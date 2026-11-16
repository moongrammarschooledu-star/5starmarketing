// Background music for the promo videos. Everything is made from oscillators
// and noise right here (nothing sampled, no songs), so there is no copyright
// to worry about and TikTok / Facebook will not mute it.
//
// Several styles, each with its own chords, tempo, rhythm and instruments.
// The music gets quieter while someone is speaking, fuller in the gaps, and
// fades out at the end.

export type MusicStyle = "upbeat" | "cinematic" | "piano" | "lofi" | "ambient";

export const MUSIC_STYLES: { id: MusicStyle; label: string; hint: string }[] = [
  { id: "upbeat", label: "Upbeat & modern", hint: "Bright, happy beat with a catchy tune" },
  { id: "cinematic", label: "Cinematic & luxury", hint: "Slow, grand strings and deep drums" },
  { id: "piano", label: "Soft piano", hint: "Warm, gentle piano melody" },
  { id: "lofi", label: "Lo-fi chill", hint: "Relaxed jazzy beat" },
  { id: "ambient", label: "Light ambient", hint: "Quiet, simple background" },
];

export const DEFAULT_MUSIC_STYLE: MusicStyle = "upbeat";

const mtof = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

interface Kit {
  ctx: BaseAudioContext;
  /** Everything goes here (then volume plan, compressor, output). */
  master: GainNode;
  /** A send into a small room reverb. */
  reverb: GainNode;
  noise: AudioBuffer;
}

function makeNoise(ctx: BaseAudioContext): AudioBuffer {
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 1.5), ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

function makeReverbImpulse(ctx: BaseAudioContext, seconds: number): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
  }
  return buf;
}

interface ToneOpts {
  freq: number;
  t: number;
  dur: number;
  type?: OscillatorType;
  gain: number;
  attack?: number;
  /** Seconds the sound takes to die away after the note (exponential tail). */
  release?: number;
  lowpass?: number;
  detune?: number;
  /** 0..1 amount sent to the reverb. */
  verb?: number;
  /** Fast decay instead of a held note (plucks, piano, bells). */
  pluck?: boolean;
}

function tone(k: Kit, o: ToneOpts) {
  const { ctx } = k;
  const osc = ctx.createOscillator();
  osc.type = o.type ?? "sine";
  osc.frequency.value = o.freq;
  if (o.detune) osc.detune.value = o.detune;
  const g = ctx.createGain();
  const attack = o.attack ?? 0.01;
  const rel = o.release ?? 0.3;
  g.gain.setValueAtTime(0.0001, o.t);
  g.gain.linearRampToValueAtTime(o.gain, o.t + attack);
  if (o.pluck) {
    g.gain.exponentialRampToValueAtTime(0.0001, o.t + attack + o.dur);
  } else {
    g.gain.setValueAtTime(o.gain, o.t + Math.max(attack, o.dur - rel));
    g.gain.linearRampToValueAtTime(0.0001, o.t + o.dur + rel);
  }
  let node: AudioNode = osc;
  if (o.lowpass) {
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = o.lowpass;
    osc.connect(f);
    node = f;
  }
  node.connect(g);
  g.connect(k.master);
  if (o.verb) {
    const s = ctx.createGain();
    s.gain.value = o.verb;
    g.connect(s);
    s.connect(k.reverb);
  }
  const end = o.t + (o.pluck ? attack + o.dur : o.dur + rel) + 0.05;
  osc.start(o.t);
  osc.stop(end);
}

/** A soft piano-like note: a fundamental plus a couple of quiet harmonics that die away quickly. */
function piano(k: Kit, midi: number, t: number, dur: number, gain: number, verb = 0.5) {
  const f = mtof(midi);
  tone(k, { freq: f, t, dur, type: "triangle", gain, pluck: true, lowpass: 3200, verb, attack: 0.006 });
  tone(k, { freq: f * 2, t, dur: dur * 0.6, type: "sine", gain: gain * 0.35, pluck: true, verb, attack: 0.004 });
  tone(k, { freq: f * 3, t, dur: dur * 0.35, type: "sine", gain: gain * 0.12, pluck: true, verb, attack: 0.003 });
}

/** A mellow electric-piano note (lo-fi style). */
function rhodes(k: Kit, midi: number, t: number, dur: number, gain: number) {
  const f = mtof(midi);
  tone(k, { freq: f, t, dur, type: "sine", gain, pluck: true, lowpass: 2400, verb: 0.35, attack: 0.012 });
  tone(k, { freq: f * 2, t, dur: dur * 0.5, type: "triangle", gain: gain * 0.28, pluck: true, lowpass: 2400, verb: 0.35, attack: 0.008 });
}

