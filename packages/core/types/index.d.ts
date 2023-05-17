export type CacheStrategy = {
  revalidate?: false | 0 | number;
  hash?: string;
};

export type Strategy = {
  cache?: CacheStrategy;
  hydrate?: "onUse" | "onIdle" | "disable";
};

export type Loader = (
  r: Request
) => Record<string, unknown> | Promise<Record<string, unknown>>;
