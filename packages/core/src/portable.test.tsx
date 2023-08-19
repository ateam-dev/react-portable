/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, test } from "vitest";
import { portable } from "./portable";
import { render, cleanup } from "@testing-library/react";
import {
  RpPreview,
  reactPortableRegister,
} from "@react-portable/client/web-components";
import { ReactNode, ReactNodeArray } from "react";

const Sample = () => <div>sample</div>;

const SampleWithChildren = ({ children }: { children: ReactNode }) => (
  <div>sample with children:{children}</div>
);

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
  test("__original", () => {
    const Component = portable(Sample, "foo");
    expect(Component.__original).toBe(Sample);
  });

  test("the component will be wrapped by rp-preview", () => {
    const Component = portable(Sample, "foo");
    const { asFragment } = render(<Component />);

    expect(asFragment()).toMatchSnapshot();
  });

  test("children will be wrapped by rp-outlet", () => {
    const Component = portable(SampleWithChildren, "foo");
    const { asFragment } = render(
      <Component>
        <p>this is children</p>
      </Component>,
    );

    expect(asFragment()).toMatchSnapshot();
  });

  test("the component will NOT be wrapped by rp-preview when `disablePreview` is specified true", () => {
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

    const element = document.querySelector<RpPreview>("rp-preview");

    expect(element!.props).toStrictEqual({ foo: "foo" });

    rerender(<Component foo="foo" />);

    expect(element!.props).toStrictEqual({ foo: "foo" });

    rerender(<Component foo="baz" />);

    expect(element!.props).toStrictEqual({ foo: "baz" });
  });

  test("elements will be wrapped by <rp-outlet>", () => {
    const SampleWithProps = ({
      children,
      fragment,
      arrayElement,
      primitiveBoolean,
      primitiveString,
    }: {
      children: ReactNode;
      fragment: ReactNode;
      arrayElement: ReactNodeArray;
      primitiveString: string;
      primitiveBoolean: boolean;
    }) => (
      <div>
        {children}
        {fragment}
        {arrayElement}
        {primitiveString}
        {primitiveBoolean}
      </div>
    );

    const Component = portable(SampleWithProps, "foo");
    const { asFragment } = render(
      <Component
        fragment={
          <>
            <div>inner fragment 1</div>
            <div>inner fragment 2</div>
          </>
        }
        arrayElement={[1, 2].map((i) => (
          <div key={i}>array element {i}</div>
        ))}
        primitiveString="foo"
        primitiveBoolean
      >
        <div>children</div>
      </Component>,
    );

    expect(asFragment()).toMatchSnapshot();
  });
});
