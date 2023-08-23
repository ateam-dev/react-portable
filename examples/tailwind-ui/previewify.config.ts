import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { previewifyPlugin } from "@react-portable/core/vite";

export default defineConfig({
  plugins: [tsconfigPaths(), previewifyPlugin({ css: "./src/global.css" })],
});
