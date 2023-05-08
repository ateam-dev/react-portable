const fs = require("node:fs");
const path = require("node:path");
const wrangler = require("wrangler");
const vite = require("vite");
const { resolve } = require("node:path");
const { qwikVite } = require("@builder.io/qwik/optimizer");
const tsconfigPaths = require("vite-tsconfig-paths").default;
const { qwikReact } = require("@builder.io/qwik-react/vite");

function copyFolderSync(source, destination) {
  if (!fs.existsSync(destination)) {
    fs.mkdirSync(destination);
  }

  const files = fs.readdirSync(source);

  for (const file of files) {
    const srcPath = path.join(source, file);
    const destPath = path.join(destination, file);

    const stat = fs.statSync(srcPath);

    if (stat.isDirectory()) {
      copyFolderSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

const vitePlugins = (entry) => [
  {
    enforce: "pre",
    name: "react-portable-vite",
    resolveId(id) {
      if (id === "react-portable:virtual") {
        return resolve(process.cwd(), entry);
      }
    },
    transform(code, id) {
      if (id.endsWith(".tsx") || id.endsWith(".jsx"))
        return `/** @jsxImportSource react */\n${code}`;
    },
  },
  qwikVite({
    srcDir: resolve(__dirname, "./sandbox/src"),
    client: {
      outDir: resolve(__dirname, "./sandbox/dist"),
    },
    ssr: {
      input: resolve(__dirname, "./sandbox/src/entry.ssr.tsx"),
      outDir: resolve(__dirname, "./sandbox/server"),
    },
  }),
  tsconfigPaths(),
  qwikReact(),
];

const main = async () => {
  // prepare sandbox dir
  const sandboxDir = path.resolve(__dirname, "sandbox");
  if (!fs.existsSync(sandboxDir)) {
    fs.mkdirSync(sandboxDir);
    copyFolderSync(path.join(__dirname, "seeds"), path.join(sandboxDir, "src"));
    fs.writeFileSync(
      path.join(path.join(sandboxDir, "src"), "root.tsx"),
      `import { component$ } from "@builder.io/qwik";
import { qwikify$ } from "@builder.io/qwik-react";
import * as reactPortable from "react-portable:virtual";
export default component$(qwikify$(reactPortable.default, reactPortable.option));`,
      { encoding: "utf-8" }
    );
  }

  const entry = process.argv[2];

  if (!entry) {
    console.error("Error: Entry file path is required as the first argument");
    process.exit(1);
  }

  console.log("Entry file is: ", entry);

  try {
    await vite.build({
      plugins: vitePlugins(entry),
    });
    await vite.build({
      plugins: vitePlugins(entry),
      ssr: { target: "webworker", noExternal: true },
      build: {
        rollupOptions: {
          external: "__STATIC_CONTENT_MANIFEST",
        },
        ssr: true,
      },
    });

    console.clear();

    const res = await wrangler.unstable_dev("sandbox/server/entry.ssr.js", {
      site: "./sandbox/dist",
      local: true,
    });

    console.log("Listening on", `http://${res.address}:${res.port}`);
  } catch (e) {
    console.error(`Error executing commands: ${e.message}`);
  }
};

main();
