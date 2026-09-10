import { createCuratedSearchLandingPage } from "@/lib/curatedSearchLandingPage";

const { metadata, Page } = createCuratedSearchLandingPage({
  title: "Properties for Sale in Lahore",
  description: "Browse houses, flats, plots and commercial properties for sale in Lahore with 5STAR.M Estate & Builders — filter by location, budget, size and more.",
  query: "purpose=sale",
});

export { metadata };
export default Page;
