import {
  renderToStream,
  type RenderToStreamOptions,
} from "@builder.io/qwik/server";
import { manifest } from "@qwik-client-manifest";
import Root from "./root";

export default function (opts: RenderToStreamOptions) {
  return renderToStream(<Root />, {
    manifest,
    ...opts,
    containerTagName: "react-portable-fragment",
    qwikLoader: { include: "always" },
    // FIXME
    base: "/_fragments/mini/build",
  });
}
