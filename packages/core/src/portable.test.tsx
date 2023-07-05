/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, test } from "vitest";
import { portable } from "./portable";
import { act, render, cleanup } from "@testing-library/react";
import {
  ReactPortablePreview,
  reactPortableRegister,
} from "@react-portable/client/web-components";

const Sample = () => <div>sample</div>;

describe("portable", () => {
  beforeEach(() => {
    cleanup();
    reactPortableRegister();
  });

  test("__code", () => {
    const Component = portable(Sample, "foo");
    expect(Component.__code).toBe("foo");
  });
  test("__strategy", () => {
    const Component = portable(Sample, "foo", {
      strategy: { hydrate: "onUse", revalidate: 60 },
    });
    expect(Component.__strategy).toStrictEqual({
      hydrate: "onUse",
      revalidate: 60,
    });
  });
  test("__loader", () => {
    const loader = () => {
      console.log("loader");
    };
    const Component = portable(Sample, "foo", {
      loader,
    });
    expect(Component.__loader).toBe(loader);
  });

  test("the component will be wrapped by react-portable-preview", () => {
    const Component = portable(Sample, "foo");
    const { asFragment } = render(<Component />);

    expect(asFragment()).toMatchSnapshot();
  });

  test("the component will NOT be wrapped by react-portable-preview when `disablePreview` is specified true", () => {
    const Component = portable(Sample, "foo", { disablePreview: true });
    const { asFragment } = render(<Component />);

    expect(asFragment()).toMatchSnapshot();
  });

  test("change props on re-rendering", () => {
    const SampleWithProps = ({ foo }: { foo: string }) => (
      <div>sample {foo}</div>
    );
    const Component = portable(SampleWithProps, "foo");
    const { rerender } = render(<Component foo="foo" />);

    const element = document.querySelector<ReactPortablePreview>(
      "react-portable-preview"
    );

    expect(element!.props).toStrictEqual({ foo: "foo" });

    rerender(<Component foo="foo" />);

    expect(element!.props).toStrictEqual({ foo: "foo" });

    rerender(<Component foo="baz" />);

    expect(element!.props).toStrictEqual({ foo: "baz" });
  });
});
