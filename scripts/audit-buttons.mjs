/**
 * Button audit + ratchet (ADR-001 button standardisation).
 *
 *   node scripts/audit-buttons.mjs            print the report (counts by kind and by module)
 *   node scripts/audit-buttons.mjs --json F   also write every site to F (for the audit write-up)
 *   node scripts/audit-buttons.mjs --check    CI: fail if any file has MORE non-canonical buttons of a
 *                                             kind than scripts/button-baseline.json allows
 *   node scripts/audit-buttons.mjs --update   rewrite the baseline (only ever after a migration
 *                                             lowered counts; review the diff: numbers may only fall)
 *
 * Canonical = the kit Button (src/ds/ui/button.tsx) and the WtButton / icon-button adapters that
 * render it. Everything else is a legacy kind below. Native <button>s carrying tab / switch / menu /
 * option semantics are reported as "native-specialized" (allowed: they are not ordinary buttons).
 * Read with the TypeScript AST, so imports are resolved (an MUI Button is not a kit Button) and
 * className strings inside templates and clsx/cn calls are seen.
 */
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'src');
const BASELINE = path.join(ROOT, 'scripts', 'button-baseline.json');
const args = process.argv.slice(2);

// Kit internals and their stories/tests own raw <button>s on purpose.
const SKIP_DIRS = new Set(['node_modules', 'ds']);
const isSkippedFile = (f) => f.endsWith('.test.tsx') || f.endsWith('.stories.tsx') || f.endsWith('.d.ts');

const SPECIALIZED_ROLES = new Set(['tab', 'switch', 'checkbox', 'radio', 'menuitem', 'menuitemradio', 'menuitemcheckbox', 'option', 'treeitem', 'gridcell', 'link']);
const SPECIALIZED_ARIA = new Set(['aria-selected', 'aria-checked']);

/** Legacy kinds, in report order. */
export const KINDS = [
  'native-button', 'bootstrap-btn-class', 'mui-button', 'mui-icon-button', 'react-bootstrap-button',
  'legacy-icon-button', 'tw-twin-button', 'role-button', 'clickable-div',
];
const INFO_KINDS = ['native-specialized', 'canonical'];

const posix = (p) => p.split(path.sep).join('/');
const words = (s) => s.split('').map((c) => (c <= ' ' ? ' ' : c)).join('').split(' ').filter(Boolean);
const hasBtnClass = (text) => words(text).some((w) => w === 'btn' || (w.startsWith('btn-') && w !== 'btn-group' && w !== 'btn-toolbar'));

function walkFiles(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name) && !e.name.startsWith('.')) walkFiles(path.join(dir, e.name), out); }
    else if ((e.name.endsWith('.tsx') || e.name.endsWith('.jsx')) && !isSkippedFile(e.name)) out.push(path.join(dir, e.name));
  }
  return out;
}

/** local name -> module specifier, for every named/default import in the file. */
function importsOf(sf) {
  const map = new Map();
  for (const st of sf.statements) {
    if (!ts.isImportDeclaration(st) || !st.importClause) continue;
    const from = st.moduleSpecifier.text;
    const c = st.importClause;
    if (c.name) map.set(c.name.text, { from, imported: 'default' });
    if (c.namedBindings && ts.isNamedImports(c.namedBindings)) {
      for (const el of c.namedBindings.elements) map.set(el.name.text, { from, imported: (el.propertyName ?? el.name).text });
    }
  }
  return map;
}

function attr(node, name) {
  return node.attributes.properties.find((p) => ts.isJsxAttribute(p) && p.name.getText() === name);
}
function stringsIn(node) {
  const out = [];
  const visit = (n) => {
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) out.push(n.text);
    else if (ts.isTemplateExpression(n)) { out.push(n.head.text); n.templateSpans.forEach((s) => { out.push(s.literal.text); visit(s.expression); }); return; }
    ts.forEachChild(n, visit);
  };
  if (node) visit(node);
  return out.join(' ');
}
const attrString = (node, name) => { const a = attr(node, name); return a?.initializer ? stringsIn(a.initializer) : ''; };

