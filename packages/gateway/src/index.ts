import {
  srcToFragmentId,
  fragmentIdToSrc,
  reactPortableInlineScript,
} from "react-portable-client";

export interface Env {
  // Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
  // MY_KV_NAMESPACE: KVNamespace;
  //
  // Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
  // MY_DURABLE_OBJECT: DurableObjectNamespace;
  //
  // Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
  // MY_BUCKET: R2Bucket;
  //
  // Example binding to a Service. Learn more at https://developers.cloudflare.com/workers/runtime-apis/service-bindings/
  // MY_SERVICE: Fetcher;
  FRAGMENTS_LIST: KVNamespace;
}

type FragmentMap = Map<string, string>;

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const [proxyRequest, proxyPromise] = proxy(request);

    const fragments: FragmentMap = new Map();

    const fragmentIds = fragmentIdsStore(proxyRequest.url, env);

    const fragmentsPromise = Promise.all(
      Array.from(await fragmentIds.pull()).map(async (id) => {
        return fragments.set(id, await fetchFragment(id));
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

    ctx.waitUntil(
      (async () => {
        // HTMLRewriterが完了するのを待つ必要がある
        await copied.text();
        return fragmentIds.push(piercingHandler.fragmentIds);
      })()
    );

    return piercedResponse;
  },
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

  // TODO: キャッシュ期間を考えなくていいか？
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

const proxy = (request: Request): [Request, Promise<Response>] => {
  const url = new URL(request.url);
  url.host = "0.0.0.0";
  url.port = "3000";
  const proxyRequest = new Request(url, request);
  return [proxyRequest, fetch(proxyRequest)];
};

const fetchFragment = async (id: string) => {
  const src = fragmentIdToSrc(id);
  const res = await fetch(src);
  return res.text();
};

class PiercingHandler {
  private readonly fragments: FragmentMap;
  public fragmentIds: Set<string>;

  constructor(fragments: FragmentMap) {
    this.fragments = fragments;
    this.fragmentIds = new Set();
  }

  async element(element: Element) {
    const src = element.getAttribute("src");
    const suspend = element.getAttribute("suspend") === "true";
    if (!src) return;
    const fragmentId = srcToFragmentId(src);
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

const isSetEqual = (set1: Set<string>, set2: Set<string>) => {
  if (set1.size !== set2.size) return false;
  for (let item of set1) {
    if (!set2.has(item)) return false;
  }
  return true;
};
