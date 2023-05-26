import { qwikify$ } from "@builder.io/qwik-react";
import { component$ } from "@builder.io/qwik";
import { RequestHandler, routeLoader$ } from "@builder.io/qwik-city";
import * as Entry from "react-portable:virtual";

const { hydrate, revalidate = 0 } = Entry.strategy ?? {};

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
const QComponent = qwikify$(Entry.default, qwikifyOption);
const getProps = routeLoader$(({ request }) => {
  return Entry.loader?.(request) ?? {};
});
export default component$(() => {
  const props = getProps().value;
  return <QComponent {...props} />;
});

export const onRequest: RequestHandler = async (requestEvent) => {
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
