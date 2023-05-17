import {
  parseFragmentId as _parseFragmentId,
  reactPortableInlineScript,
  createFragmentId,
} from "@react-portable/client";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { ExecutionContext } from "hono/dist/types/context";

type Env = {
  ORIGIN: string;
  FRAGMENT_CONFIGS: string;
  ALLOW_ORIGINS: string;
  FRAGMENTS_LIST: KVNamespace;
  CACHE: KVNamespace;
};

type FragmentConfigs = Record<
  string,
  { origin: string; assetPath: string | null }
>;

type FragmentMap = Map<string, string>;

const app = new Hono<{ Bindings: Env }>();

app.all("*", logger());

app.options("*", (c) => {
  return new Response("", {
    headers: getCorsHeader(c.req.headers.get("Origin"), c.env.ALLOW_ORIGINS),
  });
});

app.get("/_fragments/:code/*", async (c) => {
  const fragmentConfigs = parseFragmentConfigs(c.env);
  const code = c.req.param().code;
  const [proxyRequest, proxyPromise] = fragmentProxy(
    c.req.raw,
    code,
    fragmentConfigs
  );
  let response = await swr(proxyRequest, proxyPromise, c.env, c.executionCtx);

  response = new Response(response.body, {
    ...response,
    headers: getCorsHeader(
      c.req.headers.get("Origin"),
      c.env.ALLOW_ORIGINS,
      new Headers(response.headers)
    ),
  });

  if (!response.headers.get("content-type")?.includes("text/html"))
    return response;

  const gateway = c.req.headers.get("x-react-portable-gateway");
  const assetPath = fragmentConfigs[code]?.assetPath;
  const rewriter = new HTMLRewriter().on(
    "react-portable-fragment",
    new FragmentHandler({ code, gateway, assetPath })
  );

  return rewriter.transform(response);
});

