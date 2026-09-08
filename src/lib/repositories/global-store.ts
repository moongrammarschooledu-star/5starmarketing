import "server-only";

// Next.js's App Router compiles Server Components and Server Actions into
// separate webpack/Turbopack "layers," each getting its own module
// instance — a plain `let` at module scope silently forks into multiple
// copies that don't see each other's writes. `globalThis` is a true
// process-wide singleton that every layer shares, so we park the mutable
// in-memory demo data there instead. (This limitation goes away entirely
// once STEP 4 swaps these repositories for real Supabase queries.)
const registry = globalThis as unknown as Record<string, unknown>;

export function globalStore<T>(key: string, seed: () => T): { get: () => T; set: (value: T) => void } {
  const storeKey = `__5starm_store_${key}`;

  if (registry[storeKey] === undefined) {
    registry[storeKey] = seed();
  }

  return {
    get: () => registry[storeKey] as T,
    set: (value: T) => {
      registry[storeKey] = value;
    },
  };
}
