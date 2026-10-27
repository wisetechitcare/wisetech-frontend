/**
 * Appearance axes for the v2 design system. Everything is an attribute/class/variable on <html>,
 * so every component (and plain CSS) follows without React context.
 *
 *   mode     light | dark                  -> .dark
 *   surface  material | glass              -> data-surface
 *   density  comfortable | compact         -> data-density
 *   brand    any CSS colour (tenant brand) -> --brand (+ derived foreground)
 */
export type Mode = "light" | "dark"
export type Surface = "material" | "glass"
export type Density = "comfortable" | "compact"

export interface Appearance {
  mode: Mode
  surface: Surface
  density: Density
  /** CSS colour; `null` keeps the WiseTech navy from the token sheet. */
  brand: string | null
}

export const BRAND_PRESETS: ReadonlyArray<{ id: string; label: string; light: string; dark: string }> = [
  { id: "navy", label: "WiseTech Navy", light: "oklch(0.45 0.17 265)", dark: "oklch(0.7 0.14 265)" },
  { id: "teal", label: "Deep Teal", light: "oklch(0.5 0.1 190)", dark: "oklch(0.74 0.11 190)" },
  { id: "violet", label: "Violet", light: "oklch(0.5 0.2 295)", dark: "oklch(0.74 0.15 295)" },
  { id: "graphite", label: "Graphite", light: "oklch(0.35 0.02 265)", dark: "oklch(0.82 0.02 265)" },
]

export function applyAppearance(a: Appearance, root: HTMLElement = document.documentElement) {
  root.classList.toggle("dark", a.mode === "dark")
  root.style.colorScheme = a.mode
  root.dataset.surface = a.surface
  root.dataset.density = a.density
  if (a.brand) {
    root.style.setProperty("--brand", a.brand)
    // Readable text on the brand fill: dark text on light brands, light text otherwise.
    root.style.setProperty(
      "--brand-foreground",
      `oklch(from ${a.brand} calc(l > 0.68 ? 0.18 : 0.985) 0.02 h)`,
    )
  } else {
    root.style.removeProperty("--brand")
    root.style.removeProperty("--brand-foreground")
  }
}
