import { ReactPortablePreview } from "./element";

export const register = () => {
  if (
    typeof window === "undefined" ||
    window.customElements.get("react-portable-preview")
  )
    return;

  window.customElements.define("react-portable-preview", ReactPortablePreview);
};
