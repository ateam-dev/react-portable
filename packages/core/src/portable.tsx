import React, {
  FunctionComponent,
  isValidElement,
  ReactNode,
  useEffect,
  useId,
  useReducer,
  useRef,
} from "react";
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
  __forQwik: FunctionComponent<T>;
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
};

export const portable = <
  T extends FunctionComponent | ((props: any) => JSX.Element),
>(
  Component: T,
  code: string,
  { loader, strategy }: PortableOption<T> = {},
): PortableComponent<InferProps<T>> => {
  const Wrapped = (props: InferProps<T>) => {
    const id = useId();
    const [isPreviewing, dispatch] = useReducer(() => true, false);
    useEffect(() => {
      window.rpPreviewDispatchers ||= [];
      window.rpPreviewDispatchers.push([code, dispatch]);
      return () => {
        window.rpPreviewDispatchers = window.rpPreviewDispatchers?.filter(
          ([c, d]) => !(c === code && d === dispatch),
        );
      };
    }, []);

    return isPreviewing ? (
      <Previewify code={code} props={props}>
        <Component {...props} />
      </Previewify>
    ) : (
      <Component {...props} />
    );
  };

  const ForQwik = (props: InferProps<T>) => {
    const [isServer, dispatch] = useReducer(() => false, true);
    useEffect(() => {
      dispatch();
    }, []);

    return <Component {...qwikifyProps(props, isServer)} />;
  };

  Wrapped.__code = code;
  Wrapped.__loader = loader;
  Wrapped.__strategy = strategy;
  Wrapped.__forQwik = ForQwik;

  return Wrapped;
};

const Previewify = ({
  code,
  props,
  children,
}: {
  code: string;
  children: ReactNode;
  props: Record<string, unknown>;
}) => {
  const ref = useRef<RpPreview>(null);
  useEffect(() => {
    if (!ref.current) return;
    if (ref.current.previewing) ref.current.rerender(props);
    else ref.current.preview(props);
  }, [props]);

  return (
    <rp-preview code={code} ref={ref}>
      <rp-preview-area>{children}</rp-preview-area>
      <template>{rpOutlets(props).map((el) => el)}</template>
    </rp-preview>
  );
};

const rpOutlets = <T extends Record<string, unknown>>(
  props: T,
): JSX.Element[] => {
  return Object.entries(props).flatMap(([k, v]) => {
    if (
      isValidElement(v) ||
      (Array.isArray(v) && v.length > 0 && v.every(isValidElement))
    )
      return <rp-outlet key={k} _key={k} children={v} />;

    return [];
  });
};

const qwikifyProps = <T extends Record<string, unknown>>(
  props: T,
  ssr: boolean,
): T => {
  return Object.fromEntries(
    Object.entries(props).map(([key, val]) => {
      if (key === "children" || val === "__outlet__")
        return [key, ssr ? null : <rp-slot _key={key} />];

      if (typeof val !== "string") return [key, val];

      const [, uuid, name] = val.match(/__function__#(.*)#(.*)/) ?? [];
      if (uuid && name) {
        return [
          key,
          (...args: unknown[]) =>
            document
              .querySelector(`rp-preview[id="${uuid}"]`)
              ?.dispatchEvent(new CustomEvent(name, { detail: { key, args } })),
        ];
      }

      return [key, val];
    }),
  ) as T;
};

export const previewify = <
  T extends FunctionComponent | ((props: any) => JSX.Element),
>(
  Component: T,
  code: string,
): PortableComponent<InferProps<T>> => {
  return portable(Component, code, { strategy: { hydrate: "onIdle" } });
};

declare global {
  interface Window {
    rpPreviewDispatchers?: [string, VoidFunction][];
  }
}
