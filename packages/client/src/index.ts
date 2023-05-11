export {
  registerReactPortable,
  srcToFragmentId,
  fragmentIdToSrc,
} from "./react-portable";

import reactPortableInlineScriptRaw from "../dist/react-portable-inline-script.js?raw";
export const reactPortableInlineScript = `<script>(() => {${reactPortableInlineScriptRaw}})();</script>`;
