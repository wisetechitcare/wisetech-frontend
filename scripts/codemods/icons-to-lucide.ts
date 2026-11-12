/**
 * icons-to-lucide — rewrites legacy icon call sites to bare Lucide components.
 *
 *   pnpm codemod:icons <dir|file>... [--dry-run]
 *
 * Converts, pixel-identically:
 *   <KTIcon iconName="x" className="fs-3 me-1" />     -> <Glyph className="me-1 size-[21px]" />
 *   <AppIcon name="bi-x" color=".." fallbackSize={n} /> -> <Glyph className="size-[npx]" style={{ color: .. }} />
 *   <KTIcon iconName={cond ? 'a' : 'b'} />             -> {cond ? <A .. /> : <B .. />}
 *   <KTIcon iconName={item.icon} />                    -> <DynamicIcon name={item.icon} .. />
 *   <i className="bi bi-x" style={{ fontSize: 12 }} />  -> <Glyph className="size-[12px]" />
 *
 * WHY THE OUTPUT IS SIZE-[Npx] AND NOTHING ELSE
 * AppIcon drew `<Glyph size={iconPixelSize(className)} />` inside an inline-flex span. The span's
 * styling (stroke, alignment, no-shrink) is now ONE global `svg.lucide` rule, so the bare glyph plus
 * the same pixel size is the same picture. The size is emitted in px, never rem: the live app's root
 * font-size is 13px, so a rem class would silently resize every icon.
 *
 * WHAT IT REFUSES (left untouched, listed in `manual`): anything whose output cannot be computed
 * statically or would change behaviour — a non-literal className, an unknown name, title/onClick/ref
 * (they belong on the parent control), spreads, children, unknown attributes, raw `<i>` whose size
 * is inherited from the parent font-size. A blank review entry is cheaper than a wrong glyph or size
 * copied into 366 files.
 *
 * scripts/ is outside tsc's include (ruling R3); `icons-to-lucide.test.ts` is the gate.
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as lucide from 'lucide-react';
import { Node, Project, ScriptKind, SyntaxKind, ts } from 'ts-morph';
import type { Expression, ImportDeclaration, JsxAttributeLike, JsxElement, JsxSelfClosingElement, SourceFile } from 'ts-morph';
import * as brandIcons from '../../src/ds/lib/icons/brandIcons';
import { iconFor } from '../../src/ds/lib/icons/registry';
import { DEFAULT_ICON_PX, iconPixelSize, SIZE_SCALE } from '../../src/ds/lib/icons/size';

export interface ManualEntry { line: number; reason: string }
export interface TransformResult { code: string; manual: ManualEntry[] }

const LUCIDE = 'lucide-react';
const BRANDS = '@/ds/lib/icons/brandIcons';
const DYNAMIC = '@/ds/ui/dynamic-icon';
const MOVE_BEHAVIOUR = 'move title/onClick to parent control';

// ─── Glyph -> export name ─────────────────────────────────────────────────────────────────────────

const LUCIDE_EXPORTS = lucide as unknown as Record<string, unknown>;
const CANONICAL = new Map<unknown, string>();
for (const [k, v] of Object.entries((lucide as unknown as { icons: Record<string, unknown> }).icons)) CANONICAL.set(v, k);

/**
 * lucide-react exports each icon under several keys (`Trash2`, `Trash2Icon`, `LucideTrash2`) and
 * many under deprecated aliases too (`Filter` for `Funnel`, `Text` for `TextAlignStart`). The
 * canonical name — the key in lucide's own `icons` map — wins, because a deprecated alias is the
 * next thing a lucide upgrade deletes. Fallback is the brief's rule: shortest key that neither
 * starts with `Lucide` nor ends with `Icon`.
 */
function lucideExportName(component: unknown): string | null {
    const canonical = CANONICAL.get(component);
    if (canonical) return canonical;
    const keys = Object.keys(LUCIDE_EXPORTS).filter(
        (k) => LUCIDE_EXPORTS[k] === component && !k.startsWith('Lucide') && !k.endsWith('Icon'),
    );
    keys.sort((a, b) => a.length - b.length || a.localeCompare(b));
    return keys[0] ?? null;
}

/**
 * The registry wraps brand marks (`brand(WhatsAppIcon)`), so identity cannot name them. Rendering
 * both and comparing markup can, without the codemod hard-coding which brands exist.
 */
const brandCache = new Map<unknown, string | null>();
function brandExportName(component: unknown): string | null {
    if (brandCache.has(component)) return brandCache.get(component)!;
    let found: string | null = null;
    try {
        const markup = renderToStaticMarkup(createElement(component as never));
        for (const [k, v] of Object.entries(brandIcons)) {
            if (typeof v === 'function' && /^[A-Z]/.test(k) && renderToStaticMarkup(createElement(v as never)) === markup) {
                found = k;
                break;
            }
        }
    } catch {
        found = null;
    }
    brandCache.set(component, found);
    return found;
}

