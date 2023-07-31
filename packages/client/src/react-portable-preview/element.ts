import WritableDOM from "writable-dom";
import type { DetailedHTMLProps, HTMLAttributes } from "react";

if (typeof globalThis.HTMLElement === "undefined") {
  // @ts-ignore
  globalThis.HTMLElement = class {};
}

export class ReactPortablePreview extends HTMLElement {
  private uuid = "";
  private code = "";
  private remote = "";
  public props: Record<string, unknown> = {};
  private outlet: Node | null = null;
  private fetching = false;
  private previousRequestBody = "";
  private handlerProxyListener: VoidFunction | EventListener = () => {};

  private connectedCallback() {
    this.uuid ||= crypto.randomUUID();

    const code = this.getAttribute("code");
    if (!code) {
      console.error("react-portable-preview: The code is not set.");
      return;
    }
    this.code = code;

    this.addHandlerProxy();
  }

  private disconnectedCallback() {
    this.removeHandlerProxy();
  }

  public async preview(remote: string) {
    this.remote = remote;

    return this.render(remote);
  }

  public async rerender() {
    if (this.remote) return this.preview(this.remote);
  }

  private async render(remote: string) {
    if (this.fetching) return;

    const body = JSON.stringify(this.props, serialize(this.uuid));

    if (body !== this.previousRequestBody) {
      this.fetching = true;
      try {
        this.storeOutlet();

        const fragment = await this.fetchFragmentStream(remote, body);
        if (!fragment.body || !fragment.ok) {
          throw new Error(
            `react-portable-preview: Failed to retrieve fragment`,
          );
        }
        await this.piercing(fragment.body);

        this.restoreOutletToSlot();
      } finally {
        this.fetching = false;
      }
    }

    this.previousRequestBody = body;
  }

  private async fetchFragmentStream(remote: string, body: string) {
    const url = `${window.location.origin}/_fragments/${encodeURIComponent(
      remote,
    )}/${this.code}`;
    const request = new Request(url);

    return fetch(request, {
      body,
      method: "POST",
    });
  }

  private async piercing(fragmentStream: ReadableStream) {
    this.innerHTML = "";

    await fragmentStream
      .pipeThrough(new TextDecoderStream())
      .pipeTo(new WritableDOM(this));
  }

  private storeOutlet() {
    this.outlet ||= this.querySelector("rp-outlet");
  }

  private restoreOutletToSlot() {
    const slot = this.querySelector("rp-slot");
    if (slot && this.outlet) slot.appendChild(this.outlet);
  }

  private addHandlerProxy() {
    this.handlerProxyListener = (e: Event) => {
      if (!("detail" in e)) return;

      const { uuid, path, args } = e.detail as {
        uuid: string;
        path: string;
        args: unknown[];
      };

      if (this.uuid === uuid) {
        const receiver = this.props[path];
        if (typeof receiver === "function") receiver(...args);
      }
    };
    window.addEventListener(
      "react-portable-preview-message",
      this.handlerProxyListener,
    );
  }

  private removeHandlerProxy() {
    window.removeEventListener(
      "react-portable-preview-message",
      this.handlerProxyListener,
    );
  }
}

const serialize = (id: string) => (key: string, val: unknown) => {
  if (key === "children") return undefined;
  if (typeof val === "function") {
    return `__function__:${id}:${key}`;
  }
  return val;
};

interface ReactPortablePreviewAttributes {
  code: string;
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "react-portable-preview": DetailedHTMLProps<
        HTMLAttributes<HTMLElement> & ReactPortablePreviewAttributes,
        ReactPortablePreview
      >;
      "rp-outlet": DetailedHTMLProps<
        HTMLAttributes<HTMLElement>,
        ReactPortablePreview
      >;
      "rp-slot": DetailedHTMLProps<
        HTMLAttributes<HTMLElement>,
        ReactPortablePreview
      >;
    }
  }
}
