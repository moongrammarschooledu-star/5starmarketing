/** Formats a plain "YYYY-MM-DD" date-only string (e.g. Postgres `date`
 *  columns like next_follow_up_date) as "DD/MM/YYYY" without going
 *  through `new Date(...)`, which parses date-only strings as UTC
 *  midnight and can render a day off in timezones behind UTC. */
export function formatDateOnly(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/** Same, but "DD Mon" (e.g. "09 Sep") for compact widgets. */
export function formatDateOnlyShort(iso: string): string {
  const [, m, d] = iso.split("-");
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${d} ${months[Number(m) - 1] ?? m}`;
}
