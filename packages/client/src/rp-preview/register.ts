import { RpOutlet, RpPreview, RpSlot } from "./element";

export const register = () => {
  if (typeof window === "undefined" || window.customElements.get("rp-preview"))
    return;

  window.customElements.define("rp-preview", RpPreview);
  window.customElements.define("rp-slot", RpSlot);
  window.customElements.define("rp-outlet", RpOutlet);
};
