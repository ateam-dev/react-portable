/** @jsxImportSource react */
// @ts-ignore
import * as V from "react-portable:virtual";
import { qwikify$ } from "@builder.io/qwik-react";
const R = V.default;
const Component = ({ _props }: { _props: Record<string, unknown> }) => (
  <R {..._props} />
);
export default qwikify$(Component, V.option);
export const getProps = async (
  request: Request
): Promise<Record<string, unknown>> => {
  return (await V.loader?.(request)) ?? {};
};
