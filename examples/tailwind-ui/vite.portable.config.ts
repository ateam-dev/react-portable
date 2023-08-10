import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { portablePlugin } from "@react-portable/core/vite";

export default defineConfig({
  plugins: [tsconfigPaths(), portablePlugin({ css: "./src/global.css" })],
});
