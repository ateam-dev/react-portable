import { defineConfig } from "vitest/config";

export default defineConfig({
  build: {
    lib: {
      entry: "src/browser.ts",
      formats: ["umd"],
      name: "ReactPortable",
      fileName: "browser",
    },
    emptyOutDir: false,
  },
  test: {
    environment: "jsdom",
    environmentOptions: {
      jsdom: {
        url: "https://basepage.com/",
      },
    },
  },
});
