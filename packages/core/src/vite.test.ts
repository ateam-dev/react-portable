// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  preparePlugin,
  portablePlugin,
  previewifyPlugin,
  resetConfig,
} from "./vite";
import { fs, vol } from "memfs";
import * as fsPro from "node:fs/promises";

vi.mock("node:fs/promises");
beforeEach(() => {
  // @ts-ignore
  vi.spyOn(fsPro, "mkdir").mockImplementation(fs.promises.mkdir);
  // @ts-ignore
  vi.spyOn(fsPro, "readFile").mockImplementation(fs.promises.readFile);
  // @ts-ignore
  vi.spyOn(fsPro, "writeFile").mockImplementation(fs.promises.writeFile);
});

type Plugin = {
  name: string;
  enforce: string;
  config: (opt: any) => void;
  transform: (code: string, id: string) => string;
  resolveId: (source: string, importer?: string) => Promise<void>;
};

describe("preparePlugin", () => {
  beforeEach(() => {
    previewifyPlugin({ coreDir: "/app/.portable" });
    vol.fromJSON({
      "/app/src/components/sample.tsx": `import { previewify } from '@react-portable/core';const Component = () => <></>;export const Sample = previewify(Component, 'sample')`,
    });
  });
  afterEach(() => {
    resetConfig();
    vol.reset();
  });
  const plugin = preparePlugin() as Plugin;

  test("`name` and `enforce`", async () => {
    expect(plugin.name).toBe("react-portable-prepare");
    expect(plugin.enforce).toBe("pre");
  });

  test("when `config` will be called, `entry.ssr.jsx` will be placed", async () => {
    await plugin.config({});

    expect(vol.toJSON("/app/.portable")).toMatchSnapshot();
  });

  test("Install the route file if `previewify` is called in the file", async () => {
    await plugin.resolveId(
      "@react-portable/core",
      "/app/src/components/sample.tsx",
    );

    expect(vol.toJSON("/app/.portable/routes")).toMatchSnapshot();
  });
});

describe("portablePlugin", () => {
  afterEach(() => {
    resetConfig();
  });
  const plugin = portablePlugin() as Plugin;

  test("`name` and `enforce`", () => {
    expect(plugin.name).toBe("react-portable-build");
    expect(plugin.enforce).toBe("pre");
  });

  test("the `@jsxImportSource` hint comment is inserted by `transform` on tsx and jsx file", () => {
    expect(plugin.transform("base", "foo.ts")).toBeUndefined();

    expect(plugin.transform("base", "foo.tsx")).toBe(
      `/** @jsxImportSource react */\nbase`,
    );
    expect(plugin.transform("base", "foo.jsx")).toBe(
      `/** @jsxImportSource react */\nbase`,
    );
  });

  test("css path inserted by `transform` on entry.ssr.jsx", () => {
    previewifyPlugin({
      css: "./src/style.css",
      coreDir: "/app/.portable",
    });
    expect(plugin.transform("base", "/app/.portable/entry.ssr.jsx")).toMatch(
      /^base\nimport '\/.*\/src\/style\.css'$/,
    );
  });
});
