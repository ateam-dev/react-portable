import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { reactPortablePlugin } from "./vite";
import { ConfigEnv, Plugin, UserConfig } from "vite";
import { fs, vol } from "memfs";
import * as fsPro from "node:fs/promises";
import * as utils from "./utils";

vi.mock("node:fs/promises");
vi.mock("./utils");

vi.mock("app-root-path", () => ({
  path: "/working-dir",
}));

type ConfigFunction = (
  config: UserConfig,
  env?: ConfigEnv,
) => Promise<UserConfig>;

type TransformFunction = (code: string, id: string) => string;

type ResolveIdFunction = (source: string, importer?: string) => Promise<void>;

const sampleComponentFile = `
import { portable } from '@react-portable/core'
const Component = () => <div></div>
export const Sample = portable(Component, 'sample/foo-bar')`;

const routeFileDummy = `
import { PortableComponent } from "../portable";
import * as Entries from "__entryPath__";
const Entry = Object.values(Entries).find((module) => {
  if (typeof module === "function" && "__code" in module)
    return module.__code === "__code__";
}) as PortableComponent;
const QComponent__sanitized__ = qwikify$(Entry, qwikifyOption);`;

describe("reactPortablePlugin", () => {
  describe("react-portable-prepare", () => {
    const plugin = reactPortablePlugin({ prepare: true }) as Plugin;
    beforeEach(() => {
      vol.fromJSON({
        "/working-dir/node_modules/@react-portable/core/src/templates/root.tsx":
          "console.log('root.tsx')",
        "/working-dir/node_modules/@react-portable/core/src/templates/entry.ssr.tsx":
          "console.log('entry.ssr.tsx')",
        "/working-dir/node_modules/@react-portable/core/src/templates/worker.ts":
          "console.log('worker.ts')",
        "/working-dir/node_modules/@react-portable/core/src/templates/route.tsx":
          routeFileDummy,
        "/working-dir/src/components/sample.tsx": sampleComponentFile,
      });
      // @ts-ignore
      vi.spyOn(fsPro, "mkdir").mockImplementation(fs.promises.mkdir);
      // @ts-ignore
      vi.spyOn(fsPro, "readFile").mockImplementation(fs.promises.readFile);
      // @ts-ignore
      vi.spyOn(fsPro, "writeFile").mockImplementation(fs.promises.writeFile);

      vi.spyOn(utils, "currentDir").mockReturnValue(
        "/working-dir/node_modules/@react-portable/core/dist",
      );
    });
    afterEach(() => {
      vol.reset();
    });

    test("`name` and `enforce`", async () => {
      expect(plugin.name).toBe("react-portable-prepare");
      expect(plugin.enforce).toBe("pre");
    });

    test("when `config` will be called, some files will be placed", async () => {
      await (plugin.config as ConfigFunction)({});

      expect(vol.toJSON("/working-dir/node_modules/.portable")).toStrictEqual({
        "/working-dir/node_modules/.portable/entry.ssr.tsx":
          "console.log('entry.ssr.tsx')",
        "/working-dir/node_modules/.portable/root.tsx":
          "console.log('root.tsx')",
        "/working-dir/node_modules/.portable/worker.ts":
          "console.log('worker.ts')",
      });
    });

    test("Install the route file if `portable` is called in the file", async () => {
      await (plugin.resolveId as ResolveIdFunction)(
        "@react-portable/core",
        "/working-dir/src/components/sample.tsx",
      );

      expect(
        vol.toJSON(
          "/working-dir/node_modules/.portable/routes/sample/foo-bar/index.tsx",
        ),
      ).toStrictEqual({
        "/working-dir/node_modules/.portable/routes/sample/foo-bar/index.tsx": `
import { PortableComponent } from "@react-portable/core";
import * as Entries from "/working-dir/src/components/sample.tsx";
const Entry = Object.values(Entries).find((module) => {
  if (typeof module === "function" && "__code" in module)
    return module.__code === "sample/foo-bar";
}) as PortableComponent;
const QComponentsample_foo_bar = qwikify$(Entry, qwikifyOption);`,
      });
    });
  });

  describe("react-portable-build", () => {
    const [plugin] = reactPortablePlugin() as [Plugin];

    test("`name` and `enforce`", () => {
      expect(plugin.name).toBe("react-portable-build");
      expect(plugin.enforce).toBe("pre");
    });

    test("the config for Qwik city is added when it is built by ssr mode", () => {
      // not ssr build
      expect(
        (plugin.config as ConfigFunction)(
          {},
          { command: "build", mode: "", ssrBuild: false },
        ),
      ).toStrictEqual({});

      // ssr build
      expect(
        (plugin.config as ConfigFunction)(
          {},
          { command: "build", mode: "", ssrBuild: true },
        ),
      ).toStrictEqual({
        build: {
          rollupOptions: {
            input: [
              "/working-dir/node_modules/.portable/worker.ts",
              "@qwik-city-plan",
            ],
          },
        },
      });
    });

    test("the `@jsxImportSource` hint comment is inserted by `transform` on tsx and jsx file", () => {
      expect(
        (plugin.transform as TransformFunction)("base", "foo.ts"),
      ).toBeUndefined();

      expect((plugin.transform as TransformFunction)("base", "foo.tsx")).toBe(
        `/** @jsxImportSource react */\nbase`,
      );
      expect((plugin.transform as TransformFunction)("base", "foo.jsx")).toBe(
        `/** @jsxImportSource react */\nbase`,
      );
    });
  });
});
