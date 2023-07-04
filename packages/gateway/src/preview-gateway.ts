import { Hono } from "hono";
import {
  ActivateReactPortablePreviewReplacer,
  FragmentBaseReplacer,
} from "./libs/htmlRewriters";
import { originProxy } from "./gateway";

const app = new Hono();

let proxyOrigin: string;

app.all("/_fragments/:remote/*", async (c) => {
  const remote = c.req.param().remote;
  const proxyRequest = fragmentProxy(c.req.raw, remote);

  const response = await fetch(proxyRequest);

  if (
    !response.headers.get("content-type")?.includes("text/html") ||
    !response.ok
  )
    return response;

  const baseReplacer = new FragmentBaseReplacer(
    encodeURIComponent(remote),
    null,
    null
  );
  const rewriter = new HTMLRewriter().on(baseReplacer.selector, baseReplacer);

  return rewriter.transform(response);
});

app.all("*", async (c) => {
  const proxyRequest = originProxy(c.req.raw, proxyOrigin);

  const response = await fetch(proxyRequest);

  if (
    !response.headers.get("content-type")?.includes("text/html") ||
    !response.ok
  )
    return response;

  const activator = new ActivateReactPortablePreviewReplacer();
  return new HTMLRewriter()
    .on(activator.selector, activator)
    .transform(response);
});

const fragmentProxy = (request: Request, _remote: string): Request => {
  const url = new URL(request.url);

  const remote = new URL(_remote);

  url.host = remote.host;
  url.port = remote.port;
  url.protocol = remote.protocol;
  url.pathname = url.pathname.replace(
    `/_fragments/${encodeURIComponent(_remote)}`,
    ""
  );

  return new Request(url, request);
};

export const previewGateway = (config: { proxy: string }) => {
  proxyOrigin = config.proxy;

  return app.fetch;
};
