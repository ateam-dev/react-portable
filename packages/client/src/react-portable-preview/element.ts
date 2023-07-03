import WritableDOM from "writable-dom";
import type { DetailedHTMLProps, HTMLAttributes } from "react";

if (typeof globalThis.HTMLElement === "undefined") {
  // @ts-ignore
  globalThis.HTMLElement = class {};
}

export class ReactPortablePreview extends HTMLElement {
  private remote = "";
  private _props: Record<string, unknown> = {};

  public set props(p: Record<string, unknown> | null | undefined) {
    this._props = p ?? {};
  }
  public get props() {
    return this._props;
  }

  public async preview(remote: string) {
    this.remote = remote;
    const code = this.getAttribute("code");

    if (!code) {
      throw new Error("react-portable-preview: The code is not set.");
    }

    return this.render(remote, code);
  }

  public async rerender() {
    if (this.remote) return this.preview(this.remote);
  }

  private async render(remote: string, code: string) {
    const fragment = await this.fetchFragmentStream(remote, code);
    if (!fragment.body || !fragment.ok) {
      throw new Error(`react-portable-preview: Failed to retrieve fragment`);
    }
    await this.piercing(fragment.body);
  }

  private async fetchFragmentStream(remote: string, code: string) {
    const url = `${window.location.origin}/_fragments/${encodeURIComponent(
      remote
    )}/${code}`;
    const request = new Request(url);

    return fetch(request, {
      body: JSON.stringify(this._props),
      method: "POST",
    });
  }

  private async piercing(fragmentStream: ReadableStream) {
    this.innerHTML = "";

    await fragmentStream
      .pipeThrough(new TextDecoderStream())
      .pipeTo(new WritableDOM(this));
  }
}

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
    }
  }
}
