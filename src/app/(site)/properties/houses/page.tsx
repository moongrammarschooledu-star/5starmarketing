import { createCuratedSearchLandingPage } from "@/lib/curatedSearchLandingPage";

const { metadata, Page } = createCuratedSearchLandingPage({
  title: "Houses for Sale & Rent in Lahore",
  description: "Browse houses in Lahore with 5STAR.M Estate & Builders — filter by location, budget, size, bedrooms and more.",
  query: "type=house",
});

export { metadata };
export default Page;
