import { useEffect, useReducer } from "react";

export const ReactPortable = ({
  src,
  force,
}: {
  src: string;
  force?: boolean;
}) => {
  const [isMounted, mounted] = useReducer(() => true, false);
  useEffect(() => {
    mounted();
  }, []);
  if (force) return <react-portable src={src} />;
  return <react-portable src={src} suspend={String(!isMounted)} />;
};
