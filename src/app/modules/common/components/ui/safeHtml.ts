/**
 * `safeHtml` — the ONE way to build an HTML string that carries user data.
 *
 * ── WHY THIS EXISTS ────────────────────────────────────────────────────────────
 * React escapes `{value}` in JSX for you, which is why almost all of this app is
 * safe by default. But the moment a string leaves JSX — SweetAlert's `html:`,
 * `dangerouslySetInnerHTML`, a Leaflet `divIcon` — React's protection is gone and
 * the browser parses whatever you hand it as markup.
 *
 * SweetAlert2's own typings are explicit about this:
 *
 *   "[Security] SweetAlert2 does NOT sanitize this parameter. It is the
 *    developer's responsibility."
 *
 * Three call sites had already been written as
 *
 *   html: `…configured for <strong>${employeeName}</strong>…`
 *
 * where the name comes from a record someone typed. A name of
 * `<img src=x onerror=…>` executes in the browser of whoever opens that dialog —
 * planted once, fired later, usually at someone with more access. Stored XSS.
 *
 * ── WHY A TAGGED TEMPLATE, NOT AN escape() HELPER ──────────────────────────────
 * A helper you must remember to call is a helper that gets forgotten: this repo
 * already HAD one (`esc` in AssignToProjectsDialog) and three later call sites
 * never found it. The failure was ergonomic, not careless — `html: \`…${name}…\``
 * is the natural thing to type and the unsafe thing to type.
 *
 * A tagged template inverts that. Interpolations are escaped because of where
 * they sit, not because anyone remembered. The static markup you wrote stays
 * markup; every `${…}` becomes text. There is nothing to forget.
 *
 *   safeHtml`Delete <b>${org.name}</b>?`   →  name rendered as text, <b> intact
 *
 * ── WHAT IT IS NOT ─────────────────────────────────────────────────────────────
 * Not a sanitiser. It escapes VALUES; it trusts the literal parts, which are
 * written by you and fixed at build time. If you need to render HTML that ARRIVES
 * as data (a server-rendered document, rich text from an editor), that is a
 * different problem — sanitise it with DOMPurify instead. `feedback.ts` does that
 * as a second layer, so the two are belt and braces, not alternatives.
 */

/**
 * The five characters that can break out of text position in HTML.
 *
 * Numeric references (`&#60;`) rather than named ones (`&lt;`) because they are
 * valid in every context this output can land in — element text, a double-quoted
 * attribute, a single-quoted attribute — without needing to know which one.
 */
const HTML_ESCAPES: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
};

/**
 * Escape a single value for HTML text or attribute position.
 *
 * Exported for the rare case where you are not building a template — for example
 * passing one already-escaped string to a library. Prefer `safeHtml` everywhere
 * you are composing markup: it cannot be forgotten, and this can.
 */
export function escapeHtml(value: unknown): string {
    // null and undefined render as empty, not as the words "null"/"undefined",
    // which is what a template literal would otherwise splice in.
    if (value === null || value === undefined) return '';
    return String(value).replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}

/**
 * Tagged template that escapes every interpolated value.
 *
 *   safeHtml`Remove <b>${name}</b> from ${count} project(s)?`
 *
 * Static parts pass through untouched, so you keep writing ordinary markup.
 * Values are escaped, so a name, a note or an error message from the server
 * cannot become an element.
 *
 * Nesting works — the inner result is already escaped and is spliced in as text,
 * which is wrong for building lists. For that, escape the parts and join:
 *
 *   const rows = items.map((i) => `<li>${escapeHtml(i.name)}</li>`).join('');
 *   alertDialog({ html: `<ul>${rows}</ul>` });
 *
 * That is the one case where the raw-template lint rule is expected to fire; the
 * markup is yours and the values are escaped, so silence it locally with a
 * one-line eslint-disable that says so.
 */
export function safeHtml(strings: TemplateStringsArray, ...values: unknown[]): string {
    return strings.reduce<string>(
        (out, chunk, i) => out + chunk + (i < values.length ? escapeHtml(values[i]) : ''),
        '',
    );
}
