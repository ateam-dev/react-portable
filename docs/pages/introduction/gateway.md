---
outline: deep
---

# Gateway

The Gateway responds to proprietary web components (`<react-portable />`) within the page, and requests the corresponding components from the Component Delivering System. It then embeds the data from the obtained components into the page.

## Modes

Let me introduce the two modes of the Gateway.

### Proxy Mode

The Gateway acts as a proxy between the origin and the client, allowing the embedding of components within the original page. It then returns the response to the client with the embedded components.

![proxy mode](/gateway-proxy-mode.png)

### Standalone Mode

The standalone mode is used when the Gateway cannot act as a proxy between the origin and the client.

![standalone mode](/gateway-standalone-mode.png)

::: warning
When using the standalone mode, please note that component embedding is done on the client-side, which has certain performance drawbacks compared to the proxy mode. Therefore, we recommend using the proxy mode whenever possible.
:::

## Installation

You can install the gateway in the same project as the component delivering system installed in the previous step, or in a separate project.

### Preparation

Before installing the gateway, you need to set up Cloudflare Workers (`wrangler`), which are required for deploying your gateway.

[Install Wrangler - Cloudflare Workers docs](https://developers.cloudflare.com/workers/wrangler/install-and-update/)

::: code-group
```bash [npm]
npm install -D wrangler
```

```bash [yarn]
yarn add -D wrangler
```
:::

Then, initialize wrangler.

```bash
npx wrangler init
```

### Installation

::: code-group
```bash [npm]
npm install @react-portable/gateway
```

```bash [yarn]
yarn add @react-portable/gateway
```
:::


## Setup

### Prepare Store (KV)

The gateway utilizes [KV](https://developers.cloudflare.com/workers/learning/how-kv-works/) as a cache store. 
Add new KV namespaces by executing `wrangler kv:namespace create`.

```bash
npx wrangler kv:namespace create GATEWAY_STORE
npx wrangler kv:namespace create GATEWAY_STORE --preview
```

Then, the `id` and `preview_id` will be displayed, add them to the `kv_namespaces` in your `wrangler.toml`.

::: code-group
```toml{5} [wrangler.toml]
name = "gateway"
main = "src/worker.ts"
compatibility_date = "2023-05-30"

kv_namespaces = [ { binding = "GATEWAY_STORE", id = "...", preview_id = "..." } ]
```
:::

### Worker's Code

Write the Cloudflare Workers' code using the `gateway` module provided by `@react-portable/gateway`.

The configuration values are as follows:
- `proxy`: (optional) `string`
  - If you're running the gateway in proxy mode, specify the origin of the proxy target.
- `kv`: (required) `KVNamespace`
  - Specify the KV namespace that you created in the previous step.
- `cors`: (optional) `{ origin: string | string[] }`
  - Specify the origin to set in the `Access-Control-Allow-Origin` of the response headers.
    - If you have multiple origins to set, specify them in an array.
  - If not specified, `Access-Control-Allow-Origin: *` will be returned in the response headers.
    - Please note that there is a potential security risk.
- `cds`: (required) `{ [code: string]: { endpoint: stiring } }`
  - Specify the codes of the component delivering system and their corresponding endpoint origins.
      - You are free to set the codes as you like, but they should be kept simple as they will be used on the pages.

::: code-group
```ts [src/worker.ts]
import { gateway } from "@react-portable/gateway";

export type Env = {
  GATEWAY_STORE: KVNamespace;
};

export default {
  fetch: gateway({
    proxy: 'https://your.origin',
    kv: env.GATEWAY_STORE,
    cros: { origin: ['https://your.app.example', 'https://other.app.example'] },
    cds: {
      "cds-1": { endpoint: 'https://your.componet.derivering.system' }
    }
  }),
};

```
:::

## Deployment

```bash
npx wrangler deploy
```

Refer to the [documentation for Cloudflare Workers](https://developers.cloudflare.com/workers/wrangler/commands/#deploy) as needed.