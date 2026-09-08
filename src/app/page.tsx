import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { About } from "@/components/About";
import { PropertiesSection } from "@/components/PropertiesSection";
import { Services } from "@/components/Services";
import { Projects } from "@/components/Projects";
import { WhyChooseUs } from "@/components/WhyChooseUs";
import { InvestmentSection } from "@/components/InvestmentSection";
import { ConstructionSection } from "@/components/ConstructionSection";
import { Contact } from "@/components/Contact";
import { Footer } from "@/components/Footer";
import { WhatsAppFloatButton } from "@/components/WhatsAppButton";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <About />
        <PropertiesSection />
        <Services />
        <Projects />
        <WhyChooseUs />
        <InvestmentSection />
        <ConstructionSection />
        <Contact />
      </main>
      <Footer />
      <WhatsAppFloatButton />
    </>
  );
}
