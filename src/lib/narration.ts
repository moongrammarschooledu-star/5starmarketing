import "server-only";

// Builds the spoken script for a property/project reel video and turns it
// into audio with a female neural voice. The script is ALWAYS built here on
// the server from the saved property data - never from client-supplied text -
// so the endpoint can't be used as a free text-to-speech proxy.

export type NarrationLang = "en" | "ur";
export type VoiceGender = "female" | "male";

export interface NarrationScripts {
  lang: NarrationLang;
  /** Property name, location, demand and the description as written by the admin. */
  description: string;
  /** Company line and the contact details, spoken at the end. */
  closing: string;
}

const ARABIC_SCRIPT = /[؀-ۿݐ-ݿ]/g;
const LATIN = /[A-Za-z]/g;

export function detectNarrationLang(text: string): NarrationLang {
  const arabic = (text.match(ARABIC_SCRIPT) ?? []).length;
  const latin = (text.match(LATIN) ?? []).length;
  return arabic > latin ? "ur" : "en";
}

function clean(text: string) {
  return text
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/\S+@\S+\.\S+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Cuts at the last sentence end before `max`, else at a word boundary. */
function limitAtSentence(text: string, max: number) {
  if (text.length <= max) return text;
  const slice = text.slice(0, max);
  const sentenceEnd = Math.max(slice.lastIndexOf("."), slice.lastIndexOf("!"), slice.lastIndexOf("?"), slice.lastIndexOf("۔"));
  if (sentenceEnd > max * 0.5) return slice.slice(0, sentenceEnd + 1);
  return slice.replace(/\s+\S*$/, "") + ".";
}

const DIGIT_WORDS: Record<NarrationLang, string[]> = {
  en: ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"],
  ur: ["صفر", "ایک", "دو", "تین", "چار", "پانچ", "چھ", "سات", "آٹھ", "نو"],
};

/** "+92 319 8430458" -> "zero three one nine, eight four three zero four five eight" */
function spokenPhone(raw: string, lang: NarrationLang) {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("92") && digits.length >= 12) digits = `0${digits.slice(2)}`;
  if (digits.length < 7) return "";
  const words = digits.split("").map((d) => DIGIT_WORDS[lang][Number(d)]);
  const split = digits.length === 11 ? 4 : Math.ceil(digits.length / 2);
  return `${words.slice(0, split).join(" ")}, ${words.slice(split).join(" ")}`;
}

export function buildNarration(input: {
  name: string;
  location: string;
  price?: string;
  description: string;
  phones: string[];
  langOverride?: NarrationLang;
}): NarrationScripts {
  const description = clean(input.description);
  const lang = input.langOverride ?? detectNarrationLang(description || input.name);
  const name = clean(input.name);
  const location = clean(input.location);
  const price = clean(input.price ?? "");
  const body = limitAtSentence(description, 650);
  const phones = input.phones.map((p) => spokenPhone(p, lang)).filter(Boolean).slice(0, 2);

  const closing = closingScript(lang, phones);

  if (lang === "ur") {
    const intro = [`${name}۔`, location && `${location}۔`, price && `ڈیمانڈ، ${price}۔`].filter(Boolean).join(" ");
    return { lang, description: [intro, body].filter(Boolean).join(" "), closing };
  }

  const intro = [
    `${name}.`,
    location && `Location, ${location}.`,
    price && `Demand, ${price}.`,
  ]
    .filter(Boolean)
    .join(" ");
  return { lang, description: [intro, body].filter(Boolean).join(" "), closing };
}

/** The company line and contact numbers spoken at the end of every video. */
function closingScript(lang: NarrationLang, spokenPhones: string[]): string {
  if (lang === "ur") {
    return [
      "فائیو اسٹار ایم اسٹیٹ اینڈ بلڈرز۔",
      "خرید و فروخت، ڈویلپمنٹ، تعمیرات اور کرایہ داری کی خدمات۔",
      spokenPhones.length > 0 ? `مزید معلومات کے لیے رابطہ کریں: ${spokenPhones.join("، یا ")}۔` : "مزید معلومات کے لیے ہم سے رابطہ کریں۔",
      "آپ واٹس ایپ پر بھی پیغام کر سکتے ہیں۔ شکریہ۔",
    ].join(" ");
  }
  return [
    "Five Star M Estate and Builders.",
    "We deal in buying and selling, development, construction, and rental services.",
    spokenPhones.length > 0 ? `For more details, call ${spokenPhones.join(", or ")}.` : "For more details, contact us today.",
    "You can also message us on WhatsApp. Thank you.",
  ].join(" ");
}

/** The script for a company ad made from text the admin typed: the headline,
 *  then the description exactly as written (cut at a sentence end if it is
 *  very long), then the company closing with the phone numbers. */
export function buildAdNarration(input: {
  headline: string;
  description: string;
  phones: string[];
  langOverride?: NarrationLang;
}): NarrationScripts {
  const description = clean(input.description);
  const headline = clean(input.headline);
  const lang = input.langOverride ?? detectNarrationLang(description || headline);
  const phones = input.phones.map((p) => spokenPhone(p, lang)).filter(Boolean).slice(0, 2);
  const stop = lang === "ur" ? "۔" : ".";
  const head = headline && !/[.!?۔]$/.test(headline) ? `${headline}${stop}` : headline;
  return {
    lang,
    description: [head, limitAtSentence(description, 900)].filter(Boolean).join(" "),
    closing: closingScript(lang, phones),
  };
}

