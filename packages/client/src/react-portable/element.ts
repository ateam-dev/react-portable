import WritableDOM from "writable-dom";
import { DetailedHTMLProps, HTMLAttributes } from "react";

const promiseStore = new Map<string, Promise<Response> | Response>();

const restoreGatewayCache = () => {
  const templates = document.querySelectorAll<HTMLTemplateElement>(
    `.${ReactPortable.CLASS_NAME_FOR_GATEWAY_CACHE}`
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

  static readonly CUSTOM_HEADER_KEY_GATEWAY = "X-React-Portable-Gateway";
  static readonly CLASS_NAME_FOR_GATEWAY_CACHE = "react-portable-gateway-cache";

  constructor() {
    restoreGatewayCache();
    super();
  }

  async connectedCallback() {
    try {
      if (this.prepare()) {
        this.setAttribute("loading", "");
        await this.render();
      }
      this.pierced = true;
    } catch (e) {
      console.error(e);
      this.failed = true;
    }
    this.removeAttribute("loading");
  }

  private prepare() {
    const entry = this.getAttribute("entry");
    const gateway = this.getAttribute("gateway");
    const pierced = this.getAttribute("pierced");

    if (pierced === "failed") {
      throw new Error(
        `Failed to retrieve fragment (entry: ${entry}, gateway: ${
          gateway ?? "-"
        }) on the gateway.`
      );
    }
    if (pierced) return false;

    if (!entry)
      throw new Error(
        "The react portable component has been applied without `entry`"
      );
    this.fragmentId = ReactPortable.createFragmentId(entry, gateway);

    return true;
  }

  private async render() {
    const fragment = await this.fetchFragmentStream();
    if (!fragment.body || !fragment.ok) {
      this.setAttribute("pierced", "failed");
      const { entry, gateway } = ReactPortable.parseFragmentId(this.fragmentId);
      throw new Error(
        `Failed to retrieve fragment (entry: ${entry}, gateway: ${
          gateway ?? "-"
        })`
      );
    }
    await this.piercing(fragment.body);
  }

  private async fetchFragmentStream() {
    const { entry, gateway } = ReactPortable.parseFragmentId(this.fragmentId);
    const { code, path } = parseEntry(entry);

    const url = `${
      gateway ?? window.location.origin
    }/_fragments/${code}${path}`;
    const request = new Request(url);
    if (gateway)
      request.headers.set(ReactPortable.CUSTOM_HEADER_KEY_GATEWAY, gateway);

    return fetcher(request, this.fragmentId);
  }

  private async piercing(fragmentStream: ReadableStream) {
    await fragmentStream
      .pipeThrough(new TextDecoderStream())
      .pipeTo(new WritableDOM(this));

    this.setAttribute("pierced", "");
  }

  static createFragmentId(entry: string, gateway?: string | null): string {
    return btoa(JSON.stringify({ entry, gateway: gateway ?? null }));
  }

  static parseFragmentId(text: string): {
    entry: string;
    gateway: string | null;
  } {
    return JSON.parse(atob(text));
  }
}

const parseEntry = (text: string): { code: string; path: string } => {
  const [, code, path] = text.match(/^([^:]+):(.+)$/) ?? [];
  if (!code || !path)
    throw new Error(
      "The react portable component has been applied with wrong format `entry`"
    );

  return { code, path };
};

interface ReactPortableAttributes {
  gateway?: string;
  entry: string;
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "react-portable": DetailedHTMLProps<
        HTMLAttributes<HTMLElement> & ReactPortableAttributes,
        ReactPortable
      >;
    }
  }
}