interface Glyph { module: string; exportName: string; component: unknown }

function resolveGlyph(name: string): Glyph | null {
    const component = iconFor(name);
    if (!component) return null;
    const lucideName = lucideExportName(component);
    if (lucideName) return { module: LUCIDE, exportName: lucideName, component };
    const brand = brandExportName(component);
    return brand ? { module: BRANDS, exportName: brand, component } : null;
}

// ─── Classes ──────────────────────────────────────────────────────────────────────────────────────

/** A token `iconPixelSize` sizes from (`fs-1`…`fs-10`, `fs-2x`, `fs-2hx`…). Only `fs-4` maps to the default. */
const isSizeToken = (t: string) =>
    /^fs-\d+((q|h|t)?x)?$/.test(t) && (t === 'fs-4' || iconPixelSize(t) !== DEFAULT_ICON_PX);

const sizedClassName = (tokens: string[], px: number) => [...tokens.filter((t) => !isSizeToken(t)), `size-[${px}px]`].join(' ');

/**
 * Classes that mean the same thing on the bare svg as they did on the old element (AppIcon's
 * inline-flex span, or the raw `<i>`): margins (incl. responsive), colour, opacity, vertical
 * alignment, Metronic's rotate-N (a transform around the centre of a box the same size as the
 * glyph), the spinner, hiding, cursor, pointer-events and no-shrink. Everything else is refused,
 * because display/box/position utilities do NOT carry over. PADDING is the subtle one: on the
 * span it grew the box around the glyph; on an svg with `size-[N]` and border-box sizing it
 * shrinks the drawn glyph. Likewise
 * Bootstrap's `d-block` (!important) turned the span into a block whose inline svg still centred
 * under a `text-center` parent, while on the svg itself it sits flush left; `w-*`/`h-*` (!important)
 * would beat `size-[N]`. An unknown token is treated the same way — review beats a guess.
 */
const ICON_UTILITY = [
    /^-?m[setbxy]?-((sm|md|lg|xl|xxl)-)?(n?\d+|auto)$/,
    /^text-(primary|secondary|success|danger|warning|info|light|dark|muted|white|black|body|gray-\d+|(hover|active)-[a-z]+(-\d+)?)$/,
    /^opacity-\d+$/,
    /^align-(baseline|top|middle|bottom|text-top|text-bottom)$/,
    /^rotate-(90|180|270)$/,
    /^ci-spin$/,
    /^d-((sm|md|lg|xl|xxl)-)?none$/,
    /^cursor-[a-z-]+$/,
    /^(flex-)?shrink-0$/,
    /^pe-none$/,
];
const isIconUtility = (t: string) => ICON_UTILITY.some((re) => re.test(t));
const RAW_MARKERS = new Set(['bi', 'fa', 'fas', 'far', 'fab', 'fa-solid', 'fa-regular', 'fa-brands']);
const LEGACY_ICON_TOKEN = /^(bi|fa[srb]?|la[srb]?|ki)(-|$)/;

// ─── Small AST helpers ────────────────────────────────────────────────────────────────────────────

const unwrap = (e: Expression): Expression => (Node.isParenthesizedExpression(e) ? unwrap(e.getExpression()) : e);

const stringValue = (e: Node | undefined): string | undefined =>
    e && (Node.isStringLiteral(e) || Node.isNoSubstitutionTemplateLiteral(e)) ? e.getLiteralValue() : undefined;

/** The expression an attribute carries: the string literal itself, or what is inside `{…}`. */
function attrExpression(attr: JsxAttributeLike): Expression | undefined {
    if (!Node.isJsxAttribute(attr)) return undefined;
    const init = attr.getInitializer();
    if (!init) return undefined;
    if (Node.isStringLiteral(init)) return init;
    if (Node.isJsxExpression(init)) {
        const e = init.getExpression();
        return e ? unwrap(e) : undefined;
    }
    return undefined;
}

const attrName = (attr: JsxAttributeLike) => (Node.isJsxAttribute(attr) ? attr.getNameNode().getText() : '');
const hasInitializer = (attr: JsxAttributeLike) => Node.isJsxAttribute(attr) && attr.getInitializer() !== undefined;

/** Style keys AppIcon wrote after the caller's style, i.e. the caller's value never applied. */
const APPICON_OWNED_STYLE = new Set(['display', 'alignItems', 'justifyContent', 'lineHeight', 'verticalAlign', 'flexShrink']);

