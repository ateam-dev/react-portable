import React from "react";
import type { Loader, PortableComponent } from "@react-portable/core";
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

type InferProps<T> = T extends PortableComponent<infer U> ? U : never;

export const reactPortableStory = <T extends PortableComponent<any>>(
  component: T,
  params?: Pick<Params, "paramKeys">
) => {
  const Component = component;
  return {
    render: (
      args: unknown,
      ctx: {
        loaded: {
          ok: boolean;
          status: number;
          message: string;
          data: InferProps<T> | null;
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
          const res =
            (await component.__loader?.(new Request(url), { error })) ?? {};
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
        strategy: component.__strategy,
        path: `/${component.__code}`,
        ...params,
      },
    },
  };
};
