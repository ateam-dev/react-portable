import {
  ActivateRpPreviewReplacer,
  FragmentBaseReplacer,
  OtherThanFragmentRemover,
} from "./htmlRewriters";
import { describe, expect, test } from "vitest";

describe("htmlRewriters", () => {
  describe("FragmentBaseReplacer", () => {
    test("rp-fragment q:base", async () => {
      const response = new Response(
        '<rp-fragment q:base="/build/">this is fragment component</rp-fragment>',
      );

      const rewriter = new HTMLRewriter().on(
        FragmentBaseReplacer.selector,
        new FragmentBaseReplacer(),
      );

      expect(await rewriter.transform(response).text()).toBe(
        '<rp-fragment q:base="/_fragments/build/">this is fragment component</rp-fragment>',
      );
    });

    test("rp-fragment > link[rel=stylesheet], rp-fragment > link[rel=modulepreload]", async () => {
      const response = new Response(
        '<rp-fragment q:base="/build/"><link rel="stylesheet" href="/build/style.css">this is fragment component<link rel="modulepreload" href="/build/foo.js"></rp-fragment>',
      );

      const rewriter = new HTMLRewriter().on(
        FragmentBaseReplacer.selector,
        new FragmentBaseReplacer(),
      );

      expect(await rewriter.transform(response).text()).toBe(
        '<rp-fragment q:base="/_fragments/build/"><link rel="stylesheet" href="/_fragments/build/style.css">this is fragment component<link rel="modulepreload" href="/_fragments/build/foo.js"></rp-fragment>',
      );
    });
  });

  describe("ActivateRpPreviewReplacer", () => {
    test("insert the activate script for rp-preview", async () => {
      const response = new Response(`<!DOCTYPE html>
<html>
  <head>
    <title>dummy page title</title>
  </head>
  <body></body>
</html>
`);

      const rewriter = new HTMLRewriter().on(
        ActivateRpPreviewReplacer.selector,
        new ActivateRpPreviewReplacer(),
      );

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

  describe("OtherThanFragmentRemover", () => {
    test("All elements except rp-fragment are removed", async () => {
      const response = new Response(
        `<rp-fragment q:base="/build/"><link rel="stylesheet" href="/build/style.css">this is fragment component<link rel="modulepreload" href="/build/foo.js"></rp-fragment>
<script>console.log('for debug')</script><style>.for-debug {}</style>`,
      );

      const rewriter = new HTMLRewriter().on(
        OtherThanFragmentRemover.selector,
        new OtherThanFragmentRemover(),
      );

      expect(await rewriter.transform(response).text())
        .toBe(`<rp-fragment q:base="/build/"><link rel="stylesheet" href="/build/style.css">this is fragment component<link rel="modulepreload" href="/build/foo.js"></rp-fragment>
`);
    });
  });
});
