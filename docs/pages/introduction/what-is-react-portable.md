# What is React Portable

React Portable revolutionizes how we use React components, delivering them directly for use on any website, without the need for bundling.

Traditional design systems distribute components as npm libraries, necessitating installation for usage. This creates lags in time and development costs when updating components, and sometimes requires rebuilding the application.

React Portable eliminates these bottlenecks. It's like using iframes to embed common parts on a page - changes made inside the iframe are immediately reflected on the user-facing page, without any extra effort. However, iframes present issues such as SEO evaluation problems, inter-frame communication hurdles, and resource over-fetching.

Leveraging Edge Runtime (Cloudflare Workers), React Portable provides the same benefits without resorting to iframes, ensuring a smoother, more efficient component delivery system for your application.

## Use Cases

- When you want to use components made with React in a system other than React
    - For instance, using common components across multiple sites made with Vue or plain HTML.
- When you want to immediately reflect changes in the components (design system) on the page without any time gap or cost.

## How it Works

The basic concept of React Portable is divided into three sections.

### [Component Delivering System](/introduction/component-delivering-system)

Each of your React components is hosted and rendered server-side, making them accessible from the gateway discussed later. Internally, they are converted to [Qwik](https://qwik.builder.io/), which automatically reduces and optimizes the scripts for clients.

![Component Delivering System](/component-delivering-system.png)

### [Pages](/introduction/pages)

This is the page where the components are delivered and embedded. The positions where components should be embedded are marked using dedicated web components (`<react-portable />`).

![Page](/how-it-works-on-page.png)

### [Gateway](/introduction/gateway)

The Gateway integrates data delivered from the Component Delivering System with the page in the Edge Runtime. It also flexibly controls the cache on a per-component basis, according to the settings of the Component Delivering System.

![Gateway](/gateway-proxy-mode.png)
