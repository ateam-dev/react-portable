import {
  CLASS_NAME_FOR_GATEWAY_CACHE,
  createFragmentId,
} from "@react-portable/client";
import { FragmentMap } from "./fragments";

// handler for <react-portable />
export class ReactPortablePiercer {
  public fragmentIds: Set<string> = new Set();
  public readonly selector = "react-portable";

  constructor(private readonly fragments: FragmentMap) {}

  async element(element: Element) {
    const entry = element.getAttribute("entry");
    const gateway = element.getAttribute("gateway");

    if (!entry) return;

    const fragmentId = createFragmentId(entry, gateway);
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
        }
      );
    }
  }
}

export class FragmentBaseReplacer {
  public readonly selector = `react-portable-fragment,react-portable-fragment>link[rel="stylesheet"]`;

  constructor(
    private code: string,
    private gateway?: string | null,
    private assetPath?: string | null
  ) {}

  element(element: Element) {
    const attributeName = element.tagName === "link" ? "href" : "q:base";

    const originalBasePath = element
      .getAttribute(attributeName)
      ?.replace(/^(?!\/)/, "/");

    if (!originalBasePath)
      throw new Error(
        element.tagName === "link"
          ? `react-portable-fragment > link has no href (code: ${this.code})`
          : `react-portable-fragment has no q:base (code: ${this.code})`
      );

    element.setAttribute(
      attributeName,
      this.assetPath
        ? `${this.assetPath.replace(/\/$/, "")}${originalBasePath}`
        : `${this.gateway ?? ""}/_fragments/${this.code}${originalBasePath}`
    );
  }
}
