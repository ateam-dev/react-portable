import { Inter } from "next/font/google";
import { ReactPortable } from "@/components/ReactPortable";
import Link from "next/link";

const inter = Inter({ subsets: ["latin"] });

export default function Home() {
  return (
    <main
      className={`flex min-h-screen flex-col items-center justify-between p-24 ${inter.className}`}
    >
      <Link href="/1">go to page #1</Link>
      <ReactPortable gateway="http://127.0.0.1:8787" entry="mini:/on-use/60/" />
      <ReactPortable
        gateway="http://127.0.0.1:8787"
        entry="mini:/on-use/60/?n=200"
      />
    </main>
  );
}
