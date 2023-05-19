import {
  FragmentBaseReplacer,
  FragmentTemplatesAppender,
  ReactPortablePiercer,
} from "./htmlRewriters";
import { createFragmentId } from "@react-portable/client";
import { beforeEach, describe, expect, test } from "vitest";

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
  </body>
</html>
`;

const fragmentIdMapping = new Map([
  [
    createFragmentId("f1:/component1", "https://gw1.com"),
    `<react-portable-fragment>this is component1</react-portable-fragment>`,
  ],
  [
    createFragmentId("f2:/component2"),
    `<react-portable-fragment>this is component2</react-portable-fragment>`,
  ],
  [
    createFragmentId("f3:/component3"),
    `<react-portable-fragment>this is component3</react-portable-fragment>`,
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
  });
});
