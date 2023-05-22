import { beforeEach, describe, expect, Mock, test, vi } from "vitest";
import workers from "./index";
import * as swr from "./libs/swr";
import { parse } from "node-html-parser";

const bindings = getMiniflareBindings();

vi.mock("./libs/swr");

const dummyOriginBody = `<!DOCTYPE html>
<html>
  <head>
    <title>dummy page title</title>
  </head>
  <body>
    <h1>dummy page</h1>
  </body>
</html>`;

const dummyOriginBodyWithReactPortables = `<!DOCTYPE html>
<html>
  <head>
    <title>dummy page title</title>
  </head>
  <body>
    <h1>dummy page</h1>
    <react-portable entry="f1:/component1"></react-portable>
    <react-portable entry="f1:/component2" gateway="https://gw1.com"></react-portable>
    <react-portable entry="f2:/component1"></react-portable>
    <react-portable entry="f2:/component2" gateway="https://gw2.com"></react-portable>
  </body>
</html>`;

const dummyOriginBodyWithReactPortablesModified = `<!DOCTYPE html>
<html>
  <head>
    <title>dummy page title</title>
  </head>
  <body>
    <h1>dummy page</h1>
    <react-portable entry="f1:/component1" gateway="https://gw1.com"></react-portable>
    <react-portable entry="f1:/component2"></react-portable>
    <react-portable entry="f2:/component1" gateway="https://gw2.com"></react-portable>
    <react-portable entry="f2:/component2"></react-portable>
  </body>
</html>`;

const prepareOriginMock = () => {
  const fetchMock = getMiniflareFetchMock();
  fetchMock.disableNetConnect();
  // origin
  const origin = fetchMock.get("https://origin.com");
  origin
    .intercept({ method: "GET", path: "/" })
    .reply(200, dummyOriginBodyWithReactPortables, {
      headers: { "Content-Type": "text/html; charset=UTF-8" },
    });
  origin
    .intercept({ method: "GET", path: "/no-react-portable" })
    .reply(200, dummyOriginBody, {
      headers: { "Content-Type": "text/html; charset=UTF-8" },
    });
  origin
    .intercept({ method: "GET", path: "/assets/index.js" })
    .reply(200, "console.log('this is asset')", {
      headers: { "Content-Type": "application/javascript; charset=UTF-8" },
    });

  // plane fragment remote server (no assetPath)
  const f1Origin = fetchMock.get("https://f1.com");
  f1Origin
    .intercept({ method: "GET", path: "/build/index.js" })
    .reply(200, "console.log('this is mocked')", {
      headers: { "Content-Type": "application/javascript; charset=UTF-8" },
    });
  f1Origin
    .intercept({ method: "GET", path: "/component1" })
    .reply(
      200,
      `<react-portable-fragment q:base="/build/">f1 component #1</react-portable-fragment>`,
      {
        headers: { "Content-Type": "text/html; charset=UTF-8" },
      }
    );
  f1Origin
    .intercept({ method: "GET", path: "/component2" })
    .reply(
      200,
      `<react-portable-fragment q:base="/build/">f1 component #2</react-portable-fragment>`,
      {
        headers: { "Content-Type": "text/html; charset=UTF-8" },
      }
    );

  // fragment remote server has assetPath
  const f2Origin = fetchMock.get("https://f2.com");
  f2Origin
    .intercept({ method: "GET", path: "/component1" })
    .reply(
      200,
      `<react-portable-fragment q:base="/build/">f2 component #1</react-portable-fragment>`,
      {
        headers: { "Content-Type": "text/html; charset=UTF-8" },
      }
    );
  f2Origin
    .intercept({ method: "GET", path: "/component2" })
    .reply(
      200,
      `<react-portable-fragment q:base="/build/">f2 component #2</react-portable-fragment>`,
      {
        headers: { "Content-Type": "text/html; charset=UTF-8" },
      }
    );

  return origin;
};

describe("OPTION(preflight) request", () => {
  test("Returns a response with CORS headers attached", async () => {
    const res = await workers.fetch(
      new Request("http://localhost", { method: "OPTIONS" }),
      bindings
    );

    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(res.headers.get("Access-Control-Allow-Methods")).toBe(
      "GET, HEAD, OPTIONS"
    );
    expect(res.headers.get("Access-Control-Allow-Headers")).toBe(
      `Content-Type, Accept, X-React-Portable-Gateway`
    );
  });
});

