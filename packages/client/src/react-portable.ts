import WritableDOM from "writable-dom";
import type { DOMAttributes } from "react";

export const registerReactPortable = () => {
  if (typeof window !== "undefined")
    window.customElements.define("react-portable", ReactPortable);
};

const promiseStore = new Map<string, Promise<Response>>();

const singletonFetch = async (key: string, req: Request) => {
  if (promiseStore.has(key)) return promiseStore.get(key)!;

  const promise = fetch(req).finally(() => {
    promiseStore.delete(key);
  });

  promiseStore.set(key, promise);

  return promise;
};

if (typeof globalThis.HTMLElement === "undefined") {
  // @ts-ignore
  globalThis.HTMLElement = class {};
}

export class ReactPortable extends HTMLElement {
  private fragmentId = "";

  constructor() {
    super();
  }

  static get observedAttributes() {
    return ["suspend"];
  }

  async attributeChangedCallback(name: string) {
    if (name === "suspend") await this.render();
  }

  async connectedCallback() {
    await this.render();
  }

  private async render() {
    const entry = this.getAttribute("entry");
    const gateway = this.getAttribute("gateway");
    const suspend = this.getAttribute("suspend") === "true";

    if (!entry)
      throw new Error(
        "The react portable component has been applied without `entry`"
      );
    this.fragmentId = createFragmentId(entry, gateway);

    let template = this.getTemplate();

    if (!template) {
      // 何らかの原因でGatewayでpiercingできなかった時(Next.jsのナビゲートみたいにハードドキュメントロードされていないケース)
      // 直接フラグメントのDOMをfetchして取ってきて埋め込む
      template = document.createElement("template");
      template.id = this.fragmentId;

      await this.streamFragmentIntoOutlet(
        await this.fetchFragmentStream(entry, gateway),
        // @ts-ignore
        template.content
      );

      // 同一のfragmentIdを持つコンポーネントが、同時に処理されている可能性があるので、
      // <head>内への登録が重複しないようにする
      if (!this.getTemplate()) document.head.appendChild(template);
    }

    if (template) {
      // @ts-ignore
      const clone = template.content.cloneNode(true);
      if (!suspend) {
        this.innerHTML = "";
        this.appendChild(clone);
      }
    }

    if (!template) {
      throw new Error(
        `The fragment with id "${this.fragmentId}" is not present and` +
          " it could not be fetched"
      );
    }
  }

  private async fetchFragmentStream(entry: string, gateway?: string | null) {
    const { code, path } = parseEntry(entry);
    const request = new Request(`${gateway ?? ""}/_fragments/${code}${path}`, {
      headers: gateway
        ? {
            "x-react-portable-gateway": gateway,
          }
        : {},
    });
    const response = (await singletonFetch(request.url, request)).clone();
    if (!response.body) {
      throw new Error(
        "An empty response has been provided when fetching" +
          ` the fragment with id ${this.fragmentId} (entry: ${
            parseFragmentId(this.fragmentId).entry
          })`
      );
    }
    return response.body;
  }

  private async streamFragmentIntoOutlet(
    fragmentStream: ReadableStream,
    entrypoint: HTMLElement
  ) {
    await fragmentStream
      .pipeThrough(new TextDecoderStream())
      .pipeTo(new WritableDOM(entrypoint));
  }

  private getTemplate() {
    return document.getElementById(this.fragmentId);
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
      suspend?: string;
    } & Partial<
      ReactPortable &
        DOMAttributes<ReactPortable> & {
          "fragment-fetch-params"?: string;
          [onProp: `on${string}`]: Function | undefined;
        }
    >;
  }
}
