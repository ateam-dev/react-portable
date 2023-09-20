![Previewify](/ogp.png)

## 🦄 What is Previewify?

Previewify is a revolutionary tool aimed at streamlining the component library development process. If you've ever found yourself stuck in the time-consuming cycle of developing a component, testing it in Storybook, publishing it, installing it in an application, and then discovering it doesn't work as expected—Previewify is for you.

This tool allows you to preview locally developed components directly in a live, deployed application, essentially cutting out the middle steps of publishing and reinstalling. No more worrying about style breaks or unexpected behaviors after deployment; see your changes in the actual environment where they will be used. Previewify aims to accelerate your development cycle and bridge the gap between component development and its real-world implementation.

### 🌟 Features

- **🖼 Non-Intrusive Previews**: Preview your components on a deployed page without affecting the behavior of the service or the user experience.
- **🌐 Tunneling Support**: Provides globally accessible URLs via tunneling, making it easier to preview components on various devices, including mobile.
- **🔋 Hot-Reload**: Automatically reflects any changes you make to your local components in real-time during the preview.

## 🧠 Under the Hood

<video autoplay muted loop playsinline src="/previewify.mp4" poster="/previewify-under-the-hood.png"></video>

When you start Previewify, two servers get spun up: a component delivery server and a gateway proxy. Here's a simple step-by-step explanation of how it works:

1. **Initialize Servers**: Running Previewify initializes two servers: a component delivery server for serving your local components and a gateway proxy for intercepting requests to the deployed application.
2. **Access Through Gateway**: You open the deployed application through the gateway URL. At this stage, a script is injected via the proxy server, activating the preview mode on the application.
3. **Enter Preview Mode**: Once preview mode is activated, the application starts requesting the components from the component delivery server.
4. **Component Replacement**: The components in the live application are dynamically replaced with the ones from your local component delivery server, allowing you to preview how your local changes would appear in the deployed application.

By understanding this mechanism, you can effectively utilize Previewify to speed up your development process.

## 🍭 How to Use

### 📋 Prerequisites

- React v18 or higher
- Written in Typescript
- Built with Vite

### ⬇️ Installation

Install the necessary packages using npm or Yarn as follows:

```bash
# for npm
npm install -D @react-portable/core

# for yarn
yarn add -D @react-portable/core
```

### 🎁 Importing and Wrapping Components

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

export const MyComponent = previewify(Component, "pfy-unique-code");
```
:::

In this example, the `previewify` function wraps `MyComponent`, and you provide a unique identifier code prefixed with `pfy-` as the second argument. Make sure the identifier is unique across your project to avoid conflicts.

::: info
Don't forget to prefix your code (`pfy-`); Previewify will search for strings with this prefix at build time.
If you want to change the prefix, see [Custom Configuration](#🛠%EF%B8%8F-custom-configuration).
:::

### 🚀 Deploying to Live Application

After you've wrapped your component with previewify, the next step is to import this wrapped component into your live application. Make sure to deploy these changes to your production or staging environment. This is essential for Previewify to be able to preview this component in an environment that closely mimics your live application.

### 🛠️ Custom Configuration

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
      prefix: 'custom-prefix-'
    }),
  ],
});
```
:::

#### 🎚️ Parameters for `previewifyPlugin`

- `entry` (Optional): Specify the entry file for your project if it is not located at `./src/index.(ts|js|tsx|jsx)`.
- `css` (Optional): If you have a global CSS file (such as one for Tailwind CSS), specify its path here.
- `prefix` (Optional): The prefix of the code to pass as the second argument to the `prewiewify` function. Default is `pfy-`.


### 🏎️ Starting Preview

Once the wrapped component is deployed in your live environment, you can now use Previewify's command-line utility to preview it:

```bash
npx prevewify 'https://your.page.com'
```

Upon successful execution, you should see output similar to this:

```bash
$ npx prevewify 'https://your.page.com'
vite v4.4.9 building for production...
✓ 7 modules transformed.
...
✓ built in 206ms
[mf:inf] Ready on http://127.0.0.1:8787/
  🌈 Previewing at http://127.0.0.1:8787
```

Open the displayed URL in your web browser; in this example, it would be http://127.0.0.1:8787.

You should see a toggle button at the bottom of the page as shown in the image below:  

![preview footer](/previewify-bar-inactive.png)

Clicking this toggle button to activate it will initiate a preview, allowing you to see the component in the context of your live application.

![preview footer](/previewify-bar-active.png)

#### 🛠️ Command Line Options

