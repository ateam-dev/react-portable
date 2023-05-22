import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "miniflare",
    environmentOptions: {
      modules: true,
      bindings: {
        ORIGIN: "https://origin.com",
        ALLOW_ORIGINS: "*",
        FRAGMENT_CONFIGS: JSON.stringify({
          f1: { origin: "https://f1.com", assetPath: "" },
          f2: {
            origin: "https://f2.com",
            assetPath: "https://assets.f2.com/statics",
          },
        }),
      },
      kvNamespaces: ["TEST_KV", "FRAGMENTS_LIST", "CACHE"],
    },
  },
});
