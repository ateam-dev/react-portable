import { useEffect, useReducer } from "react";

export const ReactPortable = ({
  entry,
  force,
}: {
  entry: string;
  force?: boolean;
}) => {
  const [isMounted, mounted] = useReducer(() => true, false);
  useEffect(() => {
    mounted();
  }, []);
  if (force) return <react-portable entry={entry} />;
  return <react-portable entry={entry} suspend={String(!isMounted)} />;
};