function kick(k: Kit, t: number, vol: number) {
  const { ctx } = k;
  const o = ctx.createOscillator();
  o.type = "sine";
  o.frequency.setValueAtTime(150, t);
  o.frequency.exponentialRampToValueAtTime(48, t + 0.13);
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);
  o.connect(g);
  g.connect(k.master);
  o.start(t);
  o.stop(t + 0.4);
}

function noiseHit(k: Kit, t: number, vol: number, dur: number, filter: BiquadFilterType, freq: number, q = 1) {
  const { ctx } = k;
  const src = ctx.createBufferSource();
  src.buffer = k.noise;
  const f = ctx.createBiquadFilter();
  f.type = filter;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f);
  f.connect(g);
  g.connect(k.master);
  src.start(t, Math.random() * 0.5);
  src.stop(t + dur + 0.02);
}

function snare(k: Kit, t: number, vol: number) {
  noiseHit(k, t, vol, 0.17, "bandpass", 1900, 0.8);
  tone(k, { freq: 190, t, dur: 0.1, type: "triangle", gain: vol * 0.5, pluck: true, attack: 0.002 });
}

function hat(k: Kit, t: number, vol: number, open = false) {
  noiseHit(k, t, vol, open ? 0.16 : 0.045, "highpass", 7500);
}

function timpani(k: Kit, t: number, vol: number) {
  const { ctx } = k;
  const o = ctx.createOscillator();
  o.type = "sine";
  o.frequency.setValueAtTime(95, t);
  o.frequency.exponentialRampToValueAtTime(52, t + 0.5);
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
  o.connect(g);
  g.connect(k.master);
  const s = ctx.createGain();
  s.gain.value = 0.4;
  g.connect(s);
  s.connect(k.reverb);
  o.start(t);
  o.stop(t + 1.5);
  noiseHit(k, t, vol * 0.25, 0.12, "lowpass", 600);
}

/** A held, string-like chord: slightly detuned saws through a low-pass filter. */
function strings(k: Kit, notes: number[], t: number, dur: number, gain: number) {
  for (const n of notes) {
    for (const detune of [-8, 7]) {
      tone(k, { freq: mtof(n), t, dur, type: "sawtooth", gain: gain / 2, attack: Math.min(1.1, dur * 0.4), release: 0.9, lowpass: 1300, detune, verb: 0.5 });
    }
  }
}

interface Chord {
  bass: number;
  notes: number[];
}

type StyleFn = (k: Kit, t0: number, barLen: number, bar: number, chord: Chord) => void;

const upbeat: { bpm: number; chords: Chord[]; play: StyleFn } = {
  bpm: 112,
  chords: [
    { bass: 36, notes: [60, 64, 67] }, // C
    { bass: 43, notes: [59, 62, 67] }, // G
    { bass: 45, notes: [60, 64, 69] }, // Am
    { bass: 41, notes: [60, 65, 69] }, // F
  ],
  play(k, t0, barLen, bar, c) {
    const beat = barLen / 4;
    for (let i = 0; i < 4; i++) {
      kick(k, t0 + i * beat, 0.55);
      if (i === 1 || i === 3) snare(k, t0 + i * beat, 0.3);
    }
    for (let i = 0; i < 8; i++) hat(k, t0 + (i * beat) / 2, i % 2 ? 0.07 : 0.045, false);
    // bass: root on the beat, octave bounce on the off-beats
    for (let i = 0; i < 8; i++) {
      const n = c.bass + (i % 2 ? 12 : 0);
      tone(k, { freq: mtof(n), t: t0 + (i * beat) / 2, dur: beat * 0.42, type: "triangle", gain: 0.2, pluck: true, lowpass: 600, attack: 0.01 });
    }
    // chord stabs on the off-beats
    for (const i of [1, 3, 5, 7]) {
      for (const n of c.notes) tone(k, { freq: mtof(n), t: t0 + (i * beat) / 2, dur: beat * 0.35, type: "square", gain: 0.035, pluck: true, lowpass: 1800, verb: 0.25 });
    }
    // a catchy tune on top, climbing every second bar
    const tune = bar % 2 === 0 ? [0, 1, 2, 1, 2, 2, 1, 0] : [2, 1, 0, 1, 2, 3, 2, 1];
    tune.forEach((idx, i) => {
      const note = idx === 3 ? c.notes[0] + 24 : c.notes[idx] + 12;
      tone(k, { freq: mtof(note), t: t0 + (i * beat) / 2, dur: beat * 0.45, type: "triangle", gain: 0.13, pluck: true, lowpass: 3500, verb: 0.35, attack: 0.008 });
    });
  },
};

