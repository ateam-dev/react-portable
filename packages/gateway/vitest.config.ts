import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    setupFiles: "./setup.vitest.ts",
    environment: "miniflare",
    environmentOptions: {
      modules: true,
      bindings: {
        ORIGIN: "https://origin.com",
        FRAGMENTS_ENDPOINT: "https://fragments.com",
      },
    },
  },
});
