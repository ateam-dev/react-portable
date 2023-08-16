import { beforeEach, describe, expect, test } from "vitest";
import workers, { Env } from "./preview-worker";

const bindings: Env = getMiniflareBindings();

const dummyOriginBody = `<!DOCTYPE html>
<html>
  <head>
    <title>dummy page title</title>
  </head>
  <body>
    <h1>dummy page</h1>
    <react-portable-prereview code="code1">component #1</react-portable-prereview>
  </body>
</html>`;

const prepareOriginMock = () => {
  const fetchMock = getMiniflareFetchMock();
  fetchMock.disableNetConnect();

  // origin
  const origin = fetchMock.get("https://origin.com");
  origin.intercept({ method: "GET", path: "/" }).reply(200, dummyOriginBody, {
    headers: { "Content-Type": "text/html; charset=UTF-8" },
  });
  origin
    .intercept({ method: "GET", path: "/assets/index.js" })
    .reply(200, "console.log('this is asset')", {
      headers: { "Content-Type": "application/javascript; charset=UTF-8" },
    });

  // fragment
  const fragmentOrigin = fetchMock.get("https://fragment.com");
  fragmentOrigin
    .intercept({ method: "GET", path: "/build/index.js" })
    .reply(200, "console.log('this is mocked')", {
      headers: { "Content-Type": "application/javascript; charset=UTF-8" },
    });
  fragmentOrigin.intercept({ method: "POST", path: "/code1" }).reply(() => {
    return {
      statusCode: 200,
      data: `<rp-fragment q:base="/build/"><react-portable-prereview code="code1">modified component #1</react-portable-prereview></rp-fragment>`,
      responseOptions: {
        headers: { "Content-Type": "text/html; charset=UTF-8" },
      },
    };
  });
};

describe("POST request to /_fragments/:remote", () => {
  const encodedFragmentOrigin = encodeURIComponent("https://fragment.com");
  let ctx: ExecutionContext;
  beforeEach(() => {
    ctx = new ExecutionContext();
    prepareOriginMock();
  });
  test("If Content-Type is not HTML, it responds as is", async () => {
    const res = await workers.fetch(
      new Request(
        `http://localhost/_fragments/${encodeURIComponent(
          "https://fragment.com",
        )}/build/index.js`,
      ),
      bindings,
      ctx,
    );

    expect(res.headers.get("Content-Type")).toBe(
      "application/javascript; charset=UTF-8",
    );
  });
  test("q:base of <rp-fragment> is replaced", async () => {
    const res = await workers.fetch(
      new Request(
        `http://localhost/_fragments/${encodedFragmentOrigin}/code1`,
        { method: "POST" },
      ),
      bindings,
      ctx,
    );

    expect(await res.text()).toBe(
      `<rp-fragment q:base="/_fragments/${encodedFragmentOrigin}/build/"><react-portable-prereview code="code1">modified component #1</react-portable-prereview></rp-fragment>`,
    );
  });
});

describe("Request to the proxied origin", () => {
  let ctx: ExecutionContext;
  beforeEach(() => {
    ctx = new ExecutionContext();
    prepareOriginMock();
  });
  test("If Content-Type is not HTML, it responds as is", async () => {
    const res = await workers.fetch(
      new Request("http://localhost/assets/index.js"),
      bindings,
      ctx,
    );

    expect(res.headers.get("Content-Type")).toBe(
      "application/javascript; charset=UTF-8",
    );
  });
  test("The activate script for <rp-preview> is inserted", async () => {
    const res = await workers.fetch(
      new Request("http://localhost/"),
      bindings,
      ctx,
    );

    expect(await res.text()).toBe(`<!DOCTYPE html>
<html>
  <head>
    <title>dummy page title</title>
  <script>activate script</script></head>
  <body>
    <h1>dummy page</h1>
    <react-portable-prereview code="code1">component #1</react-portable-prereview>
  </body>
</html>`);
  });
  test("Additional scripts are appended to the head when a component server is specified.", async () => {
    const res = await workers.fetch(
      new Request("http://localhost/"),
      { ...bindings, COMPONENT_SERVER: "https://component.server.com" },
      ctx,
    );

    expect(await res.text()).toBe(`<!DOCTYPE html>
<html>
  <head>
    <title>dummy page title</title>
  <script>activate script</script><script>window._rpPreviewRemote = 'https://component.server.com'</script><script>rpPreview = () => Array.from(document.querySelectorAll('rp-preview')).forEach((el) => el.preview())</script></head>
  <body>
    <h1>dummy page</h1>
    <react-portable-prereview code="code1">component #1</react-portable-prereview>
  </body>
</html>`);
  });
});
