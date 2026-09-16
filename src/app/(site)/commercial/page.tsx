import { createCuratedSearchLandingPage } from "@/lib/curatedSearchLandingPage";

const { metadata, Page } = createCuratedSearchLandingPage({
  title: "Commercial Properties in Lahore",
  description: "Browse commercial properties, shops and offices for sale and rent in Lahore with 5STAR.M Estate & Builders.",
  query: "type=commercial",
});

export { metadata };
export default Page;
