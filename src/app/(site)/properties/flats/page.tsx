import { createCuratedSearchLandingPage } from "@/lib/curatedSearchLandingPage";

const { metadata, Page } = createCuratedSearchLandingPage({
  title: "Flats & Apartments for Sale & Rent in Lahore",
  description: "Browse flats and apartments in Lahore with 5STAR.M Estate & Builders — filter by location, budget, size, bedrooms and more.",
  query: "type=flat",
});

export { metadata };
export default Page;
