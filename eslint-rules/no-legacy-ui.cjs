/**
 * wisetech/no-legacy-ui
 *
 * New UI is src/ds (Tailwind + Base UI). This rule reports the two ways legacy UI creeps back in:
 *  1. runtime imports of MUI (@mui/material, system, lab, x-*), @emotion/*, react-bootstrap and
 *     material-react-table. `import type` and `{ type X }` are fine (no runtime cost, needed while
 *     legacy kit props take SxProps). @mui/icons-material belongs to wisetech/no-legacy-icons.
 *  2. Bootstrap/Metronic-only class tokens (d-flex, fw-bold, col-lg-6, btn-primary, text-muted ...)
 *     inside a `className` JSX attribute, including inside cn()/clsx()/ternaries/template literals.
 * Existing offenders are downgraded to `warn` through .eslint-legacy-ui-baseline.cjs.
 *
 * Options: { imports?: boolean, classes?: boolean } (both default true).
 */
'use strict';

const { isBootstrapOnly, REPLACEMENT_HINT, stripVariants } = require('./bootstrapClasses.cjs');

const LEGACY_SOURCES = [
  /^@mui\/(material|system|lab|x-[\w-]+)(\/|$)/,
  /^@emotion\/[\w-]+(\/|$)/,
  /^react-bootstrap(\/|$)/,
  /^material-react-table(\/|$)/,
];

const IMPORT_HINT =
  'Build it from src/ds (Tailwind + Base UI kit; see ui/README.md) instead of MUI/Bootstrap; keep `import type` only for legacy props.';

const EQUALITY = new Set(['===', '!==', '==', '!=']);

/** Literals/templates under `node`, skipping strings that are compared or used as lookup keys (not classes). */
function* literals(node, parent) {
  if (!node || typeof node.type !== 'string') return;
  if (node.type === 'Literal' && typeof node.value === 'string') {
    const compared = parent && parent.type === 'BinaryExpression' && EQUALITY.has(parent.operator);
    const caseTest = parent && parent.type === 'SwitchCase' && parent.test === node;
    const lookup = parent && parent.type === 'MemberExpression' && parent.computed && parent.property === node;
    const includes = parent && parent.type === 'CallExpression' && parent.callee.type === 'MemberExpression'
      && parent.callee.property.type === 'Identifier' && /^(includes|has|startsWith|endsWith|indexOf)$/.test(parent.callee.property.name);
    if (!compared && !caseTest && !lookup && !includes) yield { node, text: node.value, head: true, tail: true };
    return;
  }
  if (node.type === 'TemplateLiteral') {
    const last = node.quasis.length - 1;
    for (let i = 0; i <= last; i++) {
      const q = node.quasis[i];
      yield { node: q, text: q.value.cooked || q.value.raw, head: i === 0, tail: i === last };
    }
    for (const e of node.expressions) yield* literals(e, node);
    return;
  }
  for (const key of Object.keys(node)) {
    if (key === 'parent' || key === 'loc' || key === 'range') continue;
    const v = node[key];
    if (Array.isArray(v)) for (const c of v) yield* literals(c, node);
    else if (v && typeof v === 'object') yield* literals(v, node);
  }
}

/** Whitespace-split tokens; a token cut by a `${}` boundary on its leading side is dropped (unknown prefix). */
function tokensOf({ text, head }) {
  const tokens = text.split(/\s+/).filter(Boolean);
  if (!head && tokens.length && !/^\s/.test(text)) tokens.shift();
  return tokens;
}

module.exports = {
  meta: {
    type: 'problem',
    docs: { description: 'Disallow MUI / emotion / react-bootstrap / material-react-table imports and Bootstrap-only classes in favour of src/ds' },
    schema: [
      {
        type: 'object',
        properties: { imports: { type: 'boolean' }, classes: { type: 'boolean' } },
        additionalProperties: false,
      },
    ],
    messages: {
      import: 'Legacy UI library "{{src}}" is banned in new code. ' + IMPORT_HINT,
      cls: 'Bootstrap-only class "{{token}}" is banned in new code: {{hint}}.',
    },
  },
  create(context) {
    const opts = context.options[0] || {};
    const checkImports = opts.imports !== false;
    const checkClasses = opts.classes !== false;
    const out = {};

    if (checkImports) {
      const isLegacy = (src) => typeof src === 'string' && LEGACY_SOURCES.some((re) => re.test(src));
      out.ImportDeclaration = (node) => {
        if (node.importKind === 'type' || !isLegacy(node.source.value)) return;
        // `import { type A, type B }` is erased; a single value specifier keeps the import at runtime.
        if (node.specifiers.length && node.specifiers.every((s) => s.importKind === 'type')) return;
        context.report({ node, messageId: 'import', data: { src: node.source.value } });
      };
      const reexport = (node) => {
        if (!node.source || node.exportKind === 'type' || !isLegacy(node.source.value)) return;
        if (node.specifiers && node.specifiers.length && node.specifiers.every((s) => s.exportKind === 'type')) return;
        context.report({ node, messageId: 'import', data: { src: node.source.value } });
      };
      out.ExportNamedDeclaration = reexport;
      out.ExportAllDeclaration = reexport;
    }

    if (checkClasses) {
      out.JSXAttribute = (node) => {
        if (node.name.type !== 'JSXIdentifier' || node.name.name !== 'className' || !node.value) return;
        for (const lit of literals(node.value, node)) {
          // One report per string: the first offending token names the fix, the rest follow once it is rewritten.
          const token = tokensOf(lit).find(isBootstrapOnly);
          if (token) {
            context.report({
              node: lit.node,
              messageId: 'cls',
              data: { token: stripVariants(token), hint: REPLACEMENT_HINT(token) },
            });
          }
        }
      };
    }
    return out;
  },
};
