import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: "src/browser.ts",
      formats: ["umd"],
      name: "ReactPortable",
      fileName: "browser",
    },
  },
});
