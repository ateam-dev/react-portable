import { FragmentBaseReplacer } from "./htmlRewriters";
import { parseFragmentId as _parseFragmentId } from "@react-portable/client";

type FragmentMap = Map<string, string>;
export type FragmentConfigs = Record<
  string,
  { origin: string; assetPath: string | null }
>;

let fragmentConfigs: FragmentConfigs;

export const prepareFragmentConfigs = (config: FragmentConfigs) => {
  fragmentConfigs = config;
};

export const getFragmentsForPiercing = async (
  ids: string[],
  handleRequest: (request: Request) => Promise<Response>
) => {
  const fragments: FragmentMap = new Map();

  await Promise.allSettled(
    ids.map(async (id) => {
      const { code, path } = parseFragmentId(id);
      const response = await handleRequest(fragmentRequest(code, path));
      const config = getFragmentConfig(code);
      const baseReplacer = new FragmentBaseReplacer(
        code,
        null,
        config.assetPath
      );
      const rewriter = new HTMLRewriter().on(
        baseReplacer.selector,
        baseReplacer
      );
      if (response.ok)
        fragments.set(id, await rewriter.transform(response).text());
    })
  );

  return fragments;
};

const parseFragmentId = (id: string) => {
  const { entry, gateway } = _parseFragmentId(id);
  const [, code, path] = entry.match(/^([^:]+):(.+)$/) ?? [];
  if (!code || !path) throw new Error(`invalid entry ${entry}`);

  return { entry, gateway, code, path };
};

const fragmentRequest = (code: string, path: string) => {
  const config = getFragmentConfig(code);
  return new Request(`${config.origin}${path}`);
};

export const getFragmentConfig = (code: string) => {
  const config = fragmentConfigs[code];
  if (!config) throw new Response(null, { status: 404 });
  return config;
};
