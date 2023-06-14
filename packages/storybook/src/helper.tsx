import React from "react";
import type { JSXElementConstructor } from "react";
import type { Strategy, Loader } from "@react-portable/core";
import { PARAM_KEY } from "./constants";
import { Params } from "./Panel";
import { Fallback } from "./components/Fallback";

class CustomError extends Error {
  static {
    this.prototype.name = "CustomError";
  }
  constructor(public status: number, message: string) {
    super(message);
  }
}

type ErrorFunction = Parameters<Loader>[1]["error"];

const error = ((status: number, message: string) =>
  new CustomError(status, message)) as ErrorFunction;

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
    render: (
      args: unknown,
      ctx: {
        loaded: {
          ok: boolean;
          status: number;
          message: string;
          data: Record<string, any> | null;
        };
      }
    ) => {
      if (!ctx.loaded.ok) return <Fallback {...ctx.loaded} />;
      return <Component {...ctx.loaded.data} />;
    },
    loaders: [
      async (context: { args: Record<string, any> }) => {
        const url = new URL(window.location.href);
        const search = new URLSearchParams(context.args);
        url.search = search.toString();
        try {
          const res = (await mods.loader?.(new Request(url), { error })) ?? {};
          if (res instanceof CustomError) throw res;
          return { status: 200, message: "", data: res, ok: true };
        } catch (e) {
          if (e instanceof CustomError)
            return {
              status: e.status,
              message: e.message,
              data: null,
              ok: false,
            };

          throw e;
        }
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
