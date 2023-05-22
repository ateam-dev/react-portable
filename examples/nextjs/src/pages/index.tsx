import Image from "next/image";
import { Inter } from "next/font/google";
import { ReactPortable } from "@/components/ReactPortable";

const inter = Inter({ subsets: ["latin"] });

export default function Home() {
  return (
    <main
      className={`flex min-h-screen flex-col items-center justify-between p-24 ${inter.className}`}
    >
      <ReactPortable gateway="http://127.0.0.1:8787" entry="mini:/?n=-300" />
      <ReactPortable
        gateway="http://127.0.0.1:8787"
        entry="mini:/foo/?n=-300"
      />
    </main>
  );
}
