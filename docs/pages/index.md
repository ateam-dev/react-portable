## 📚 Introduction

<video autoplay muted loop inline src="/previewify.mp4"></video>

### 🤔 What is Previewify?

Previewify is a tool specifically designed to ease the development process of component libraries by allowing developers to preview how the components would look and behave in a deployed application. It aims to bridge the gap between component development and its actual implementation.

### 🌟 Features

- **🖼 Non-Intrusive Previews**: Preview your components on a deployed page without affecting the behavior of the service or the user experience.
- **🌐 Tunneling Support**: Provides globally accessible URLs via tunneling, making it easier to preview components on various devices, including mobile.
- **🔋 Hot-Reload**: Automatically reflects any changes you make to your local components in real-time during the preview.


## 📋 Prerequisites

- React v18 or higher
- Written in Typescript
- Built with Vite

## 🛠️ How to Use

### ⬇️ Installation

Install the necessary packages using npm or Yarn as follows:

```bash
# for npm
npm install -D @react-portable/core @builder.io/qwik@1.2.8 @builder.io/qwik-city@1.2.8 @builder.io/qwik-react@0.5.0

# for yarn
yarn add -D @react-portable/core @builder.io/qwik@1.2.8 @builder.io/qwik-city@1.2.8 @builder.io/qwik-react@0.5.0
```

The `@react-portable/core` package contains Previewify, and `qwik` packages are necessary for its functionality.

### 📝 Usage Steps

#### 🎁 Importing and Wrapping Components

To start, you'll first need to import and wrap your component using Previewify's `previewify` function.

Here is a simplified example:

::: code-group
```tsx [./src/components/MyComponent.tsx]
import { FC } from "react";
import { previewify } from "@react-portable/core";

type Props = {
  // Your component props
};

const Component: FC<Props> = (props) => {
  // Your component code
};

export const MyComponent = previewify(Component, "unique-code");
```
:::

In this example, the `previewify` function wraps `MyComponent`, and you provide a unique identifier code as the second argument. Make sure the identifier is unique across your project to avoid conflicts.

#### 🚀 Deploying to Live Application

After you've wrapped your component with previewify, the next step is to import this wrapped component into your live application. Make sure to deploy these changes to your production or staging environment. This is essential for Previewify to be able to preview this component in an environment that closely mimics your live application.

#### 🛠️ Custom Configuration

You can customize Previewify's settings by placing a configuration file in your project root. Create `previewify.config.ts` at the root of your project.

To configure Previewify, you'll use the `previewifyPlugin` for Vite.

Here's a sample configuration:

::: code-group
```ts [previewify.config.ts]
import { defineConfig } from "vite";
import { previewifyPlugin } from "@react-portable/core/vite";

export default defineConfig({
  plugins: [
    // Insert any required Vite plugins for your build process (e.g., tsconfigPaths)
    previewifyPlugin({ 
      entry: "./src/entry.ts",
      css: "./src/global.css",
    }),
  ],
});
```
:::

##### 🎚️ Parameters for `previewifyPlugin`

- `entry` (Optional): Specify the entry file for your project if it is not located at `./src/index.(ts|js|tsx|jsx)`.
- `css` (Optional): If you have a global CSS file (such as one for Tailwind CSS), specify its path here.


#### 🌈 Starting Preview

Once the wrapped component is deployed in your live environment, you can now use Previewify's command-line utility to preview it:

```bash
npx portable prevewify 'https://your.page.com'
```

Upon successful execution, you should see output similar to this:


```bash
...
✓ built in 561ms
[mf:inf] Ready on http://127.0.0.1:55349/
📁 Serving static files from .portable/client
🚀 Loading server entry .portable/server/worker.mjs
[mf:inf] Ready on http://127.0.0.1:8787/
🟢 Previewing at http://127.0.0.1:8787 (proxy ~> https://your.page.com)
```

::: info
If your project's entry file is not located at `./src/index.(ts|js|tsx|jsx)`, starting the preview server as mentioned above will not work as expected. Please refer to the [Custom Configuration](#custom-configuration) section.
:::

Open the displayed URL in your web browser; in this example, it would be http://127.0.0.1:8787.

You should see a preview button and status at the bottom of the page, similar to the image below:

![preview footer](/preview-button.png)

Clicking this button will initiate the preview, allowing you to see the component in the context of your live application.


##### 🛠️ Command Line Options

`npx portable previewify [options] <origin>`

- `origin`: Specify the path to the source directory if you want to watch changes and automatically restart the server. Enabling this option allows hot-reloading of components during preview.
- `-p`, `--port <port>`: Specifies the port for the gateway server.
- `-w`, `--watch <path>`: If you want to watch for file changes in a specific directory, provide the `<path>` here to automatically restart the server.
- `-t`, `--tunnel`: Use Cloudflared tunnel to make the local server globally accessible. Default is `false`.

Usage

```bash
npx portable previewify 'https://your.page.com' --watch ./src --tunnel
```

## 🎓 TIPs for Effective Use
### 🎨 Using Tailwind with Both Component Library and Application
During previews, you don't need reset CSS. Prepare a separate CSS file that omits `@tailwind base;` specifically for Previewify and set its path in your `previewify.config.ts`.

Here is an example:

::: code-group
```css [./src/previewify.css]
/**
 * Tailwind CSS imports
 * View the full documentation at https://tailwindcss.com
 */
/*@tailwind base;*/
@tailwind components;
@tailwind utilities;
```
```ts [./previewify.config.ts]
import { defineConfig } from "vite";
import { previewifyPlugin } from "@react-portable/core/vite";

export default defineConfig({
  plugins: [previewifyPlugin({ css: "./src/previewify.css" })],
});
```
:::

To avoid style conflicts due to CSS overrides, you can set the `important` option in your `tailwind.config.js`.

::: code-group
```js [tailwind.config.js]
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  important: "rp-preview",  // set this to scope styles
  theme: {
    extend: {},
  },
};
```
:::

Setting `important` to `"rp-preview"` ensures that Tailwind styles are scoped to this specific area, avoiding global overrides that might interfere with your existing styles.

### 🌐 When The Response from the Origin has a Content-Type of `br`

If the response from the origin server has a `Content-Type: br` header, you must enable tunneling mode for the preview to work properly.

To enable tunneling mode, use the `--tunnel` flag when running the preview command:

```bash
npx portable previewify 'https://your.page.com' --tunnel
```

By using tunneling mode, Previewify will be able to handle br (Brotli) compressed content correctly, ensuring that your previews display as expected.

## 🔮 Future Features
We have several features planned for future releases:

- Fixed domain during tunneling
