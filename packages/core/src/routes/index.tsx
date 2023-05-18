import { qwikify$ } from "@builder.io/qwik-react";
import { component$ } from "@builder.io/qwik";
import { RequestHandler, routeLoader$ } from "@builder.io/qwik-city";
// @ts-ignore
import * as Entry from "react-portable:virtual";

export type Strategy = {
  revalidate?: false | 0 | number;
  hydrate?: "onUse" | "onIdle" | "disable";
};

export type Loader = (
  r: Request
) => Record<string, unknown> | Promise<Record<string, unknown>>;

const { hydrate, revalidate = 0 }: Strategy = Entry.strategy ?? {};

const qwikifyOption =
  hydrate === "onUse"
    ? ({
        eagerness: "hover",
        event: "focusin",
      } as const)
    : hydrate === "onIdle"
    ? ({
        eagerness: "idle",
        event: undefined,
      } as const)
    : {
        eagerness: undefined,
        event: undefined,
      };
const QR = qwikify$(Entry.default, qwikifyOption);
const getProps = routeLoader$(({ request }) => {
  return Entry.loader?.(request) ?? {};
});
export default component$(() => {
  const props = getProps().value;
  return <QR {...props} />;
});

export const onGet: RequestHandler = async (requestEvent) => {
  requestEvent.headers.set(
    "Cache-Control",
    revalidate === false
      ? `public, s-maxage=${3600 * 24 * 365}`
      : revalidate === 0
      ? `no-store`
      : `public, s-maxage=${revalidate}, stale-while-revalidate=${
          3600 * 24 * 365
        }`
  );
};
