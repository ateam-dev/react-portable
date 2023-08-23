import inlineRegister from "@react-portable/client/dist/browser.umd?raw";
import inlinePreviewButton from "../statics/preview-button?raw";

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
