#!/usr/bin/env node
import * as fs from "fs";
import * as path from "path";
import * as vite from "vite";
import { qwikVite } from "@builder.io/qwik/optimizer";
import { qwikCity } from "@builder.io/qwik-city/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { qwikReact } from "@builder.io/qwik-react/vite";
import { program } from "commander";
import { PluginOption } from "vite";
import fsx from "fs-extra";
import chokidar from "chokidar";
import { glob } from "glob";
import { Config } from "./types";

// FIXME: projectRoot
const projectRoot = process.cwd();
const baseModuleDir = path.resolve(__dirname, "../src");
let srcDir: string;
let clientOutDir: string;
let serverOutDir: string;
let tmpDir: string;
let entryFile: string;
let workerFilePath: string;

const loadConfig = () => {
  const config: Config = require(path.resolve(
    process.cwd(),
    "react-portable.config.js"
  ));

  srcDir = config.src;
  tmpDir = config.tmpDir ?? path.resolve(projectRoot, ".rp/tmp");
  clientOutDir =
    config.outDirs?.client ?? path.resolve(projectRoot, ".rp/client");
  serverOutDir =
    config.outDirs?.server ?? path.resolve(projectRoot, ".rp/server");
  workerFilePath =
    config.workerScript ?? path.resolve(projectRoot, "worker.ts");
  entryFile = path.resolve(tmpDir, "entry.ssr.tsx");
};

const vitePlugins = (): PluginOption[] => [
  {
    enforce: "pre",
    name: "react-portable-vite",
    resolveId: async (source) => {
      if (source.startsWith("react-portable:virtual:")) {
        const name = source.replace("react-portable:virtual:", "");
        const [target] = await glob(
          `${srcDir}/**/${name}.rp.@(ts|tsx|js|jsx)`,
          {
            absolute: true,
          }
        );
        return target;
      }
    },
    transform: (code: string, id: string) => {
      if (
        !id.includes(tmpDir) &&
        (id.endsWith(".tsx") || id.endsWith(".jsx"))
      ) {
        return `/** @jsxImportSource react */\n${code}`;
      }
    },
  },
  {
    enforce: "pre",
    name: "react-portable-worker",
    resolveId: (source) => {
      if (source === "@entry") return entryFile;
    },
  },
  qwikCity({
    routesDir: path.resolve(tmpDir, "routes"),
    trailingSlash: false,
  }),
  qwikVite({
    srcDir: tmpDir,
    client: {
      outDir: clientOutDir,
    },
    ssr: {
      outDir: serverOutDir,
    },
  }),
  tsconfigPaths(),
  qwikReact(),
];

const initProject = async () => {
  await Promise.all(
    ["react-portable.config.js", "worker.ts", "wrangler.toml"].map(
      async (file) => {
        // FIXME: check existing
        await fsx.promises.cp(
          path.resolve(baseModuleDir, file),
          path.resolve(projectRoot, file)
        );
        console.log(`🧩 Placed ${file}`);
      }
    )
  );
};

const prepareProject = async () => {
  if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true });
  await Promise.all(
    ["root.tsx", "entry.ssr.tsx"].map((file) =>
      fsx.promises.cp(
        path.resolve(baseModuleDir, file),
        path.resolve(tmpDir, file)
      )
    )
  );
};

const syncRoutes = async (once: boolean = false) => {
  const routeFileTemplate = fsx.readFileSync(
    path.resolve(baseModuleDir, "index.tsx"),
    "utf8"
  );

  const watcher = chokidar.watch(`${srcDir}/**/*.rp.@(ts|tsx|js|jsx)`, {
    persistent: !once,
    ignoreInitial: false,
    followSymlinks: true,
    depth: 99,
  });

  watcher.on("unlink", (filePath) => {
    const name = filePath.match(/([^/]+?)\.rp\.[jt]sx?$/)![1];

    fsx.rmSync(path.resolve(tmpDir, "routes", ...name.split("."), "index.tsx"));
  });

  watcher.on("add", (filePath) => {
    const name = filePath.match(/([^/]+?)\.rp\.[jt]sx?$/)![1];

    fsx.outputFile(
      path.resolve(tmpDir, "routes", ...name.split("."), "index.tsx"),
      routeFileTemplate.replace(
        "react-portable:virtual",
        `react-portable:virtual:${name}`
      )
    );
  });

  return new Promise((r) => watcher.on("ready", r));
};

const serveSSR = async (option: { port?: number } = {}) => {
  const server = await vite.createServer({
    plugins: vitePlugins(),
    mode: "ssr",
  });
  await server.listen(option.port);
  server.printUrls();
};

const buildClient = async () => {
  return vite.build({
    plugins: vitePlugins(),
  });
};

const buildWorker = async (seamless = false) => {
  return vite.build({
    plugins: vitePlugins(),
    build: {
      emptyOutDir: !seamless,
      ssr: true,
      rollupOptions: {
        input: [workerFilePath, "@qwik-city-plan"],
      },
    },
  });
};

program.version("0.0.1");

program
  .command("init")
  .description("initialize project")
  .action(async () => {
    await initProject();
    console.log("🎒Completed initializing react portable project");
  });

program
  .command("dev")
  .description("launch a server for development")
  .option("-p, --port <number>", "port number")
  .action(async ({ port }: { port?: string }) => {
    loadConfig();
    await prepareProject();
    await syncRoutes();

    await serveSSR({ port: port ? Number(port) : undefined }).catch((e) => {
      console.error(e);
      process.exit(1);
    });
  });

program
  .command("build")
  .description("build scripts for react portable")
  .action(async () => {
    loadConfig();
    await prepareProject();
    await syncRoutes(true);
    await buildClient();
    await buildWorker();
  });

program
  .command("watch")
  .description("watch mode")
  .option(
    "--preBuilt",
    "skip out-directory reset and initial build if already pre-built"
  )
  .action(async ({ preBuilt }: { watch?: true; preBuilt?: true }) => {
    loadConfig();
    if (!preBuilt) await prepareProject();
    await syncRoutes();
    if (!preBuilt) await buildClient();
    if (!preBuilt) await buildWorker();

    const watcher = chokidar.watch(`${srcDir}/**/*`, {
      persistent: true,
      ignoreInitial: true,
      depth: 99,
    });
    watcher.on("all", async () => {
      await buildClient();
      await buildWorker(true);
    });
  });

program.parse(process.argv);

if (program.args.length === 0) {
  program.help();
}
