#!/usr/bin/env node
import * as vite from "vite";
import { program } from "commander";
import { portablePlugin, portablePreparePlugin } from "./vite";

const prepare = async (configFile?: string | null) => {
  return vite.build(
    configFile
      ? { configFile }
      : {
          plugins: [portablePreparePlugin()],
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
    await prepare(config);
  });

program
  .command("build")
  .description("Build the scripts for react portable.")
  .option(
    "--no-cleanup",
    "Disables cleanup of the destination directory before build. This prevents the server from temporarily losing referenced files during continuous builds with file change watching.",
  )
  .option(
    "-c --config <path>",
    "Specifying the path of the config file will overwrite the settings.",
  )
  .action(async ({ cleanup, config }) => {
    await buildClient(config);
    await buildServer(cleanup, config);
  });

program.parse(process.argv);

if (program.args.length === 0) {
  program.help();
}
