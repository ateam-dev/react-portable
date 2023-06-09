---
outline: deep
---

# Storybook

React Portable offers a useful Storybook addon to assist your development process.

![storybook addon](/storybook-addon.png)

## Installation

::: code-group
```bash [npm]
npm install @react-portable/storybook
```

```bash [yarn]
yarn add @react-portable/storybook
```
:::

## Setup

::: code-group
```ts [.storybook/main.ts]
import { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(js|jsx|ts|tsx)"],
  addons: [
    "@storybook/addon-links",
    "@storybook/addon-essentials",
    "@storybook/addon-interactions",
    "@react-portable/storybook",     // [!code ++]
  ],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
};
export default config;

```
:::

::: code-group
```ts [.storybook/preview.ts]
import { Preview } from '@storybook/react'

const preview: Preview = {
    parameters: {
      actions: { argTypesRegex: "^on[A-Z].*" },
      controls: {
        matchers: {
          color: /(background|color)$/i,
          date: /Date$/,
        },
      },
      reactPortable: {                                                                      // [!code ++]
        code: "cds-1", // (requeired) the code of your component delivering system          // [!code ++]
        gateway: 'https://my.gateway.example', // (optional) when you use standalone mode   // [!code ++]
      },                                                                                    // [!code ++]
    },
  };

export default preview;
```
:::

## Story

::: code-group
```ts [Pokemon.stories.ts]
import { Meta, StoryObj } from "@storybook/react";
import { Pokemon } from "./Pokemon";
import * as ReactPortable from "./pokemon.rp";
import { reactPortableStory } from "@react-portable/storybook";

const meta: Meta = {
  title: "Pokemon",
  component: Pokemon,
};

export default meta;

export const reactPortable: StoryObj = {
  ...reactPortableStory("/pokemon", ReactPortable, {
    paramKeys: ["code"],
  }),
  argTypes: {
    code: {
      control: { type: "select" },
      options: ["bulbasaur", "ivysaur", "venusaur", "charmander"],
    },
  },
  args: {
    code: "bulbasaur",
  },
};
```

```ts [pokemon.rp.ts]
import { Pokemon } from "./Pokemon";
import { Strategy, Loader } from "@react-portable/core";
import { ComponentProps } from "react";

export default Pokemon;

export const loader: Loader<ComponentProps<typeof Pokemon>> = async (
  req: Request
) => {
  const search = new URL(req.url).searchParams;
  const code = search.get("code") ?? "";
  const url = `https://pokeapi.co/api/v2/pokemon/${search.get("code")}`;
  const res = await fetch(url);
  const data = await res.json();
  return {
    imgSrc: data.sprites.front_default,
    name: code,
    types: data.types.map(({ type }) => type.name),
  };
};

export const strategy: Strategy = { revalidate: 60, hydrate: "disable" };
```
:::
