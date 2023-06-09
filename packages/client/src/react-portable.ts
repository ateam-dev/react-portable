import WritableDOM from "writable-dom";
import type { DOMAttributes } from "react";

const promiseStore = new Map<string, Promise<Response> | Response>();

const restoreGatewayCache = () => {
  const templates = document.querySelectorAll<HTMLTemplateElement>(
    `.${CLASS_NAME_FOR_GATEWAY_CACHE}`
  );

  Array.from(templates).forEach((template) => {
    promiseStore.set(template.id, new Response(template.innerHTML));
  });
};

const fetcher = async (req: Request, key: string) => {
  const cache = promiseStore.get(key);
  if (cache) return (await cache).clone();

  const promise = fetch(req);

  promiseStore.set(key, promise);

  return (await promise).clone();
};

if (typeof globalThis.HTMLElement === "undefined") {
  // @ts-ignore
  globalThis.HTMLElement = class {};
}

export class ReactPortable extends HTMLElement {
  private fragmentId = "";
  public pierced = false;
  public failed = false;

  constructor() {
    restoreGatewayCache();
    super();
  }

  async connectedCallback() {
    try {
      await this.render();
      this.pierced = true;
    } catch (e) {
      console.error(e);
      this.failed = true;
    }
  }

  private async render() {
    const entry = this.getAttribute("entry");
    const gateway = this.getAttribute("gateway");
    const pierced = this.getAttribute("pierced") !== null;

    if (pierced) return;

    if (!entry)
      throw new Error(
        "The react portable component has been applied without `entry`"
      );
    this.fragmentId = createFragmentId(entry, gateway);

    const fragment = await this.fetchFragmentStream();
    if (!fragment.body || !fragment.ok) {
      throw new Error(
        `Failed to retrieve fragment (entry: ${entry}, gateway: ${
          gateway ?? "-"
        })`
      );
    }
    await this.piercing(fragment.body);
  }

  private async fetchFragmentStream() {
    const { entry, gateway } = parseFragmentId(this.fragmentId);
    const { code, path } = parseEntry(entry);

    const url = `${
      gateway ?? window.location.origin
    }/_fragments/${code}${path}`;
    const request = new Request(url);
    if (gateway) request.headers.set(CUSTOM_HEADER_KEY_GATEWAY, gateway);

    return fetcher(request, this.fragmentId);
  }

  private async piercing(fragmentStream: ReadableStream) {
    await fragmentStream
      .pipeThrough(new TextDecoderStream())
      .pipeTo(new WritableDOM(this));

    this.setAttribute("pierced", "");
  }
}

export const createFragmentId = (
  entry: string,
  gateway?: string | null
): string => {
  return btoa(JSON.stringify({ entry, gateway: gateway ?? null }));
};

export const parseFragmentId = (
  text: string
): { entry: string; gateway: string | null } => {
  return JSON.parse(atob(text));
};

export const CUSTOM_HEADER_KEY_GATEWAY = "X-React-Portable-Gateway";
export const CLASS_NAME_FOR_GATEWAY_CACHE = "react-portable-gateway-cache";

const parseEntry = (text: string): { code: string; path: string } => {
  const [, code, path] = text.match(/^([^:]+):(.+)$/) ?? [];
  if (!code || !path)
    throw new Error(
      "The react portable component has been applied with wrong format `entry`"
    );

  return { code, path };
};

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "react-portable": ReactPortableAttributes;
    }

    type ReactPortableAttributes = {
      gateway?: string;
      entry: string;
    } & Partial<
      ReactPortable &
        DOMAttributes<ReactPortable> & {
          "fragment-fetch-params"?: string;
          [onProp: `on${string}`]: Function | undefined;
        }
    >;
  }
}
