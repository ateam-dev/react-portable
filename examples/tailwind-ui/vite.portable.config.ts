import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { reactPortablePlugin } from "@react-portable/core/vite";

export default defineConfig({
  plugins: [tsconfigPaths(), reactPortablePlugin()],
});
