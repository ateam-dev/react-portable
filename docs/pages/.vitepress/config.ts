import { defineConfig } from "vitepress";

// https://vitepress.dev/reference/site-config
export default defineConfig({
  base: "/react-portable/",
  title: "React Portable",
  description:
    "A lightweight, script-free library enabling React components to run seamlessly on any webpage, including those without frontend frameworks.",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    siteTitle: "🎒React Portable",
    nav: [
      { text: "Home", link: "/" },
      { text: "Guide", link: "/introduction/what-is-react-portable" },
    ],

    sidebar: [
      {
        text: "Introduction",
        items: [
          {
            text: "What is React Portable",
            link: "/introduction/what-is-react-portable",
          },
          {
            text: "Component Delivering System",
            link: "/introduction/component-delivering-system",
          },
          {
            text: "Gateway",
            link: "/introduction/gateway",
          },
          {
            text: "Pages",
            link: "/introduction/pages",
          },
        ],
      },
      {
        text: "Integrations",
        items: [
          {
            text: "Storybook",
            link: "/integrations/storybook",
          },
        ],
      },
      {
        text: "Customizations",
        items: [
          {
            text: "react-portable.config.js",
            link: "/customizations/react-portable-core-configurations",
          },
        ],
      },
    ],

    socialLinks: [
      { icon: "github", link: "https://github.com/ateam-dev/react-portable" },
    ],
  },
});
