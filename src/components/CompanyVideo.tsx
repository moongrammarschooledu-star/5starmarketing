/** The company introduction video (the owner and how the company works).
 *  A portrait phone video, so it is shown in a tall frame. It does not play by
 *  itself - the visitor starts it with the sound on. `#t=0.1` makes the
 *  browser show the first frame instead of a black box until it is played. */
export function CompanyVideo({ className }: { className?: string }) {
  return (
    <video
      src="/videos/company-intro.mp4#t=0.1"
      controls
      playsInline
      preload="metadata"
      aria-label="Introduction to 5STAR.M Estate & Builders and its director"
      className={className}
    />
  );
}
