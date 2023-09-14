#!/usr/bin/env node
import * as vite from "vite";
import { program } from "commander";
import {
  portableConfig,
  portablePlugin,
  preparePlugin,
  qwikPlugins,
} from "./vite";
import * as path from "node:path";
import * as fs from "node:fs";
import { Worker } from "./worker";

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

const devServer = async (configFile?: string | null) => {
  const server = await vite.createServer({
    configFile: configFile || false,
    mode: "ssr",
    plugins: [portablePlugin(), qwikPlugins()],
    base: "/_fragments",
    server: {
      host: "127.0.0.1",
      hmr: false,
    },
  });
  return server.listen();
};

program
  .argument("<origin>", "Specify the origin of the proxy destination.")
  .description("Start the server for preview.")
  .option("-p --port <port>", "The gateway server port.")
  .option(
    "-t --tunnel",
    "Use cloudflared tunnel to allow global access.",
    false,
  )
  .option(
    "--cloudflared-config <path>",
    "Specifies a config file for tunneling by cloudflared in YAML format.",
  )
  .action(async (origin, { port, tunnel, cloudflaredConfig }) => {
    const config = "./previewify.config.ts";
    if (cloudflaredConfig && !fs.existsSync(cloudflaredConfig))
      throw new Error(`${cloudflaredConfig} dose not exist.`);

    // Step1: prepare (setup routing files)
    await prepare(config);

    // Step2: launch a vite dev server
    const dev = await devServer(config);
    if (process.env.DEBUG) dev.printUrls();
    const address = dev.httpServer?.address() as {
      address: string;
      port: number;
    };
    const devEndpoint = `http://${address.address}:${address.port}`;

    // Step3: start gateway server (worker)
    const gateway = new Worker(require.resolve("./gateway.mjs"), {
      vars: {
        ORIGIN: origin,
        FRAGMENTS_ENDPOINT: devEndpoint,
      },
      port: port ? Number(port) : undefined,
      durableObjects: [
        {
          name: "GATEWAY",
          class_name: "HotReloadableGateway",
        },
      ],
      persistTo: path.resolve(portableConfig.coreDir, ".wrangler"),
    });
    await gateway.start();
    if (tunnel) {
      console.log("  🌐 Waiting for tunneling to be completed...");
      await gateway.startTunnel(cloudflaredConfig);
    }

    // Step4: start watching changes for hot reload
    dev.watcher.on("change", () => {
      gateway.worker?.fetch("/_reload");
    });

    console.log(
      `\x1b[36m${"  🌈 Previewing at"}\x1b[0m`,
      gateway.globalUrl ?? gateway.localUrl,
    );
  });

program.parse(process.argv);

if (program.args.length === 0) {
  program.help();
}
