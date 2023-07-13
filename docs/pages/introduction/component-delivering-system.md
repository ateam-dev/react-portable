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
npm install @react-portable/core
npm install -D wrangler
```

```bash [yarn]
yarn add @react-portable/core
yarn add -D wrangler
```
:::

### Initialize

Add `wrangler.toml` in your project.
```toml
name = "react-portable"
main = ".portable/server/worker.mjs"
compatibility_date = "2023-05-10"

[build]
command = "npx portable build --continuous"
watch_dir = "src" # Change it to fit the structure of your project

[site]
bucket = ".portable/client"
```

Add `scripts` in your `package.json`

```json
"scripts": {
  "portable:build": "portable build",
  "portable:dev": "wrangler dev --live-reload",
  "portable:preview": "wrangler dev",
}
```

Update your `vite.config.ts`; add the plugin `reactPortablePlugin`

```ts
import { defineConfig } from "vite";
import { reactPortablePlugin } from "@react-portable/core/vite";

export default defineConfig({
  plugins: [
    reactPortablePlugin({ prepare: true }),
    // your vite plugins
  ],
  // your vite configure
});
```

Add `vite.portable.config.ts` in your project

```ts
import { defineConfig } from "vite";
import { reactPortablePlugin } from "@react-portable/core/vite";

export default defineConfig({
  // If you need any plugins (e.g. vite-tsconfig-paths) to build the components, add them
  plugins: [reactPortablePlugin()],
});
```

## Deliver Your Components

It's very easy to deliver your components, since you you've installed React Portable.

Your components are automatically server-side-rendered (SSR) during delivery. Also, you can perform Incremental Static Regeneration (ISR) on components with data loaded from an API server. In addition, you can control the timing of hydration on the client.

### Wrap your components by `portable`

Let's take the following React component as an example:

```tsx
export const Example = () => {
  return (
    <div>
      {/* content omitted for brevity */}
    </div>
  )
}
```

To use the portable function, we first need to import it from the '@react-portable/core' library, and then wrap our component with it as follows:

```tsx
import { portable } from '@react-portable/core'

const Component = () => {
  return (
    <div>
      {/* content omitted for brevity */}
    </div>
  )
}

export const Example = portable(Component, 'example')
```

In this example, the portable function is being used to wrap the `Component`. The first argument to portable is the component you want to make portable, and the second argument is a string that serves as a unique identifier for the component.

::: warning
The second argument to portable must be a unique identifier within your project. This uniqueness helps '@react-portable/core' to track and manage your portable components efficiently. If two components share the same identifier, it will lead to conflicts and unexpected behavior. Therefore, always ensure that each portable component has a unique identifier.
:::

#### Loader

When data fetching is required during Server Side Rendering (SSR) for a component, pass the `loader` function. This function is invoked before SSR and passes returned values to the component as props.

```ts
import { portable, Loader } from '@react-portable/core'

export const loader: Loader<ComponentProps> = async (request) => {
  // ...data fetch from an API server
  return { ... } // ComponentProps
}

export const Example = portable(Component, 'example', { loader })
```

##### Error Handling

When handling errors within `loader`, throw or return `ctx.error` with the appropriate status code and message as arguments.

```ts
import { portable, Loader } from '@react-portable/core'

export const loader: Loader<ComponentProps> = async (request, ctx) => {
  try {
    // ...data fetch from an API server
    return { ... } // ComponentProps
  } catch (e) {
    throw ctx.error(404, e.message)
  }
}

export const Example = portable(Component, 'example', { loader })
```

When embedding the component on a page through the Gateway, if the loader returns a status other than 2xx via ctx.error, the component will not be displayed. Instead, the error will be displayed in the browser's console.

#### Strategy

You can apply various configurations by passing the `strategy` object.

::: tip
When you do not specify `strategy`, it is same as the following value.
```ts
const strategy = {
  revalidate: 0,
  hydrate: 'onIdle'
}
export const Example = portable(Component, 'example', { strategy })
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
import { portable, Loader, Strategy } from '@react-portable/core'

export const loader: Loader<ComponentProps> = async (request) => {
  // ...data fetch from an API server
  return { ... } // ComponentProps
}

const strategy: Strategy = {
  // The cache is used for 60 seconds.
  // After 60 seconds, the cache will be regenerated, but it will still be used until the regeneration process is completed.
  revalidate: 60
}

export const Example = portable(Component, 'example', { loader, strategy })
```

##### Timing of Hydration

By controlling the timing of component hydration on the client with the `hydrate` option, you can avoid loading unnecessary scripts.

- `disable`: No hydration is required for static components.
- `onIdle`: (default) Hydration will occur after the browser becomes idle.
- `onUse`: Hydration will occur when thr component is hovered over or focused on.

```ts
import { portable } from '@react-portable/core'

export const Example = portable(Component, 'example', { strategy: { hydarate: 'onUse' } })
```

#### Styling

##### Compliance with Vite's Default CSS
Since React Portable uses Vite for building, it supports the styling methods officially adopted by Vite. This includes importing CSS files, using CSS Modules, etc.

[CSS - Vite](https://vitejs.dev/guide/features.html#css)

##### Tailwind
React Portable also supports Tailwind. Follow the official [documentation for setup](https://tailwindcss.com/docs/guides/vite).

You can apply styles by importing into your component files.

```ts {1} 
import './index.css'
import { portable } from '@react-portable/core'

export const Example = portable(Component, 'example')
```

#### Env Variables

If you want to use environment variables, follow the rules for using environment variables in Vite.

[Env - Vite](https://vitejs.dev/guide/env-and-mode.html#env-files)

## Deployment

```bash
npx wrangler deploy
```

Refer to the [documentation for Cloudflare Workers](https://developers.cloudflare.com/workers/wrangler/commands/#deploy) as needed.