import React, {
  FunctionComponent,
  ComponentType,
  isValidElement,
  ReactNode,
  RefObject,
  useEffect,
  useReducer,
  useRef,
} from "react";
import { RpPreview } from "@react-portable/client/web-components";

export interface PreviewifyComponent<T extends Record<string, unknown> = {}>
  extends FunctionComponent<T> {
  __code: string;
  __forQwik: FunctionComponent<T>;
}

type InferProps<T> = T extends ComponentType<infer U>
  ? U
  : T extends (props: infer U) => JSX.Element
  ? U
  : never;

export const previewify = <
  T extends ComponentType | ((props: any) => JSX.Element),
>(
  Component: T,
  code: string,
  option: { props?: InferProps<T> } = {},
): PreviewifyComponent<InferProps<T>> => {
  const Wrapped = (props: InferProps<T>) => {
    const ref = useRef<RpPreview>(null);
    const [isPreviewing, dispatch] = useReducer((status) => {
      if (status) ref.current?.preview();
      return true;
    }, false);
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
      <Previewify code={code} props={props} rpRef={ref}>
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

    return (
      <Component
        {...qwikifyProps(option.props ?? props, isServer, !!option.props)}
      />
    );
  };

  Wrapped.__code = code;
  Wrapped.__forQwik = ForQwik;

  return Wrapped;
};

const Previewify = ({
  code,
  rpRef,
  props,
  children,
}: {
  code: string;
  rpRef: RefObject<RpPreview>;
  children: ReactNode;
  props: Record<string, unknown>;
}) => {
  useEffect(() => {
    if (!rpRef.current) return;
    if (rpRef.current.previewing) rpRef.current.rerender(props);
    else rpRef.current.preview(props);
  }, [props]);

  return (
    <rp-preview code={code} ref={rpRef}>
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
  overwritten: boolean,
): T => {
  return Object.fromEntries(
    Object.entries(props).map(([key, val]) => {
      if (overwritten) return [key, val];
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

declare global {
  interface Window {
    rpPreviewDispatchers?: [string, VoidFunction][];
  }
}
