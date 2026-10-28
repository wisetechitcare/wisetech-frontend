/**
 * PostCSS plugin: Bootstrap/Metronic utility classes never apply to v2 kit elements.
 *
 * The kit (src/ds, shadcn + Tailwind) and Bootstrap share utility names with different meanings:
 * `px-4`, `gap-1`, `border`, `bg-white`, `text-white`, `text-primary`… Bootstrap's are unlayered and
 * `!important`, so on a kit element they beat the kit's layered Tailwind classes outright (a dark-mode
 * kit button stayed white because `.bg-white` is `!important`). Kit elements carry `data-slot`; this
 * plugin rewrites every single-class, all-`!important` rule in the Metronic stylesheets from `.px-4`
 * to `.px-4:not(:where([data-slot]))`.
 *
 * `:where()` adds zero specificity, so on every element WITHOUT data-slot (all legacy UI) the rule
 * matches and wins exactly as before; nothing on an unmigrated screen changes.
 */

const SLASH = String.fromCharCode(92);
const EXEMPT = ':not(:where([data-slot]))';
// A Bootstrap/Metronic utility: one class, nothing else (`.px-4`, `.bg-white`, `.w-lg-25`).
const SINGLE_CLASS = /^[.][a-z0-9_-]+$/i;

interface Decl { type: 'decl'; prop: string; important?: boolean }
interface Rule {
  type: 'rule';
  selectors: string[];
  nodes: Array<Decl | { type: string }>;
  source?: { input?: { file?: string } };
  parent?: { type?: string; name?: string };
}

export const isLegacyStylesheet = (file: string | undefined) =>
  !!file && file.split(SLASH).join('/').includes('/src/_metronic/');

/** Exported for the unit test; the plugin applies it to every rule from a legacy stylesheet. */
export function exemptKitFromUtility(rule: Rule): boolean {
  if (rule.parent?.type === 'atrule' && rule.parent.name?.endsWith('keyframes')) return false;
  const decls = rule.nodes.filter((n): n is Decl => n.type === 'decl');
  const real = decls.filter((d) => !d.prop.startsWith('--'));
  if (real.length === 0 || !real.every((d) => d.important)) return false;
  if (!rule.selectors.every((s) => SINGLE_CLASS.test(s))) return false;
  rule.selectors = rule.selectors.map((s) => s + EXEMPT);
  return true;
}

export function kitExemption() {
  return {
    postcssPlugin: 'wt-kit-exempt-from-legacy-utilities',
    Rule(rule: Rule) {
      if (isLegacyStylesheet(rule.source?.input?.file)) exemptKitFromUtility(rule);
    },
  };
}
