import { HUE_TONES, STATUS_TONES, type Tone } from '@/ds/lib/tone';

/**
 * One translation from the legacy kits' colour NAMES to the kit's tones.
 *
 * The legacy kits named their colours in three places and not identically: `ConfigSectionCard`'s
 * `iconColor` ('primary', 'teal'), `GlassCard`'s `accentEdge` (`VividTone`: 'cyan', 'rose',
 * 'slate') and the chips' `SemanticTone`. Each adapter that forwards one of those props needs the
 * same answer, so it lives here once instead of being re-derived per adapter — and when the last
 * adapter goes, so does this file.
 *
 * Most names ARE kit tones already and pass straight through; only the two below differ.
 */
/*
 * A Map, not an object literal: `ALIAS['constructor']` on a plain object returns Object's own
 * constructor — truthy — and a function would be handed on as a tone. `iconMap` has the same
 * guard for the same reason.
 */
const ALIAS = new Map<string, Tone>([
  // The config palette's "primary" is the brand.
  ['primary', 'brand'],
  // The legacy kits' teal is the kit's cyan; there is no separate teal token.
  ['teal', 'cyan'],
]);

const KNOWN = new Set<string>([...STATUS_TONES, ...HUE_TONES]);

/**
 * A legacy colour name as a kit tone. An unrecognised name falls back rather than reaching a
 * component as an invalid tone, because `Card`/`IconBox` take `Tone | (string & {})` and would
 * otherwise paint `var(--tone)` from a name no token defines — a transparent accent with nothing
 * to say what went wrong.
 */
export const legacyTone = (name?: string | null, fallback: Tone = 'brand'): Tone => {
  if (!name) return fallback;
  return ALIAS.get(name) ?? (KNOWN.has(name) ? (name as Tone) : fallback);
};
