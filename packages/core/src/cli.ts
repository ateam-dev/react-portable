#!/usr/bin/env node
import * as vite from "vite";
import { program } from "commander";
import { portablePlugin, portablePreparePlugin } from "./vite";
import * as chokidar from "chokidar";
import * as path from "node:path";
import { Worker } from "./worker";

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
  return vite.build(
    configFile
      ? { configFile, clearScreen: false }
      : {
          plugins: [portablePreparePlugin()],
          clearScreen: false,
        },
  );
};

const buildClient = async (configFile?: string | null) => {
  return vite.build(
    configFile
      ? { configFile }
      : {
          plugins: [portablePlugin()],
        },
  );
};

const buildServer = async (emptyOutDir = true, configFile?: string | null) => {
  return vite.build({
    ...(configFile
      ? { configFile }
      : {
          plugins: [portablePlugin()],
        }),
    build: {
      emptyOutDir,
      ssr: true,
    },
  });
};

program
  .command("prepare")
  .description("Place the configuration files in the project.")
  .option(
    "-c --config <path>",
    "Specifying the path of the config file will overwrite the settings.",
  )
  .action(async ({ config }) => {
    if (config) displayLog(`⚙️ Loading config`, ["cyan", config]);

    await prepare(config);
  });

program
  .command("build")
  .description("Build the scripts for react portable.")
  .option(
    "-c --config <path>",
    "Specifying the path of the config file of vite will overwrite the settings for build.",
  )
  .action(async ({ config }) => {
    if (config) displayLog(`⚙️ Loading config`, ["cyan", config]);

    await buildClient(config);
    await buildServer(true, config);
  });

program
  .command("preview")
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
  )
  .option(
    "-t --tunnel",
    "Use cloudflared tunnel to allow global access.",
    false,
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
      { watch, config, port, tunnel, serverEntry, clientEntry },
    ) => {
      if (config) displayLog(`⚙️ Loading config`, ["cyan", config]);

      const devWorker = new Worker(serverEntry, {
        site: clientEntry,
      });

      await buildClient(config);
      await buildServer(true, config);
      await devWorker.start();
      displayLog("📁 Serving static files from", ["cyan", clientEntry]);
      displayLog("🚀 Loading server entry", ["cyan", serverEntry]);

      const gateway = new Worker(
        path.resolve(__dirname, "../src/templates/preview-gateway.js"),
        {
          vars: {
            ORIGIN: origin,
            FRAGMENTS_ENDPOINT: devWorker.localUrl,
          },
          port: port ? Number(port) : undefined,
        },
      );
      await gateway.start(tunnel);
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
        watcher.on("all", async () => {
          displayLog(`♻️ Rebuilding component assets...`);
          await buildClient(config);
          await buildServer(false, config);
          displayLog(`♻️ Restarting components server...`);
          await devWorker.restart();
          displayLog(`🟢 Restarted components server`);
        });
      }
    },
  );

program.parse(process.argv);

if (program.args.length === 0) {
  program.help();
}
