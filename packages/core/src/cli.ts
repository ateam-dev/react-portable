#!/usr/bin/env node
import * as vite from "vite";
import { program } from "commander";
import { portablePlugin, portablePreparePlugin } from "./vite";
import * as chokidar from "chokidar";
import { unstable_dev, UnstableDevOptions, UnstableDevWorker } from "wrangler";
import { startTunnel } from "untun";
import * as path from "node:path";

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
    if (config) console.log("Load custom config", config);

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
    if (config) console.log("Load custom config", config);

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
    "-g --global",
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
      { watch, config, port, global: tunnel, serverEntry, clientEntry },
    ) => {
      if (config) console.log("Load custom config", config);

      const devWorker = new Worker(
        serverEntry,
        {
          site: clientEntry,
          experimental: {
            disableExperimentalWarning: true,
          },
        },
        {
          name: "dev server",
          silent: true,
        },
      );

      await buildClient(config);
      await buildServer(true, config);
      await devWorker.start();

      const gateway = new Worker(
        path.resolve(__dirname, "../src/templates/preview-gateway.js"),
        {
          vars: {
            ORIGIN: origin,
            REMOTE: devWorker.localUrl,
          },
          port: port ? Number(port) : undefined,
          experimental: {
            disableExperimentalWarning: true,
          },
        },
        { name: "gateway server" },
      );
      await gateway.start(tunnel);
      console.log("Proxy", gateway.globalUrl ?? gateway.localUrl, "~>", origin);

      if (watch) {
        const watcher = chokidar.watch(watch, {
          persistent: true,
          ignoreInitial: true,
        });
        watcher.on("all", async (event) => {
          await buildClient(config);
          await buildServer(false, config);
          await devWorker.restart();
        });
      }
    },
  );

class Worker {
  private worker: UnstableDevWorker | undefined;
  public globalUrl: string | undefined;

  constructor(
    private readonly workerEntry: string,
    private readonly workerOption: UnstableDevOptions,
    private readonly option: { name: string; silent?: boolean },
  ) {}

  public async start(tunnel = false) {
    this.worker = await unstable_dev(this.workerEntry, this.workerOption);

    if (tunnel) await this.startTunnel();
    else
      this.print("success", `${this.option.name} is running at`, this.localUrl);
  }

  public async restart(tunnel = false) {
    this.print("info", `Restarting ${this.option.name}...`);

    await this.worker?.stop();
    this.worker = await unstable_dev(this.workerEntry, {
      ...this.workerOption,
      port: this.worker?.port ?? this.workerOption.port,
    });

    this.print("success", `${this.option.name} is restarted`);
  }

  private async startTunnel() {
    const tunnel = await startTunnel({ url: this.localUrl });

    this.print("info", `Waiting for ${this.option.name} tunnel URL...`);

    this.globalUrl = await tunnel!.getURL();
    this.print(
      "success",
      `${this.option.name} is tunneling at`,
      this.globalUrl,
    );
  }

  public get localUrl() {
    if (!this.worker) throw new Error(`${this.option.name} is not up yet.`);

    return `http://${this.worker.address}:${this.worker.port}`;
  }

  private print(level: "info" | "success", ...message: string[]) {
    if (this.option.silent) return;
    const prefix = level === "info" ? `\x1b[34mℹ\x1b[0m` : `\x1b[32m✔\x1b[0m`;
    console.log(prefix, ...message);
  }
}

program.parse(process.argv);

if (program.args.length === 0) {
  program.help();
}