export type SpeechResult =
  | { ok: true; audio: ArrayBuffer; contentType: string }
  | { ok: false; reason: "not_configured" | "failed"; message: string };

const SAFE_ENV = /^[\x21-\x7E]+$/;

function readEnv(name: string): string | null {
  const v = process.env[name]?.trim();
  if (!v) return null;
  // A pasted key with a stray non-ASCII character (e.g. a bullet) throws a
  // cryptic "ByteString" error when set as an HTTP header - say so plainly.
  if (!SAFE_ENV.test(v)) {
    throw new Error(`${name} contains an invalid character. Delete it and paste the key again, straight from the provider's dashboard.`);
  }
  return v;
}

function escapeXml(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

async function azureSpeech(text: string, lang: NarrationLang, gender: VoiceGender, key: string, region: string): Promise<SpeechResult> {
  const voice =
    gender === "male"
      ? lang === "ur"
        ? process.env.AZURE_VOICE_UR_MALE?.trim() || "ur-PK-AsadNeural"
        : process.env.AZURE_VOICE_EN_MALE?.trim() || "en-IN-PrabhatNeural"
      : lang === "ur"
        ? process.env.AZURE_VOICE_UR?.trim() || "ur-PK-UzmaNeural"
        : process.env.AZURE_VOICE_EN?.trim() || "en-IN-NeerjaNeural";
  const xmlLang = lang === "ur" ? "ur-PK" : "en-IN";
  const ssml = `<speak version='1.0' xml:lang='${xmlLang}'><voice name='${voice}'>${escapeXml(text)}</voice></speak>`;
  const res = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": key,
      "Content-Type": "application/ssml+xml",
      "X-Microsoft-OutputFormat": "audio-24khz-96kbitrate-mono-mp3",
      "User-Agent": "5starm-reel-video",
    },
    body: ssml,
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) {
    const detail = (await res.text().catch(() => "")).slice(0, 200);
    console.error("Azure speech failed:", res.status, detail);
    return { ok: false, reason: "failed", message: `The voice service (Azure) returned ${res.status}. Check the key and region.` };
  }
  return { ok: true, audio: await res.arrayBuffer(), contentType: "audio/mpeg" };
}

async function elevenLabsSpeech(text: string, gender: VoiceGender, key: string): Promise<SpeechResult> {
  // Premade voices available on every plan: Rachel (female) and Adam (male).
  const voiceId =
    gender === "male"
      ? process.env.ELEVENLABS_VOICE_ID_MALE?.trim() || "pNInz6obpgDQGcFmaJgB"
      : process.env.ELEVENLABS_VOICE_ID?.trim() || "21m00Tcm4TlvDq8ikWAM";
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": key, "Content-Type": "application/json", Accept: "audio/mpeg" },
    body: JSON.stringify({ text, model_id: "eleven_multilingual_v2" }),
    signal: AbortSignal.timeout(45000),
  });
  if (!res.ok) {
    const detail = (await res.text().catch(() => "")).slice(0, 200);
    console.error("ElevenLabs speech failed:", res.status, detail);
    return { ok: false, reason: "failed", message: `The voice service (ElevenLabs) returned ${res.status}. Check the key and your plan's character limit.` };
  }
  return { ok: true, audio: await res.arrayBuffer(), contentType: "audio/mpeg" };
}

/** Female (default) or male neural voice. Providers are tried one after the other and
 *  the first one that works wins, so one provider having a problem (wrong or expired key,
 *  a disabled Azure subscription, quota used up) does not leave an ad without a voice.
 *  ElevenLabs goes first; set VOICE_PROVIDER=azure in Vercel to put Azure (better Urdu) first. */
export async function synthesizeSpeech(text: string, lang: NarrationLang, gender: VoiceGender = "female"): Promise<SpeechResult> {
  let azureKey: string | null;
  let azureRegion: string | null;
  let elevenKey: string | null;
  try {
    azureKey = readEnv("AZURE_SPEECH_KEY");
    azureRegion = readEnv("AZURE_SPEECH_REGION");
    elevenKey = readEnv("ELEVENLABS_API_KEY");
  } catch (e) {
    return { ok: false, reason: "failed", message: e instanceof Error ? e.message : "The voice service key is invalid." };
  }

  const azure = azureKey && azureRegion ? { name: "Azure", run: () => azureSpeech(text, lang, gender, azureKey, azureRegion) } : null;
  const eleven = elevenKey ? { name: "ElevenLabs", run: () => elevenLabsSpeech(text, gender, elevenKey) } : null;
  const azureFirst = process.env.VOICE_PROVIDER?.trim().toLowerCase() === "azure";
  const order = (azureFirst ? [azure, eleven] : [eleven, azure]).filter((p): p is NonNullable<typeof p> => p !== null);
  if (order.length === 0) return { ok: false, reason: "not_configured", message: "No voice service is set up yet." };

  const problems: string[] = [];
  for (const provider of order) {
    try {
      const res = await provider.run();
      if (res.ok) return res;
      problems.push(res.message);
    } catch (e) {
      console.error(`${provider.name} speech error:`, e);
      problems.push(`The voice service (${provider.name}) did not respond.`);
    }
  }
  return { ok: false, reason: "failed", message: problems.join(" ") };
}
