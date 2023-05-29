import { Inter } from "next/font/google";
import { ReactPortable } from "@/components/ReactPortable";

export default function Home() {
  return (
    <>
      <ReactPortable
        gateway="http://127.0.0.1:8787"
        entry="tailwind-ui:/header"
      />
      <main className="min-h-screen mt-2">
        <ReactPortable
          gateway="http://127.0.0.1:8787"
          entry="tailwind-ui:/ec/hero"
        />
        <div className="mt-1">
          <ReactPortable
            gateway="http://127.0.0.1:8787"
            entry="tailwind-ui:/ec/products"
          />
        </div>
      </main>
    </>
  );
}
