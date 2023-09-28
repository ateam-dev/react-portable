import { previewify } from "@react-portable/core";
import { forwardRef, ReactNode } from "react";

export const AnchorButton = previewify(
  forwardRef<
    HTMLAnchorElement,
    {
      children: ReactNode;
      href: string;
    }
  >(({ href, children }, ref) => {
    return (
      <a
        ref={ref}
        href={href}
        className="inline-block rounded-md border border-transparent bg-indigo-600 px-8 py-3 text-center font-medium text-white hover:bg-indigo-700"
      >
        {children}
      </a>
    );
  }),
  "pfy-anchor-button",
);
