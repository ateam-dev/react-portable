import {
  createFragmentId,
  reactPortableInlineScript,
} from "@react-portable/client";

type FragmentMap = Map<string, string>;

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

    element.setInnerContent(fragment, { html: true });
    element.setAttribute("pierced", "");
  }
}

// append fragment templates to <head />
export class FragmentTemplatesAppender {
  public readonly selector = "head";

  constructor(private readonly fragments: FragmentMap) {}

  element(element: Element) {
    for (const [fragmentId, fragment] of this.fragments) {
      element.append(`<template id="${fragmentId}">${fragment}</template>`, {
        html: true,
      });
    }
  }
}

export class FragmentBaseReplacer {
  public readonly selector = "react-portable-fragment";

  constructor(
    private code: string,
    private gateway?: string | null,
    private assetPath?: string | null
  ) {}

  element(element: Element) {
    const originalBasePath =
      element.getAttribute("q:base")?.replace(/^(?!\/)/, "/") ?? "";
    element.setAttribute(
      "q:base",
      this.assetPath
        ? `${this.assetPath.replace(/\/$/, "")}${originalBasePath}`
        : `${this.gateway ?? ""}/_fragments/${this.code}${originalBasePath}`
    );
  }
}
