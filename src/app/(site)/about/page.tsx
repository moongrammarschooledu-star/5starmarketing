import type { Metadata } from "next";
import { About } from "@/components/About";
import { Contact } from "@/components/Contact";

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
