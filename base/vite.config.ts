import { defineConfig } from "vite";
import { qwikVite } from "@builder.io/qwik/optimizer";
import { qwikCity } from "@builder.io/qwik-city/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { qwikReact } from "@builder.io/qwik-react/vite";
import { resolve } from "node:path";

export default defineConfig(() => {
  return {
    plugins: [
      {
        enforce: "pre",
        name: "react-portal-vite",
        resolveId(id) {
          if (id === "react-portal:virtual") {
            let reactPortalValue: string | null = null;
            const reactPortalIndex = process.argv.findIndex((arg) =>
              arg.startsWith("--react-portal")
            );

            if (reactPortalIndex !== -1) {
              const reactPortalArg = process.argv[reactPortalIndex];

              // Handle --react-portal=<string>
              if (reactPortalArg.includes("=")) {
                reactPortalValue = reactPortalArg.split("=")[1];
              }
              // Handle --react-portal <string>
              else if (process.argv[reactPortalIndex + 1]) {
                reactPortalValue = process.argv[reactPortalIndex + 1];
              }
            }

            if (!reactPortalValue)
              throw new Error(
                "The --react-portal option is required, but it was not provided. Please specify the option in the format '--react-portal=<string>'."
              );

            return resolve(process.cwd(), reactPortalValue);
          }
        },
        transform(code, id) {
          if (
            !id.endsWith("routes/index.tsx") &&
            !id.endsWith("src/root.tsx") &&
            !id.endsWith("src/entry.ssr.tsx") &&
            id.endsWith(".tsx")
          ) {
            return `/** @jsxImportSource react */\n${code}`;
          }
        },
      },
      qwikCity(),
      qwikVite(),
      tsconfigPaths(),
      qwikReact(),
    ],
    preview: {
      headers: {
        "Cache-Control": "public, max-age=600",
      },
    },
  };
});
