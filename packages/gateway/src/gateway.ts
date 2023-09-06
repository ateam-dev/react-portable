import {
  ActivateRpPreviewReplacer,
  FragmentBaseReplacer,
  OtherThanFragmentRemover,
} from "./libs/htmlRewriters";

const proxy = (request: Request, remote: string): Request => {
  const url = new URL(request.url);
  const { host, port, protocol } = new URL(remote);

  url.host = host;
  url.port = port;
  url.protocol = protocol;

  return new Request(url, request);
};

const isHTMLResponse = (res: Response) => {
  return !res.headers.get("content-type")?.includes("text/html");
};

export const gateway = ({
  originEndpoint,
  fragmentsEndpoint,
}: {
  originEndpoint: string;
  fragmentsEndpoint: string;
}) => {
  return async (req: Request) => {
    const isFragmentReq = /^\/(_fragments|node_modules)\//.test(
      new URL(req.url).pathname,
    );

    const remote = isFragmentReq ? fragmentsEndpoint : originEndpoint;
    const proxyReq = proxy(req, remote);

    const response = await fetch(proxyReq);

    if (isHTMLResponse(response) || !response.ok) return response;

    const rewriter = isFragmentReq
      ? new HTMLRewriter()
          .on(FragmentBaseReplacer.selector, new FragmentBaseReplacer())
          .on(OtherThanFragmentRemover.selector, new OtherThanFragmentRemover())
      : new HTMLRewriter().on(
          ActivateRpPreviewReplacer.selector,
          new ActivateRpPreviewReplacer(),
        );

    return rewriter.transform(response);
  };
};
