import { BRAND_PRESETS as APP_BRAND_PRESETS } from "@/app/theme/appearance"

/**
 * Appearance axes for the v2 design system. Everything is an attribute/class/variable on <html>,
 * so every component (and plain CSS) follows without React context.
 *
 *   mode     light | dark                  -> .dark
 *   surface  material | glass              -> data-surface
 *   density  comfortable | compact         -> data-density
 *   brand    tenant brand colour           -> --brand, --brand-bright, --brand-deep
 */
export type Mode = "light" | "dark"
export type Surface = "material" | "glass"
export type Density = "comfortable" | "compact"

export interface Appearance {
  mode: Mode
  surface: Surface
  density: Density
  /** A tenant brand colour; `null` keeps the app's default navy from the token sheet. */
  brand: string | null
}

/** The app's own presets (src/app/theme/appearance.ts) — one source, never a copy. */
export const BRAND_PRESETS = APP_BRAND_PRESETS.map(({ id, label, brand }) => ({ id, label, primary: brand.primary }))

/**
 * The CTA gradient's brighter start, derived from any tenant brand. Lightness is capped so white
 * text keeps >= 4.5:1 on every preset (teal is the tightest at 4.65); chroma is capped so a vivid
 * brand doesn't go neon. The default navy uses the live app's exact pair from the token sheet.
 */
export const brightOf = (brand: string) =>
  `oklch(from ${brand} min(calc(l + 0.167), 0.53) min(calc(c * 1.56), 0.22) calc(h - 2.6))`

/** The strong CTA's dark end, derived the same way; the default navy uses the live #172554. */
export const deepOf = (brand: string) => `oklch(from ${brand} calc(l - 0.1) calc(c * 0.66) h)`

export function applyAppearance(a: Appearance, root: HTMLElement = document.documentElement) {
  root.classList.toggle("dark", a.mode === "dark")
  root.style.colorScheme = a.mode
  root.dataset.surface = a.surface
  root.dataset.density = a.density
  if (a.brand) {
    root.style.setProperty("--brand", a.brand)
    root.style.setProperty("--brand-bright", brightOf(a.brand))
    root.style.setProperty("--brand-deep", deepOf(a.brand))
  } else {
    root.style.removeProperty("--brand")
    root.style.removeProperty("--brand-bright")
    root.style.removeProperty("--brand-deep")
  }
}
