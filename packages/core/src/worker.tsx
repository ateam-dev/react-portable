import { getAssetFromKV } from "@cloudflare/kv-asset-handler";
// @ts-ignore
import manifestJSON from "__STATIC_CONTENT_MANIFEST";
import { renderToStream } from "@builder.io/qwik/server";
import { manifest } from "@qwik-client-manifest";
import { getProps } from "./entry";
import Root from "./root";

export interface Env {
  __STATIC_CONTENT: KVNamespace;
}

const ASSET_MANIFEST = JSON.parse(manifestJSON);

const createStream = () => {
  const { writable, readable } = new TransformStream();
  const writer = writable.getWriter();

  const stream = {
    write: (chunk: unknown) => {
      if (typeof chunk === "string") {
        const encoder = new TextEncoder();
        writer.write(encoder.encode(chunk));
      } else {
        writer.write(chunk);
      }
    },
  };

  return { writer, readable, stream };
};

const handleAssets = (request: Request, env: Env, ctx: ExecutionContext) => {
  return getAssetFromKV(
    { request, waitUntil: (promise) => ctx.waitUntil(promise) },
    { ASSET_NAMESPACE: env.__STATIC_CONTENT, ASSET_MANIFEST }
  ).catch((e) => {
    console.error(e);
    return new Response("An unexpected error occurred", { status: 500 });
  });
};

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);

    // asset
    if (url.pathname.startsWith("/build/"))
      return handleAssets(request, env, ctx);

    const { writer, readable, stream } = createStream();

    const props = await getProps(request);
    renderToStream(<Root {...props} />, {
      manifest,
      containerTagName: "react-portable-fragment",
      qwikLoader: { include: "always" },
      // FIXME: 本番ではオリジンを直接指定する
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
