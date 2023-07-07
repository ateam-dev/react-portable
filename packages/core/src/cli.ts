#!/usr/bin/env node
import * as vite from "vite";
import { program } from "commander";

const configFile = "./vite.portable.config.ts";

const buildClient = async () => {
  return vite.build({
    configFile,
  });
};

const buildServer = async (emptyOutDir = true) => {
  return vite.build({
    configFile,
    build: {
      emptyOutDir,
      ssr: true,
    },
  });
};

program
  .command("build")
  .description("build scripts for react portable")
  .option(
    "--continuous",
    "Watch the specified (glob format) path and rebuild if there are any changes. default: ./src/**/*",
    false
  )
  .action(async ({ continuous }) => {
    await buildClient();
    await buildServer(!continuous);
  });

program.parse(process.argv);

if (program.args.length === 0) {
  program.help();
}
