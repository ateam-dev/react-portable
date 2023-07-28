import React, { FunctionComponent, useEffect, useMemo, useRef } from "react";
import { ReactPortablePreview } from "@react-portable/client/web-components";
import { RequestEventCommon } from "@builder.io/qwik-city/middleware/request-handler";

export type Strategy = {
  revalidate?: false | 0 | number;
  hydrate?: "onUse" | "onIdle" | "disable";
};

type ErrorResponse = ReturnType<RequestEventCommon["error"]>;

export type Loader<T extends Record<string, unknown> = {}> = (
  r: Request,
  ctx: { error: RequestEventCommon["error"] },
) => T | ErrorResponse | Promise<T | ErrorResponse>;

export interface PortableComponent<T extends Record<string, unknown> = {}>
  extends FunctionComponent<T> {
  __code: string;
  __strategy: undefined | Strategy;
  __loader: undefined | Loader<T>;
}

type InferProps<T> = T extends FunctionComponent<infer U>
  ? U
  : T extends (props: infer U) => JSX.Element
  ? U
  : T extends () => JSX.Element
  ? {}
  : never;

export const portable = <
  T extends FunctionComponent | ((props: any) => JSX.Element),
>(
  Component: T,
  code: string,
  {
    loader,
    strategy,
    disablePreview = false,
  }: {
    loader?: Loader<InferProps<T>>;
    strategy?: Strategy;
    disablePreview?: boolean;
  } = {},
): PortableComponent<InferProps<T>> => {
  const Wrapped = (props: InferProps<T>) => {
    const ref = useRef<ReactPortablePreview>(null);
    useEffect(() => {
      if (!ref.current) return;

      ref.current.props = props;
      ref.current.rerender?.();
    }, [props]);

    if (disablePreview) return <Component {...(props as any)} />;

    return (
      <react-portable-preview ref={ref} code={code}>
        <Component
          {...(props as any)}
          children={<rp-outlet>{props.children}</rp-outlet>}
        />
      </react-portable-preview>
    );
  };

  Wrapped.__code = code;
  Wrapped.__loader = loader;
  Wrapped.__strategy = strategy;

  return Wrapped;
};
