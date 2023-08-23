import {
  ActivateRpPreviewReplacer,
  FragmentBaseReplacer,
} from "./htmlRewriters";
import { beforeEach, describe, expect, test } from "vitest";

describe("htmlRewriters", () => {
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
  <script>activate script</script><script type="module">preview button</script></head>
  <body></body>
</html>
`);
    });
  });
});
