import WritableDOM from "writable-dom";
import type { DetailedHTMLProps, HTMLAttributes } from "react";

if (typeof globalThis.HTMLElement === "undefined") {
  // @ts-ignore
  globalThis.HTMLElement = class {};
}

export class RpSlot extends HTMLElement {
  connectedCallback() {
    const parentRpPreview = this.closest<RpPreview>("rp-preview");
    if (parentRpPreview) {
      const key = this.getAttribute("_key")!;
      const outlet = parentRpPreview.outlets?.[key];
      if (outlet) this.appendChild(outlet);
    }
  }
}

export class RpOutlet extends HTMLElement {
  connectedCallback() {
    const parentRpPreview = this.closest<RpPreview>("rp-preview");
    if (parentRpPreview) {
      const key = this.getAttribute("_key")!;
      parentRpPreview.outlets[key] = this;
    }
  }
}

export class RpPreview extends HTMLElement {
  public previewing = false;
  private uuid = "";
  private code = "";
  public props: Record<string, unknown> = {};
  public outlets: Record<string, RpOutlet> = {};
  private fetching = false;
  private previousRequestBody = "";
  private readonly customEventName = "rp-preview-event";
  private previewArea = document.createElement("pr-preview-area");

  private connectedCallback() {
    this.uuid ||= randomId();
    this.setAttribute("id", this.uuid);
    const area = this.querySelector<HTMLElement>("rp-preview-area");
    if (!area) {
      console.error("rp-preview: <rp-preview-area /> is not set.");
      return;
    }
    this.previewArea = area;

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

  public async preview(props?: Record<string, unknown>) {
    this.previewing = true;
    if (props) this.props = props;

    return this.render(true);
  }

  public async rerender(props?: Record<string, unknown>, force = false) {
    if (props) this.props = props;

    if (this.previewing) return this.render(force);
  }

  private async render(force = false) {
    if (this.fetching) return;

    const requestBody = JSON.stringify(
      this.props,
      this.serializeProps.bind(this),
    );

    if (requestBody !== this.previousRequestBody || force) {
      this.fetching = true;
      try {
        const fragment = await this.fetchFragmentStream(requestBody);
        if (!fragment.body || !fragment.ok) {
          throw new Error(`rp-preview: Failed to retrieve fragment`);
        }
        await this.piercing(fragment.body);
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
      headers: { accept: "text/html" },
    });
  }

  private async piercing(fragmentStream: ReadableStream) {
    if (!this.previewArea) return;
    this.previewArea.innerHTML = "";

    await fragmentStream
      .pipeThrough(new TextDecoderStream())
      .pipeTo(new WritableDOM(this.previewArea));
  }

  private addHandlerProxy() {
    this.addEventListener(this.customEventName, this.handlerProxyListener);
  }

  private removeHandlerProxy() {
    this.removeEventListener(this.customEventName, this.handlerProxyListener);
  }

  private handlerProxyListener(e: Event) {
    if (!("detail" in e)) return;

    const { key, args } = e.detail as {
      key: string;
      args: unknown[];
    };

    const receiver = this.props[key];
    if (typeof receiver === "function") receiver(...args);
  }

  private serializeProps(_: string, val: unknown) {
    const isElementProps =
      val != null && typeof val === "object" && "type" in val && "props" in val;

    if (isElementProps) {
      return `__outlet__`;
    }
    if (typeof val === "function") {
      return `__function__#${this.uuid}#${this.customEventName}`;
    }
    return val;
  }
}

const randomId = () =>
  window.__previewifyDebug
    ? "dummy-uuid"
    : Date.now().toString(36) + Math.random().toString(36).substring(2, 10);

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
      "rp-preview-area": DetailedHTMLProps<
        HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      "rp-outlet": DetailedHTMLProps<
        HTMLAttributes<HTMLElement> & { _key: string },
        RpOutlet
      >;
      "rp-slot": DetailedHTMLProps<
        HTMLAttributes<HTMLElement> & { _key: string },
        RpSlot
      >;
    }
  }
  interface Window {
    __previewifyDebug?: boolean;
  }
}
