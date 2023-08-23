import { Hono } from "hono";
import {
  ActivateRpPreviewReplacer,
  FragmentBaseReplacer,
} from "./libs/htmlRewriters";

const app = new Hono();

let proxyOrigin: string;
let fragmentsEndpoint: string;

app.all("/_fragments/*", async (c) => {
  const proxyRequest = fragmentProxy(c.req.raw);

  const response = await fetch(proxyRequest);

  if (
    !response.headers.get("content-type")?.includes("text/html") ||
    !response.ok
  )
    return response;

  const baseReplacer = new FragmentBaseReplacer("", null, null);
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

  const activator = new ActivateRpPreviewReplacer();
  return new HTMLRewriter()
    .on(activator.selector, activator)
    .transform(response);
});

const originProxy = (request: Request, _origin: string): Request => {
  const url = new URL(request.url);
  const origin = new URL(_origin);
  url.host = origin.host;
  url.port = origin.port;
  url.protocol = origin.protocol;

  return new Request(url, request);
};

const fragmentProxy = (request: Request): Request => {
  const remote = new URL(fragmentsEndpoint);
  remote.pathname = new URL(request.url).pathname.replace(/^\/_fragments/, "");

  return new Request(remote, request);
};

export const gateway = (config: {
  proxy: string;
  fragmentsEndpoint: string;
}) => {
  proxyOrigin = config.proxy;
  fragmentsEndpoint = config.fragmentsEndpoint;

  return app.fetch;
};
