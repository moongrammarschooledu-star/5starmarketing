import { createCuratedSearchLandingPage } from "@/lib/curatedSearchLandingPage";

const { metadata, Page } = createCuratedSearchLandingPage({
  title: "Properties for Rent in Lahore",
  description: "Browse houses, flats and commercial properties for rent in Lahore with 5STAR.M Estate & Builders — filter by location, budget, size and more.",
  query: "purpose=rent",
});

export { metadata };
export default Page;
