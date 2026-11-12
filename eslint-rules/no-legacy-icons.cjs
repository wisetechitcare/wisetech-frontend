/**
 * wisetech/no-legacy-icons
 *
 * Icons are Lucide (static: import from `lucide-react`; data-driven names: DynamicIcon).
 * Every legacy form is reported: KTIcon/KTSVG, AppIcon, raw Bootstrap/FontAwesome/LineAwesome/
 * keenicon classes, @mui/icons-material and other icon libraries.
 * Existing offenders are downgraded to `warn` through .eslint-icon-baseline.cjs.
 */
'use strict';

const REPLACEMENT =
  'Import the icon from lucide-react (see ui/README.md → Icons); names stored as data use DynamicIcon.';

const BANNED_SOURCES = [
  /^@mui\/icons-material(\/|$)/,
  /^react-inlinesvg$/,
  /^iconsax-reactjs$/,
  /^react-icons(\/|$)/,
  /^@fortawesome(\/|$)/,
  /^bootstrap-icons(\/|$)/,
  /^line-awesome(\/|$)/,
];
const APP_ICON_SOURCE = /(^|\/)AppIcon$/;
const BANNED_NAMES = new Set(['KTIcon', 'KTSVG']);

// `bi bi-x`, `fa-solid`, `fas fa-x`, `la la-x`, `ki-duotone`. `fab`/`lab` alone are not matched
// (they would hit `fab-button`); real brand usage always carries an `fa-*`/`la-*` class too.
const CLASS_TOKEN = /(^|\s)(bi|fa[sr]?|la[sr]?|ki)[- ]/;
const CLASS_PREFIX = /^(bi|fa|la|ki)-/;

const ATTRS = new Set(['className', 'icon', 'iconName', 'name']);
const PROPS = new Set(['icon', 'iconName']);

const isLegacyClass = (s) => CLASS_TOKEN.test(s) || CLASS_PREFIX.test(s);

function* literals(node) {
  if (!node || typeof node.type !== 'string') return;
  if (node.type === 'Literal' && typeof node.value === 'string') yield node;
  else if (node.type === 'TemplateElement') yield node;
  for (const key of Object.keys(node)) {
    if (key === 'parent' || key === 'loc' || key === 'range') continue;
    const v = node[key];
    if (Array.isArray(v)) for (const c of v) yield* literals(c);
    else if (v && typeof v === 'object') yield* literals(v);
  }
}

module.exports = {
  meta: {
    type: 'problem',
    docs: { description: 'Disallow legacy icon systems in favour of lucide-react / DynamicIcon' },
    schema: [],
    messages: { legacy: '{{what}}. ' + REPLACEMENT },
  },
  create(context) {
    const report = (node, what) => context.report({ node, messageId: 'legacy', data: { what } });

    function checkValue(valueNode) {
      for (const lit of literals(valueNode)) {
        const text = lit.type === 'TemplateElement' ? lit.value.cooked || lit.value.raw : lit.value;
        if (isLegacyClass(text)) report(lit, 'Legacy icon class "' + text.trim() + '"');
      }
    }

    return {
      ImportDeclaration(node) {
        const src = node.source.value;
        if (BANNED_SOURCES.some((re) => re.test(src))) return report(node, 'Legacy icon library "' + src + '"');
        if (APP_ICON_SOURCE.test(src)) return report(node, 'AppIcon is legacy');
        for (const s of node.specifiers) {
          if (s.type !== 'ImportSpecifier') continue;
          const name = s.imported.name || s.imported.value;
          if (BANNED_NAMES.has(name)) report(s, name + ' is legacy');
          else if (name === 'AppIcon') report(s, 'AppIcon is legacy');
        }
      },
      JSXAttribute(node) {
        if (node.name.type !== 'JSXIdentifier' || !ATTRS.has(node.name.name)) return;
        checkValue(node.value);
      },
      Property(node) {
        if (node.computed) return;
        const k = node.key;
        const name = k.type === 'Identifier' ? k.name : k.type === 'Literal' ? k.value : null;
        if (PROPS.has(name)) checkValue(node.value);
      },
    };
  },
};