app.all("*", async (c) => {
  const fragmentConfigs = parseFragmentConfigs(c.env);
  const [proxyRequest, proxyPromise] = originProxy(c.req.raw, c.env);

  const fragmentIds = fragmentIdsStore(proxyRequest.url, c.env);

  const fragmentsPromise = new Promise<FragmentMap>(async (resolve) => {
    const fragments: FragmentMap = new Map();
    const ids = Array.from(await fragmentIds.pull());
    await Promise.allSettled(
      ids.map(async (id) => {
        const fragmentRes = await swr(
          proxyRequest,
          fetchFragment(id, proxyRequest, fragmentConfigs),
          c.env,
          c.executionCtx
        );
        const { gateway, code } = parseFragmentId(id);
        const rewriter = new HTMLRewriter().on(
          "react-portable-fragment",
          new FragmentHandler({ code, gateway })
        );
        if (fragmentRes.ok)
          fragments.set(id, await rewriter.transform(fragmentRes).text());
      })
    );

    resolve(fragments);
  });

  const [response, fragments] = await Promise.all([
    proxyPromise,
    fragmentsPromise,
  ]);

  // アセットへのリクエストはスルー
  if (!response.headers.get("content-type")?.includes("text/html"))
    return response;

  const piercingHandler = new PiercingHandler(fragments);
  const rewriter = new HTMLRewriter()
    .on("head", new HeadHandler(fragments))
    .on("react-portable", piercingHandler)
    .on("script#react-portable-script", new InlineScript());

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

const getCorsHeader = (
  origin: string | null,
  allowOrigins: string,
  baseHeaders?: Headers
) => {
  const headers = baseHeaders ?? new Headers();
  if (allowOrigins === "*") {
    headers.set("Access-Control-Allow-Origin", allowOrigins);
  } else if (origin && allowOrigins.includes(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
  }
  headers.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Accept, x-react-portable-gateway"
  );
  return headers;
};

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
  fragmentConfigs: FragmentConfigs
): [Request, Promise<Response>] => {
  const url = new URL(request.url);
  const config = fragmentConfigs[code];
  if (!config) throw new Response(null, { status: 404 });

  const remote = new URL(config.origin);

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

const fetchFragment = async (
  id: string,
  request: Request,
  fragmentConfigs: FragmentConfigs
) => {
  const { code, path } = parseFragmentId(id);
  const config = fragmentConfigs[code];
  if (!config) return new Response(null, { status: 404 });
  return fetch(new URL(`${config.origin}${path}`), request);
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
    if (!entry) return;
    const fragmentId = createFragmentId(entry, gateway);
    this.fragmentIds.add(fragmentId);

    const fragment = this.fragments.get(fragmentId);
    if (!fragment) return;

    element.setInnerContent(fragment, { html: true });
    element.setAttribute("pierced", "");
  }
}

class HeadHandler {
  private readonly fragments: FragmentMap;

  constructor(fragments: FragmentMap) {
    this.fragments = fragments;
  }

  element(element: Element) {
    for (const [fragmentId, fragment] of this.fragments) {
      element.append(`<template id="${fragmentId}">${fragment}</template>`, {
        html: true,
      });
    }
  }
}

class InlineScript {
  element(element: Element) {
    element.setInnerContent(reactPortableInlineScript, { html: true });
  }
}

// <react-portable-fragment /> の q:base を書き換える
class FragmentHandler {
  private gateway?: string | null;
  private assetPath?: string | null;
  private code: string;
  constructor({
    code,
    gateway,
    assetPath,
  }: {
    code: string;
    gateway?: string | null;
    assetPath?: string | null;
  }) {
    this.gateway = gateway;
    this.code = code;
    this.assetPath = assetPath;
  }
  element(element: Element) {
    const originalBasePath =
      element.getAttribute("q:base")?.replace(/^(?!\/)/, "/") ?? "";
    element.setAttribute(
      "q:base",
      this.assetPath
        ? `${this.assetPath}${originalBasePath}`
        : `${this.gateway ?? ""}/_fragments/${this.code}${originalBasePath}`
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

const swr = async (
  request: Request,
  responsePromise: Promise<Response>,
  env: Env,
  ctx: ExecutionContext
) => {
  const { value: cache, metadata } = await env.CACHE.getWithMetadata<{
    hash: string;
    staleAt: string;
    headers: Record<string, string>;
  }>(request.url, "arrayBuffer");

  ctx.waitUntil(
    (async () => {
      const response = (await responsePromise).clone();

      if (!isCacheable(request, response) || !response.body) return;

      const hash = response.headers.get("x-react-portable-hash");
      const [staleAt, expirationTtl] = getCacheTimes(response);
      if (isStale(metadata?.staleAt) || metadata?.hash !== hash)
        await env.CACHE.put(request.url, response.body, {
          metadata: {
            hash,
            staleAt: staleAt.toISOString(),
            headers: Object.fromEntries(response.headers.entries()),
          },
          expirationTtl,
        });
    })()
  );

  if (cache && metadata?.headers)
    return new Response(cache, {
      headers: {
        ...metadata.headers,
        "x-react-portable-cache": `staleAt: ${metadata.staleAt}`,
      },
    });
  return responsePromise;
};

const isCacheable = (request: Request, response: Response) => {
  const contentType = response.headers.get("Content-Type");
  if (!contentType || !contentType.includes("text/html")) return false;

  // https://vercel.com/docs/concepts/edge-network/caching#cacheable-response-criteria
  if (!["GET", "HEAD"].includes(request.method)) return false;
  if (request.headers.has("Range")) return false;
  if (request.headers.has("Authorization")) return false;
  if (![200, 404, 301, 308].includes(response.status)) return false;
  const contentLength = Number(response.headers.get("Content-Length"));
  if (Number.isNaN(contentLength) || contentLength / 1024 ** 2 > 10)
    return false;
  if (response.headers.has("set-cookie")) return false;
  const cacheControl = response.headers.get("Cache-Control") ?? "";
  return !(
    cacheControl.includes("private") ||
    cacheControl.includes("no-cache") ||
    cacheControl.includes("no-store")
  );
};

const isStale = (expireAt?: string) => {
  if (!expireAt) return true;
  return new Date(expireAt) < new Date();
};

const getDirectiveValue = (
  directives: string[],
  name: string
): number | null => {
  const directive = directives.find((d) => d.startsWith(`${name}=`));
  return directive ? parseInt(directive.split("=")[1]!) : null;
};

const getCacheTimes = (response: Response): [Date, number] => {
  const cacheControl = response.headers.get("Cache-Control");

  if (!cacheControl) return [new Date(0), 0];

  const directives = cacheControl
    .split(",")
    .map((directive) => directive.trim());

  const sMaxAge = getDirectiveValue(directives, "s-maxage") ?? 0;
  const staleWhileRevalidate =
    getDirectiveValue(directives, "stale-while-revalidate") ?? 0;

  const now = new Date();
  const staleAt = new Date(now.getTime() + sMaxAge * 1000);
  const forbiddenTTL = sMaxAge + staleWhileRevalidate;

  return [staleAt, forbiddenTTL];
};

const parseFragmentConfigs = (e: Env): FragmentConfigs => {
  return JSON.parse(e.FRAGMENT_CONFIGS);
};
