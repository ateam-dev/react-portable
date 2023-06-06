import React from "react";
import { useArgs, useParameter } from "@storybook/manager-api";
import { AddonPanel } from "@storybook/components";
import { PanelContent, PanelContentProps } from "./components/PanelContent";
import { PARAM_KEY } from "./constants";

interface PanelProps {
  active: boolean;
}

export type Params = PanelContentProps & { paramKeys?: string[] };

export const Panel: React.FC<PanelProps> = (props) => {
  const params = useParameter<Params | undefined>(PARAM_KEY);
  const [args] = useArgs();

  if (!params?.path || !props.active) return null;

  const search = new URLSearchParams(
    Object.fromEntries(
      Object.entries(args).filter(([key]) => params.paramKeys?.includes(key))
    )
  );

  return (
    <AddonPanel {...props}>
      <PanelContent {...params} path={params.path + `?${search.toString()}`} />
    </AddonPanel>
  );
};
