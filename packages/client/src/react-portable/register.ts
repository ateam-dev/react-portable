import { ReactPortable } from "./element";

export const register = () => {
  if (
    typeof window === "undefined" ||
    window.customElements.get("react-portable")
  )
    return;

  window.customElements.define("react-portable", ReactPortable);
};
