/** @jsxImportSource @builder.io/qwik */
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
    containerTagName: "rp-fragment",
    qwikLoader: { include: "always" },
  });
}
