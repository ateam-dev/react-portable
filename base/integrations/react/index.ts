import Sample from "./Sample.react";
import { RequestEventLoader } from "@builder.io/qwik-city/middleware/request-handler";
import { QwikifyOptions } from "@builder.io/qwik-react/lib/types/react/types";

export default Sample;

export const loader = ({ query }: RequestEventLoader) => {
  const n = query.get("n");

  return { n: Number(n ?? "0") };
};

export const option: QwikifyOptions = {
  eagerness: "hover",
  event: ["focusin"],
};
