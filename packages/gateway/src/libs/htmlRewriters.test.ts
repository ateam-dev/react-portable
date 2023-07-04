import {
  ActivateReactPortablePreviewReplacer,
  FragmentBaseReplacer,
  FragmentTemplatesAppender,
  ReactPortablePiercer,
} from "./htmlRewriters";
import { ReactPortable } from "@react-portable/client/web-components";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { FragmentMap } from "./fragments";

const hostDummyResponseBody = `<!DOCTYPE html>
<html>
  <head>
    <title>dummy page title</title>
  </head>
  <body>
    <h1>dummy page</h1>
    <react-portable entry="f1:/component1" gateway="https://gw1.com"></react-portable>
    <react-portable entry="f2:/component2"></react-portable>
    <react-portable entry="f3:/component3">has inner text</react-portable>
    <react-portable>this is bad component (no entry attribute)</react-portable>
    <react-portablee entry="f3:/component3">this is bad component (typo)</react-portablee>
    <react-portable entry="f4:/component4">this is bad component (response status is 404)</react-portable>
  </body>
</html>
`;

const fragmentIdMapping: FragmentMap = new Map([
  [
    ReactPortable.createFragmentId("f1:/component1", "https://gw1.com"),
    {
      ok: true,
      body: `<react-portable-fragment>this is component1</react-portable-fragment>`,
      status: 200,
      statusText: "OK",
    },
  ],
  [
    ReactPortable.createFragmentId("f2:/component2"),
    {
      ok: true,
      body: `<react-portable-fragment>this is component2</react-portable-fragment>`,
      status: 200,
      statusText: "OK",
    },
  ],
  [
    ReactPortable.createFragmentId("f3:/component3"),
    {
      ok: true,
      body: `<react-portable-fragment>this is component3</react-portable-fragment>`,
      status: 200,
      statusText: "OK",
    },
  ],
  [
    ReactPortable.createFragmentId("f4:/component4"),
    {
      ok: false,
      body: null,
      status: 404,
      statusText: "Not Found",
    },
  ],
]);

