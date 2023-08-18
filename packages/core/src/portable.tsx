import React, { FunctionComponent, useEffect, useRef } from "react";
import { RpPreview } from "@react-portable/client/web-components";
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
  __original: FunctionComponent<T>;
}

type InferProps<T> = T extends FunctionComponent<infer U>
  ? U
  : T extends (props: infer U) => JSX.Element
  ? U
  : T extends () => JSX.Element
  ? {}
  : never;

type PortableOption<
  T extends FunctionComponent | ((props: any) => JSX.Element),
> = {
  loader?: Loader<InferProps<T>>;
  strategy?: Strategy;
  disablePreview?: boolean;
};

export const portable = <
  T extends FunctionComponent | ((props: any) => JSX.Element),
>(
  Component: T,
  code: string,
  { loader, strategy, disablePreview = false }: PortableOption<T> = {},
): PortableComponent<InferProps<T>> => {
  const Wrapped = (props: InferProps<T>) => {
    const ref = useRef<RpPreview>(null);
    useEffect(() => {
      if (!ref.current) return;

      ref.current.props = props;
      ref.current.rerender?.();
    }, [props]);

    if (disablePreview) return <Component {...(props as any)} />;

    return (
      <rp-preview ref={ref} code={code}>
        <Component
          {...(props as any)}
          children={<rp-outlet>{props.children}</rp-outlet>}
        />
      </rp-preview>
    );
  };

  Wrapped.__code = code;
  Wrapped.__loader = loader;
  Wrapped.__strategy = strategy;
  Wrapped.__original = Component;

  return Wrapped;
};

export const previewify = <
  T extends FunctionComponent | ((props: any) => JSX.Element),
>(
  Component: T,
  code: string,
): PortableComponent<InferProps<T>> => {
  return portable(Component, code, { strategy: { hydrate: "onIdle" } });
};
