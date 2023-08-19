/** @jsxImportSource @builder.io/qwik */
import { qwikify$ } from "@builder.io/qwik-react";
import { component$, $ } from "@builder.io/qwik";
import { RequestHandler, routeLoader$ } from "@builder.io/qwik-city";
import { PortableComponent } from "../portable";
// @ts-ignore
import * as Entries from "__entryPath__";

const Entry = Object.values(Entries).find((module) => {
  if (typeof module === "function" && "__code" in module)
    return module.__code === "__code__";
}) as PortableComponent;

const { hydrate = "onIdle", revalidate = 0 } = Entry.__strategy ?? {};

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
const QComponent__sanitized__ = qwikify$(Entry.__original, qwikifyOption);
const getProps = routeLoader$(async ({ request, error }) => {
  try {
    if (request.method === "POST") return await request.json();

    const res = (await Entry.__loader?.(request, { error })) ?? {};
    if (res instanceof Error) throw res;
    return res;
  } catch (e) {
    throw e;
  }
});
export default component$(() => {
  const props = Object.fromEntries(
    Object.entries(getProps().value).map(([key, val]) => {
      if (typeof val !== "string") return [key, val];
      const [, uuid, path] = val.match(/__function__:(.*):(.*)/) ?? [];
      if (uuid && path) {
        return [
          `${key}$`,
          $((...args: unknown[]) => {
            window.dispatchEvent(
              new CustomEvent("rp-preview-message", {
                detail: { uuid, path, args },
              }),
            );
          }),
        ];
      }

      // TODO: support keys other than `children`
      if (val === "__outlet__" && key === "children")
        return [key, <rp-slot _key={key} />];

      return [key, val];
    }),
  );

  return <QComponent__sanitized__ {...props} />;
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
        }`,
  );
};
