declare module "@entry" {
  const render: any;
  export default render;
}

declare module "react-portable:virtual" {
  import { FC } from "react";
  import { RequestEventCommon } from "@builder.io/qwik-city/middleware/request-handler";

  type ErrorResponse = ReturnType<RequestEventCommon["error"]>;

  export type Strategy = {
    revalidate?: false | 0 | number;
    hydrate?: "onUse" | "onIdle" | "disable";
  };

  export type Loader<T extends Record = Record> = (
    r: Request,
    ctx: { error: RequestEventCommon["error"] }
  ) => T | ErrorResponse | Promise<T | ErrorResponse>;

  const Component: FC;
  export const strategy: Strategy | undefined;
  export const loader: Loader | undefined;
  export default Component;
}
