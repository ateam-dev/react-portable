import React from "react";
import type { JSXElementConstructor } from "react";
import type { Strategy, Loader } from "@react-portable/core";
import { PARAM_KEY } from "./constants";
import { Params } from "./Panel";

export const reactPortableStory = (
  path: string,
  mods: {
    default: keyof JSX.IntrinsicElements | JSXElementConstructor<any>;
    strategy?: Strategy;
    loader?: Loader;
  },
  params?: Pick<Params, "paramKeys">
) => {
  const Component = mods.default;
  return {
    render: (args: unknown, ctx: { loaded: Record<string, any> }) => {
      return <Component {...ctx.loaded} />;
    },
    loaders: [
      async (context: { args: Record<string, any> }) => {
        const url = new URL(window.location.href);
        const search = new URLSearchParams(context.args);
        url.search = search.toString();
        return mods.loader?.(new Request(url)) ?? {};
      },
    ],
    parameters: {
      [PARAM_KEY]: {
        strategy: mods.strategy,
        path,
        ...params,
      },
    },
  };
};
