import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { runAsSystem } from "@/lib/supabase/server";
import { automationService } from "@/services/automationService";
import { followUpService } from "@/services/followUpService";
import { leadScoringService } from "@/services/leadScoringService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Called by Vercel Cron every 15 minutes (see vercel.json). Without it the
// marketing automation only moved when an admin happened to open the CRM or
// Marketing page. Vercel sends "Authorization: Bearer <CRON_SECRET>"; anything
// else is refused, and with no CRON_SECRET set the route stays switched off.
function authorized(request: NextRequest, secret: string): boolean {
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

async function step<T>(name: string, run: () => Promise<T>): Promise<{ name: string; ok: boolean; result?: T; error?: string }> {
  try {
    return { name, ok: true, result: await run() };
  } catch (e) {
    console.error(`cron/marketing: ${name} failed:`, e);
    return { name, ok: false, error: e instanceof Error ? e.message : "failed" };
  }
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "Not configured." }, { status: 503 });
  if (!authorized(request, secret)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const steps = await runAsSystem(async () => [
    await step("automation_queue", () => automationService.processQueuedEvents(50)),
    await step("follow_ups_overdue", () => followUpService.markOverdue()),
    await step("lead_sla_breaches", () => leadScoringService.sweepSlaBreaches()),
  ]);

  return NextResponse.json({ ranAt: new Date().toISOString(), steps });
}