const isBehaviourAttr = (n: string) => n === 'title' || n === 'ref' || /^on[A-Z]/.test(n);
const isCarriedAttr = (n: string) => n === 'id' || /^(data|aria)-/.test(n);

function hasRealChildren(el: JsxElement | JsxSelfClosingElement): boolean {
    if (Node.isJsxSelfClosingElement(el)) return false;
    return el.getJsxChildren().some((c) => !(Node.isJsxText(c) && c.containsOnlyTriviaWhiteSpaces()));
}

const quoteJs = (s: string) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

function styleObject(props: string[]): string {
    return props.length ? `style={{ ${props.join(', ')} }}` : '';
}

// ─── Per-file import bookkeeping ──────────────────────────────────────────────────────────────────

class Imports {
    private used = new Set<string>();
    private lucideLocals = new Map<unknown, string>();
    private existing = new Map<string, Map<string, string>>();
    /** module -> local -> specifier text */
    readonly pending = new Map<string, Map<string, string>>();

    constructor(sf: SourceFile) {
        for (const id of sf.getDescendantsOfKind(SyntaxKind.Identifier)) this.used.add(id.getText());
        for (const decl of sf.getImportDeclarations()) {
            if (decl.isTypeOnly()) continue;
            const mod = decl.getModuleSpecifierValue();
            for (const spec of decl.getNamedImports()) {
                if (spec.isTypeOnly()) continue;
                const imported = spec.getName();
                const local = spec.getAliasNode()?.getText() ?? imported;
                if (mod === LUCIDE && LUCIDE_EXPORTS[imported]) this.lucideLocals.set(LUCIDE_EXPORTS[imported], local);
                if (!this.existing.has(mod)) this.existing.set(mod, new Map());
                this.existing.get(mod)!.set(imported, local);
            }
        }
    }

    private free(name: string) {
        return !this.used.has(name);
    }

    private add(module: string, local: string, specifier: string) {
        this.used.add(local);
        if (!this.pending.has(module)) this.pending.set(module, new Map());
        this.pending.get(module)!.set(local, specifier);
        return local;
    }

    /** The local identifier for `exportName` of `module`, importing it (clash-safely) if needed. */
    local(module: string, exportName: string, component?: unknown): string {
        if (module === LUCIDE && component !== undefined) {
            const known = this.lucideLocals.get(component);
            if (known) return known;
        } else {
            const known = this.existing.get(module)?.get(exportName);
            if (known) return known;
        }
        for (const [local, spec] of this.pending.get(module) ?? []) {
            if (spec === exportName || spec.startsWith(`${exportName} as `)) return local;
            if (module === LUCIDE && component !== undefined && LUCIDE_EXPORTS[spec] === component) return local;
        }
        const remember = (local: string) => {
            if (module === LUCIDE && component !== undefined) this.lucideLocals.set(component, local);
            return local;
        };
        if (this.free(exportName)) return remember(this.add(module, exportName, exportName));
        const alias = `${exportName}Icon`;
        if (module === LUCIDE && LUCIDE_EXPORTS[alias] === component && this.free(alias)) {
            return remember(this.add(module, alias, alias));
        }
        let local = `${exportName}Glyph`;
        for (let i = 2; !this.free(local); i++) local = `${exportName}Glyph${i}`;
        return remember(this.add(module, local, `${exportName} as ${local}`));
    }
}

// ─── Planning one element ─────────────────────────────────────────────────────────────────────────

type Plan =
    | { kind: 'leaf'; glyph: Glyph }
    | { kind: 'cond'; test: string; whenTrue: Plan; whenFalse: Plan }
    | { kind: 'dynamic' }
    | { kind: 'fail'; reason: string };

function planName(e: Expression): Plan {
    e = unwrap(e);
    const literal = stringValue(e);
    if (literal !== undefined) {
        const glyph = resolveGlyph(literal);
        return glyph ? { kind: 'leaf', glyph } : { kind: 'fail', reason: `no registry entry for "${literal}"` };
    }
    if (Node.isConditionalExpression(e)) {
        const whenTrue = planName(e.getWhenTrue());
        const whenFalse = planName(e.getWhenFalse());
        for (const p of [whenTrue, whenFalse]) if (p.kind === 'fail') return p;
        if (whenTrue.kind === 'dynamic' || whenFalse.kind === 'dynamic') return { kind: 'dynamic' };
        return { kind: 'cond', test: e.getCondition().getText(), whenTrue, whenFalse };
    }
    return { kind: 'dynamic' };
}

const NAME_SLOT = '\u0000name';
const CLASS_SLOT = '\u0000class';

interface Planned {
    /** Attribute texts in source order; NAME_SLOT/CLASS_SLOT are filled per output element. */
    attrs: string[];
    className: string;
    plan: Plan;
    nameText?: string;
}

