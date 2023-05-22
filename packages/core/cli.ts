#!/usr/bin/env node
import * as fs from "fs";
import * as path from "path";
import * as wrangler from "wrangler";
import * as vite from "vite";
import { qwikVite } from "@builder.io/qwik/optimizer";
import { qwikCity } from "@builder.io/qwik-city/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { qwikReact } from "@builder.io/qwik-react/vite";
import { program } from "commander";
import { PluginOption } from "vite";
import { globSync } from "glob";
import fsx from "fs-extra";

const clientOutDir = path.resolve(process.cwd(), ".rp/client");
const serverOutDir = path.resolve(process.cwd(), ".rp/server");
const tmpDir = path.resolve(process.cwd(), ".rp/tmp");

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
  qwikCity({
    routesDir: path.resolve(tmpDir, "routes"),
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

const prepareProject = async (routesDir: string) => {
  if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true });
  const pathToSrc = path.resolve(__dirname, "../src");

  await Promise.all(
    ["root.tsx", "entry.ssr.tsx", "workers.ts", "hono.ts"].map((file) =>
      fsx.promises.cp(path.resolve(pathToSrc, file), path.resolve(tmpDir, file))
    )
  );

  const routeFileTemplate = fsx.readFileSync(
    path.resolve(pathToSrc, "index.tsx"),
    "utf8"
  );
  await Promise.all(
    globSync(`${routesDir}/**/index.@(ts|tsx|js|jsx)`, {
      absolute: true,
    }).map((file) => {
      return fsx.outputFile(
        path.resolve(
          path.dirname(
            path.resolve(tmpDir, "routes", path.relative(routesDir, file))
          ),
          "index.tsx"
        ),
        routeFileTemplate.replace("react-portable:virtual", file)
      );
    })
  );
};

const launchDevWorker = async (
  option: { port?: number; liveReload?: boolean } = {}
) => {
  const worker = await wrangler.unstable_dev(
    path.resolve(serverOutDir, "workers.mjs"),
    {
      site: path.relative(process.cwd(), clientOutDir),
      port: option.port,
      experimental: {
        liveReload: option.liveReload ?? false,
        disableExperimentalWarning: true,
      },
      logLevel: "log",
    }
  );

  console.log("🧩 Listening on", `http://${worker.address}:${worker.port}`);
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
        input: [path.resolve(tmpDir, "workers.ts"), "@qwik-city-plan"],
      },
    },
  });
};

program.version("0.0.1");

program
  .command("dev <src>")
  .description("開発モード")
  .option("-p, --port <number>", "使用するポート")
  .action(async (src: string, { port }: { port?: string }) => {
    // TODO: srcを監視して、ディレクトリ構造が変わったら再構築したい
    await prepareProject(src);

    await serveSSR({ port: port ? Number(port) : undefined }).catch((e) => {
      console.error(e);
      process.exit(1);
    });
  });

program
  .command("build <src>")
  .description("ビルドモード")
  .action(async (src: string) => {
    await prepareProject(src);
    await buildClient();
    await buildWorker();
  });

program
  .command("start <src>")
  .description("スタートモード")
  .option("-p, --port <number>", "使用するポート")
  .action(async (src: string, { port }: { port?: string }) => {
    await launchDevWorker({ port: port ? Number(port) : undefined });
  });

program
  .command("preview <src>")
  .description("プレビューモード(workerモード)")
  .option("-p, --port <number>", "使用するポート")
  .action(async (src: string, { port }: { port?: string }) => {
    await prepareProject(src);
    await buildClient();
    await buildWorker();
    await launchDevWorker({ port: port ? Number(port) : undefined });
  });

program
  .command("deploy <entry>")
  .description("デプロイモード")
  .action((entry) => {
    // TODO
  });

program.parse(process.argv);

if (program.args.length === 0) {
  program.help();
}
