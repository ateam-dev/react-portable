import { useEffect, useReducer } from "react";

export const ReactPortable = ({
  entry,
  force,
  gateway,
}: {
  entry: string;
  force?: boolean;
  gateway?: string;
}) => {
  const [isMounted, mounted] = useReducer(() => true, false);
  useEffect(() => {
    mounted();
  }, []);
  if (force) return <react-portable gateway={gateway} entry={entry} />;
  return (
    <react-portable
      gateway={gateway}
      entry={entry}
      suspend={String(!isMounted)}
    />
  );
};
