import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as ts from "typescript";
import type { PluginOption } from "vite";
import { qwikCity } from "@builder.io/qwik-city/vite";
import { qwikVite } from "@builder.io/qwik/optimizer";
import { qwikReact } from "@builder.io/qwik-react/vite";
import entrySSRRaw from "./statics/entry.ssr.jsx?raw";
import routeRaw from "./statics/route.jsx?raw";

const findPortableFunctionCalls = (node: ts.Node): string | null => {
  if (
    ts.isCallExpression(node) &&
    ts.isIdentifier(node.expression) &&
    node.expression.escapedText === "previewify"
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
    fileName,
    script,
    ts.ScriptTarget.Latest,
    true,
  );

  if (sourceFile) return findPortableFunctionCalls(sourceFile);
};

const putRouteFile = async (code: string, importer: string) => {
  const destPath = path.resolve(
    portableConfig.coreDir,
    `routes/${code}/index.jsx`,
  );
  await fs.mkdir(path.dirname(destPath), { recursive: true });
  await fs.writeFile(
    destPath,
    routeRaw.replaceAll("__code__", code).replaceAll("__entryPath__", importer),
    "utf-8",
  );
};

export const preparePlugin = (): PluginOption => {
  return {
    name: "react-portable-prepare",
    enforce: "pre",
    config: async (config) => {
      const destPath = path.resolve(portableConfig.coreDir, "entry.ssr.jsx");
      await fs.mkdir(path.dirname(destPath), { recursive: true });
      await fs.writeFile(destPath, entrySSRRaw, "utf-8");

      return config;
    },
    resolveId: async (source, importer) => {
      if (importer && source === "@react-portable/core") {
        const code = await getPortableCode(importer);

        if (!code) return;

        await putRouteFile(code, importer);
      }
    },
  };
};

type Config = {
  css: string | undefined;
  coreDir: string;
  entry: string;
};
const initialConfig: Config = {
  css: undefined,
  coreDir: path.resolve("node_modules", ".portable"),
  entry: "./src",
};
export let portableConfig = initialConfig;

export const previewifyPlugin = ({
  css,
  entry,
  coreDir,
}: Partial<Config> = {}): PluginOption => {
  if (css) portableConfig.css = css;
  if (entry) portableConfig.entry = entry;
  if (coreDir) portableConfig.coreDir = coreDir;

  return [];
};

export const resetConfig = () => (portableConfig = initialConfig);

export const portablePlugin = (): PluginOption => {
  return {
    name: "react-portable-build",
    enforce: "pre",
    transform: (code: string, id: string) => {
      if (
        id === path.resolve(portableConfig.coreDir, "entry.ssr.jsx") &&
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
  };
};

export const qwikPlugins = (): PluginOption => {
  return [
    qwikCity({
      routesDir: path.resolve(portableConfig.coreDir, "routes"),
      trailingSlash: false,
    }),
    qwikVite({
      srcDir: portableConfig.coreDir,
      ssr: {
        input: path.resolve(portableConfig.coreDir, "entry.ssr.jsx"),
      },
    }),
    qwikReact(),
    {
      name: "react-portable-qwik-resolve",
      config: () => {
        return {
          ssr: {
            noExternal: ["@builder.io/qwik-react", "@builder.io/qwik-city"],
          },
        };
      },
    },
  ];
};
