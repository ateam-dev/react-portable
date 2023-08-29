#!/usr/bin/env node
import * as vite from "vite";
import { program } from "commander";
import {
  portableConfig,
  portablePlugin,
  preparePlugin,
  qwikPlugins,
} from "./vite";
import * as chokidar from "chokidar";
import * as path from "node:path";
import * as fs from "node:fs";
import { Worker } from "./worker";
import { BuildQueue } from "./buildQueue";
import { startWS } from "./ws";

type Color = "cyan" | "yellow" | "green";
const displayLog = (...messages: (string | [Color, string])[]) => {
  const formatted = messages.map((msg) => {
    if (typeof msg === "string") return msg;
    const [color, txt] = msg;
    return color === "cyan"
      ? `\x1b[36m${txt}\x1b[0m`
      : color === "yellow"
      ? `\x1b[34m${txt}\x1b[0m`
      : `\x1b[32m${txt}\x1b[0m`;
  });
  console.log(...formatted);
};

const prepare = async (configFile?: string | null) => {
  return vite.build({
    configFile: configFile || false,
    plugins: [preparePlugin()],
    build: {
      emptyOutDir: true,
      outDir: path.resolve(portableConfig.coreDir, "tmp"),
      lib: {
        entry: portableConfig.entry,
        formats: ["es"],
      },
      rollupOptions: {
        external: /.*\/node_modules\/.*/,
      },
    },
    clearScreen: false,
  });
};

const buildClient = async (configFile?: string | null) => {
  return vite.build({
    configFile: configFile || false,
    plugins: [portablePlugin(), qwikPlugins()],
  });
};

const buildServer = async (emptyOutDir = true, configFile?: string | null) => {
  return vite.build({
    configFile: configFile || false,
    plugins: [portablePlugin(), qwikPlugins()],
    build: {
      emptyOutDir,
      ssr: true,
    },
  });
};

program
  .argument("<origin>", "Specify the origin of the proxy destination.")
  .description("Start the server for preview.")
  .option("-p --port <port>", "The gateway server port.")
  .option(
    "-w --watch <path>",
    "Specify the path to the source directory if you want to watch changes and automatically restart the server.",
  )
  .option(
    "-c --config <path>",
    "Specifying the path of the config file of vite will overwrite the settings for build.",
    "./previewify.config.ts",
  )
  .option(
    "-t --tunnel",
    "Use cloudflared tunnel to allow global access.",
    false,
  )
  .option(
    "--cloudflared-config <path>",
    "Specifies a config file for tunneling by cloudflared in YAML format.",
  )
  .option(
    "--server-entry <path>",
    "Specify a custom entry file for the server.",
    ".portable/server/worker.mjs",
  )
  .option(
    "--client-entry <path>",
    "Specify a custom entry directory for the client.",
    ".portable/client",
  )
  .action(
    async (
      origin,
      {
        watch,
        config,
        port,
        tunnel,
        cloudflaredConfig,
        serverEntry,
        clientEntry,
      },
    ) => {
      if (fs.existsSync(config))
        displayLog(`⚙️ Loading config`, ["cyan", config]);
      if (cloudflaredConfig && !fs.existsSync(cloudflaredConfig))
        throw new Error(`${cloudflaredConfig} dose not exist.`);

      // Step1: prepare (setup routing files)
      await prepare(config);

      // Step2: build client and server code for qwik
      await buildClient(config);
      await buildServer(true, config);

      // Step3: start components server (worker)
      const devWorker = new Worker(serverEntry, {
        site: clientEntry,
      });
      await devWorker.start();
      displayLog("📁 Serving static files from", ["cyan", clientEntry]);
      displayLog("🚀 Loading server entry", ["cyan", serverEntry]);

      // Step4: start websocket server for hot reload
      const wsPort = await (await import("get-port")).default();
      const wss = startWS({
        port: wsPort,
      });

      // Step5: start gateway server (worker)
      const gateway = new Worker(
        path.resolve(__dirname, "../src/templates/gateway.js"),
        {
          vars: {
            ORIGIN: origin,
            FRAGMENTS_ENDPOINT: devWorker.localUrl,
            WS_ENDPOINT: `http://127.0.0.1:${wsPort}/_ws`,
          },
          port: port ? Number(port) : undefined,
        },
      );
      await gateway.start();
      if (tunnel) {
        displayLog("🌐 Waiting for tunneling to be completed...");
        await gateway.startTunnel(cloudflaredConfig);
      }
      displayLog(
        "🟢 Previewing at",
        gateway.globalUrl ?? gateway.localUrl,
        `(proxy ~> ${origin})`,
      );

      if (watch) {
        displayLog("👀 Watching", ["cyan", watch], "for changes");
        const watcher = chokidar.watch(watch, {
          persistent: true,
          ignoreInitial: true,
        });
        const queue = new BuildQueue();
        watcher.on("all", async () => {
          queue.enqueue(async () => {
            wss.clients.forEach((client) => {
              client.send("rebuilding");
            });

            displayLog(`♻️ Rebuilding component assets...`);
            await buildClient(config);
            await buildServer(false, config);
            displayLog(`♻️ Restarting components server...`);
            await devWorker.restart();
            displayLog(`🟢 Restarted components server`);

            wss.clients.forEach((client) => {
              client.send("reload");
            });
          });
        });
      }
    },
  );

program.parse(process.argv);

if (program.args.length === 0) {
  program.help();
}
