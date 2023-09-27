import React, {
  FunctionComponent,
  ComponentType,
  isValidElement,
  ReactNode,
  RefObject,
  useEffect,
  useReducer,
  useRef,
  Dispatch,
  ReducerAction,
  ForwardRefExoticComponent,
  forwardRef,
} from "react";
import { RpPreview } from "@react-portable/client/web-components";

export interface PreviewifyComponent<T = {}> extends FunctionComponent<T> {
  __code: string;
  __forQwik: FunctionComponent<T>;
}

type InferProps<T> = T extends ComponentType<infer U>
  ? U
  : T extends ForwardRefExoticComponent<infer U>
  ? U
  : T extends (props: infer U) => JSX.Element
  ? U
  : never;

type Reducer = (s: boolean, a: "open" | "close" | undefined) => boolean;

export const previewify = <
  T extends
    | ForwardRefExoticComponent<unknown>
    | ComponentType
    | ((props: any) => JSX.Element),
>(
  Component: T,
  code: string,
  option: { props?: InferProps<T> } = {},
): PreviewifyComponent<InferProps<T>> => {
  const Wrapped = forwardRef<any, InferProps<T>>((props, ref) => {
    const rpRef = useRef<RpPreview>(null);
    const [isPreviewing, dispatcher] = useReducer<Reducer>((s, a) => {
      // re-preview on hot reload
      if (s) rpRef.current?.preview();
      return a !== "close";
    }, false);

    useEffect(() => {
      window.previewifyDispatchers.add(dispatcher);
      return () => {
        window.previewifyDispatchers.delete(dispatcher);
      };
    }, []);

    return isPreviewing ? (
      <Previewify code={code} props={props} rpRef={rpRef}>
        {/* @ts-ignore */}
        <Component ref={ref} {...props} />
      </Previewify>
    ) : (
      // @ts-ignore
      <Component ref={ref} {...props} />
    );
  }) as unknown as PreviewifyComponent<InferProps<T>>;

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

if (typeof window !== "undefined") {
  window.previewifyDispatchers ||= new Set<Dispatch<ReducerAction<Reducer>>>();
}

declare global {
  interface Window {
    previewifyDispatchers: Set<Dispatch<ReducerAction<Reducer>>>;
  }
}
