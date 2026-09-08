import { Hero } from "@/components/Hero";
import { About } from "@/components/About";
import { FeaturedProperties } from "@/components/FeaturedProperties";
import { Services } from "@/components/Services";
import { Projects } from "@/components/Projects";
import { WhyChooseUs } from "@/components/WhyChooseUs";
import { InvestmentSection } from "@/components/InvestmentSection";
import { ConstructionSection } from "@/components/ConstructionSection";
import { Contact } from "@/components/Contact";

// Featured properties/projects/services come from the in-memory
// repositories, which admins update live — this page must not be frozen
// as a static snapshot from build time.
export const dynamic = "force-dynamic";

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
