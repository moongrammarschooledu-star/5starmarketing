import "server-only";
import { parseTraceAnswer, type RawTrace } from "./trace";

// Reads one picture of a floor plan with Claude (vision) and returns the rooms
// in feet. The picture goes straight to the Anthropic API and is never stored.

const MODELS = [process.env.HOUSE_PLAN_MODEL, "claude-sonnet-5-5", "claude-sonnet-5"].filter((m): m is string => Boolean(m));

export type TraceAiResult = { ok: true; trace: RawTrace } | { ok: false; message: string; notConfigured?: boolean };

/** The API key with any invisible/non-ASCII character removed (a stray
 *  newline or zero-width character pasted with the key breaks the header). */
function apiKey(): string {
  return (process.env.ANTHROPIC_API_KEY ?? "").replace(/[^\x21-\x7E]/g, "");
}

export function isTraceConfigured(): boolean {
  return apiKey().length > 20;
}

function systemPrompt(plot: { width: number; length: number }): string {
  return `You read hand-drawn or printed house floor plans (naqsha, as used in Pakistan) and return them as JSON.

Output ONLY one JSON object - no words before or after, no code fences.

Coordinates are in FEET. (0,0) is the top-left corner of the PLOT. x grows to the right, y grows DOWN. The plot is ${plot.width} ft wide (x) and ${plot.length} ft long (y).

Rules:
- Use the dimensions written on the drawing when you can read them (for example 12'-6", 12 x 14, 12'6" x 14'). A plot size in "marla" is not a room dimension. When a room has no dimension, estimate from the proportions of the drawing so that the whole house fits inside the plot.
- Rooms must not overlap and should touch along shared walls. Round every number to 0.5.
- The FRONT of the house (the road / main gate side) must be at the BOTTOM of the plan (large y). If the drawing shows the road or gate on another side, rotate the whole plan so the road is at the bottom.
- Room "type" must be one of: bedroom, bathroom, kitchen, lounge (TV lounge / hall), drawing (drawing room), dining, office (study), prayer, store, stairs, garage, porch, lawn, grass (a grass area), footpath (paved path), plants (a planter bed), tree, balcony, other.
- "name" is the label written on the drawing, kept short (for example "Master Bed", "Kitchen"). If nothing is written, use the type's usual name.
- "openings" lists the doors and windows drawn on that room's walls. Each opening: {"kind": "door" | "main_door" | "window" | "ventilator", "side": "top" | "bottom" | "left" | "right" (the wall of THAT room), "offset": feet from the left end of that wall (top / bottom walls) or from the top end (left / right walls) to the START of the opening, "width": feet}. The main entrance is "main_door". Include only what is drawn.
- Only include rooms that are drawn. Never invent rooms.
- Put anything you were unsure about in "notes" (short sentences).
- If the picture is not a floor plan or cannot be read, answer {"error": "short reason"}.

Answer shape: {"rooms":[{"type":"bedroom","name":"Master Bed","x":0,"y":0,"w":12,"h":14,"openings":[{"kind":"window","side":"top","offset":4,"width":4}]}],"notes":["..."]}`;
}

export async function readPlanPicture(image: { mediaType: string; data: string }, plot: { width: number; length: number }, floorName: string): Promise<TraceAiResult> {
  const key = apiKey();
  if (key.length < 20) return { ok: false, notConfigured: true, message: "The AI reader is not set up yet (no API key)." };

  let lastMessage = "The AI could not read this picture.";
  for (const model of MODELS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 55_000);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        signal: controller.signal,
        headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model,
          max_tokens: 8000,
          system: systemPrompt(plot),
          messages: [
            {
              role: "user",
              content: [
                { type: "image", source: { type: "base64", media_type: image.mediaType, data: image.data } },
                { type: "text", text: `Read this floor plan. It is the ${floorName}. The plot is ${plot.width} x ${plot.length} ft. Answer with the JSON only.` },
              ],
            },
          ],
        }),
      });
      const body = (await res.json().catch(() => null)) as { content?: { type: string; text?: string }[]; error?: { type?: string; message?: string } } | null;
      if (!res.ok) {
        const apiMessage = body?.error?.message ?? `HTTP ${res.status}`;
        if (res.status === 401 || res.status === 403) return { ok: false, message: "The AI key was not accepted. Please check ANTHROPIC_API_KEY in Vercel." };
        if (res.status === 429) return { ok: false, message: "The AI is busy or out of credit. Please try again in a minute." };
        lastMessage = `The AI said: ${apiMessage}`.slice(0, 300);
        // A model name that does not exist for this account: try the next one.
        if (res.status === 404 || /model/i.test(apiMessage)) continue;
        return { ok: false, message: lastMessage };
      }
      const text = (body?.content ?? []).filter((c) => c.type === "text").map((c) => c.text ?? "").join("\n");
      const parsed = parseTraceAnswer(text);
      if (!parsed.trace) return { ok: false, message: parsed.error ?? lastMessage };
      return { ok: true, trace: parsed.trace };
    } catch (e) {
      lastMessage = e instanceof Error && e.name === "AbortError" ? "The AI took too long. Please try again with a smaller or clearer picture." : "Could not reach the AI. Please try again.";
    } finally {
      clearTimeout(timer);
    }
  }
  return { ok: false, message: lastMessage };
}
