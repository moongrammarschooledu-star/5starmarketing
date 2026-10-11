import type { Metadata } from "next";
import { About } from "@/components/About";
import { Contact } from "@/components/Contact";

// Public page: built once and kept for a few minutes (and rebuilt at once when
// the admin changes the related data), so visitors do not each run the server.
export const dynamic = "force-static";
export const revalidate = 180;

export const metadata: Metadata = {
  title: "About Us",
  description:
    "About 5STAR.M Estate & Builders — a real estate and construction business based in Johar Town, Lahore, helping clients buy, sell and invest in property with honest advice.",
  alternates: { canonical: "/about" },
  openGraph: { title: "About 5STAR.M Estate & Builders", url: "/about" },
};

export default function AboutPage() {
  return (
    <>
      <About />
      <Contact />
    </>
  );
}
