---
outline: deep
---

# Pages

Once the Component Delivering System and Gateway are set up, all you need to do is integrate them on your page.

By marking the location on the page to place components in the format of [web components](https://developer.mozilla.org/en-US/docs/Web/API/Web_components) `<react-portable />`, the components will be automatically integrated.

![how it works on the pages](/how-it-works-on-page.png)

## Installation

In order to make `<react-portable />` usable, you need to install the client-side module.

There are two methods of installation. Please choose the one that best suits the configuration of your page.

### CDN

::: code-group

```html [latest version]
<script crossorigin src="https://www.unpkg.com/@react-portable/client/dist/browser.umd.js"></script>
```

```html [certain version]
<!-- Replace `@x.x.x` with your desired version -->
<script crossorigin src="https://www.unpkg.com/@react-portable/client@x.x.x/dist/browser.umd.js"></script>
```

:::


### NPM

::: code-group
```bash [npm]
npm install @react-portable/client
```

```bash [yarn]
yarn add @react-portable/client
```
:::

By executing `registerReactPortable()`, you can enable the `<react-portable />` web components.

::: code-group
```tsx [React]
// src/index.tsx
import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { registerReactPortable } from '@react-portable/client'; // [!code ++]
registerReactPortable();                                        // [!code ++]

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);
```
:::

## How to Use `<react-portable />`

```html
<react-portable entry="code:/path-to-component"></react-portable>
```

The entry attribute is composed of two parts: `code` and `path`, formatted as `${code}:${path}`.
- `code`: This is the code you assigned to the Component Delivering System endpoint when setting up the Gateway.
  ::: code-group
  ```ts {5} [src/worker.ts] 
  export default {
    fetch: gateway({
      kv: env.GATEWAY_STORE,
      cds: {
        "cds-1": { // <- this is the code
          endpoint: 'https://your.componet.derivering.system'
        }
      }
    }),
  };
  ```
  :::
- `path`: This is the URL path part for accessing the component on the Component Delivering System.
    - Basically, it will be the filename of [the entry point file](/introduction/component-delivering-system.html#prepare-entry-point-file); `{path}.rp.ts`

---

If you want to use [standalone mode](/introduction/gateway.html#standalone-mode), specify the gateway's origin in the `gateway` attribute as follows. 

```html
<react-portable entry="code:/component-path" gateway="https://your.gateway"></react-portable>
```

### The Case of Using with Next.js

In server-side rendering environments like Next.js, using web components can lead to discrepancies between the server-rendered markup and the client-side rendered version, also known as hydration mismatches.

By using the `ReactPortable` component, you can avoid it.

```tsx
import { ReactPortable } from '@react-portable/client'

const Page = () => {
  return (
    <div>
      ...
      <ReactPortable
        entry="code:/component-path"
        gateway={/* when you use standalone mode */}
      />
    </div>
  )
}
```


