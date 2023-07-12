import { useEffect, useReducer, useRef, useId } from "react";
import { register } from "./register";

export const ReactPortable = ({
  entry,
  gateway,
}: {
  entry: string;
  gateway?: string;
}) => {
  const isMounted = useMounted();
  const id = useId();
  const ref = useRef("");
  if (!isMounted && typeof window !== "undefined") {
    ref.current = document.getElementById(id)?.innerText ?? "";
    register();
  }

  return (
    <react-portable
      gateway={gateway}
      entry={entry}
      id={id}
      dangerouslySetInnerHTML={{ __html: ref.current }}
    />
  );
};

const useMounted = () => {
  const [isMounted, mounted] = useReducer(() => true, false);
  useEffect(() => {
    mounted();
  }, []);

  return isMounted;
};
