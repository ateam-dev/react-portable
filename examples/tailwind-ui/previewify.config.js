import tsconfigPaths from "vite-tsconfig-paths";

/** @type {import('@react/portable').PreviewifyConfig} */
export default {
  entry: "./src",
  css: "./src/global.css",
  viteConfig: {
    plugins: [tsconfigPaths()],
  },
};
