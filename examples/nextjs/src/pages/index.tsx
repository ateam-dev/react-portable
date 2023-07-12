import React from "react";
import { Header, Hero, Products } from "examples-tailwind-ui";

export default function Home() {
  return (
    <>
      <Header />
      <main className="min-h-screen mt-2">
        <Hero />
        <div className="mt-1">
          <Products />
        </div>
      </main>
    </>
  );
}