const cinematic: { bpm: number; chords: Chord[]; play: StyleFn } = {
  bpm: 66,
  chords: [
    { bass: 38, notes: [62, 65, 69] }, // Dm
    { bass: 34, notes: [58, 62, 65] }, // Bb
    { bass: 41, notes: [60, 65, 69] }, // F
    { bass: 36, notes: [60, 64, 67] }, // C
  ],
  play(k, t0, barLen, bar, c) {
    const beat = barLen / 4;
    strings(k, [...c.notes, c.notes[0] - 12], t0, barLen, 0.1);
    tone(k, { freq: mtof(c.bass), t: t0, dur: barLen, type: "sine", gain: 0.2, attack: 0.3, release: 0.5 });
    if (bar % 2 === 0) timpani(k, t0, 0.42);
    // a slow, bell-like theme
    const theme = [2, 1, 0, 1];
    theme.forEach((idx, i) => {
      if (bar % 2 === 1 && i % 2) return;
      const note = c.notes[idx] + 24;
      tone(k, { freq: mtof(note), t: t0 + i * beat, dur: beat * 1.8, type: "sine", gain: 0.12, pluck: true, verb: 0.8, attack: 0.01 });
      tone(k, { freq: mtof(note) * 2, t: t0 + i * beat, dur: beat * 1.0, type: "sine", gain: 0.03, pluck: true, verb: 0.8, attack: 0.01 });
    });
    if (bar % 4 === 3) noiseHit(k, t0 + barLen - beat * 0.9, 0.05, beat, "highpass", 4000); // soft rise into the next phrase
  },
};

const pianoStyle: { bpm: number; chords: Chord[]; play: StyleFn } = {
  bpm: 76,
  chords: [
    { bass: 36, notes: [60, 64, 67, 72] }, // C
    { bass: 45, notes: [60, 64, 69, 72] }, // Am
    { bass: 41, notes: [60, 65, 69, 72] }, // F
    { bass: 43, notes: [59, 62, 67, 71] }, // G
  ],
  play(k, t0, barLen, bar, c) {
    const beat = barLen / 4;
    strings(k, c.notes.slice(0, 3).map((n) => n - 12), t0, barLen, 0.045);
    tone(k, { freq: mtof(c.bass), t: t0, dur: beat * 2.2, type: "sine", gain: 0.2, pluck: true, attack: 0.01 });
    tone(k, { freq: mtof(c.bass + (bar % 2 ? 7 : 0)), t: t0 + beat * 2, dur: beat * 1.8, type: "sine", gain: 0.14, pluck: true, attack: 0.01 });
    // flowing arpeggio, 8th notes, up then down
    const order = [0, 1, 2, 3, 2, 1, 2, 1];
    order.forEach((idx, i) => {
      piano(k, c.notes[idx], t0 + (i * beat) / 2, beat * 2.2, i === 0 ? 0.2 : 0.14);
    });
    // a singing melody note on beats 1 and 3
    piano(k, c.notes[3] + 12, t0, beat * 3, 0.17, 0.7);
    if (bar % 2) piano(k, c.notes[2] + 12, t0 + beat * 2, beat * 2.5, 0.15, 0.7);
  },
};

const lofi: { bpm: number; chords: Chord[]; play: StyleFn } = {
  bpm: 78,
  chords: [
    { bass: 41, notes: [65, 69, 72, 76] }, // Fmaj7
    { bass: 40, notes: [64, 67, 71, 74] }, // Em7
    { bass: 38, notes: [62, 65, 69, 72] }, // Dm7
    { bass: 36, notes: [60, 64, 67, 71] }, // Cmaj7
  ],
  play(k, t0, barLen, bar, c) {
    const beat = barLen / 4;
    const swing = beat * 0.17;
    kick(k, t0, 0.42);
    kick(k, t0 + beat * 2.5 + swing, 0.36);
    snare(k, t0 + beat, 0.17);
    snare(k, t0 + beat * 3, 0.17);
    for (let i = 0; i < 8; i++) hat(k, t0 + (i * beat) / 2 + (i % 2 ? swing : 0), i % 2 ? 0.05 : 0.035, i === 7);
    c.notes.forEach((n, i) => {
      rhodes(k, n, t0 + i * 0.018, beat * 1.9, 0.11);
      rhodes(k, n, t0 + beat * 2.5 + swing + i * 0.018, beat * 1.4, 0.085);
    });
    tone(k, { freq: mtof(c.bass), t: t0, dur: beat * 1.7, type: "sine", gain: 0.24, pluck: true, attack: 0.012, lowpass: 500 });
    tone(k, { freq: mtof(c.bass + 7), t: t0 + beat * 2.5 + swing, dur: beat * 1.2, type: "sine", gain: 0.18, pluck: true, attack: 0.012, lowpass: 500 });
    if (bar % 2 === 1) rhodes(k, c.notes[3] + 12, t0 + beat * 3.5, beat * 0.9, 0.09);
  },
};

