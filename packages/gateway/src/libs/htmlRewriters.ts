import inlineRegister from "@react-portable/client/browser?raw";
import inlinePreviewButton from "../statics/preview-button?raw";

export class FragmentBaseReplacer {
  static selector = `rp-fragment,rp-fragment>link[rel="stylesheet"],rp-fragment>link[rel="modulepreload"]`;

  element(element: Element) {
    const attributeName = element.tagName === "link" ? "href" : "q:base";

    const originalBasePath = element
      .getAttribute(attributeName)
      ?.replace(/^(?!\/)/, "/");

    element.setAttribute(attributeName, `/_fragments${originalBasePath}`);
  }
}

export class ActivateRpPreviewReplacer {
  static selector = "head";

  element(element: Element) {
    element.append(`<script>${inlineRegister}</script>`, { html: true });
    element.append(`<script type="module">${inlinePreviewButton}</script>`, {
      html: true,
    });
  }
}

export class OtherThanFragmentRemover {
  static selector = "*";
  private isOuterFragment = true;

  element(element: Element) {
    if (element.tagName === "rp-fragment") {
      this.isOuterFragment = false;
      element.onEndTag(() => {
        this.isOuterFragment = true;
      });
    }

    if (this.isOuterFragment) element.remove();
  }
}
