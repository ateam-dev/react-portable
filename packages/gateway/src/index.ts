import {
  getFragmentId,
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
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    let fragments: [string, string][] = [];

    const url = new URL(request.url);
    url.host = "0.0.0.0";
    url.port = "3000";
    const newRequest = new Request(url, request);
    const response = await fetch(newRequest);

    const contentType = response.headers.get("content-type");
    // アセットへのリクエストはスルー
    if (!contentType || !contentType.includes("text/html")) return response;

    // HTML内のreact-portableを探索してfragmentをフェッチし、fragments に格納
    const outletHandler = new ReactFragmentHandler();
    let rewriter = new HTMLRewriter().on("react-portable", outletHandler);
    await rewriter.transform(response.clone()).text();

    rewriter = new HTMLRewriter()
      .on("head", new BodyHandler(outletHandler.fragments))
      .on("react-portable", new ReactFragmentHandler2(outletHandler.fragments));

    return rewriter.transform(response);
  },
};

class ReactFragmentHandler {
  public fragments: [string, string][] = [];

  async element(element: Element) {
    const src = element.getAttribute("src");

    if (src) {
      const fragmentId = getFragmentId(src);
      const res = await fetch(createFragmentRequest(src));
      const fragment = await res.text();
      this.fragments.push([fragmentId, fragment]);
    }
  }
}

class ReactFragmentHandler2 {
  private readonly fragments: [string, string][];

  constructor(fragments: [string, string][]) {
    this.fragments = fragments;
  }

  async element(element: Element) {
    const src = element.getAttribute("src");
    const suspend = element.getAttribute("suspend") === "true";
    if (!src) throw new Error();

    const fragmentId = getFragmentId(src);
    const fragment = Object.fromEntries(this.fragments)[fragmentId];
    !suspend && element.setInnerContent(fragment, { html: true });
  }
}

class BodyHandler {
  private readonly fragments: [string, string][];

  constructor(fragments: [string, string][]) {
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

const createFragmentRequest = (url: string) => {
  return new Request(url);
};