type Outcome = { ok: true; planned: Planned } | { ok: false; reason: string } | { ok: 'skip' };

const fail = (reason: string): Outcome => ({ ok: false, reason });

function planComponent(el: JsxElement | JsxSelfClosingElement, attrsList: JsxAttributeLike[], flavour: 'kt' | 'app'): Outcome {
    if (hasRealChildren(el)) return fail('icon element has children');
    const nameAttrName = flavour === 'kt' ? 'iconName' : 'name';
    const out: string[] = [];
    let nameExpr: Expression | undefined;
    let className: string | undefined;
    let classSeen = false;
    let fallback: number | undefined;
    let colorText: string | undefined;
    let styleIndex = -1;
    let styleExpr: Expression | undefined;
    let colorIndex = -1;

    for (const attr of attrsList) {
        if (!Node.isJsxAttribute(attr)) return fail('spread attribute on icon');
        const n = attrName(attr);
        const e = attrExpression(attr);
        if (n === nameAttrName) {
            if (!e) return fail(`missing ${nameAttrName} value`);
            nameExpr = e;
            out.push(NAME_SLOT);
        } else if (n === 'className') {
            const lit = stringValue(e);
            if (hasInitializer(attr) && lit === undefined) return fail('non-literal className');
            className = lit ?? '';
            classSeen = true;
            out.push(CLASS_SLOT);
        } else if (n === 'key') {
            out.push(attr.getText());
        } else if (flavour === 'kt' && n === 'iconType') {
            // ignored by KTIcon; dropped
        } else if (isBehaviourAttr(n)) {
            return fail(MOVE_BEHAVIOUR);
        } else if (flavour === 'kt') {
            return fail(`KTIcon drops "${n}" today; carrying it would change the DOM`);
        } else if (n === 'fallbackSize') {
            if (!e || !Node.isNumericLiteral(e)) return fail('non-literal fallbackSize');
            fallback = e.getLiteralValue();
        } else if (n === 'color') {
            if (!e) return fail('color without a value');
            const lit = stringValue(e);
            colorText = lit !== undefined && Node.isStringLiteral(e) ? quoteJs(lit) : e.getText();
            colorIndex = out.length;
            out.push('');
        } else if (n === 'style') {
            if (!e || Node.isStringLiteral(e)) return fail('style without an object value');
            styleExpr = e;
            styleIndex = out.length;
            out.push(attr.getText());
        } else if (isCarriedAttr(n)) {
            out.push(attr.getText());
        } else {
            return fail(`unsupported attribute "${n}"`);
        }
    }
    if (!nameExpr) return fail(`no ${nameAttrName}`);

    const base = classSeen && !(flavour === 'kt' && className === '') ? className! : 'fs-4';
    const tokens = base.split(/\s+/).filter(Boolean);
    if (tokens.some((t) => t.startsWith('size-'))) return fail('className already has a size-* class');
    const odd = tokens.find((t) => !isSizeToken(t) && !isIconUtility(t));
    if (odd) return fail(`class ${odd} behaves differently on svg than on AppIcon's span`);
    const px = fallback ?? iconPixelSize(base);

    if (styleExpr) {
        // AppIcon spread `style` FIRST and then set these keys itself, so a call site's value for
        // them never reached the screen. Carried onto the bare svg they would start applying (a
        // `display: 'block'` would really go block), so they are dropped — that is today's render.
        // A spread or computed key could hide one of them, so those go to review instead.
        if (!Node.isObjectLiteralExpression(styleExpr)) return fail('non-literal style on AppIcon');
        const props: string[] = [];
        let dropped = false;
        let colorPlaced = false;
        for (const p of styleExpr.getProperties()) {
            if (!Node.isPropertyAssignment(p) && !Node.isShorthandPropertyAssignment(p)) return fail('style spread on AppIcon');
            const key = p.getNameNode();
            if (Node.isComputedPropertyName(key)) return fail('computed style key on AppIcon');
            const keyText = Node.isStringLiteral(key) ? key.getLiteralValue() : key.getText();
            if (APPICON_OWNED_STYLE.has(keyText)) dropped = true;
            else if (keyText === 'color' && colorText !== undefined) {
                // AppIcon applied the color PROP after style, so the prop wins. Replace in place —
                // appending a second `color` key is TS1117 (duplicate key in an object literal).
                if (!colorPlaced) props.push(`color: ${colorText}`);
                colorPlaced = true;
            } else props.push(p.getText());
        }
        if (colorText !== undefined && !colorPlaced) props.push(`color: ${colorText}`);
        if (dropped || colorText !== undefined) out[styleIndex] = styleObject(props);
    } else if (colorText !== undefined) {
        out[colorIndex] = styleObject([`color: ${colorText}`]);
    }

    const plan = planName(nameExpr);
    if (plan.kind === 'fail') return fail(plan.reason);
    if (!classSeen) out.splice(out.indexOf(NAME_SLOT) + 1, 0, CLASS_SLOT);
    return {
        ok: true,
        planned: {
            attrs: out.filter(Boolean),
            className: sizedClassName(tokens, px),
            plan,
            nameText: plan.kind === 'dynamic' ? `name={${nameExpr.getText()}}` : undefined,
        },
    };
}