describe("GET request to /_fragments/:code", () => {
  let revalidateMock: Mock;
  let ctx: ExecutionContext;
  beforeEach(() => {
    revalidateMock = vi.fn();
    vi.spyOn(swr, "swr").mockImplementation(async (req, _fetch) => {
      const response = await _fetch(req);
      return { response, revalidate: revalidateMock };
    });

    ctx = new ExecutionContext();

    prepareOriginMock();
  });

  test("swr's revalidate is executed with untilWait", async () => {
    await workers.fetch(
      new Request("http://localhost/_fragments/f1/component1"),
      bindings,
      ctx
    );
    await getMiniflareWaitUntil(ctx);

    expect(revalidateMock).toBeCalled();
  });
  test("If Content-Type is not HTML, it responds as is", async () => {
    const res = await workers.fetch(
      new Request("http://localhost/_fragments/f1/build/index.js"),
      bindings,
      ctx
    );

    expect(res.headers.get("Content-Type")).toBe(
      "application/javascript; charset=UTF-8"
    );
  });
  test("CORS headers are attached regardless of Content-Type", async () => {
    // assets request
    const res = await workers.fetch(
      new Request("http://localhost/_fragments/f1/build/index.js"),
      bindings,
      ctx
    );

    expect(res.headers.get("Content-Type")).toBe(
      "application/javascript; charset=UTF-8"
    );
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(res.headers.get("Access-Control-Allow-Methods")).toBe(
      "GET, HEAD, OPTIONS"
    );
    expect(res.headers.get("Access-Control-Allow-Headers")).toBe(
      `Content-Type, Accept, X-React-Portable-Gateway`
    );

    // fragment component request
    const res2 = await workers.fetch(
      new Request("http://localhost/_fragments/f1/component1"),
      bindings,
      ctx
    );

    expect(res2.headers.get("Content-Type")).toBe("text/html; charset=UTF-8");
    expect(res2.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(res2.headers.get("Access-Control-Allow-Methods")).toBe(
      "GET, HEAD, OPTIONS"
    );
    expect(res2.headers.get("Access-Control-Allow-Headers")).toBe(
      `Content-Type, Accept, X-React-Portable-Gateway`
    );
  });
  test("q:base of <react-portable-fragment> is replaced", async () => {
    const res = await workers.fetch(
      new Request("http://localhost/_fragments/f1/component1"),
      bindings,
      ctx
    );

    expect(await res.text()).toBe(
      `<react-portable-fragment q:base="/_fragments/f1/build/">f1 component #1</react-portable-fragment>`
    );
  });
  test("Replacement of q:base by assetPath information", async () => {
    const res = await workers.fetch(
      new Request("http://localhost/_fragments/f2/component1"),
      bindings,
      ctx
    );

    expect(await res.text()).toBe(
      `<react-portable-fragment q:base="https://assets.f2.com/statics/build/">f2 component #1</react-portable-fragment>`
    );
  });
  test("Replacement of q:base by request and header's gateway data", async () => {
    const res = await workers.fetch(
      new Request("http://localhost/_fragments/f1/component1", {
        headers: {
          "X-React-Portable-Gateway": "https://f1.gw.com",
        },
      }),
      bindings,
      ctx
    );

    expect(await res.text()).toBe(
      `<react-portable-fragment q:base="https://f1.gw.com/_fragments/f1/build/">f1 component #1</react-portable-fragment>`
    );
  });
  test("If both assetPath information and request and header's gateway data are present, assetPath is prioritized", async () => {
    const res = await workers.fetch(
      new Request("http://localhost/_fragments/f2/component1", {
        headers: {
          "X-React-Portable-Gateway": "https://f2.gw.com",
        },
      }),
      bindings,
      ctx
    );

    expect(await res.text()).toBe(
      `<react-portable-fragment q:base="https://assets.f2.com/statics/build/">f2 component #1</react-portable-fragment>`
    );
  });
});

const kvIsolateDescribe = setupMiniflareIsolatedStorage();

describe("Request to the origin", () => {
  let revalidateMock: Mock;
  let ctx: ExecutionContext;
  let mockedOrigin: ReturnType<typeof prepareOriginMock>;
  beforeEach(() => {
    revalidateMock = vi.fn();
    vi.spyOn(swr, "swr").mockImplementation(async (req, _fetch) => {
      const response = await _fetch(req);
      return { response, revalidate: revalidateMock };
    });

    ctx = new ExecutionContext();

    mockedOrigin = prepareOriginMock();
  });
  test("If <react-portable> is not included, it responds as is", async () => {
    const res = await workers.fetch(
      new Request("http://localhost/no-react-portable"),
      bindings,
      ctx
    );
    expect(await res.text()).toBe(dummyOriginBody);
  });
  test("If Content-Type is not HTML, it responds as is", async () => {
    const res = await workers.fetch(
      new Request("http://localhost/assets/index.js"),
      bindings,
      ctx
    );

    expect(res.headers.get("Content-Type")).toBe(
      "application/javascript; charset=UTF-8"
    );
  });
  describe("When <react-portable> is included", () => {
    kvIsolateDescribe(
      "First request (when fragmentIdList is not in KV)",
      () => {
        test("Returns the response as is, and stores fragmentIdList in KV with untilWait", async () => {
          const { FRAGMENTS_LIST } = getMiniflareBindings();
          await workers.fetch(new Request("http://localhost/"), bindings, ctx);

          await getMiniflareWaitUntil(ctx);

          const savedIdList = await FRAGMENTS_LIST.get(
            "https://origin.com/",
            "json"
          );
          expect(savedIdList.length).toBe(4);
        });
      }
    );
    kvIsolateDescribe(
      "Request from the second time onward (when fragmentIdList is in KV)",
      () => {
        beforeEach(async () => {
          // first access (for prepare fragmentIdList on KV)
          await workers.fetch(new Request("http://localhost/"), bindings, ctx);
          await getMiniflareWaitUntil(ctx);

          prepareOriginMock();
        });

        test("<react-portable-fragment> is inserted into <react-portable>", async () => {
          const res = await workers.fetch(
            new Request("http://localhost/"),
            bindings,
            ctx
          );

          const text = await res.text();

          // no gateway & remote server has no assetPath => default piercing
          expect(text).toMatch(
            '<react-portable entry="f1:/component1" pierced=""><react-portable-fragment q:base="/_fragments/f1/build/">f1 component #1</react-portable-fragment></react-portable>'
          );

          // has gateway & remote server has no assetPath => default piercing (gateway is ignored)
          expect(text).toMatch(
            '<react-portable entry="f1:/component2" gateway="https://gw1.com" pierced=""><react-portable-fragment q:base="/_fragments/f1/build/">f1 component #2</react-portable-fragment></react-portable>'
          );

          // no gateway & remote server has no assetPath => piercing with assetPath
          expect(text).toMatch(
            '<react-portable entry="f2:/component1" pierced=""><react-portable-fragment q:base="https://assets.f2.com/statics/build/">f2 component #1</react-portable-fragment></react-portable>'
          );

          // has gateway & remote server has no assetPath => piercing with assetPath (gateway is ignored)
          expect(text).toMatch(
            '<react-portable entry="f2:/component2" gateway="https://gw2.com" pierced=""><react-portable-fragment q:base="https://assets.f2.com/statics/build/">f2 component #2</react-portable-fragment></react-portable>'
          );
        });
        test("swr's revalidate is executed with untilWait", async () => {
          await workers.fetch(new Request("http://localhost/"), bindings, ctx);
          await getMiniflareWaitUntil(ctx);

          expect(revalidateMock).toBeCalledTimes(4);
        });
        test("<template> of each fragment is inserted in <head>", async () => {
          const res = await workers.fetch(
            new Request("http://localhost/"),
            bindings,
            ctx
          );

          const html = parse(await res.text());
          expect(html.querySelectorAll("head > template").length).toBe(4);
          for (const template of html.querySelectorAll("template")) {
            expect(template.innerHTML).toMatch(/react-portable-fragment/);
          }
        });
      }
    );
  });
});