function classify(node, imports) {
  const tag = node.tagName.getText();
  const imp = imports.get(tag.split('.')[0]);
  const from = imp?.from ?? '';
  const role = attrString(node, 'role');
  const btnClass = hasBtnClass(attrString(node, 'className'));

  if (tag === 'button') {
    const specialized = SPECIALIZED_ROLES.has(role) || [...SPECIALIZED_ARIA].some((a) => attr(node, a));
    if (specialized) return 'native-specialized';
    return btnClass ? 'bootstrap-btn-class' : 'native-button';
  }
  if (from.startsWith('@mui/material')) {
    if (imp.imported === 'Button' || (imp.imported === 'default' && from.endsWith('/Button'))) return 'mui-button';
    if (imp.imported === 'IconButton' || (imp.imported === 'default' && from.endsWith('/IconButton'))) return 'mui-icon-button';
  }
  if (from === 'react-bootstrap' || from.startsWith('react-bootstrap/')) {
    if (imp.imported === 'Button' || (imp.imported === 'default' && from.endsWith('/Button'))) return 'react-bootstrap-button';
  }
  if (from.includes('tw/Buttons') || from.endsWith('/tw')) {
    if (/Button$/.test(imp.imported)) return 'tw-twin-button';
  }
  if (tag === 'WtButton' || from.includes('/ds/ui/button')) return 'canonical';
  if (tag === 'WtIconButton' || tag === 'ActionIconButton' || tag === 'WtCloseButton') return 'legacy-icon-button';
  if (btnClass && (tag === 'a' || tag === 'div' || tag === 'span' || tag === 'label')) return 'bootstrap-btn-class';
  if ((tag === 'div' || tag === 'span') && role === 'button') return 'role-button';
  if ((tag === 'div' || tag === 'span') && attr(node, 'onClick') && !role) return 'clickable-div';
  return null;
}

export function scan() {
  const sites = [];
  for (const file of walkFiles(SRC)) {
    const text = readFileSync(file, 'utf8');
    const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const imports = importsOf(sf);
    const rel = posix(path.relative(ROOT, file));
    const visit = (n) => {
      if (ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n)) {
        const kind = classify(n, imports);
        if (kind) sites.push({ file: rel, line: sf.getLineAndCharacterOfPosition(n.getStart()).line + 1, kind, tag: n.tagName.getText() });
      }
      ts.forEachChild(n, visit);
    };
    visit(sf);
  }
  return sites;
}

const moduleOf = (file) => {
  const p = file.split('/');
  const i = p.indexOf('pages') >= 0 ? p.indexOf('pages') : p.indexOf('modules');
  return i >= 0 ? p.slice(i, i + 2).join('/') : p.slice(1, 3).join('/');
};

function countsByFile(sites) {
  const out = {};
  for (const s of sites) {
    if (!KINDS.includes(s.kind)) continue;
    (out[s.file] ??= {})[s.kind] = (out[s.file][s.kind] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
}

function report(sites) {
  const by = (key) => sites.reduce((m, s) => ((m[key(s)] = (m[key(s)] ?? 0) + 1), m), {});
  const kinds = by((s) => s.kind);
  const legacy = sites.filter((s) => KINDS.includes(s.kind));
  console.log('Button audit');
  for (const k of [...KINDS, ...INFO_KINDS]) console.log(`  ${k.padEnd(24)} ${String(kinds[k] ?? 0).padStart(5)}`);
  console.log(`  ${'legacy total'.padEnd(24)} ${String(legacy.length).padStart(5)}  in ${new Set(legacy.map((s) => s.file)).size} files`);
  console.log('\nLegacy sites by module (top 25)');
  const mods = Object.entries(by.call(null, (s) => (KINDS.includes(s.kind) ? moduleOf(s.file) : '_'))).filter(([m]) => m !== '_').sort((a, b) => b[1] - a[1]);
  for (const [m, n] of mods.slice(0, 25)) console.log(`  ${m.padEnd(40)} ${n}`);
}

const sites = scan();
if (args.includes('--json')) writeFileSync(args[args.indexOf('--json') + 1], JSON.stringify(sites, null, 1));

if (args.includes('--update')) {
  writeFileSync(BASELINE, JSON.stringify(countsByFile(sites), null, 1) + '\n');
  console.log(`baseline written: ${Object.keys(countsByFile(sites)).length} files`);
} else if (args.includes('--check')) {
  const base = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, 'utf8')) : {};
  const now = countsByFile(sites);
  const errors = [];
  for (const [file, kinds] of Object.entries(now)) {
    for (const [kind, n] of Object.entries(kinds)) {
      const allowed = base[file]?.[kind] ?? 0;
      if (n > allowed) errors.push(`${file}: ${n} ${kind} (baseline ${allowed}) — use the kit Button (src/ds/ui/button.tsx) or WtButton`);
    }
  }
  if (errors.length) { console.error(errors.join('\n')); console.error(`\n${errors.length} new non-canonical button(s). See docs/BUTTONS.md.`); process.exit(1); }
  console.log('buttons: no new non-canonical buttons');
} else {
  report(sites);
}
