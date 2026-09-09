import type { Metadata } from "next";
import { Contact } from "@/components/Contact";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Contact 5STAR.M Estate & Builders — 1037-E-1 Johar Town, Lahore. Call, WhatsApp or send an inquiry about property buying, selling or investment.",
  alternates: { canonical: "/contact" },
  openGraph: { title: "Contact 5STAR.M Estate & Builders", url: "/contact" },
};

export default function ContactPage() {
  return <Contact />;
}
