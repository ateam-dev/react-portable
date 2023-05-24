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

// TODO: react-portable.config.js
const projectRoot = process.cwd();
const clientOutDir = path.resolve(projectRoot, ".rp/client");
const serverOutDir = path.resolve(projectRoot, ".rp/server");
const tmpDir = path.resolve(projectRoot, ".rp/tmp");
const entryFile = path.resolve(tmpDir, "entry.ssr.tsx");
const workerFilePath = path.resolve(projectRoot, "worker.ts");
const baseModuleDir = path.resolve(__dirname, "../src");

const vitePlugins = (): PluginOption[] => [
  {
    enforce: "pre",
    name: "react-portable-vite",
    transform(code: string, id: string) {
      if (
        !id.includes("/.rp/") &&
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
  // FIXME
  tsconfigPaths(),
  qwikReact(),
];

const initProject = async () => {
  await Promise.all(
    ["worker.ts", "wrangler.toml"].map(async (file) => {
      // FIXME check existing
      await fsx.promises.cp(
        path.resolve(baseModuleDir, file),
        path.resolve(projectRoot, file)
      );
      console.log(`🧩 Placed ${file}`);
    })
  );
  // TODO: update package.json (scripts)
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

const syncRoutes = async (src: string, once: boolean = false) => {
  const routeFileTemplate = fsx.readFileSync(
    path.resolve(baseModuleDir, "index.tsx"),
    "utf8"
  );

  const watcher = chokidar.watch(`${src}/**/*.rp.@(ts|tsx|js|jsx)`, {
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
    const absolutePath = path.resolve(process.cwd(), filePath);
    const name = filePath.match(/([^/]+?)\.rp\.[jt]sx?$/)![1];

    fsx.outputFile(
      path.resolve(tmpDir, "routes", ...name.split("."), "index.tsx"),
      routeFileTemplate.replace("react-portable:virtual", absolutePath)
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

const buildWorker = async () => {
  return vite.build({
    plugins: vitePlugins(),
    build: {
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
  .command("dev <src>")
  .description("launch a server for development")
  .option("-p, --port <number>", "port number")
  .action(async (src: string, { port }: { port?: string }) => {
    await prepareProject();
    await syncRoutes(src);

    await serveSSR({ port: port ? Number(port) : undefined }).catch((e) => {
      console.error(e);
      process.exit(1);
    });
  });

program
  .command("build <src>")
  .description("build scripts for react portable")
  .option("--watch", "watch mode")
  .action(async (src: string, { watch }: { watch?: true }) => {
    await prepareProject();
    await syncRoutes(src, !watch);

    await buildClient();
    await buildWorker();

    if (watch) {
      const watcher = chokidar.watch(`${src}/**/*`, {
        persistent: true,
        ignoreInitial: true,
        depth: 99,
      });
      watcher.on("all", async () => {
        await buildClient();
        await buildWorker();
      });
    }
  });

program.parse(process.argv);

if (program.args.length === 0) {
  program.help();
}
