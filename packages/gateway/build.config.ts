import { defineBuildConfig } from "unbuild";
import * as fs from "node:fs";
import * as path from "node:path";

export default defineBuildConfig({
  hooks: {
    "rollup:options"(ctx, options) {
      if (Array.isArray(options.plugins)) {
        options.plugins.unshift({
          name: "raw-loader",
          resolveId(source, importer) {
            if (source.endsWith("?raw")) {
              return source.startsWith(".")
                ? path.resolve(path.dirname(importer), source)
                : source;
            }
            return null;
          },
          load(id) {
            if (id.endsWith("?raw")) {
              const content = fs.readFileSync(
                require.resolve(id.replace(/\?raw$/, "")),
                "utf-8",
              );
              return `export default ${JSON.stringify(content)};`;
            }
            return null;
          },
        });
      }
    },
  },
  rollup: {
    inlineDependencies: true,
  },
  clean: false,
});
