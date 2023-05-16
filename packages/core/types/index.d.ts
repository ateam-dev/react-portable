import { QwikifyOptions } from "@builder.io/qwik-react/lib/types/react/types";

export type CacheStrategy = {
  revalidate?: false | 0 | number;
  hash?: string;
};

export type ActivateStrategy = Pick<QwikifyOptions, "eagerness" | "event">;

export type Strategy = {
  cache: CacheStrategy;
  activate: ActivateStrategy;
};

export type Loader = (
  r: Request
) => Record<string, unknown> | Promise<Record<string, unknown>>;