`npx previewify [options] <origin>`

- `origin`: Specify the origin (protocol + domain) of the page you want to preview. This should be the base URL (e.g., `https://example.com`) where you want to see your component previews.
- `-p`, `--port <port>`: Specifies the port for the gateway server.
- `-t`, `--tunnel`: Use Cloudflared tunnel to make the local server globally accessible. Default is `false`.
- `--cloudflared-config <path>`: Specify a Cloudflared configuration file in YAML format to use a fixed domain for the tunnel. This option is meant to be used in conjunction with the `-t` option. It's optional; if not specified, Cloudflared will automatically assign a domain for you. (See: [Fixing the domain for the tunnel](#🔮-fixing-the-domain-for-the-tunnel))

Usage

```bash
npx previewify 'https://your.page.com' --tunnel
```

## 🎓 TIPs for Effective Use
### 🎨 Using Tailwind with Both Component Library and Application
If you're using Tailwind CSS with Previewify, you can customize your styles specifically for the preview environment.

1. **Create a separate CSS file for Preview:**

You don't need reset styles (`@tailwind base;`) for Previewify. This is because the production application you are previewing against already includes these reset styles.

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
:::

2. **Configure a specific Tailwind config for Previewify:**

Create a new file, `tailwind.previewify.config.js`, and set the `important` option to scope styles only to the preview environment. This ensures that the styles for your components do not overwrite those in your production application during preview.

::: code-group
```js [tailwind.previewify.config.js]
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

3. **Update your Previewify config:**

Make sure that Previewify references this new Tailwind configuration.

::: code-group
```ts [./previewify.config.ts]
import { defineConfig } from "vite";
import { previewifyPlugin } from "@react-portable/core/vite";

export default defineConfig({
  plugins: [previewifyPlugin({ css: "./src/previewify.css" })],
  css: {
    postcss: {
      plugins: [
        require("tailwindcss")({
          config: "./tailwind.previewify.config.js",
        }),
      ],
    },
  },
});
```
:::

By following these steps, you ensure that your Tailwind CSS styles are scoped specifically to Previewify, without affecting your regular builds.

### 🎛️ Overriding Props for Preview Purposes

Sometimes, the props type of the component you are currently modifying locally may differ from the deployed component in production, making the preview unworkable. The `previewify` function accepts a third argument, `options`, that you can use to override props for such cases.

```tsx
export const MyComponent = previewify(Component, "unique-code", { 
  props: { /* your overridden props here */ }
});
```

::: info
Overriding props in this manner is intended solely for previewing purposes. You don't need to specify this during the actual deployment to production.
:::

### 🌐 When The Response from the Origin has a Content-Type of `br`

If the response from the origin server has a `Content-Type: br` header, you must enable tunneling mode for the preview to work properly.

To enable tunneling mode, use the `--tunnel` flag when running the preview command:

```bash
npx previewify 'https://your.page.com' --tunnel
```

By using tunneling mode, Previewify will be able to handle br (Brotli) compressed content correctly, ensuring that your previews display as expected.

### 🔮 Fixing the Domain for the Tunnel

Prerequisites: Make sure you are using Cloudflare's authoritative DNS servers and have registered your own domain with Cloudflare.

#### Steps
1. **Login to Cloudflared:**
```bash
npx cloudflared tunnel login
```
After executing this command, your browser will open for you to log into your Cloudflare account. Select the domain you have registered. A certificate will be downloaded to your machine, usually to `~/.cloudflared/cert.pem`.

2. **Create a Tunnel and Add CNAME Record:**
```bash
npx cloudflared tunnel create <tunnel-name>
npx cloudflared tunnel route dns <tunnel-name> <hostname>
```
This will generate a credentials file for the tunnel, and add the CNAME record. Go to the DNS page on Cloudflare's dashboard to confirm that the corresponding CNAME has been created.

3. **Configure Cloudflared:**  

Place a configuration file at `~/.cloudflared/config.yaml` with the following settings:
```yaml
tunnel: <tunnel-name>
credentials-file: /path/to/.cloudflared/<Tunnel-UUID>.json
```

::: info
If you encounter any difficulties or have questions while following these steps, you can refer to the [Via the command line · Cloudflare Zero Trust docs](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/install-and-setup/tunnel-guide/local/).
:::

When you want to start Previewify, use the following command:
```bash
npx previewify <your origin page> -t --cloudflared-config ~/.cloudflared/config.yaml
```
By following these steps, you'll be able to set a fixed domain for your tunnel, making your development workflow more predictable.
