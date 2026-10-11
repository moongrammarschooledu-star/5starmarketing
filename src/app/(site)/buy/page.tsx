import { createCuratedSearchLandingPage } from "@/lib/curatedSearchLandingPage";

// Public page: built once and kept for a few minutes (and rebuilt at once when
// the admin changes the related data), so visitors do not each run the server.
export const dynamic = "force-static";
export const revalidate = 180;

const { metadata, Page } = createCuratedSearchLandingPage({
  title: "Properties for Sale in Lahore",
  description: "Browse houses, flats, plots and commercial properties for sale in Lahore with 5STAR.M Estate & Builders — filter by location, budget, size and more.",
  query: "purpose=sale",
});

export { metadata };
export default Page;
