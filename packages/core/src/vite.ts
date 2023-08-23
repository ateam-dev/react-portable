import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as ts from "typescript";
import type { PluginOption } from "vite";
import * as appRootPath from "app-root-path";
import { qwikCity } from "@builder.io/qwik-city/vite";
import { qwikVite } from "@builder.io/qwik/optimizer";
import { qwikReact } from "@builder.io/qwik-react/vite";
import { currentDir } from "./utils";

const copyAndReplace = async (
  srcPath: string,
  destPath: string,
  replacements: {
    search: string;
    replace: string;
  }[] = [],
): Promise<void> => {
  await fs.mkdir(path.dirname(destPath), { recursive: true });

  let result = await fs.readFile(srcPath, "utf-8");
  for (const { search, replace } of replacements) {
    result = result.replace(new RegExp(search, "g"), replace);
  }

  await fs.writeFile(destPath, result, "utf-8");
};

const findPortableFunctionCalls = (node: ts.Node): string | null => {
  if (
    ts.isCallExpression(node) &&
    ts.isIdentifier(node.expression) &&
    typeof node.expression.escapedText === "string" &&
    ["previewify"].includes(node.expression.escapedText) &&
    node.arguments.length >= 2
  ) {
    const [, secondArg] = node.arguments;

    if (ts.isStringLiteral(secondArg)) return secondArg.text;
  }

  let result = null;
  ts.forEachChild(node, (child) => {
    const childResult = findPortableFunctionCalls(child);
    if (childResult) result = childResult;
  });

  return result;
};

const getPortableCode = async (fileName: string) => {
  const script = await fs.readFile(fileName, "utf-8");
  const sourceFile = ts.createSourceFile(
    "test.ts",
    script,
    ts.ScriptTarget.Latest,
    true,
  );

  if (sourceFile) return findPortableFunctionCalls(sourceFile);
};

export const preparePlugin = (): PluginOption => {
  return {
    name: "react-portable-prepare",
    enforce: "pre",
    config: async (config) => {
      await Promise.all(
        ["root.tsx", "entry.ssr.tsx", "worker.ts"].map((file) => {
          return copyAndReplace(
            path.resolve(currentDir(), "../src/templates", file),
            path.resolve(portableConfig.coreDir, file),
          );
        }),
      );
      return config;
    },
    resolveId: async (source, importer) => {
      if (importer && source === "@react-portable/core") {
        const code = await getPortableCode(importer);
        if (code) {
          const destPath = path.resolve(
            portableConfig.coreDir,
            "routes",
            code,
            "index.tsx",
          );
          await copyAndReplace(
            path.resolve(currentDir(), "../src/templates", "route.tsx"),
            destPath,
            [
              { search: "__code__", replace: code },
              {
                search: "__sanitized__",
                replace: code.replace(/[-/:;*]/g, "_"),
              },
              { search: "__entryPath__", replace: importer },
              { search: "../portable", replace: "@react-portable/core" },
            ],
          );
        }
      }
    },
  };
};

type Config = {
  css: string | undefined;
  outDir: string;
  coreDir: string;
  entry: string;
};
const initialConfig: Config = {
  css: undefined,
  outDir: ".portable",
  coreDir: path.resolve(appRootPath.path, "node_modules", ".portable"),
  entry: "./src",
};
export let portableConfig = initialConfig;

export const previewifyPlugin = ({
  css,
  outDir,
  entry,
}: Partial<Config> = {}): PluginOption => {
  if (css) portableConfig.css = css;
  if (outDir) portableConfig.outDir = outDir;
  if (entry) portableConfig.entry = entry;

  return [];
};

export const resetConfig = () => (portableConfig = initialConfig);

export const portablePlugin = (): PluginOption => {
  return [
    {
      name: "react-portable-build",
      enforce: "pre",
      config: (config, env) => {
        if (env.ssrBuild) {
          return {
            build: {
              rollupOptions: {
                input: [
                  path.resolve(portableConfig.coreDir, "worker.ts"),
                  "@qwik-city-plan",
                ],
              },
            },
          };
        }
        return config;
      },
      transform: (code: string, id: string) => {
        if (
          id === path.resolve(portableConfig.coreDir, "root.tsx") &&
          portableConfig.css
        ) {
          return `${code}\nimport '${path.resolve(portableConfig.css)}'`;
        }

        if (
          !id.includes(portableConfig.coreDir) &&
          (id.endsWith(".tsx") || id.endsWith(".jsx"))
        ) {
          return `/** @jsxImportSource react */\n${code}`;
        }
      },
    },
  ];
};

export const qwikPlugins = (): PluginOption => {
  return [
    qwikCity({
      routesDir: path.resolve(portableConfig.coreDir, "routes"),
      trailingSlash: false,
    }),
    qwikVite({
      srcDir: portableConfig.coreDir,
      client: {
        outDir: path.resolve(portableConfig.outDir, "client"),
      },
      ssr: {
        outDir: path.resolve(portableConfig.outDir, "server"),
      },
      // vendorRoots: [
      //   path.dirname(require.resolve("@builder.io/qwik-city")),
      //   path.dirname(require.resolve("@builder.io/qwik-react")),
      // ],
    }),
    qwikReact(),
  ];
};
