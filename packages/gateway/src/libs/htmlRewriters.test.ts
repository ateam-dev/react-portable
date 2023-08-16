import {
  ActivateRpPreviewReplacer,
  FragmentBaseReplacer,
  FragmentTemplatesAppender,
  ReactPortablePiercer,
} from "./htmlRewriters";
import { ReactPortable } from "@react-portable/client/web-components";
import { beforeEach, describe, expect, test } from "vitest";
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
      body: `<rp-fragment>this is component1</rp-fragment>`,
      status: 200,
      statusText: "OK",
    },
  ],
  [
    ReactPortable.createFragmentId("f2:/component2"),
    {
      ok: true,
      body: `<rp-fragment>this is component2</rp-fragment>`,
      status: 200,
      statusText: "OK",
    },
  ],
  [
    ReactPortable.createFragmentId("f3:/component3"),
    {
      ok: true,
      body: `<rp-fragment>this is component3</rp-fragment>`,
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
        hostDummyResponseBody,
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
        hostDummyResponseBody,
      );
    });
    test("fulfilled fragmentIdsMap", async () => {
      const appender = new FragmentTemplatesAppender(fragmentIdMapping);
      const rewriter = new HTMLRewriter().on(appender.selector, appender);

      expect(await rewriter.transform(response).text()).matchSnapshot();
    });
  });

  describe("FragmentBaseReplacer", () => {
    describe("rp-fragment q:base", () => {
      let response: Response;
      beforeEach(() => {
        response = new Response(
          '<rp-fragment q:base="/build/">this is fragment component</rp-fragment>',
        );
      });
      test("no gateway, no assetPath", async () => {
        const replacer = new FragmentBaseReplacer("code1");
        const rewriter = new HTMLRewriter().on(replacer.selector, replacer);

        expect(await rewriter.transform(response).text()).toBe(
          '<rp-fragment q:base="/_fragments/code1/build/">this is fragment component</rp-fragment>',
        );
      });

      test("having gateway", async () => {
        const replacer = new FragmentBaseReplacer("code2", "https://gw.com");
        const rewriter = new HTMLRewriter().on(replacer.selector, replacer);

        expect(await rewriter.transform(response).text()).toBe(
          '<rp-fragment q:base="https://gw.com/_fragments/code2/build/">this is fragment component</rp-fragment>',
        );
      });

      test("having assetPath", async () => {
        const replacer = new FragmentBaseReplacer(
          "code2",
          "https://gw.com",
          "https://asset.com/asset/",
        );
        const rewriter = new HTMLRewriter().on(replacer.selector, replacer);

        expect(await rewriter.transform(response).text()).toBe(
          '<rp-fragment q:base="https://asset.com/asset/build/">this is fragment component</rp-fragment>',
        );
      });

      test("rp-fragment does not have q:base", async () => {
        const replacer = new FragmentBaseReplacer("code1");
        const rewriter = new HTMLRewriter().on(replacer.selector, replacer);
        const response = new Response(
          "<rp-fragment>this is fragment component</rp-fragment>",
        );

        await expect(
          rewriter.transform(response).text(),
        ).rejects.toThrowError();
      });
    });

    describe("rp-fragment > link[rel=stylesheet], rp-fragment > link[rel=modulepreload]", () => {
      let response: Response;
      beforeEach(() => {
        response = new Response(
          '<rp-fragment q:base="/build/"><link rel="stylesheet" href="/build/style.css">this is fragment component<link rel="modulepreload" href="/build/foo.js"></rp-fragment>',
        );
      });

      test("no gateway, no assetPath", async () => {
        const replacer = new FragmentBaseReplacer("code1");
        const rewriter = new HTMLRewriter().on(replacer.selector, replacer);

        expect(await rewriter.transform(response).text()).toBe(
          '<rp-fragment q:base="/_fragments/code1/build/"><link rel="stylesheet" href="/_fragments/code1/build/style.css">this is fragment component<link rel="modulepreload" href="/_fragments/code1/build/foo.js"></rp-fragment>',
        );
      });

      test("having gateway", async () => {
        const replacer = new FragmentBaseReplacer("code2", "https://gw.com");
        const rewriter = new HTMLRewriter().on(replacer.selector, replacer);

        expect(await rewriter.transform(response).text()).toBe(
          '<rp-fragment q:base="https://gw.com/_fragments/code2/build/"><link rel="stylesheet" href="https://gw.com/_fragments/code2/build/style.css">this is fragment component<link rel="modulepreload" href="https://gw.com/_fragments/code2/build/foo.js"></rp-fragment>',
        );
      });

      test("having assetPath", async () => {
        const replacer = new FragmentBaseReplacer(
          "code2",
          "https://gw.com",
          "https://asset.com/asset/",
        );
        const rewriter = new HTMLRewriter().on(replacer.selector, replacer);

        expect(await rewriter.transform(response).text()).toBe(
          '<rp-fragment q:base="https://asset.com/asset/build/"><link rel="stylesheet" href="https://asset.com/asset/build/style.css">this is fragment component<link rel="modulepreload" href="https://asset.com/asset/build/foo.js"></rp-fragment>',
        );
      });

      test("rp-fragment does not have q:base", async () => {
        const replacer = new FragmentBaseReplacer("code1");
        const rewriter = new HTMLRewriter().on(replacer.selector, replacer);
        const response = new Response(
          `<rp-fragment q:base="/build/"><link rel="stylesheet">this is fragment component</rp-fragment>`,
        );

        await expect(
          rewriter.transform(response).text(),
        ).rejects.toThrowError();
      });
    });
  });

  describe("ActivateRpPreviewReplacer", () => {
    let response: Response;
    beforeEach(() => {
      response = new Response(`<!DOCTYPE html>
<html>
  <head>
    <title>dummy page title</title>
  </head>
  <body></body>
</html>
`);
    });

    test("insert the activate script for rp-preview", async () => {
      const activator = new ActivateRpPreviewReplacer();
      const rewriter = new HTMLRewriter().on(activator.selector, activator);

      expect(await rewriter.transform(response).text()).toBe(`<!DOCTYPE html>
<html>
  <head>
    <title>dummy page title</title>
  <script>activate script</script></head>
  <body></body>
</html>
`);
    });

    test("When specifying the origin of the component server", async () => {
      const activator = new ActivateRpPreviewReplacer("https://example.com");
      const rewriter = new HTMLRewriter().on(activator.selector, activator);

      expect(await rewriter.transform(response).text()).toBe(`<!DOCTYPE html>
<html>
  <head>
    <title>dummy page title</title>
  <script>activate script</script><script>window._rpPreviewRemote = 'https://example.com'</script><script>rpPreview = () => Array.from(document.querySelectorAll('rp-preview')).forEach((el) => el.preview())</script></head>
  <body></body>
</html>
`);
    });
  });
});
