import { FragmentBaseReplacer } from "./htmlRewriters";
import { ReactPortable } from "@react-portable/client/web-components";

export type FragmentMap = Map<
  string,
  | { ok: true; body: string; status: number; statusText: string }
  | { ok: false; body: null; status: number; statusText: string }
>;
export type FragmentConfigs = Record<
  string,
  { endpoint: string; assetPath: string | null }
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
      if (!response.ok) {
        fragments.set(id, {
          ok: false,
          status: response.status,
          statusText: response.statusText,
          body: null,
        });
        return;
      }
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

      fragments.set(id, {
        ok: true,
        body: await rewriter.transform(response).text(),
        status: response.status,
        statusText: response.statusText,
      });
    })
  );

  return fragments;
};

const parseFragmentId = (id: string) => {
  const { entry, gateway } = ReactPortable.parseFragmentId(id);
  const [, code, path] = entry.match(/^([^:]+):(.+)$/) ?? [];
  if (!code || !path) throw new Error(`invalid entry ${entry}`);

  return { entry, gateway, code, path };
};

const fragmentRequest = (code: string, path: string) => {
  const config = getFragmentConfig(code);
  return new Request(`${config.endpoint}${path}`);
};

export const getFragmentConfig = (code: string) => {
  const config = fragmentConfigs[code];
  if (!config) throw new Response(null, { status: 404 });
  return config;
};
