import { createCuratedSearchLandingPage } from "@/lib/curatedSearchLandingPage";

// Public page: built once and kept for a few minutes (and rebuilt at once when
// the admin changes the related data), so visitors do not each run the server.
export const dynamic = "force-static";
export const revalidate = 180;

const { metadata, Page } = createCuratedSearchLandingPage({
  title: "Commercial Properties in Lahore",
  description: "Browse commercial properties, shops and offices for sale and rent in Lahore with 5STAR.M Estate & Builders.",
  query: "type=commercial",
});

export { metadata };
export default Page;
