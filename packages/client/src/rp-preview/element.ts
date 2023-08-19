import WritableDOM from "writable-dom";
import type { DetailedHTMLProps, HTMLAttributes } from "react";

if (typeof globalThis.HTMLElement === "undefined") {
  // @ts-ignore
  globalThis.HTMLElement = class {};
}

export class RpPreview extends HTMLElement {
  public previewing = false;
  private uuid = "";
  private code = "";
  public props: Record<string, unknown> = {};
  private outlets: Record<string, HTMLElement> | null = null;
  private fetching = false;
  private previousRequestBody = "";
  private handlerProxyListener: VoidFunction | EventListener = () => {};

  private connectedCallback() {
    this.uuid ||= crypto.randomUUID();

    const code = this.getAttribute("code");
    if (!code) {
      console.error("rp-preview: The code is not set.");
      return;
    }
    this.code = code;

    this.addHandlerProxy();
  }

  private disconnectedCallback() {
    this.removeHandlerProxy();
  }

  public async preview() {
    this.previewing = true;

    return this.render(true);
  }

  public async rerender(force = false) {
    if (this.previewing) return this.render(force);
  }

  private async render(force = false) {
    if (this.fetching) return;

    const requestBody = JSON.stringify(this.props, serialize(this.uuid));

    if (requestBody !== this.previousRequestBody || force) {
      this.fetching = true;
      try {
        this.storeOutlets();

        const fragment = await this.fetchFragmentStream(requestBody);
        if (!fragment.body || !fragment.ok) {
          throw new Error(`rp-preview: Failed to retrieve fragment`);
        }
        await this.piercing(fragment.body);

        this.restoreOutletsToSlots();
      } finally {
        this.fetching = false;
      }
    }

    this.previousRequestBody = requestBody;
  }

  private async fetchFragmentStream(body: string) {
    const url = `${window.location.origin}/_fragments/${this.code}`;
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

  private storeOutlets() {
    this.outlets ||= Object.fromEntries(
      Array.from(this.querySelectorAll<HTMLElement>("rp-outlet")).map((el) => [
        el.getAttribute("_key"),
        el,
      ]),
    );
  }

  private restoreOutletsToSlots() {
    Array.from(this.querySelectorAll<HTMLElement>("rp-slot")).forEach(
      (slot) => {
        if (!this.outlets) return;
        const outlet = this.outlets[slot.getAttribute("_key")!];
        if (outlet) slot.appendChild(outlet);
      },
    );
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
    window.addEventListener("rp-preview-message", this.handlerProxyListener);
  }

  private removeHandlerProxy() {
    window.removeEventListener("rp-preview-message", this.handlerProxyListener);
  }
}

const serialize = (id: string) => (key: string, val: unknown) => {
  if (isRpOutletProps(val)) {
    return `__outlet__`;
  }
  if (typeof val === "function") {
    return `__function__:${id}:${key}`;
  }
  return val;
};

const isRpOutletProps = (value: unknown) => {
  return (
    value != null &&
    typeof value === "object" &&
    "type" in value &&
    "props" in value
  );
};

interface RpPreviewAttributes {
  code: string;
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "rp-preview": DetailedHTMLProps<
        HTMLAttributes<HTMLElement> & RpPreviewAttributes,
        RpPreview
      >;
      "rp-outlet": DetailedHTMLProps<
        HTMLAttributes<HTMLElement> & { _key: string },
        HTMLElement
      >;
      "rp-slot": DetailedHTMLProps<
        HTMLAttributes<HTMLElement> & { _key: string },
        HTMLElement
      >;
    }
  }
}
