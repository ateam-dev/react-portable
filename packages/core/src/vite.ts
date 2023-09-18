import * as fs from "node:fs";
import * as path from "node:path";
import type { PluginOption } from "vite";
import { qwikCity } from "@builder.io/qwik-city/vite";
import { qwikVite } from "@builder.io/qwik/optimizer";
import { qwikReact } from "@builder.io/qwik-react/vite";
import entrySSRRaw from "./statics/entry.ssr.jsx?raw";
import routeRaw from "./statics/route.jsx?raw";

const putRouteFile = (code: string) => {
  const destPath = path.resolve(
    portableConfig.coreDir,
    `routes/${code}/index.jsx`,
  );
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.writeFileSync(
    destPath,
    routeRaw
      .replaceAll("__code__", code)
      .replaceAll("__entryPath__", path.resolve(portableConfig.entry)),
    "utf-8",
  );
};

export const preparePlugin = (): PluginOption => {
  return {
    name: "react-portable-prepare",
    enforce: "pre",
    config: () => {
      const destPath = path.resolve(portableConfig.coreDir, "entry.ssr.jsx");
      // cleanup
      fs.rmSync(path.dirname(destPath), { recursive: true, force: true });
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.writeFileSync(destPath, entrySSRRaw, "utf-8");
    },
    transform: (code) => {
      const regex = new RegExp(`${portableConfig.prefix}[^\\s"'\`]+`, "g");
      const matches = code.match(regex) ?? [];
      matches.forEach((code) => putRouteFile(code));
    },
  };
};

type Config = {
  css: string | undefined;
  coreDir: string;
  entry: string;
  prefix: string;
};
const initialConfig: Config = {
  css: undefined,
  coreDir: path.resolve("node_modules", ".portable"),
  entry: "./src",
  prefix: "pfy-",
};
export let portableConfig = initialConfig;

export const previewifyPlugin = ({
  css,
  entry,
  coreDir,
  prefix,
}: Partial<Config> = {}): PluginOption => {
  if (css) portableConfig.css = css;
  if (entry) portableConfig.entry = entry;
  if (coreDir) portableConfig.coreDir = coreDir;
  if (prefix) portableConfig.prefix = prefix;

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
