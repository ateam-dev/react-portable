// @ts-ignore
import * as V from "react-portable:virtual";
import { qwikify$ } from "@builder.io/qwik-react";
export default qwikify$(V.default, V.option);
export const getProps = async (
  request: Request
): Promise<Record<string, unknown>> => {
  return (await V.loader?.(request)) ?? {};
};
