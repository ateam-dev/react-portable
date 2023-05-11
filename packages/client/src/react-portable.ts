import WritableDOM from "writable-dom";
import type { DOMAttributes } from "react";

export const registerReactPortable = () => {
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
    const src = this.getAttribute("src");
    const suspend = this.getAttribute("suspend") === "true";

    if (!src)
      throw new Error(
        "The react portable component has been applied without `src`"
      );
    this.fragmentId = srcToFragmentId(src);

    let template = this.getTemplate();

    if (!template) {
      // 何らかの原因でGatewayでpiercingできなかった時(Next.jsのナビゲートみたいにハードドキュメントロードされていないケース)
      // 直接フラグメントのDOMをfetchして取ってきて埋め込む
      template = document.createElement("template");
      template.id = this.fragmentId;

      await this.streamFragmentIntoOutlet(
        await this.fetchFragmentStream(src),
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

  private async fetchFragmentStream(url: string) {
    const response = (await singletonFetch(url, new Request(url))).clone();
    if (!response.body) {
      throw new Error(
        "An empty response has been provided when fetching" +
          ` the fragment with id ${this.fragmentId}`
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

export const srcToFragmentId = (text: string): string => {
  return btoa(text);
};

export const fragmentIdToSrc = (text: string): string => {
  return atob(text);
};

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "react-portable": ReactPortableAttributes;
    }

    type ReactPortableAttributes = {
      src: string;
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
