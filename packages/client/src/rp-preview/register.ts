import { RpPreview } from "./element";

export const register = () => {
  if (typeof window === "undefined" || window.customElements.get("rp-preview"))
    return;

  window.customElements.define("rp-preview", RpPreview);
};
