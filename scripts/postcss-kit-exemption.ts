/**
 * PostCSS plugin: where the kit and Bootstrap/Metronic use the SAME utility name, the kit's wins on
 * v2 kit elements.
 *
 * The kit (src/ds, shadcn + Tailwind) and Bootstrap share utility names with different meanings:
 * `px-4`, `gap-1`, `border`, `bg-white`, `text-white`, `text-primary`… Bootstrap's are unlayered and
 * `!important`, so on a kit element they beat the kit's layered Tailwind classes outright (a dark-mode
 * kit button stayed white because `.bg-white` is `!important`). Kit elements carry `data-slot`; this
 * plugin rewrites those colliding single-class, all-`!important` rules in the Metronic stylesheets
 * from `.px-4` to `.px-4:not(:where([data-slot]))`.
 *
 * Only names the kit itself uses are rewritten (read from src/ds at startup). Bootstrap-only layout
 * classes a call site puts on a kit button (`w-100`, `d-none`, `me-2`, `d-md-inline-flex`) keep
 * working there exactly as they did on the old button.
 *
 * `:where()` adds zero specificity, so on every element WITHOUT data-slot (all legacy UI) the rule
 * matches and wins exactly as before; nothing on an unmigrated screen changes. The dev server reads
 * the kit's classes once: restart it after adding a new utility to a kit component.
 */
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const SLASH = String.fromCharCode(92);
const EXEMPT = ':not(:where([data-slot]))';
// A Bootstrap/Metronic utility: one class, nothing else (`.px-4`, `.bg-white`, `.w-lg-25`).
const SINGLE_CLASS = /^[.][a-z0-9_-]+$/i;
const PLAIN_TOKEN = /^[a-z0-9_-]+$/i;

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

const tokens = (s: string) => s.split('').map((c) => (c <= ' ' ? ' ' : c)).join('').split(' ').filter((t) => PLAIN_TOKEN.test(t));

/** Every plain class token in the kit's string literals (variant-prefixed ones can't collide). */
export function kitClassNames(dsDir: string): Set<string> {
  const out = new Set<string>();
  const walk = (dir: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.tsx') && !e.name.includes('.stories.') && !e.name.includes('.test.')) {
        const sf = ts.createSourceFile(p, readFileSync(p, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
        const visit = (n: ts.Node) => {
          if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) tokens(n.text).forEach((t) => out.add(t));
          else if (ts.isTemplateExpression(n)) [n.head.text, ...n.templateSpans.map((s) => s.literal.text)].forEach((t) => tokens(t).forEach((x) => out.add(x)));
          ts.forEachChild(n, visit);
        };
        visit(sf);
      }
    }
  };
  walk(dsDir);
  return out;
}

/** Exported for the unit test; the plugin applies it to every rule from a legacy stylesheet. */
export function exemptKitFromUtility(rule: Rule, kitClasses: Set<string>): boolean {
  if (rule.parent?.type === 'atrule' && rule.parent.name?.endsWith('keyframes')) return false;
  const decls = rule.nodes.filter((n): n is Decl => n.type === 'decl');
  const real = decls.filter((d) => !d.prop.startsWith('--'));
  if (real.length === 0 || !real.every((d) => d.important)) return false;
  if (!rule.selectors.every((s) => SINGLE_CLASS.test(s))) return false;
  let changed = false;
  rule.selectors = rule.selectors.map((s) => {
    if (!kitClasses.has(s.slice(1))) return s;
    changed = true;
    return s + EXEMPT;
  });
  return changed;
}

export function kitExemption(dsDir: string) {
  const kitClasses = kitClassNames(dsDir);
  return {
    postcssPlugin: 'wt-kit-exempt-from-legacy-utilities',
    Rule(rule: Rule) {
      if (isLegacyStylesheet(rule.source?.input?.file)) exemptKitFromUtility(rule, kitClasses);
    },
  };
}
