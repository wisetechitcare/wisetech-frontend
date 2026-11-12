// Transitive "does this module reach legacy UI (MUI / emotion / react-bootstrap / MRT)?" analyser.
//
//   node scripts/legacy-ui-reach.mjs <startDir> [repoRoot]
//
// Follows RUNTIME imports only (skips `import type`), resolves tsconfig path aliases, resolves named
// imports through barrel re-exports (so `import { X } from 'barrel'` follows only X), and follows
// `import('./x')` / `lazy(() => import('./x'))`. @mui/icons-material is NOT counted: the
// `wisetech/no-legacy-icons` rule owns it.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);

export const LEGACY_SPEC = /^(@mui\/(material|system|lab|x-[a-z-]+)|@emotion\/[a-z-]+|react-bootstrap|material-react-table)(\/|$)/;
const EXTS = ['.tsx', '.ts', '.jsx', '.js', '/index.tsx', '/index.ts', '/index.jsx', '/index.js'];

/** Alias table from tsconfig `paths`, so aliases never drift from the real config. */
function loadAliases(root) {
  const ts = require('typescript');
  const cfg = ts.readConfigFile(path.join(root, 'tsconfig.json'), ts.sys.readFile);
  const paths = cfg.config?.compilerOptions?.paths ?? {};
  return Object.entries(paths).map(([key, [target]]) => ({
    wildcard: key.endsWith('/*'),
    prefix: key.replace(/\/?\*$/, ''),
    target: target.replace(/^\.\//, '').replace(/\/?\*$/, ''),
  }));
}

/** Strip comments but keep string contents, so a glob like "src/**\/*.ts" cannot open a fake comment. */
function stripComments(src) {
  return src.replace(
    /("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`)|\/\*[\s\S]*?\*\/|\/\/[^\n]*/g,
    (m, str) => (str ? str : ' '),
  );
}

function parseModule(file) {
  const s = stripComments(fs.readFileSync(file, 'utf8'));
  const imports = []; // { spec, names: string[] | '*' }
  const reexports = []; // { spec, names: Map<exported, local> | '*' }
  for (const m of s.matchAll(/\bimport\s+(type\s+)?([\w$*{][\s\S]*?)\s+from\s+['"]([^'"]+)['"]/g)) {
    if (m[1]) continue;
    const clause = m[2];
    const braces = clause.match(/\{([\s\S]*)\}/);
    let names = [];
    if (braces) {
      names = braces[1].split(',').map((x) => x.trim()).filter((x) => x && !x.startsWith('type '))
        .map((x) => x.split(/\s+as\s+/)[0].trim());
    }
    const def = clause.replace(/\{[\s\S]*\}/, '').replace(/,/g, '').trim();
    if (def.startsWith('* as')) names = '*';
    else if (def) names = [...names, 'default'];
    else if (braces && names.length === 0) continue; // only `type` specifiers: erased at build
    imports.push({ spec: m[3], names });
  }
  for (const m of s.matchAll(/^\s*import\s+['"]([^'"]+)['"]/gm)) imports.push({ spec: m[1], names: '*' });
  // `import('./x')` / `lazy(() => import('./x'))` pull in the whole module.
  for (const m of s.matchAll(/\bimport\(\s*['"]([^'"]+)['"]\s*\)/g)) imports.push({ spec: m[1], names: '*' });
  for (const m of s.matchAll(/\bexport\s+(type\s+)?\{([^}]*)\}\s+from\s+['"]([^'"]+)['"]/g)) {
    if (m[1]) continue;
    const map = new Map();
    for (const part of m[2].split(',').map((x) => x.trim()).filter(Boolean)) {
      if (part.startsWith('type ')) continue;
      const [local, exported] = part.split(/\s+as\s+/).map((x) => x.trim());
      map.set(exported ?? local, local);
    }
    reexports.push({ spec: m[3], names: map });
  }
  for (const m of s.matchAll(/\bexport\s+\*\s+(as\s+\w+\s+)?from\s+['"]([^'"]+)['"]/g)) reexports.push({ spec: m[2], names: '*' });
  return { imports, reexports, isBarrel: reexports.length > 0 };
}

const norm = (p) => p.replace(/\\/g, '/');

/**
 * @param {string} root repo root (has tsconfig.json + src/)
 * @param {string} startDir directory (relative to root, or absolute) whose files are the entry points
 * @returns {{ file: string, specs: string[], chain: string[] }[]} every file reachable from startDir that
 *   imports legacy UI at runtime; `chain` is the import path from an entry file to it (repo-relative).
 */
export function reachLegacyUi(root, startDir) {
  root = path.resolve(root);
  const SRC = path.join(root, 'src');
  const aliases = loadAliases(root);
  const cache = new Map();
  const parse = (f) => {
    if (!cache.has(f)) cache.set(f, parseModule(f));
    return cache.get(f);
  };

  function resolve(spec, fromFile) {
    let base = null;
    if (spec.startsWith('.')) base = path.resolve(path.dirname(fromFile), spec);
    else {
      for (const a of aliases) {
        if (spec === a.prefix || (a.wildcard && spec.startsWith(a.prefix + '/'))) {
          base = path.join(root, a.target, spec.slice(a.prefix.length).replace(/^\//, ''));
          break;
        }
      }
    }
    if (!base) return null;
    if (fs.existsSync(base) && fs.statSync(base).isFile()) return base;
    for (const e of EXTS) if (fs.existsSync(base + e)) return base + e;
    return null;
  }

  // Which concrete modules does importing `names` from `file` pull in? A `#local` suffix means "the
  // barrel's own code" (names defined in it rather than re-exported).
  function targetsFor(file, names, seen = new Set()) {
    const key = file + '|' + (names === '*' ? '*' : names.join(','));
    if (seen.has(key)) return [];
    seen.add(key);
    const p = parse(file);
    if (!p.isBarrel) return [file];
    // Whole-module arrival (namespace import, import()/lazy, side-effect import): the barrel's own imports AND every re-export target count.
    if (names === '*') return [file + '#all'];
    const res = [];
    const unresolved = [];
    for (const n of names) {
      let found = false;
      for (const r of p.reexports) {
        if (r.names !== '*' && r.names.has(n)) {
          const t = resolve(r.spec, file);
          if (t) res.push(...targetsFor(t, [r.names.get(n)], seen));
          found = true;
          break;
        }
      }
      if (!found) unresolved.push(n);
    }
    if (unresolved.length) {
      res.push(file + '#local');
      for (const r of p.reexports) {
        if (r.names !== '*') continue;
        const t = resolve(r.spec, file);
        if (!t) continue;
        const txt = fs.readFileSync(t, 'utf8');
        if (unresolved.some((n) => new RegExp(`\\b${n}\\b`).test(txt))) res.push(...targetsFor(t, unresolved, seen));
      }
    }
    return res;
  }

  const starts = [];
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const f = path.join(d, e.name);
      if (e.isDirectory()) walk(f);
      else if (/\.(tsx?|jsx?)$/.test(e.name) && !/\.(test|stories)\./.test(e.name)) starts.push(f);
    }
  })(path.resolve(root, startDir));

  const parent = new Map();
  const queue = [];
  for (const s of starts) {
    parent.set(s + '#all', null);
    queue.push(s + '#all');
  }
  const hits = new Map(); // file -> Set<legacy spec>
  while (queue.length) {
    const raw = queue.shift();
    const file = raw.replace(/#(local|all)$/, '');
    const p = parse(file);
    // A barrel contributes its own imports only when something it defines itself is used.
    const deps = raw.endsWith('#local') || raw.endsWith('#all') || !p.isBarrel ? p.imports : [];
    if (raw.endsWith('#all')) {
      for (const r of p.reexports) {
        const t = resolve(r.spec, file);
        if (!t || !t.startsWith(SRC)) continue;
        for (const target of targetsFor(t, '*')) {
          if (!parent.has(target)) {
            parent.set(target, raw);
            queue.push(target);
          }
        }
      }
    }
    for (const imp of deps) {
      if (LEGACY_SPEC.test(imp.spec)) {
        if (!hits.has(file)) hits.set(file, new Set());
        hits.get(file).add(imp.spec);
        continue;
      }
      const t = resolve(imp.spec, file);
      if (!t || !t.startsWith(SRC)) continue;
      for (const target of targetsFor(t, imp.names)) {
        if (!parent.has(target)) {
          parent.set(target, raw);
          queue.push(target);
        }
      }
    }
  }

  const rel = (f) => norm(path.relative(root, f.replace(/#(local|all)$/, '')));
  const rows = [];
  for (const [file, specs] of hits) {
    const chain = [];
    let cur = [file, file + '#all', file + '#local'].find((k) => parent.has(k));
    while (cur) {
      const r = rel(cur);
      if (chain[0] !== r) chain.unshift(r);
      cur = parent.get(cur);
    }
    rows.push({ file: rel(file), specs: [...specs].sort(), chain });
  }
  rows.sort((a, b) => a.chain.length - b.chain.length || a.file.localeCompare(b.file));
  return rows;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [startDir, root = process.cwd()] = process.argv.slice(2);
  if (!startDir) {
    console.error('usage: node scripts/legacy-ui-reach.mjs <startDir> [repoRoot]');
    process.exit(2);
  }
  const rows = reachLegacyUi(root, startDir);
  console.log(`Legacy-UI-reaching files: ${rows.length}`);
  for (const r of rows) console.log(`${r.file}  [${r.specs.join(', ')}]\n    chain: ${r.chain.join(' -> ')}`);
  process.exit(rows.length ? 1 : 0);
}
