import Sample from "./Sample.react";
import { QwikifyOptions } from "@builder.io/qwik-react/lib/types/react/types";

import "./global.css";

export default Sample;

export const loader = (request: Request) => {
  const url = new URL(request.url);
  const n = url.searchParams.get("n");

  return { n: Number(n ?? "0") };
};

export const option: QwikifyOptions = {
  eagerness: "hover",
  event: ["focusin"],
};
