/**
 * Bootstrap/Metronic-ONLY class tokens (names Tailwind does not define), for wisetech/no-legacy-ui.
 *
 * Every family here is absent from Tailwind. Names Tailwind ALSO generates must never be listed,
 * because the same className carries both vocabularies in this repo: px-5, gap-3, text-gray-700,
 * flex-row, text-start, w-100, table, table-row, col-span-*, col-auto, flex-wrap, shrink-0,
 * cursor-pointer, ms-/me-/ps-/pe-N, rounded-2xl, border-t. The kit-purity test
 * (eslint-rules/no-legacy-ui.test.ts) lints all of src/ds with these tokens and expects 0 reports.
 */
'use strict';

const BP = '(?:sm|md|lg|xl|xxl)';
const DISPLAY = '(?:none|inline|inline-block|block|grid|table|table-row|table-cell|flex|inline-flex)';

// Components match as the whole token or `<prefix>-*` (`card`, `card-body`).
const COMPONENTS = [
  'btn', 'card', 'badge', 'alert', 'modal', 'dropdown', 'nav', 'navbar', 'tab-content', 'tab-pane',
  'list-group', 'form', 'input-group', 'accordion', 'progress', 'toast', 'offcanvas', 'breadcrumb',
  'pagination', 'spinner-border', 'page-item', 'page-link', 'symbol', 'separator', 'menu', 'svg-icon', 'bullet',
];

/** [family, regex, hint]. First match wins, so the hint names the right replacement. */
const FAMILIES = [
  ['grid', new RegExp(`^(?:row|col|col-${BP}(?:-\\d+|-auto)?|g-\\d+|gx-\\d+|gy-\\d+)$`),
    'use CSS grid / flex: `grid grid-cols-12 gap-4` with `col-span-N`, or `flex flex-wrap gap-4` (see src/ds)'],
  ['display', new RegExp(`^d-(?:${BP}-)?${DISPLAY}$`),
    'use the Tailwind display utility: `flex`, `inline-flex`, `grid`, `block`, `hidden` (responsive: `md:flex`)'],
  ['flex-align', new RegExp(`^(?:justify-content|align-items|align-self|align-content)-.+$`),
    'use `justify-between` / `justify-center` / `items-center` / `self-start` / `content-center`'],
  ['flex-direction', new RegExp(`^(?:flex-(?:column|column-reverse|stack|root|center)|flex-${BP}-(?:row|column|column-reverse|wrap|nowrap))$`),
    'use `flex-col`, `flex-col-reverse`, `flex-row`, `flex-wrap` (responsive: `md:flex-row`) and `items-center justify-center`'],
  ['type', /^(?:fw-.+|fs-\d+x?|fs-base|lh-.+|text-(?:muted|dark|truncate|uppercase|lowercase|capitalize|decoration-none)|text-hover-.+|text-active-.+)$/,
    'use `font-semibold` / `font-bold`, `text-sm` / `text-base`, `leading-*`, `text-muted-foreground`, `text-foreground`, `truncate`, `uppercase`, `no-underline`'],
  ['background', /^(?:bg-light|bg-light-.+|bg-hover-.+|bg-active-.+|bg-body)$/,
    'use a token background: `bg-muted`, `bg-background`, `bg-accent`, `hover:bg-accent`'],
  ['sizing', /^(?:mw-.+|mh-.+|(?:min-|max-)?[wh]-\d+px)$/,
    'use an arbitrary or scale value: `max-w-[150px]`, `min-h-[40px]`, `w-40`'],
  ['position', /^position-(?:relative|absolute|fixed|sticky|static)$/,
    'use `relative`, `absolute`, `fixed`, `sticky`, `static`'],
  ['radius', /^rounded-(?:\d+|top|bottom|start|end|circle|pill)$/,
    'use `rounded-md` / `rounded-lg` / `rounded-full`, `rounded-t-*`, `rounded-b-*`, `rounded-s-*`, `rounded-e-*`'],
  ['border', /^border-(?:top|bottom|start|end)(?:-\d+)?$/,
    'use `border-t`, `border-b`, `border-s`, `border-e` (width: `border-t-2`)'],
  ['utility', /^(?:user-select-.+|pe-none|pe-auto|visually-hidden(?:-focusable)?)$/,
    'use `select-none` / `select-text`, `pointer-events-none` / `pointer-events-auto`, `sr-only`'],
  ['table', /^table-(?:responsive|striped|hover|bordered|borderless|sm|row-dashed|row-gray-\d+|rounded|flush)$/,
    'use the DataTable pattern from src/ds (not a Bootstrap table modifier)'],
  ['component',
    new RegExp(`^(?:${COMPONENTS.join('|')})(?:-.*)?$|^(?:form-.*|fv-.*)$`),
    'use the matching src/ds component (Button, Card, Badge, Alert, Dialog, DropdownMenu, Tabs, Input, Field, Progress, Skeleton, Separator, Avatar) instead of a Bootstrap/Metronic component class'],
];

/** Strip variant prefixes (`md:`, `hover:`, `[&>svg]:`, `dark:`) and the important marker. */
function stripVariants(token) {
  let t = token;
  for (;;) {
    const m = t.match(/^(?:\[[^\]]*\]|[\w-]+|\*):(.+)$/);
    if (!m) break;
    t = m[1];
  }
  return t.replace(/^!|!$/g, '');
}

function familyOf(token) {
  const t = stripVariants(token);
  if (!t) return null;
  return FAMILIES.find(([, re]) => re.test(t)) || null;
}

/** True when `token` (variants allowed) is a Bootstrap/Metronic-only class. */
function isBootstrapOnly(token) {
  return familyOf(token) !== null;
}

/** Message fragment naming the replacement for a Bootstrap-only `token`. */
function REPLACEMENT_HINT(token) {
  const fam = familyOf(token);
  return fam ? fam[2] : 'use Tailwind utilities and src/ds components';
}

module.exports = { isBootstrapOnly, REPLACEMENT_HINT, stripVariants };
