import * as fs from "fs";
import * as path from "path";
import * as wrangler from "wrangler";
import * as vite from "vite";
import { qwikVite } from "@builder.io/qwik/optimizer";
import tsconfigPaths from "vite-tsconfig-paths";
import { qwikReact } from "@builder.io/qwik-react/vite";
import { program } from "commander";
import { PluginOption } from "vite";
import { UnstableDevWorker } from "wrangler";

const reactEntryFile = "entry.js";
const clientEntryFile = "root.js";
const clientOutDir = "client";
const ssrEntryFile = "worker.js";
const ssrOutDir = "server";
const distDir = "_rp-build";

const vitePlugins = (entry: string, srcDir: string): PluginOption[] => [
  {
    enforce: "pre",
    name: "react-portable-vite",
    resolveId(id: string) {
      if (id === "react-portable:virtual") {
        return path.resolve(process.cwd(), entry);
      }
      if (id === "react-portable:root-entry") {
        return path.resolve(srcDir, clientEntryFile);
      }
    },
    transform(code: string, id: string) {
      if (id.endsWith(".tsx") || id.endsWith(".jsx"))
        return `/** @jsxImportSource react */\n${code}`;
    },
  },
  qwikVite({
    srcDir,
    client: {
      input: path.resolve(srcDir, clientEntryFile),
      outDir: path.resolve(srcDir, clientOutDir),
    },
    ssr: {
      input: path.resolve(srcDir, ssrEntryFile),
      outDir: path.resolve(srcDir, ssrOutDir),
    },
  }),
  // FIXME
  tsconfigPaths(),
  qwikReact(),
];

const launchWorkerPlugin = (
  workerEntry: string,
  bucketDir: string,
  option: { port?: number; host?: string } = {}
): PluginOption => ({
  name: "start-dev-worker",
  writeBundle: () => launchDevWorker(workerEntry, bucketDir, option),
});

const createOutputDir = (dir: string) => {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true });
  fs.mkdirSync(dir, { recursive: true });

  fs.cpSync(
    path.resolve(__dirname, "../dist", reactEntryFile),
    path.resolve(dir, reactEntryFile)
  );
  fs.cpSync(
    path.resolve(__dirname, "../dist", clientEntryFile),
    path.resolve(dir, clientEntryFile)
  );
  fs.cpSync(
    path.resolve(__dirname, "../dist", ssrEntryFile),
    path.resolve(dir, ssrEntryFile)
  );

  process.on("exit", () => {
    fs.rmSync(path.resolve(dir, reactEntryFile), { force: true });
    fs.rmSync(path.resolve(dir, clientEntryFile), { force: true });
    fs.rmSync(path.resolve(dir, ssrEntryFile), { force: true });
  });
};

let worker: UnstableDevWorker;
const launchDevWorker = async (
  workerEntry: string,
  bucketDir: string,
  option: { port?: number; host?: string } = {}
) => {
  if (worker) await worker.stop();

  worker = await wrangler.unstable_dev(workerEntry, {
    site: bucketDir,
    local: true,
    port: option.port ?? worker?.port,
    experimental: {
      liveReload: true,
    },
  });

  console.log("🧩 Listening on", `http://${worker.address}:${worker.port}`);
};

const buildClient = async (
  entry: string,
  outDir: string,
  option: { isDev?: boolean; additionalPlugins?: PluginOption[] } = {}
) => {
  return vite.build({
    plugins: [
      ...vitePlugins(entry, outDir),
      ...(option.additionalPlugins ?? []),
    ],
    build: {
      watch: option.isDev
        ? {
            include: new RegExp(path.dirname(entry)),
            exclude: new RegExp(outDir),
          }
        : undefined,
    },
  });
};

const buildSSR = async (
  entry: string,
  outDir: string,
  option: { isDev?: boolean; additionalPlugins?: PluginOption[] } = {}
) => {
  return vite.build({
    plugins: [
      ...vitePlugins(entry, outDir),
      ...(option.additionalPlugins ?? []),
    ],
    ssr: { target: "webworker", noExternal: true },
    build: {
      rollupOptions: {
        external: "__STATIC_CONTENT_MANIFEST",
      },
      ssr: true,
      watch: option.isDev
        ? {
            include: new RegExp(path.dirname(entry)),
            exclude: new RegExp(outDir),
          }
        : undefined,
    },
  });
};

program.version("0.0.1");

program
  .command("dev <entry>")
  .description("開発モード")
  .option("-p, --port <number>", "使用するポート")
  .action((entry: string, { port }: { port?: number }) => {
    const ourDir = path.join(path.dirname(entry), distDir);
    createOutputDir(ourDir);
    const workerEntry = path.join(ourDir, ssrOutDir, ssrEntryFile);
    const bucketDir = path.relative(
      process.cwd(),
      path.resolve(ourDir, clientOutDir)
    );
    buildClient(entry, ourDir, { isDev: true }).catch((e) => {
      console.error(e);
      process.exit(1);
    });
    buildSSR(entry, ourDir, {
      isDev: true,
      additionalPlugins: [launchWorkerPlugin(workerEntry, bucketDir, { port })],
    }).catch((e) => {
      console.error(e);
      process.exit(1);
    });
  });

program
  .command("build <entry>")
  .description("ビルドモード")
  .action((entry: string) => {
    const ourDir = path.join(path.dirname(entry), distDir);
    createOutputDir(ourDir);
    buildClient(entry, ourDir).catch((e) => {
      console.error(e);
      process.exit(1);
    });
    buildSSR(entry, ourDir).catch((e) => {
      console.error(e);
      process.exit(1);
    });
  });

program
  .command("start <entry>")
  .description("スタートモード")
  .option("-p, --port <number>", "使用するポート")
  .action((entry, { port }: { port?: number }) => {
    const outDir = path.join(path.dirname(entry), distDir);
    const workerEntry = path.join(outDir, ssrOutDir, ssrEntryFile);
    const bucketDir = path.relative(
      process.cwd(),
      path.resolve(outDir, clientOutDir)
    );
    launchDevWorker(workerEntry, bucketDir, { port });
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
