// How the admin panel opens WhatsApp for the team - as fast as possible.
//
// On a computer the link goes straight to the installed WhatsApp app
// (whatsapp://send), with no browser page or website loading in between, so the
// chat with the number and message is ready in a moment.
//
// Windows limits how long such a link may be. A short message goes inside the
// link as usual. A long one (like "all the saved details + company details")
// opens the chat with the number, and the message is put on the clipboard for a
// single Ctrl+V - so the number and the whole message are never lost.
//
// Shift + click opens WhatsApp Web in one reused browser tab instead (for a
// computer without the app). On a phone nothing changes: wa.me opens the app.

const WINDOW_NAME = "5star-whatsapp";
/** Longest app link that is still safe to pass to Windows with the text inside. */
const APP_URL_LIMIT = 1700;

function onPhone(): boolean {
  return typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

/** "https://wa.me/923001234567?text=..." -> its parts, or null if it is not a wa.me link. */
function parseWaLink(waUrl: string): { phone: string; text: string } | null {
  try {
    const u = new URL(waUrl);
    if (u.hostname !== "wa.me") return null;
    const phone = u.pathname.replace(/\D/g, "");
    if (!phone) return null;
    return { phone, text: u.searchParams.get("text") ?? "" };
  } catch {
    return null;
  }
}

/** The same chat on WhatsApp Web, or null if it is not a wa.me link. */
export function toWhatsAppWebUrl(waUrl: string): string | null {
  const p = parseWaLink(waUrl);
  if (!p) return null;
  return `https://web.whatsapp.com/send?phone=${p.phone}${p.text ? `&text=${encodeURIComponent(p.text)}` : ""}`;
}

/** The same chat in the installed WhatsApp app. */
export function toWhatsAppAppUrl(waUrl: string, withText = true): string | null {
  const p = parseWaLink(waUrl);
  if (!p) return null;
  return `whatsapp://send?phone=${p.phone}${withText && p.text ? `&text=${encodeURIComponent(p.text)}` : ""}`;
}

function showNote(message: string) {
  try {
    const old = document.getElementById("wa-note");
    old?.remove();
    const el = document.createElement("div");
    el.id = "wa-note";
    el.textContent = message;
    el.setAttribute("role", "status");
    el.style.cssText =
      "position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:100000;max-width:90vw;background:#17110f;color:#fff;padding:12px 18px;border-radius:12px;font:600 14px/1.4 system-ui,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.3)";
    document.body.appendChild(el);
    window.setTimeout(() => el.remove(), 7000);
  } catch {
    /* the message is still on the clipboard */
  }
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Opens a wa.me link the admin way: the WhatsApp app on a computer (Shift = WhatsApp Web), wa.me on a phone. */
export function openAdminWhatsApp(waUrl: string, opts: { web?: boolean } = {}): void {
  const parsed = onPhone() ? null : parseWaLink(waUrl);
  if (!parsed) {
    window.open(waUrl, "_blank", "noopener,noreferrer");
    return;
  }

  if (opts.web) {
    const win = window.open(toWhatsAppWebUrl(waUrl) ?? waUrl, WINDOW_NAME);
    win?.focus();
    return;
  }

  const full = toWhatsAppAppUrl(waUrl, true) as string;
  if (full.length <= APP_URL_LIMIT) {
    window.location.href = full;
    return;
  }
  // Too long for the link: open the chat, and keep the message ready to paste.
  const chatOnly = toWhatsAppAppUrl(waUrl, false) as string;
  void copyText(parsed.text).then((ok) => {
    showNote(ok ? "Message copied - in WhatsApp press Ctrl + V to paste it, then Send." : "Could not copy the message - use the message shown in the box.");
  });
  window.location.href = chatOnly;
}

/** The wa.me link in a plain left click (or Shift + click for WhatsApp Web) on a computer, otherwise null. */
export function shouldTakeOver(e: MouseEvent): { anchor: HTMLAnchorElement; web: boolean } | null {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.altKey) return null;
  if (onPhone()) return null;
  const target = e.target;
  if (!(target instanceof Element)) return null;
  const a = target.closest("a");
  if (!a || !a.href.startsWith("https://wa.me/")) return null;
  return { anchor: a, web: e.shiftKey };
}
