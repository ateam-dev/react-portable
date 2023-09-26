#!/usr/bin/env node
import * as vite from "vite";
import { program } from "commander";
import { portablePlugin, preparePlugin, Config, qwikPlugins } from "./vite";
import * as path from "node:path";
import * as fs from "node:fs";
import { Worker } from "./worker";
import { writeFile, parseModule } from "magicast";
import { loadConfig } from "c12";
import { input, confirm } from "@inquirer/prompts";
import { defu } from "defu";
import { InlineConfig } from "vite";

const prepare = async (config: Config) => {
  return vite.build(
    defu<InlineConfig, InlineConfig[]>(
      {
        configFile:
          typeof config.viteConfig === "string" ? config.viteConfig : false,
        plugins: [preparePlugin(config)],
        build: {
          emptyOutDir: true,
          outDir: path.resolve(config.coreDir, "tmp"),
          lib: {
            entry: config.entry,
            formats: ["es"],
          },
          rollupOptions: {
            external: /.*\/node_modules\/.*/,
          },
        },
        clearScreen: false,
      },
      typeof config.viteConfig === "string" ? {} : config.viteConfig,
    ),
  );
};

const devServer = async (config: Config) => {
  const server = await vite.createServer(
    defu<InlineConfig, InlineConfig[]>(
      {
        configFile:
          typeof config.viteConfig === "string" ? config.viteConfig : false,
        mode: "ssr",
        plugins: [portablePlugin(config), qwikPlugins(config)],
        base: "/_fragments",
        server: {
          host: "127.0.0.1",
          hmr: false,
        },
      },
      typeof config.viteConfig === "string" ? {} : config.viteConfig,
    ),
  );
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
    // Step0: load config
    const { config } = await loadConfig<Config>({
      name: "previewify",
      defaults: {
        coreDir: path.resolve("node_modules", ".portable"),
        prefix: "pfy-",
        entry: "",
        css: undefined,
        viteConfig: {},
      },
    });
    if (process.env.DEBUG) console.log(config);
    if (!config?.entry)
      throw new Error(
        "Config file is either missing or invalid. Please run `npx previewify init` to set up the config file.",
      );

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
      persistTo: path.resolve(config.coreDir, ".wrangler"),
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

program.command("init").action(async () => {
  console.log("♻️ Welcome to Previewify! Let's set it up.");

  const configPath = path.resolve("./previewify.config.js");
  if (fs.existsSync(configPath)) {
    if (
      !(await confirm({
        message:
          "A previewify.config.js file already exists. Would you like to overwrite it?",
        default: false,
      }))
    ) {
      console.log("Bye 👋");
      return;
    }
  }

  const entry = await input({
    message: "Enter the path of this project's entry file",
    default: "./src",
  });

  const mod = parseModule(
    `/** @type {import('@react/portable').PreviewifyConfig} */\nexport default {}`,
  );
  mod.exports.default.entry = entry;

  await writeFile(mod, configPath);

  console.log("✅ Setup complete! Proceed with the documentation to continue.");
});

program.parse(process.argv);

if (program.args.length === 0) {
  program.help();
}
