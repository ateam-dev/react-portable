import React, { useEffect, useRef } from "react";
import { Header, Hero, Products, AnchorButton } from "examples-tailwind-ui";

export default function Home() {
  const ref = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    console.log(ref);
  }, []);
  return (
    <>
      <Header />
      <main className="min-h-screen mt-2">
        <Hero>
          <AnchorButton href="#" ref={ref}>
            Product List
          </AnchorButton>
        </Hero>
        <div className="mt-1">
          <Products />
        </div>
      </main>
    </>
  );
}
