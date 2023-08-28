import { defineConfig } from "vitepress";

// https://vitepress.dev/reference/site-config
export default defineConfig({
  base: "/react-portable/",
  title: "Previewify - React Portable",
  head: [
    ["meta", { property: "og:image", content: "/react-portable/ogp.png" }],
    [
      "link",
      {
        rel: "icon",
        type: "image/png",
        href: "https://cdn.jsdelivr.net/gh/twitter/twemoji/assets/72x72/267b.png",
      },
    ],
  ],
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    siteTitle: "♻️ Previewify",
    socialLinks: [
      { icon: "github", link: "https://github.com/ateam-dev/react-portable" },
    ],
  },
});
