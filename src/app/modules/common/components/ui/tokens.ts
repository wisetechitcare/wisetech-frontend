/**
 * Design tokens for the premium UI kit.
 *
 * MIGRATION (Phase 1): this file is now a thin compatibility shim. The real
 * source of truth lives in `@app/theme/tokens` (see repo-root DESIGN_SYSTEM.md).
 * `T` re-exports the legacy pin `LEGACY_UIKIT` so nothing here changes visually
 * yet. Do NOT add new tokens here — add to the canonical module and, when
 * migrating a consumer, import from `@app/theme/tokens` directly.
 */
export {
  LEGACY_UIKIT as T,
  label,
  glassTokens,
  tonePair,
} from '@app/theme/tokens';

export type {
  ThemeMode,
  SemanticTone,
  VividTone,
  GlassVariant,
  LabelTier,
} from '@app/theme/tokens';
