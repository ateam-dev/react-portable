import { ReactPortable } from "./react-portable";

export const registerReactPortable = () => {
  if (
    typeof window === "undefined" ||
    window.customElements.get("react-portable")
  )
    return;

  window.customElements.define("react-portable", ReactPortable);
};
