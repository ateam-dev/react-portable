import { ReactPortable } from "@react-portable/client/web-components";
import { CLASS_NAME_FOR_GATEWAY_CACHE } from "./constants";
import { FragmentMap } from "./fragments";
import inlineRegister from "@react-portable/client/dist/browser.umd?raw";
import inlinePreviewButton from "../statics/preview-button?raw";

// handler for <react-portable />
export class ReactPortablePiercer {
  public fragmentIds: Set<string> = new Set();
  public readonly selector = "react-portable";

  constructor(private readonly fragments: FragmentMap) {}

  async element(element: Element) {
    const entry = element.getAttribute("entry");
    const gateway = element.getAttribute("gateway");

    if (!entry) return;

    const fragmentId = ReactPortable.createFragmentId(entry, gateway);
    this.fragmentIds.add(fragmentId);

    const fragment = this.fragments.get(fragmentId);
    if (!fragment) return;

    if (fragment.ok) {
      element.setInnerContent(fragment.body, { html: true });
      element.setAttribute("pierced", "succeed");
    } else {
      element.setAttribute("pierced", "failed");
    }
  }
}

// append fragment templates to <head />
export class FragmentTemplatesAppender {
  public readonly selector = "head";

  constructor(private readonly fragments: FragmentMap) {}

  element(element: Element) {
    for (const [fragmentId, fragment] of this.fragments) {
      if (!fragment.ok) continue;
      element.append(
        `<template id="${fragmentId}" class="${CLASS_NAME_FOR_GATEWAY_CACHE}" >${fragment.body}</template>`,
        {
          html: true,
        },
      );
    }
  }
}

export class FragmentBaseReplacer {
  public readonly selector = `rp-fragment,rp-fragment>link[rel="stylesheet"],rp-fragment>link[rel="modulepreload"]`;

  constructor(
    private code: string,
    private gateway?: string | null,
    private assetPath?: string | null,
  ) {}

  element(element: Element) {
    const attributeName = element.tagName === "link" ? "href" : "q:base";

    const originalBasePath = element
      .getAttribute(attributeName)
      ?.replace(/^(?!\/)/, "/");

    if (!originalBasePath)
      throw new Error(
        element.tagName === "link"
          ? `rp-fragment > link has no href (code: ${this.code})`
          : `rp-fragment has no q:base (code: ${this.code})`,
      );

    element.setAttribute(
      attributeName,
      (this.assetPath
        ? `${this.assetPath}${originalBasePath}`
        : `${this.gateway ?? ""}/_fragments/${this.code}${originalBasePath}`
      ).replace(/(?<!https?:)\/\//g, "/"),
    );
  }
}

export class ActivateRpPreviewReplacer {
  public readonly selector = "head";

  element(element: Element) {
    element.append(`<script>${inlineRegister}</script>`, { html: true });
    element.append(`<script type="module">${inlinePreviewButton}</script>`, {
      html: true,
    });
  }
}
