import { defineConfig } from "vitepress";

// https://vitepress.dev/reference/site-config
export default defineConfig({
  base: "/react-portable/",
  title: "♻️ Previewify - React Portable",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    siteTitle: "♻️ Previewify",
    socialLinks: [
      { icon: "github", link: "https://github.com/ateam-dev/react-portable" },
    ],
  },
});
