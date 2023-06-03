import "../src/global.css";

/** @type { import('@storybook/react').Preview } */
const preview = {
  parameters: {
    actions: { argTypesRegex: "^on[A-Z].*" },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
    reactPortable: {
      gateway: "http://127.0.0.1:8787",
      code: "tailwind-ui",
    },
  },
};

export default preview;
