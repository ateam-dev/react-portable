import { Hono } from "hono";
import {
  FragmentBaseReplacer,
  FragmentTemplatesAppender,
  ReactPortablePiercer,
} from "./libs/htmlRewriters";
import { corsHeader } from "./libs/cors";
import { createIdListStore, prepareStore } from "./libs/store";
import { prepareSwr, swr } from "./libs/swr";
import { CUSTOM_HEADER_KEY_GATEWAY } from "./libs/constants";
import {
  getFragmentConfig,
  getFragmentsForPiercing,
  prepareFragmentConfigs,
} from "./libs/fragments";

type Env = {
  ORIGIN: string;
  FRAGMENT_CONFIGS: string;
  ALLOW_ORIGINS: string;
  FRAGMENTS_LIST: KVNamespace;
  CACHE: KVNamespace;
};

const app = new Hono<{ Bindings: Env }>();

app.options("*", (c) => {
  return new Response("", {
    headers: corsHeader(c.req.headers.get("Origin"), c.env.ALLOW_ORIGINS),
  });
});

app.all("*", (c, next) => {
  prepareSwr(c.env.CACHE);
  prepareStore(c.env.FRAGMENTS_LIST);
  prepareFragmentConfigs(c.env.FRAGMENT_CONFIGS);
  return next();
});

app.get("/_fragments/:code/*", async (c) => {
  const code = c.req.param().code;
  const proxyRequest = fragmentProxy(c.req.raw, code);
  const { response: _response, revalidate } = await swr(proxyRequest, fetch);
  c.executionCtx.waitUntil(revalidate(fetch));

  const response = new Response(_response.body, {
    ..._response,
    headers: corsHeader(
      c.req.headers.get("Origin"),
      c.env.ALLOW_ORIGINS,
      new Headers(_response.headers)
    ),
  });

  if (!response.headers.get("content-type")?.includes("text/html"))
    return response;

  const gateway = c.req.headers.get(CUSTOM_HEADER_KEY_GATEWAY);
  const assetPath = getFragmentConfig(code).assetPath;
  const baseReplacer = new FragmentBaseReplacer(code, gateway, assetPath);
  const rewriter = new HTMLRewriter().on(baseReplacer.selector, baseReplacer);

  return rewriter.transform(response);
});

app.all("*", async (c) => {
  const url = new URL(c.req.url);
  url.host = new URL(c.env.ORIGIN).host;
  const proxyRequest = new Request(url, c.req.raw);

  const fragmentIdStore = createIdListStore(proxyRequest.url);

  const fragmentsFetch = fragmentIdStore.load().then((store) =>
    getFragmentsForPiercing(store.ids, async (request) => {
      const { revalidate, response } = await swr(request, fetch);
      c.executionCtx.waitUntil(revalidate(fetch));
      return response;
    })
  );

  const [response, fragments] = await Promise.all([
    fetch(proxyRequest),
    fragmentsFetch,
  ]);

  if (!response.headers.get("content-type")?.includes("text/html"))
    return response;

  const piercer = new ReactPortablePiercer(fragments);
  const templatesAppender = new FragmentTemplatesAppender(fragments);
  const rewriter = new HTMLRewriter()
    .on(piercer.selector, piercer)
    .on(templatesAppender.selector, templatesAppender);

  const piercedResponse = rewriter.transform(response);
  const copied = piercedResponse.clone();

  c.executionCtx.waitUntil(
    (async () => {
      // need to wait for complete `rewriter.transform(response)`
      await copied.text();
      return fragmentIdStore.update(piercer.fragmentIds).save();
    })()
  );

  return piercedResponse;
});

export default app;

const fragmentProxy = (request: Request, code: string): Request => {
  const url = new URL(request.url);
  const config = getFragmentConfig(code);

  const remote = new URL(config.origin);

  url.host = remote.host;
  url.protocol = remote.protocol;
  url.pathname = url.pathname.replace(`/_fragments/${code}`, "");

  return new Request(url, request);
};
