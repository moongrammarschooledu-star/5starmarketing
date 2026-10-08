import Link from "next/link";
import { siteNewsService } from "@/services/siteNewsService";
import type { TickerItem } from "@/lib/models/news";

// Pixels per character / per item are rough guesses - enough to know how
// many times the list must repeat so one half of the loop is wider than any
// screen and the scroll never shows a gap.
const PX_PER_CHAR = 7.5;
const PX_PER_ITEM = 130;
const MIN_HALF_WIDTH = 2400;
const SECONDS_PER_1000_PX = 14;

function Entry({ item }: { item: TickerItem }) {
  const badge = item.kind === "demand" ? "Wanted" : "News";
  const body = (
    <>
      <span className="mr-2 rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide">{badge}</span>
      {item.text}
    </>
  );
  const className = "inline-flex items-center whitespace-nowrap px-6 text-[13px] font-semibold";
  if (!item.href) return <span className={className}>{body}</span>;
  if (item.href.startsWith("/")) {
    return (
      <Link href={item.href} className={`${className} hover:underline`}>
        {body}
      </Link>
    );
  }
  return (
    <a href={item.href} target="_blank" rel="noopener noreferrer" className={`${className} hover:underline`}>
      {body}
    </a>
  );
}

/** A scrolling strip above the header: the team's news and the clients'
 *  demands (without any name or number). Shows nothing when there is
 *  nothing to say. */
export async function NewsTicker() {
  const items = await siteNewsService.getTickerItems();
  if (items.length === 0) return null;

  const width = items.reduce((sum, i) => sum + i.text.length * PX_PER_CHAR + PX_PER_ITEM, 0);
  const repeat = Math.max(1, Math.ceil(MIN_HALF_WIDTH / width));
  const half = Array.from({ length: repeat }, () => items).flat();
  const seconds = Math.max(20, Math.round(((width * repeat) / 1000) * SECONDS_PER_1000_PX));

  return (
    <div className="bg-primary text-primary-foreground" role="region" aria-label="Latest news and client requirements">
      <div className="mx-auto flex max-w-7xl items-stretch">
        <span className="flex shrink-0 items-center bg-ink px-3 text-[11px] font-extrabold uppercase tracking-wider text-white">Latest</span>
        <div className="ticker-viewport min-w-0 flex-1 overflow-hidden py-1.5">
          <div className="ticker-track flex w-max" style={{ animationDuration: `${seconds}s` }}>
            <div className="flex shrink-0 items-center">
              {half.map((item, i) => (
                <Entry key={`a-${i}-${item.id}`} item={item} />
              ))}
            </div>
            <div className="flex shrink-0 items-center" aria-hidden="true" inert>
              {half.map((item, i) => (
                <Entry key={`b-${i}-${item.id}`} item={item} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