function planRawI(el: JsxElement | JsxSelfClosingElement, attrsList: JsxAttributeLike[]): Outcome {
    const classAttr = attrsList.find((a) => attrName(a) === 'className');
    if (!classAttr) return { ok: 'skip' };
    const literal = stringValue(attrExpression(classAttr));
    if (literal === undefined) {
        return /(^|[\s'"`{])(bi|fa[srb]?|la[srb]?|ki)[- ]/.test(classAttr.getText())
            ? fail('raw <i> with non-literal className')
            : { ok: 'skip' };
    }
    const tokens = literal.split(/\s+/).filter(Boolean);
    if (!tokens.some((t) => LEGACY_ICON_TOKEN.test(t))) return { ok: 'skip' };

    const names: string[] = [];
    for (const t of tokens) {
        if (RAW_MARKERS.has(t) || isSizeToken(t) || isIconUtility(t)) continue;
        if (/^(bi|fa)-/.test(t)) names.push(t);
        else return fail(`raw <i> with unrecognised class "${t}"`);
    }
    if (names.length !== 1) return fail('raw <i> without exactly one bi-*/fa-* icon class');
    if (hasRealChildren(el)) return fail('raw <i> has children');
    const glyph = resolveGlyph(names[0]);
    if (!glyph) return fail(`no registry entry for "${names[0]}"`);

    const out: string[] = [];
    let fontPx: number | undefined;
    for (const attr of attrsList) {
        if (!Node.isJsxAttribute(attr)) return fail('spread attribute on raw <i>');
        const n = attrName(attr);
        if (n === 'className') {
            out.push(CLASS_SLOT);
        } else if (n === 'style') {
            const e = attrExpression(attr);
            if (!e || !Node.isObjectLiteralExpression(e)) return fail('raw <i> with non-literal style');
            const kept: string[] = [];
            for (const p of e.getProperties()) {
                if (!Node.isPropertyAssignment(p) && !Node.isShorthandPropertyAssignment(p)) return fail('raw <i> style spread');
                const key = p.getNameNode();
                const keyText = Node.isStringLiteral(key) ? key.getLiteralValue() : key.getText();
                if (keyText !== 'fontSize') {
                    kept.push(p.getText());
                    continue;
                }
                const v = Node.isPropertyAssignment(p) ? p.getInitializer() : undefined;
                const s = stringValue(v);
                if (v && Node.isNumericLiteral(v)) fontPx = v.getLiteralValue();
                else if (s !== undefined && /^\d+(\.\d+)?px$/.test(s)) fontPx = Number(s.slice(0, -2));
                else return fail('raw <i> fontSize is not a px value');
            }
            const styleText = styleObject(kept);
            if (styleText) out.push(styleText);
        } else if (n === 'key' || isCarriedAttr(n)) {
            out.push(attr.getText());
        } else if (isBehaviourAttr(n)) {
            return fail(MOVE_BEHAVIOUR);
        } else {
            return fail(`unsupported attribute "${n}" on raw <i>`);
        }
    }
    const hasFs = tokens.some(isSizeToken);
    if (fontPx !== undefined && hasFs) return fail('raw <i> has both fontSize and an fs-* class');
    if (fontPx === undefined && !hasFs) return fail('raw <i> with inherited size (no fs-* class, no fontSize)');
    const kept = tokens.filter((t) => !RAW_MARKERS.has(t) && !names.includes(t));
    return {
        ok: true,
        planned: { attrs: out, className: sizedClassName(kept, fontPx !== undefined ? Math.round(fontPx * SIZE_SCALE) : iconPixelSize(literal)), plan: { kind: 'leaf', glyph } },
    };
}

// ─── Rendering ────────────────────────────────────────────────────────────────────────────────────

function renderElement(tag: string, planned: Planned, withName: boolean): string {
    const attrs = planned.attrs.flatMap((a) => {
        if (a === CLASS_SLOT) return [`className="${planned.className}"`];
        if (a === NAME_SLOT) return withName && planned.nameText ? [planned.nameText] : [];
        return [a];
    });
    return `<${tag}${attrs.length ? ` ${attrs.join(' ')}` : ''} />`;
}

function renderPlan(plan: Plan, planned: Planned, imports: Imports, nested = false): string {
    switch (plan.kind) {
        case 'leaf':
            return renderElement(imports.local(plan.glyph.module, plan.glyph.exportName, plan.glyph.component), planned, false);
        case 'dynamic':
            return renderElement(imports.local(DYNAMIC, 'DynamicIcon'), planned, true);
        case 'cond': {
            const text = `${plan.test} ? ${renderPlan(plan.whenTrue, planned, imports, true)} : ${renderPlan(plan.whenFalse, planned, imports, true)}`;
            return nested ? `(${text})` : text;
        }
        default:
            throw new Error('unreachable');
    }
}

/** A conditional replaces an element: braces in JSX positions, parentheses in expression positions. */
function wrapConditional(el: Node, text: string): string {
    const parent = el.getParent();
    if (!parent) return text;
    if (Node.isJsxElement(parent) || Node.isJsxFragment(parent) || Node.isJsxAttribute(parent)) return `{${text}}`;
    if (Node.isParenthesizedExpression(parent)) return text;
    return `(${text})`;
}

// ─── Imports phase ────────────────────────────────────────────────────────────────────────────────

const KT_SOURCE = /(^@metronic\/helpers$|\/helpers$|\/KTIcon$)/;
const APP_SOURCE = /(\/ui|\/ui\/index|(^|\/)AppIcon)$/;

interface LegacyBinding { kind: 'default' | 'named'; local: string; flavour: 'kt' | 'app' }

function legacyBindings(decl: ImportDeclaration): LegacyBinding[] {
    if (decl.isTypeOnly()) return [];
    const mod = decl.getModuleSpecifierValue();
    const out: LegacyBinding[] = [];
    const def = decl.getDefaultImport();
    if (def && /(^|\/)AppIcon$/.test(mod)) out.push({ kind: 'default', local: def.getText(), flavour: 'app' });
    for (const spec of decl.getNamedImports()) {
        if (spec.isTypeOnly()) continue;
        const name = spec.getName();
        const local = spec.getAliasNode()?.getText() ?? name;
        if (name === 'KTIcon' && KT_SOURCE.test(mod)) out.push({ kind: 'named', local, flavour: 'kt' });
        else if (name === 'AppIcon' && APP_SOURCE.test(mod)) out.push({ kind: 'named', local, flavour: 'app' });
    }
    return out;
}

function isReferenced(sf: SourceFile, local: string): boolean {
    return sf
        .getDescendantsOfKind(SyntaxKind.Identifier)
        .some((id) => id.getText() === local && !id.getFirstAncestorByKind(SyntaxKind.ImportDeclaration));
}

interface Edit { start: number; end: number; text: string }

function applyEdits(code: string, edits: Edit[]): string {
    let out = code;
    for (const e of [...edits].sort((a, b) => b.start - a.start)) out = out.slice(0, e.start) + e.text + out.slice(e.end);
    return out;
}

function lineEndAfter(code: string, pos: number): number {
    if (code.startsWith('\r\n', pos)) return pos + 2;
    if (code[pos] === '\n') return pos + 1;
    return pos;
}

let fileSeq = 0;
function parse(project: Project, code: string, filePath: string): SourceFile {
    const ext = extname(filePath).toLowerCase();
    const kind = ext === '.tsx' || ext === '.jsx' ? ScriptKind.TSX : ext === '.js' ? ScriptKind.JS : ScriptKind.TS;
    return project.createSourceFile(`/codemod-${fileSeq++}${ext || '.tsx'}`, code, { overwrite: true, scriptKind: kind });
}

/**
 * A file the parser had to recover from is never rewritten: its AST is the parser's guess, and
 * splicing text at guessed positions can turn one error into several. `transpileModule` reports
 * syntactic diagnostics only (no type checking), so this stays cheap enough to run per file.
 */
function firstSyntaxError(code: string, filePath: string): ManualEntry | null {
    const ext = extname(filePath).toLowerCase() || '.tsx';
    const { diagnostics = [] } = ts.transpileModule(code, {
        fileName: `file${ext}`,
        reportDiagnostics: true,
        compilerOptions: { jsx: ts.JsxEmit.ReactJSX, allowJs: true },
    });
    const d = diagnostics.find((x) => x.category === ts.DiagnosticCategory.Error && x.file);
    if (!d) return null;
    const line = d.file!.getLineAndCharacterOfPosition(d.start ?? 0).line + 1;
    return { line, reason: `syntax error, file skipped: ${ts.flattenDiagnosticMessageText(d.messageText, ' ')}` };
}

/**
 * The CLI's per-file call: one file that throws (a construct the codemod never met) must not
 * abort a 366-file run halfway with some files written and others not. It is reported and skipped.
 */
export function transformFileSafely(code: string, filePath: string): TransformResult {
    try {
        return transformSource(code, filePath);
    } catch (err) {
        return { code, manual: [{ line: 1, reason: `codemod error ${err instanceof Error ? err.message : String(err)}` }] };
    }
}

// ─── Entry point ──────────────────────────────────────────────────────────────────────────────────

export function transformSource(code: string, filePath: string): TransformResult {
    const project = new Project({ useInMemoryFileSystem: true, compilerOptions: { jsx: 4 /* ReactJSX */, allowJs: true } });
    const syntaxError = firstSyntaxError(code, filePath);
    if (syntaxError) return { code, manual: [syntaxError] };
    const sf = parse(project, code, filePath);
    const manual: ManualEntry[] = [];
    const lineOf = (pos: number) => sf.getLineAndColumnAtPos(pos).line;

    const kt = new Set<string>();
    const app = new Set<string>();
    for (const decl of sf.getImportDeclarations()) {
        for (const b of legacyBindings(decl)) (b.flavour === 'kt' ? kt : app).add(b.local);
    }

    const imports = new Imports(sf);
    const edits: Edit[] = [];
    const elements = [
        ...sf.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement),
        ...sf.getDescendantsOfKind(SyntaxKind.JsxElement),
    ].sort((a, b) => a.getStart() - b.getStart());

    for (const el of elements) {
        const head = Node.isJsxElement(el) ? el.getOpeningElement() : el;
        const tag = head.getTagNameNode().getText();
        const flavour = kt.has(tag) ? 'kt' : app.has(tag) ? 'app' : tag === 'i' ? 'i' : null;
        if (!flavour) continue;
        const attrs = head.getAttributes();
        const outcome = flavour === 'i' ? planRawI(el, attrs) : planComponent(el, attrs, flavour);
        if (outcome.ok === 'skip') continue;
        if (outcome.ok === false) {
            manual.push({ line: lineOf(el.getStart()), reason: outcome.reason });
            continue;
        }
        const start = el.getStart();
        const end = el.getEnd();
        if (edits.some((e) => start < e.end && end > e.start)) {
            manual.push({ line: lineOf(start), reason: 'icon nested inside another converted icon; re-run the codemod' });
            continue;
        }
        const { plan } = outcome.planned;
        const text = renderPlan(plan, outcome.planned, imports);
        edits.push({ start, end, text: plan.kind === 'cond' ? wrapConditional(el, text) : text });
    }

    if (!edits.length) return { code, manual };

    const eol = code.includes('\r\n') ? '\r\n' : '\n';
    const firstImport = sf.getImportDeclarations()[0];
    const quote = firstImport ? firstImport.getModuleSpecifier().getText()[0] : "'";
    const firstStatement = sf.getStatements()[0];
    const semi = firstStatement ? firstStatement.getText().trimEnd().endsWith(';') : true;

    let text = applyEdits(code, edits);
    const legacyLocals = new Set([...kt, ...app]);

    // 1. Partial removals, one binding at a time (re-parsing between them keeps comma handling exact).
    for (let guard = 0; guard < 50; guard++) {
        const cur = parse(project, text, filePath);
        let edit: Edit | null = null;
        for (const decl of cur.getImportDeclarations()) {
            const removable = legacyBindings(decl).filter((b) => legacyLocals.has(b.local) && !isReferenced(cur, b.local));
            if (!removable.length) continue;
            const named = decl.getNamedImports();
            const def = decl.getDefaultImport();
            const bindingCount = named.length + (def ? 1 : 0) + (decl.getNamespaceImport() ? 1 : 0);
            if (removable.length === bindingCount) continue; // whole declaration: handled in step 2
            const b = removable[0];
            if (b.kind === 'default') {
                edit = { start: def!.getStart(), end: decl.getImportClause()!.getNamedBindings()!.getStart(), text: '' };
            } else {
                const i = named.findIndex((s) => (s.getAliasNode()?.getText() ?? s.getName()) === b.local);
                if (named.length === 1) {
                    edit = { start: def!.getEnd(), end: decl.getImportClause()!.getNamedBindings()!.getEnd(), text: '' };
                } else if (i < named.length - 1) {
                    edit = { start: named[i].getStart(), end: named[i + 1].getStart(), text: '' };
                } else {
                    edit = { start: named[i - 1].getEnd(), end: named[i].getEnd(), text: '' };
                }
            }
            break;
        }
        if (!edit) break;
        text = applyEdits(text, [edit]);
    }

    // 2. Whole-declaration removals, merges into existing imports, and new declarations.
    const cur = parse(project, text, filePath);
    const final: Edit[] = [];
    const decls = cur.getImportDeclarations();
    const removed = new Set<ImportDeclaration>();
    for (const decl of decls) {
        const removable = legacyBindings(decl).filter((b) => legacyLocals.has(b.local) && !isReferenced(cur, b.local));
        const bindingCount = decl.getNamedImports().length + (decl.getDefaultImport() ? 1 : 0) + (decl.getNamespaceImport() ? 1 : 0);
        if (removable.length && removable.length === bindingCount) {
            removed.add(decl);
            final.push({ start: decl.getStart(), end: lineEndAfter(text, decl.getEnd()), text: '' });
        }
    }

    const newDecls: string[] = [];
    for (const [module, specs] of imports.pending) {
        const names = [...specs.values()];
        const target = decls.find(
            (d) => !removed.has(d) && !d.isTypeOnly() && d.getModuleSpecifierValue() === module && d.getNamedImports().length && !d.getNamespaceImport(),
        );
        if (target) {
            const named = target.getNamedImports();
            const last = named[named.length - 1];
            const bindings = target.getImportClause()!.getNamedBindings()!.getText();
            let sep = ', ';
            if (bindings.includes('\n')) {
                const lineStart = text.lastIndexOf('\n', last.getStart()) + 1;
                sep = `,${eol}${text.slice(lineStart, last.getStart())}`;
            }
            final.push({ start: last.getEnd(), end: last.getEnd(), text: names.map((n) => sep + n).join('') });
        } else {
            newDecls.push(`import { ${names.join(', ')} } from ${quote}${module}${quote}${semi ? ';' : ''}`);
        }
    }

    if (newDecls.length) {
        const kept = decls.filter((d) => !removed.has(d));
        const block = newDecls.join(eol);
        if (kept.length) {
            const pos = kept[kept.length - 1].getEnd();
            final.push({ start: pos, end: pos, text: eol + block });
        } else if (removed.size) {
            const first = decls.find((d) => removed.has(d))!;
            const slot = final.find((e) => e.start === first.getStart())!;
            slot.text = block + eol;
        } else {
            // No imports at all: after any directive prologue ('use client').
            let pos = 0;
            for (const st of cur.getStatements()) {
                if (Node.isExpressionStatement(st) && Node.isStringLiteral(st.getExpression())) pos = lineEndAfter(text, st.getEnd());
                else break;
            }
            final.push({ start: pos, end: pos, text: block + eol });
        }
    }

    return { code: applyEdits(text, final), manual };
}

// ─── CLI ──────────────────────────────────────────────────────────────────────────────────────────

const SOURCE_EXT = new Set(['.ts', '.tsx', '.js', '.jsx']);

function collect(path: string, out: string[]) {
    const st = statSync(path);
    if (st.isDirectory()) {
        for (const entry of readdirSync(path)) {
            if (entry === 'node_modules' || entry.startsWith('.')) continue;
            collect(join(path, entry), out);
        }
    } else if (SOURCE_EXT.has(extname(path)) && !path.endsWith('.d.ts')) {
        out.push(path);
    }
}

/** Read, transform, write ONE file. Nothing it does — I/O included — can abort the whole run. */
export function processFile(file: string, dry: boolean): { changed: boolean; manual: ManualEntry[] } {
    try {
        const code = readFileSync(file, 'utf8');
        const result = transformFileSafely(code, file);
        const changed = result.code !== code;
        if (changed && !dry) writeFileSync(file, result.code, 'utf8');
        return { changed, manual: result.manual };
    } catch (err) {
        return { changed: false, manual: [{ line: 1, reason: `codemod error ${err instanceof Error ? err.message : String(err)}` }] };
    }
}

function main(argv: string[]) {
    const dry = argv.includes('--dry-run');
    const targets = argv.filter((a) => !a.startsWith('--'));
    if (!targets.length) {
        console.log('usage: pnpm codemod:icons <dir|file>... [--dry-run]');
        return;
    }
    const files: string[] = [];
    for (const t of targets) collect(resolve(t), files);
    let changed = 0;
    const review: string[] = [];
    for (const file of files) {
        const result = processFile(file, dry);
        if (result.changed) changed++;
        for (const m of result.manual) review.push(`${file}:${m.line}  ${m.reason}`);
    }
    console.log(`${dry ? '[dry run] would change' : 'changed'} ${changed} of ${files.length} files`);
    if (review.length) {
        console.log(`\nManual review (${review.length}):`);
        for (const r of review) console.log(`  ${r}`);
    }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
    main(process.argv.slice(2));
    process.exitCode = 0;
}
