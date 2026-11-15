// How the admin panel opens WhatsApp for the team.
//
// A normal wa.me link hands the message to the Windows WhatsApp app (or opens
// a new browser tab every time). Windows limits how long that link may be, so a
// long message - like "all the saved details + company details" - arrives
// without its text and number. On a computer the team now goes straight to
// WhatsApp Web, which takes the whole message, and always reuses the same
// browser tab instead of piling up a new one for every click.
// On a phone nothing changes: the normal wa.me link opens the WhatsApp app.

const WINDOW_NAME = "5star-whatsapp";

function onPhone(): boolean {
  return typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

/** "https://wa.me/923001234567?text=..." -> the same chat on WhatsApp Web, or null if it is not a wa.me link. */
export function toWhatsAppWebUrl(waUrl: string): string | null {
  try {
    const u = new URL(waUrl);
    if (u.hostname !== "wa.me") return null;
    const phone = u.pathname.replace(/\D/g, "");
    if (!phone) return null;
    const text = u.searchParams.get("text");
    return `https://web.whatsapp.com/send?phone=${phone}${text ? `&text=${encodeURIComponent(text)}` : ""}`;
  } catch {
    return null;
  }
}

/** Opens a wa.me link the admin way (WhatsApp Web in one reused tab on a computer). */
export function openAdminWhatsApp(waUrl: string): void {
  const web = onPhone() ? null : toWhatsAppWebUrl(waUrl);
  if (!web) {
    window.open(waUrl, "_blank", "noopener,noreferrer");
    return;
  }
  const win = window.open(web, WINDOW_NAME);
  win?.focus();
}

/** True for a click that should be taken over: a plain left click on a wa.me link, on a computer. */
export function shouldTakeOver(e: MouseEvent): HTMLAnchorElement | null {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return null;
  if (onPhone()) return null;
  const target = e.target;
  if (!(target instanceof Element)) return null;
  const a = target.closest("a");
  if (!a || !a.href.startsWith("https://wa.me/")) return null;
  return a;
}
