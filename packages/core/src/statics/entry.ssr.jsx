import { renderToStream } from "@builder.io/qwik/server";
import { manifest } from "@qwik-client-manifest";
import { QwikCityProvider, RouterOutlet } from "@builder.io/qwik-city";
import { component$ } from "@builder.io/qwik";

const Root = component$(() => (
  <QwikCityProvider>
    <RouterOutlet />
  </QwikCityProvider>
));

export default function (opts) {
  return renderToStream(<Root />, {
    manifest,
    ...opts,
    containerTagName: "rp-fragment",
    qwikLoader: { include: "always" },
  });
}
