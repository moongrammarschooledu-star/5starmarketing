import { Hero } from "@/components/Hero";
import { About } from "@/components/About";
import { FeaturedProperties } from "@/components/FeaturedProperties";
import { Services } from "@/components/Services";
import { Projects } from "@/components/Projects";
import { WhyChooseUs } from "@/components/WhyChooseUs";
import { InvestmentSection } from "@/components/InvestmentSection";
import { ConstructionSection } from "@/components/ConstructionSection";
import { Contact } from "@/components/Contact";

export default function Home() {
  return (
    <main>
      <Hero />
      <About />
      <FeaturedProperties />
      <Services />
      <Projects />
      <WhyChooseUs />
      <InvestmentSection />
      <ConstructionSection />
      <Contact />
    </main>
  );
}
