import {
  parseFragmentId as _parseFragmentId,
  reactPortableInlineScript,
  createFragmentId,
} from "react-portable-client";
import { Hono } from "hono";
import { logger } from "hono/logger";

type Env = {
  ORIGIN: string;
  FRAGMENT_REMOTE_MAPPING: string;
  FRAGMENTS_LIST: KVNamespace;
};

type FragmentMap = Map<string, string>;

const app = new Hono<{ Bindings: Env }>();

app.all("*", logger());

app.get("/_fragments/:code/*", async (c) => {
  const code = c.req.param().code;
  const [, proxyPromise] = fragmentProxy(c.req.raw, code, c.env);
  const response = await proxyPromise;

  if (!response.headers.get("content-type")?.includes("text/html"))
    return response;

  const gateway = c.req.headers.get("x-react-portable-gateway");
  const rewriter = new HTMLRewriter().on(
    "react-portable-fragment",
    new FragmentHandler({ code, gateway })
  );

  // TODO: Proxyモード無しでアクセスしてきたときにCORSのレスポンスを返す
  // TODO: handle cache control
  return rewriter.transform(response);
});

app.all("*", async (c) => {
  const [proxyRequest, proxyPromise] = originProxy(c.req.raw, c.env);

  const fragments: FragmentMap = new Map();
  const fragmentIds = fragmentIdsStore(proxyRequest.url, c.env);

  const fragmentsPromise = Promise.all(
    Array.from(await fragmentIds.pull()).map(async (id) => {
      try {
        // TODO: Handel cache control for fragment
        const fragmentRes = await fetchFragment(id, proxyRequest, c.env);
        const { gateway, code } = parseFragmentId(id);
        const rewriter = new HTMLRewriter().on(
          "react-portable-fragment",
          new FragmentHandler({ code, gateway })
        );
        if (fragmentRes.ok)
          fragments.set(id, await rewriter.transform(fragmentRes).text());
      } catch (e) {
        console.error(e);
      }
    })
  );

  const [response] = await Promise.all([proxyPromise, fragmentsPromise]);

  // アセットへのリクエストはスルー
  if (!response.headers.get("content-type")?.includes("text/html"))
    return response;

  const piercingHandler = new PiercingHandler(fragments);
  const rewriter = new HTMLRewriter()
    .on("head", new HeadHandler(fragments))
    .on("react-portable", piercingHandler);

  const piercedResponse = rewriter.transform(response);
  const copied = piercedResponse.clone();

  c.executionCtx.waitUntil(
    (async () => {
      // HTMLRewriterが完了するのを待つ必要がある
      await copied.text();
      return fragmentIds.push(piercingHandler.fragmentIds);
    })()
  );

  return piercedResponse;
});

export default app;

const fragmentIdsStore = (key: string, env: Env) => {
  let fragmentIds: Set<string> = new Set();
  const pull = async () => {
    if (fragmentIds.size === 0)
      fragmentIds = new Set(
        await env.FRAGMENTS_LIST.get<Array<string>>(key, {
          type: "json",
        })
      );
    return fragmentIds;
  };

  const push = async (newFragmentIds: Set<string>) => {
    if (!isSetEqual(fragmentIds, newFragmentIds))
      await env.FRAGMENTS_LIST.put(
        key,
        JSON.stringify(Array.from(newFragmentIds))
      );
    fragmentIds = newFragmentIds;
  };

  return { push, pull };
};

const originProxy = (
  request: Request,
  env: Env
): [Request, Promise<Response>] => {
  const url = new URL(request.url);
  url.host = new URL(env.ORIGIN).host;

  const proxyRequest = new Request(url, request);
  return [proxyRequest, fetch(proxyRequest)];
};

const fragmentProxy = (
  request: Request,
  code: string,
  env: Env
): [Request, Promise<Response>] => {
  const url = new URL(request.url);
  const fetchRemote: string | undefined = JSON.parse(
    env.FRAGMENT_REMOTE_MAPPING
  )[code];
  if (!fetchRemote) throw new Response(null, { status: 404 });

  const remote = new URL(fetchRemote);

  url.host = remote.host;
  url.protocol = remote.protocol;
  url.pathname = url.pathname.replace(`/_fragments/${code}`, "");

  const proxyRequest = new Request(url, request);
  return [proxyRequest, fetch(proxyRequest)];
};

const parseFragmentId = (id: string) => {
  const { entry, gateway } = _parseFragmentId(id);
  const [, code, path] = entry.match(/^([^:]+):(.+)$/) ?? [];
  if (!code || !path) throw new Error(`invalid entry ${entry}`);

  return { entry, gateway, code, path };
};

const fetchFragment = async (id: string, request: Request, env: Env) => {
  const { code, path } = parseFragmentId(id);
  const fetchRemote: string | undefined = JSON.parse(
    env.FRAGMENT_REMOTE_MAPPING
  )[code];
  if (!fetchRemote) return new Response(null, { status: 404 });
  return fetch(new URL(`${fetchRemote}${path}`), request);
};

class PiercingHandler {
  private readonly fragments: FragmentMap;
  public fragmentIds: Set<string>;

  constructor(fragments: FragmentMap) {
    this.fragments = fragments;
    this.fragmentIds = new Set();
  }

  async element(element: Element) {
    const entry = element.getAttribute("entry");
    const gateway = element.getAttribute("gateway");
    const suspend = element.getAttribute("suspend") === "true";
    if (!entry) return;
    const fragmentId = createFragmentId(entry, gateway);
    this.fragmentIds.add(fragmentId);

    const fragment = this.fragments.get(fragmentId);
    if (!fragment || suspend) return;

    element.setInnerContent(fragment, { html: true });
  }
}

class HeadHandler {
  private readonly fragments: FragmentMap;

  constructor(fragments: FragmentMap) {
    this.fragments = fragments;
  }

  element(element: Element) {
    element.append(reactPortableInlineScript, { html: true });

    for (const [fragmentId, fragment] of this.fragments) {
      element.append(`<template id="${fragmentId}">${fragment}</template>`, {
        html: true,
      });
    }
  }
}

// <react-portable-fragment /> の q:base を書き換える
class FragmentHandler {
  private gateway?: string | null;
  private code: string;
  constructor({ code, gateway }: { code: string; gateway?: string | null }) {
    this.gateway = gateway;
    this.code = code;
  }
  element(element: Element) {
    const originalBasePath = element.getAttribute("q:base");
    element.setAttribute(
      "q:base",
      `${this.gateway ?? ""}/_fragments/${this.code}${originalBasePath}`
    );
  }
}

const isSetEqual = (set1: Set<string>, set2: Set<string>) => {
  if (set1.size !== set2.size) return false;
  for (let item of set1) {
    if (!set2.has(item)) return false;
  }
  return true;
};
