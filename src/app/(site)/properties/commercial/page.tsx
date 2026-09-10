import { createCuratedSearchLandingPage } from "@/lib/curatedSearchLandingPage";

const { metadata, Page } = createCuratedSearchLandingPage({
  title: "Commercial Properties in Lahore",
  description: "Browse commercial properties, shops and offices in Lahore with 5STAR.M Estate & Builders — filter by location, budget, size and more.",
  query: "type=commercial",
});

export { metadata };
export default Page;
