import { beforeEach, describe, expect, test } from "vitest";
import workers, { Env } from "./worker";

const bindings: Env = getMiniflareBindings();

const dummyOriginBody = `<!DOCTYPE html>
<html>
  <head>
    <title>dummy page title</title>
  </head>
  <body>
    <h1>dummy page</h1>
    <rp-prereview code="code1">component #1</rp-prereview>
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
  const fragmentOrigin = fetchMock.get("https://fragments.com");
  fragmentOrigin
    .intercept({ method: "GET", path: "/_fragments/build/index.js" })
    .reply(200, "console.log('this is mocked')", {
      headers: { "Content-Type": "application/javascript; charset=UTF-8" },
    });
  fragmentOrigin
    .intercept({ method: "POST", path: "/_fragments/code1" })
    .reply(() => {
      return {
        statusCode: 200,
        data: `<rp-fragment q:base="/build/">modified component #1</rp-fragment><script>console.log('for debug')</script>`,
        responseOptions: {
          headers: { "Content-Type": "text/html; charset=UTF-8" },
        },
      };
    });
};

describe("POST request to /_fragments/*", () => {
  beforeEach(() => {
    prepareOriginMock();
  });
  test("If Content-Type is not HTML, it responds as is", async () => {
    const res = await workers.fetch(
      new Request(`http://localhost/_fragments/build/index.js`),
      bindings,
    );

    expect(res.headers.get("Content-Type")).toBe(
      "application/javascript; charset=UTF-8",
    );
  });
  test("q:base of <rp-fragment> is replaced", async () => {
    const res = await workers.fetch(
      new Request(`http://localhost/_fragments/code1`, { method: "POST" }),
      bindings,
    );

    expect(await res.text()).toBe(
      `<rp-fragment q:base="/_fragments/build/">modified component #1</rp-fragment>`,
    );
  });
});

describe("Request to the proxied origin", () => {
  beforeEach(() => {
    prepareOriginMock();
  });
  test("If Content-Type is not HTML, it responds as is", async () => {
    const res = await workers.fetch(
      new Request("http://localhost/assets/index.js"),
      bindings,
    );

    expect(res.headers.get("Content-Type")).toBe(
      "application/javascript; charset=UTF-8",
    );
  });
  test("The activate script for <rp-preview> is inserted", async () => {
    const res = await workers.fetch(new Request("http://localhost/"), bindings);

    expect(await res.text()).toBe(`<!DOCTYPE html>
<html>
  <head>
    <title>dummy page title</title>
  </head>
  <body>
    <h1>dummy page</h1>
    <rp-prereview code="code1">component #1</rp-prereview>
  <script>activate script</script><script type="module">preview button</script></body>
</html>`);
  });
});
