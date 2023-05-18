export type Strategy = {
  revalidate?: false | 0 | number;
  hydrate?: "onUse" | "onIdle" | "disable";
};

export type Loader = (
  r: Request
) => Record<string, unknown> | Promise<Record<string, unknown>>;
