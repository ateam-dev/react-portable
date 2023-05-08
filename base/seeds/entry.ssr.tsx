/** @jsxImportSource @builder.io/qwik */
import { getAssetFromKV } from "@cloudflare/kv-asset-handler";
// @ts-ignore
import manifestJSON from "__STATIC_CONTENT_MANIFEST";
import { renderToStream } from "@builder.io/qwik/server";
import { manifest } from "@qwik-client-manifest";
// @ts-ignore
import Root from "./root";
// @ts-ignore
import * as reactPortable from "react-portable:virtual";
import { KVNamespace, ExecutionContext } from "@cloudflare/workers-types";

export interface Env {
  __STATIC_CONTENT: KVNamespace;
}

const getProps = async (request: Request) => {
  return (await reactPortable.loader?.(request)) ?? {};
};

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);

    // asset
    if (url.pathname.startsWith("/build/")) {
      try {
        return await getAssetFromKV(
          {
            request,
            waitUntil(promise) {
              return ctx.waitUntil(promise);
            },
          },
          {
            ASSET_NAMESPACE: env.__STATIC_CONTENT,
            ASSET_MANIFEST: JSON.parse(manifestJSON),
          }
        );
      } catch (e) {
        console.error(e);
        return new Response("An unexpected error occurred", { status: 500 });
      }
    }

    const { writable, readable } = new TransformStream();
    const writer = writable.getWriter();

    const stream = {
      write: (chunk: any) => {
        if (typeof chunk === "string") {
          const encoder = new TextEncoder();
          writer.write(encoder.encode(chunk));
        } else {
          writer.write(chunk);
        }
      },
    };

    renderToStream(<Root {...await getProps(request)} />, {
      manifest,
      containerTagName: "react-portable",
      qwikLoader: { include: "always" },
      base: `${url.origin}/build`,
      stream,
    }).finally(() => writer.close());

    return new Response(readable, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  },
};
