/**
 * Bootstrap Reboot (unlayered Metronic CSS) overrides Tailwind utilities on raw typographic and interactive
 * elements. src/main.css shields them only when they carry `data-slot`. jsdom has no cascade, so tests assert
 * the attribute itself. The one exemption is the inside of a kit Button (`[data-slot=button]`), whose own
 * styling owns its content. Keep the tag list in step with rebootShield.test.ts and src/main.css.
 */
const SHIELDED_SELECTOR = "h1,h2,h3,h4,h5,h6,p,label,ul,ol,li,dl,dt,dd,button,a";

/** Every shielded-tag element under `root` that has no `data-slot` (and is not inside a kit Button). */
export function findBareElements(root: ParentNode): Element[] {
  return [...root.querySelectorAll(SHIELDED_SELECTOR)].filter(
    (el) => !el.hasAttribute("data-slot") && !el.closest("[data-slot=button]"),
  );
}