const ambient: { bpm: number; chords: Chord[]; play: StyleFn } = {
  bpm: 76,
  chords: [
    { bass: 45, notes: [57, 60, 64] }, // Am
    { bass: 41, notes: [53, 57, 60] }, // F
    { bass: 48, notes: [60, 64, 67] }, // C
    { bass: 43, notes: [55, 59, 62] }, // G
  ],
  play(k, t0, barLen, _bar, c) {
    const beat = barLen / 4;
    for (const n of c.notes) tone(k, { freq: mtof(n), t: t0, dur: barLen - 0.4, type: "triangle", gain: 0.12, attack: 0.7, release: 0.7, lowpass: 1000, verb: 0.3 });
    tone(k, { freq: mtof(c.bass - 12), t: t0, dur: barLen, type: "sine", gain: 0.18, attack: 0.3, release: 0.2 });
    [0, 1, 2, 1, 0, 2, 1, 2].forEach((idx, i) => {
      tone(k, { freq: mtof(c.notes[idx] + 12), t: t0 + (i * beat) / 2, dur: 0.6, type: "triangle", gain: 0.1, pluck: true, verb: 0.4 });
    });
  },
};

/** `trim` evens out how loud each style plays (measured: upbeat, piano and lo-fi came out about 6 dB quieter than the others). */
const STYLES: Record<MusicStyle, { bpm: number; chords: Chord[]; play: StyleFn; trim: number }> = {
  upbeat: { ...upbeat, trim: 1.5 },
  cinematic: { ...cinematic, trim: 1 },
  piano: { ...pianoStyle, trim: 1.8 },
  lofi: { ...lofi, trim: 1.9 },
  ambient: { ...ambient, trim: 1 },
};

/** Schedules the whole piece on `ctx`, from `startAt` for `total` seconds, ducked under any speech. */
export function scheduleMusic(
  ctx: BaseAudioContext,
  out: AudioNode,
  startAt: number,
  total: number,
  voice: { from: number; to: number }[],
  style: MusicStyle = DEFAULT_MUSIC_STYLE
) {
  const def = STYLES[style] ?? STYLES[DEFAULT_MUSIC_STYLE];

  const master = ctx.createGain();
  master.gain.value = 0;
  const warm = ctx.createBiquadFilter();
  warm.type = "lowpass";
  warm.frequency.value = style === "lofi" ? 4200 : 12000;
  const comp = ctx.createDynamicsCompressor();
  master.connect(warm);
  warm.connect(comp);
  comp.connect(out);

  const conv = ctx.createConvolver();
  conv.buffer = makeReverbImpulse(ctx, style === "cinematic" ? 3.2 : 1.8);
  const verbOut = ctx.createGain();
  verbOut.gain.value = style === "cinematic" ? 0.5 : 0.35;
  const reverb = ctx.createGain();
  reverb.connect(conv);
  conv.connect(verbOut);
  verbOut.connect(master);

  const kit: Kit = { ctx, master, reverb, noise: makeNoise(ctx) };
  const barLen = (60 / def.bpm) * 4;
  const bars = Math.ceil(total / barLen) + 1;
  for (let b = 0; b < bars; b++) {
    def.play(kit, startAt + b * barLen, barLen, b, def.chords[b % def.chords.length]);
  }

  // Loudness plan: gently in, quiet while someone is speaking, fuller in the gaps, out at the end.
  const hi = 0.55 * def.trim;
  const lo = 0.2 * def.trim;
  const g = master.gain;
  g.setValueAtTime(0, startAt);
  g.linearRampToValueAtTime(hi, startAt + 1.2);
  for (const v of voice) {
    g.setTargetAtTime(lo, startAt + v.from - 0.25, 0.25);
    g.setTargetAtTime(hi, startAt + v.to + 0.1, 0.5);
  }
  g.setValueAtTime(hi, startAt + Math.max(0, total - 1.8));
  g.linearRampToValueAtTime(0, startAt + total);
}
