import { ReactPortable } from "@react-portable/client";

export default function Home() {
  return (
    <>
      <ReactPortable
        gateway="http://127.0.0.1:8080"
        entry="tailwind-ui:/header"
      />
      <main className="min-h-screen mt-2">
        <ReactPortable
          gateway="http://127.0.0.1:8080"
          entry="tailwind-ui:/hero"
        />
        <div className="mt-1">
          <ReactPortable
            gateway="http://127.0.0.1:8080"
            entry="tailwind-ui:/products"
          />
        </div>
        <ReactPortable
          gateway="http://127.0.0.1:8080"
          entry="tailwind-ui:/pokemon?code=bulbasaur"
        />
      </main>
    </>
  );
}
