/**
 * Scoped preferences — one cascade, one resolver.
 *
 * A preference can hold an opinion at several scopes (the user, their branch, the
 * organisation). The most specific scope that HAS an opinion wins; the fallback is
 * applied once, here, only after every scope has declined.
 *
 * Design: summary/architecture/PREFERENCE_CASCADE_ARCHITECTURE.md §3.1. Built when the
 * second consumer (Interface Style) arrived, per that document's trigger.
 *
 * R1 — the invariant this file exists to hold: `null` means "this scope has nothing to
 * say" and is NOT the fallback value. Conflating them let an unset branch override its
 * org three separate times in the time-format work.
 */

export type Scope = 'user' | 'branch' | 'org';

export interface PreferenceSpec<T> {
  readonly key: string;
  /** Scopes allowed to hold an opinion, most specific first. The order IS the policy. */
  readonly scopes: readonly Scope[];
  /** Applied ONCE, by the resolver, only when every scope declines. */
  readonly fallback: T;
  /** Raw stored value -> an opinion, or `null` for "no opinion". Never return `fallback` here (R1). */
  decode(raw: unknown): T | null;
}

export type ScopeValues = Partial<Record<Scope, unknown>>;

/** The value, plus WHICH scope decided it — so a settings screen can say "Following your organisation". */
export function explain<T>(
  spec: PreferenceSpec<T>,
  layers: ScopeValues,
): { value: T; source: Scope | 'fallback' } {
  for (const scope of spec.scopes) {
    const opinion = spec.decode(layers[scope]);
    if (opinion !== null) return { value: opinion, source: scope };
  }
  return { value: spec.fallback, source: 'fallback' };
}

export function resolve<T>(spec: PreferenceSpec<T>, layers: ScopeValues): T {
  return explain(spec, layers).value;
}
