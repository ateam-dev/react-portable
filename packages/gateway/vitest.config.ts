import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "miniflare",
    environmentOptions: {
      // bindings: { KEY: "value" },
      kvNamespaces: ["TEST_KV"],
    },
  },
});
