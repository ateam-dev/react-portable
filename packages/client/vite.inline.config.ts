import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, `src/inline-script.ts`),
      formats: ["es"],
      fileName: "react-portable-inline-script",
    },
  },
});
