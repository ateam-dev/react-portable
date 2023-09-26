import * as fs from "node:fs";
import * as path from "node:path";
import type { UserConfig, PluginOption } from "vite";
import { qwikCity } from "@builder.io/qwik-city/vite";
import { qwikVite } from "@builder.io/qwik/optimizer";
import { qwikReact } from "@builder.io/qwik-react/vite";
import entrySSRRaw from "./statics/entry.ssr.jsx?raw";
import routeRaw from "./statics/route.jsx?raw";

export type Config = {
  css: string | undefined;
  coreDir: string;
  entry: string;
  prefix: string;
  viteConfig: UserConfig | string;
};

export type PreviewifyConfig = Partial<Config> & Pick<Config, "entry">;

const putRouteFile = (
  { coreDir, entry }: Pick<Config, "coreDir" | "entry">,
  code: string,
) => {
  const destPath = path.resolve(coreDir, `routes/${code}/index.jsx`);
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.writeFileSync(
    destPath,
    routeRaw
      .replaceAll("__code__", code)
      .replaceAll("__entryPath__", path.resolve(entry)),
    "utf-8",
  );
};

export const preparePlugin = ({
  coreDir,
  prefix,
  entry,
}: Pick<Config, "coreDir" | "prefix" | "entry">): PluginOption => {
  return {
    name: "react-portable-prepare",
    enforce: "pre",
    config: () => {
      const destPath = path.resolve(coreDir, "entry.ssr.jsx");
      // cleanup
      fs.rmSync(path.dirname(destPath), { recursive: true, force: true });
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.writeFileSync(destPath, entrySSRRaw, "utf-8");
    },
    transform: (code) => {
      const regex = new RegExp(`${prefix}[^\\s"'\`]+`, "g");
      const matches = code.match(regex) ?? [];
      matches.forEach((code) => putRouteFile({ coreDir, entry }, code));
    },
  };
};

export const portablePlugin = ({
  coreDir,
  css,
}: Pick<Config, "coreDir" | "css">): PluginOption => {
  return {
    name: "react-portable-build",
    enforce: "pre",
    transform: (code: string, id: string) => {
      if (id === path.resolve(coreDir, "entry.ssr.jsx") && css) {
        return `${code}\nimport '${path.resolve(css)}'`;
      }

      if (
        !id.includes(coreDir) &&
        (id.endsWith(".tsx") || id.endsWith(".jsx"))
      ) {
        return `/** @jsxImportSource react */\n${code}`;
      }
    },
  };
};

export const qwikPlugins = ({
  coreDir,
}: Pick<Config, "coreDir">): PluginOption => {
  return [
    qwikCity({
      routesDir: path.resolve(coreDir, "routes"),
      trailingSlash: false,
    }),
    qwikVite({
      srcDir: coreDir,
      ssr: {
        input: path.resolve(coreDir, "entry.ssr.jsx"),
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
