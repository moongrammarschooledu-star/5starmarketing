// Renders a JSON-LD <script> tag. JSON.stringify already escapes quotes,
// so the only thing to guard against is a literal "</script>" inside a
// string value breaking out of the tag — replaced defensively below.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function JsonLd({ data }: { data: Record<string, any> }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
