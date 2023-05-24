declare module "@entry" {
  const render: any;
  export default render;
}

declare module "react-portable:virtual" {
  import { FC } from "react";

  export type Strategy = {
    revalidate?: false | 0 | number;
    hydrate?: "onUse" | "onIdle" | "disable";
  };

  export type Loader = (
    r: Request
  ) => Record<string, unknown> | Promise<Record<string, unknown>>;

  const Component: FC;
  export const strategy: Strategy | undefined;
  export const loader: Loader | undefined;
  export default Component;
}
