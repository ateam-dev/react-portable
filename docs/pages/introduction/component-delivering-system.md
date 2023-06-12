---
outline: deep
---

# Component Delivering System

First you need to be able to host and deliver your components.

![component delivering system](/component-delivering-system.png)

## Installation

Install React Portable in a project where you are creating and managing your components as a design system.

::: code-group
```bash [npm]
npm install @react-portable/core @builder.io/qwik-react
npm install -D wrangler
```

```bash [yarn]
yarn add @react-portable/core @builder.io/qwik-react
yarn add -D wrangler
```
:::

### Initialize

```bash
npx react-portable init
```

Several files, including configuration files, will be located.

![npx react-portable init](/npx-react-portable-init.png)

::: tip
By default, React Portable stores its dev server output, and the production build output in `.rp`. If using Git, you should add them to your `.gitignore` file. These locations can also be [configured](/customizations/react-portable-core-configurations).
:::

## Deliver Your Components

It's very easy to deliver your components, since you you've installed React Portable.

Your components are automatically server-side-rendered (SSR) during delivery. Also, you can perform Incremental Static Regeneration (ISR) on components with data loaded from an API server. In addition, you can control the timing of hydration on the client.

### Prepare Entry Point File

First, prepare the entry point files. React Portal treats files with extensions `.rp.ts(x)` or `.rp.js(x)` as the entry points for delivering components. 
Then, name of the file becomes part of the delivery URL. For example, if you prepare `foo.rp.ts`, you can access the component using `/foo` 

```
├─ src
│  └─ components
│     ├─ Component1
│     │   ├─ Component1.tsx
│     │   ├─ Component1.stories.tsx
│     │   ├─ Component1.test.tsx
│     │   └─ component1.rp.ts => delivered by https://your.host/component1
│     └─ Component2
│         ├─ Component2.tsx
│         ├─ Component2.stories.tsx
│         ├─ Component2.test.tsx
│         └─ component2.rp.ts => delivered by https://your.host/component2
```

::: tip
You can place everywhere the entry point files within the src directory. `src/` can also be [configured](/customizations/react-portable-core-configurations).
:::

Export the component you want to deliver as default export in the entry file.

```ts
import { Component } from './your-comopnent'

export default Component
```

#### Loader

When data fetching is required during Server Side Rendering (SSR) for a component, export the `loader` function as a named export. This function is invoked before SSR and passes returned values to the component as props.

```ts
import { Loader } from '@react-portable/core'
import { Component, ComponentProps } from './your-comopnent'

export default Component

export const loader: Loader<ComponentProps> = async (request: Request) => {
  // ...data fetch from an API server
  return { ... } // ComponentProps
}
```

#### Strategy

You can apply various configurations by exporting the `strategy` object as a named export.

::: tip
When you do not specify `strategy`, it is same as the following value.
```ts
export const strategy = {
  revalidate: 0,
  hydrate: 'disable'
}
```
:::

##### Revalidate

React Potable provides a feature equivalent to Incremental Static Regeneration (ISR) of Next.js.

Specify `revalidate`.
- `0`: (default) No caching; components will be regenerated for each request.
- `number` (>0): Components will be cached for the specified number of seconds. Once this time elapses, the cache will be regenerated, but the existing cache will continue to be used during this regeneration.
- `false`: The cache will be used indefinitely. It will not be regenerated.

::: tip
If you redeploy the component delivering system, the cache becomes stale regardless of the specified value. Regeneration will occur at the time of the next request.
:::

```ts
import { loader, Strategy } from '@react-portable/core'
import { Component, ComponentProps } from './your-comopnent'

export default Component

export const loader: Loader<ComponentProps> = async (request: Request) => {
  // ...data fetch from an API server
  return { ... } // ComponentProps
}

export const strategy: Strategy = {
  // The cache is used for 60 seconds.
  // After 60 seconds, the cache will be regenerated, but it will still be used until the regeneration process is completed.
  revalidate: 60
}
```

##### Timing of Hydration

By controlling the timing of component hydration on the client with the `hydrate` option, you can avoid loading unnecessary scripts.

- `disable`: (default) No hydration is required for static components.
- `onIdle`: Hydration will occur after the browser becomes idle.
- `onUse`: Hydration will occur when thr component is hovered over or focused on.

```ts
import { Strategy } from '@react-portable/core'
import { SomeInteractiveComponent } from './your-comopnent'

export default SomeInteractiveComponent

export const strategy: Strategy = {
  hydarate: 'onUse'
}
```

#### Styling

##### Compliance with Vite's Default CSS
Since React Portable uses Vite for building, it supports the styling methods officially adopted by Vite. This includes importing CSS files, using CSS Modules, etc.

[CSS - Vite](https://vitejs.dev/guide/features.html#css)

##### Tailwind
React Portable also supports Tailwind. Follow the official [documentation for setup](https://tailwindcss.com/docs/guides/vite).

You can apply styles by importing into your entry point file.

```ts {1} 
import './index.css'
import { Component } from './your-comopnent'

export default Component
```

### Build & Launch Server

#### Build

```bash
npx react-portable build
```

#### Watch mode

```bash
npx react-portable watch
```

#### Start Server

```bash
npx wrangler dev
```

[dev command - Cloudflare Workers](https://developers.cloudflare.com/workers/wrangler/commands/#dev)

:::tip
By configuring the following scripts in the `package.json`, you can restart the server whenever the components are changed. (You need to install `npm-run-all`.)

```json [package.json]
"scripts": {
  "preview:build": "react-portable watch --preBuilt",
  "preview:worker": "wrangler dev --port 3001",
  "preview": "yarn build && run-p preview:*",
}
```
:::

## Deployment

```bash
npx wrangler deploy
```

Refer to the [documentation for Cloudflare Workers](https://developers.cloudflare.com/workers/wrangler/commands/#deploy) as needed.