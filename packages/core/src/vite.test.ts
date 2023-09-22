// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { preparePlugin, portablePlugin } from "./vite";
import { fs, vol } from "memfs";
import * as fsOrg from "node:fs";

vi.mock("node:fs");
beforeEach(() => {
  // @ts-ignore
  vi.spyOn(fsOrg, "mkdirSync").mockImplementation(fs.mkdirSync);
  // @ts-ignore
  vi.spyOn(fsOrg, "writeFileSync").mockImplementation(fs.writeFileSync);
  // @ts-ignore
  vi.spyOn(fsOrg, "rmSync").mockImplementation(fs.rmSync);
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
    vol.fromJSON({
      "/app/src/components/sample.tsx": `import { previewify } from '@react-portable/core';const Component = () => <></>;export const Sample = previewify(Component, 'sample')`,
    });
  });
  afterEach(() => {
    vol.reset();
  });
  const plugin = preparePlugin({
    coreDir: "/app/.portable",
    entry: "/app/src/index.ts",
    prefix: "pfy-",
  }) as Plugin;

  test("`name` and `enforce`", async () => {
    expect(plugin.name).toBe("react-portable-prepare");
    expect(plugin.enforce).toBe("pre");
  });

  test("when `config` will be called, `entry.ssr.jsx` will be placed", () => {
    plugin.config({});

    expect(vol.toJSON("/app/.portable")).toMatchSnapshot();
  });

  test("Install the route file if `previewify` is called in the file", () => {
    plugin.transform(
      `import { previewify } from '@react-portable/core';const Component = () => <></>;export const Sample = previewify(Component, 'pfy-sample')`,
      "/app/src/components/sample.tsx",
    );

    expect(vol.toJSON("/app/.portable/routes")).toMatchSnapshot();
  });
});

describe("portablePlugin", () => {
  const plugin = portablePlugin({
    css: "./src/style.css",
    coreDir: "/app/.portable",
  }) as Plugin;

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
    expect(plugin.transform("base", "/app/.portable/entry.ssr.jsx")).toMatch(
      /^base\nimport '\/.*\/src\/style\.css'$/,
    );
  });
});
