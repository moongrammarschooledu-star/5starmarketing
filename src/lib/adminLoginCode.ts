import "server-only";
import { randomInt } from "node:crypto";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { sendEmailMessage } from "@/lib/communication/senders";
import { ADMIN_2FA_CODE_MINUTES, hashLoginCode } from "@/lib/adminTwoFactor";

const RESEND_WAIT_SECONDS = 60;
const MAX_CODES_PER_HOUR = 6;

function maskEmail(email: string): string {
  const [name, domain] = email.split("@");
  if (!name || !domain) return email;
  return `${name.slice(0, 2)}${"*".repeat(Math.max(1, name.length - 2))}@${domain}`;
}

/** Creates a fresh code for this signed-in user and emails it to them. Used
 *  right after the password step and by the "Send a new code" button. */
export async function issueLoginCode(
  userId: string,
  email: string,
): Promise<{ ok: true; sentTo: string } | { ok: false; error: string }> {
  const db = createServiceRoleClient();

  const { data: recent } = await db
    .from("admin_login_codes")
    .select("created_at")
    .eq("user_id", userId)
    .gte("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString())
    .order("created_at", { ascending: false });
  if (recent && recent.length >= MAX_CODES_PER_HOUR) {
    return { ok: false, error: "Too many codes were requested. Please try again in an hour." };
  }
  const last = recent?.[0]?.created_at ? new Date(recent[0].created_at).getTime() : 0;
  if (Date.now() - last < RESEND_WAIT_SECONDS * 1000) {
    return { ok: false, error: `Please wait a minute before asking for another code.` };
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const codeHash = await hashLoginCode(userId, code);
  if (!codeHash) return { ok: false, error: "The server is missing its secret key, so a code cannot be made." };

  const { data: row, error: insertError } = await db
    .from("admin_login_codes")
    .insert({
      user_id: userId,
      code_hash: codeHash,
      expires_at: new Date(Date.now() + ADMIN_2FA_CODE_MINUTES * 60 * 1000).toISOString(),
    })
    .select("id")
    .single();
  if (insertError || !row) {
    console.error("issueLoginCode: insert failed:", insertError);
    return { ok: false, error: "Could not create a login code. Please try again." };
  }

  const html = `<div style="font-family:Arial,sans-serif;max-width:420px">
    <h2 style="margin:0 0 8px">5STAR.M admin login</h2>
    <p>Your login code is:</p>
    <p style="font-size:32px;font-weight:bold;letter-spacing:6px;margin:8px 0">${code}</p>
    <p>It works for ${ADMIN_2FA_CODE_MINUTES} minutes. If you did not try to log in, ignore this email and change your password.</p>
  </div>`;
  const sent = await sendEmailMessage(
    email,
    `Your 5STAR.M login code: ${code}`,
    html,
    `Your 5STAR.M admin login code is ${code}. It works for ${ADMIN_2FA_CODE_MINUTES} minutes.`,
  );
  if (!sent.success) {
    await db.from("admin_login_codes").delete().eq("id", row.id);
    console.error("issueLoginCode: email failed:", sent.error);
    return { ok: false, error: "The email could not be sent. Check the email (SMTP) settings." };
  }
  return { ok: true, sentTo: maskEmail(email) };
}
