import { RequestHandler } from "@builder.io/qwik-city";
export type Strategy = {
    revalidate?: false | 0 | number;
    hydrate?: "onUse" | "onIdle" | "disable";
};
export type Loader = (r: Request) => Record<string, unknown> | Promise<Record<string, unknown>>;
declare const _default: import("@builder.io/qwik").Component<{}>;
export default _default;
export declare const onGet: RequestHandler;
