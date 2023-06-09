---
outline: deep
---

# react-portable.config.js

When setting up the Component Delivering System and executing `npx react-portable init`, several files will be automatically placed in your project root.

Let's discuss one of these files, the `react-portable.config.js`.

## Config File

::: code-group
```js [react-portable.config.js]
const path = require("node:path");

/** @type {import('@react-portable/core/types').Config} */
module.exports = {
  src: path.resolve(__dirname, "./src"),
};
```
:::

```ts
export type Config = {
  src: string;
  tmpDir?: string;
  outDirs?: {
    client?: string;
    server?: string;
  };
  workerScript?: string;
};
```

- `src`: (required) You can specify src directory path. 
    - For example: `path.resolve(__dirname, "./src")`
- `tmpDir`: (optional) The path of sandbox (temporary and intermediate files are output here)
    - default: `path.resolve(__dirname, ".rp/tmp")`
- `outDirs.client`: (optional) The path of output directory of the scripts for client.
    - default: `path.resolve(__dirname, ".rp/client")`
- `outDirs.server`: (optional) The path of output directory of the scripts for server.
    - default: `path.resolve(__dirname, ".rp/server")`
- `workerScript`: (optional) The path of the script for Cloudflare Workers.
    - default: `path.resolve(__dirname, "./worker.ts")`