describe("htmlRewriters", () => {
  describe("ReactPortablePiercer", () => {
    let response: Response;
    beforeEach(() => {
      response = new Response(hostDummyResponseBody);
    });
    test("empty fragmentIdsMap", async () => {
      const piercer = new ReactPortablePiercer(new Map());
      const rewriter = new HTMLRewriter().on(piercer.selector, piercer);

      expect(await rewriter.transform(response).text()).toBe(
        hostDummyResponseBody
      );
    });
    test("fulfilled fragmentIdsMap", async () => {
      const piercer = new ReactPortablePiercer(fragmentIdMapping);
      const rewriter = new HTMLRewriter().on(piercer.selector, piercer);

      expect(await rewriter.transform(response).text()).matchSnapshot();
    });
  });

  describe("FragmentTemplatesAppender", () => {
    let response: Response;
    beforeEach(() => {
      response = new Response(hostDummyResponseBody);
    });
    test("empty fragmentIdsMap", async () => {
      const appender = new FragmentTemplatesAppender(new Map());
      const rewriter = new HTMLRewriter().on(appender.selector, appender);

      expect(await rewriter.transform(response).text()).toBe(
        hostDummyResponseBody
      );
    });
    test("fulfilled fragmentIdsMap", async () => {
      const appender = new FragmentTemplatesAppender(fragmentIdMapping);
      const rewriter = new HTMLRewriter().on(appender.selector, appender);

      expect(await rewriter.transform(response).text()).matchSnapshot();
    });
  });

  describe("FragmentBaseReplacer", () => {
    describe("react-portable-fragment q:base", () => {
      let response: Response;
      beforeEach(() => {
        response = new Response(
          '<react-portable-fragment q:base="/build/">this is fragment component</react-portable-fragment>'
        );
      });
      test("no gateway, no assetPath", async () => {
        const replacer = new FragmentBaseReplacer("code1");
        const rewriter = new HTMLRewriter().on(replacer.selector, replacer);

        expect(await rewriter.transform(response).text()).toBe(
          '<react-portable-fragment q:base="/_fragments/code1/build/">this is fragment component</react-portable-fragment>'
        );
      });

      test("having gateway", async () => {
        const replacer = new FragmentBaseReplacer("code2", "https://gw.com");
        const rewriter = new HTMLRewriter().on(replacer.selector, replacer);

        expect(await rewriter.transform(response).text()).toBe(
          '<react-portable-fragment q:base="https://gw.com/_fragments/code2/build/">this is fragment component</react-portable-fragment>'
        );
      });

      test("having assetPath", async () => {
        const replacer = new FragmentBaseReplacer(
          "code2",
          "https://gw.com",
          "https://asset.com/asset/"
        );
        const rewriter = new HTMLRewriter().on(replacer.selector, replacer);

        expect(await rewriter.transform(response).text()).toBe(
          '<react-portable-fragment q:base="https://asset.com/asset/build/">this is fragment component</react-portable-fragment>'
        );
      });

      test("react-portable-fragment does not have q:base", async () => {
        const replacer = new FragmentBaseReplacer("code1");
        const rewriter = new HTMLRewriter().on(replacer.selector, replacer);
        const response = new Response(
          "<react-portable-fragment>this is fragment component</react-portable-fragment>"
        );

        await expect(
          rewriter.transform(response).text()
        ).rejects.toThrowError();
      });
    });

    describe("react-portable-fragment > link[rel=stylesheet]", () => {
      let response: Response;
      beforeEach(() => {
        response = new Response(
          '<react-portable-fragment q:base="/build/"><link rel="stylesheet" href="/build/style.css">this is fragment component</react-portable-fragment>'
        );
      });

      test("no gateway, no assetPath", async () => {
        const replacer = new FragmentBaseReplacer("code1");
        const rewriter = new HTMLRewriter().on(replacer.selector, replacer);

        expect(await rewriter.transform(response).text()).toBe(
          '<react-portable-fragment q:base="/_fragments/code1/build/"><link rel="stylesheet" href="/_fragments/code1/build/style.css">this is fragment component</react-portable-fragment>'
        );
      });

      test("having gateway", async () => {
        const replacer = new FragmentBaseReplacer("code2", "https://gw.com");
        const rewriter = new HTMLRewriter().on(replacer.selector, replacer);

        expect(await rewriter.transform(response).text()).toBe(
          '<react-portable-fragment q:base="https://gw.com/_fragments/code2/build/"><link rel="stylesheet" href="https://gw.com/_fragments/code2/build/style.css">this is fragment component</react-portable-fragment>'
        );
      });

      test("having assetPath", async () => {
        const replacer = new FragmentBaseReplacer(
          "code2",
          "https://gw.com",
          "https://asset.com/asset/"
        );
        const rewriter = new HTMLRewriter().on(replacer.selector, replacer);

        expect(await rewriter.transform(response).text()).toBe(
          '<react-portable-fragment q:base="https://asset.com/asset/build/"><link rel="stylesheet" href="https://asset.com/asset/build/style.css">this is fragment component</react-portable-fragment>'
        );
      });

      test("react-portable-fragment does not have q:base", async () => {
        const replacer = new FragmentBaseReplacer("code1");
        const rewriter = new HTMLRewriter().on(replacer.selector, replacer);
        const response = new Response(
          `<react-portable-fragment q:base="/build/"><link rel="stylesheet">this is fragment component</react-portable-fragment>`
        );

        await expect(
          rewriter.transform(response).text()
        ).rejects.toThrowError();
      });
    });
  });

  describe("ActivateReactPortablePreviewReplacer", () => {
    test("insert the activate script for react-portable-preview", async () => {
      const activator = new ActivateReactPortablePreviewReplacer();
      const rewriter = new HTMLRewriter().on(activator.selector, activator);

      const response = new Response(`<!DOCTYPE html>
<html>
  <head>
    <title>dummy page title</title>
  </head>
  <body></body>
</html>
`);

      expect(await rewriter.transform(response).text()).toBe(`<!DOCTYPE html>
<html>
  <head>
    <title>dummy page title</title>
  <script>activate script</script></head>
  <body></body>
</html>
`);
    });
  });
});
