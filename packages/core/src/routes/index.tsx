import { qwikify$ } from "@builder.io/qwik-react";
import { component$ } from "@builder.io/qwik";
import { RequestHandler, routeLoader$ } from "@builder.io/qwik-city";
// @ts-ignore
import * as Entry from "react-portable:virtual";
import { QwikifyOptions } from "@builder.io/qwik-react/lib/types/react/types";
const qwikifyOption = (
  Entry.strategy?.hydrate === "onUse"
    ? {
        eagerness: "hover",
        event: "focusin",
      }
    : Entry.strategy?.hydrate === "onIdle"
    ? {
        eagerness: "idle",
      }
    : undefined
) as QwikifyOptions;
const QR = qwikify$(Entry.default, qwikifyOption);
const getProps = routeLoader$(({ request }) => {
  return Entry.loader?.(request) ?? {};
});
export default component$(() => {
  const props = getProps().value;
  return <QR {...props} />;
});

const { revalidate = 0, hash } = Entry.strategy?.cache ?? {};
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
  if (hash) requestEvent.headers.set("x-react-portable-hash", hash);
};
