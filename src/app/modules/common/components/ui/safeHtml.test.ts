// @vitest-environment jsdom
/**
 * The escape that stands between a typed-in name and a script tag.
 *
 * These are regression tests for a real hole: three dialogs interpolated an
 * employee, branch or organisation name straight into SweetAlert's `html`, which
 * is assigned to the DOM as markup. A name of `<img src=x onerror=…>` executed in
 * the browser of whoever opened the dialog.
 *
 * The payloads below are the shapes that actually get used — an image with an
 * error handler, a closed-then-reopened tag, an attribute break-out — not
 * `<script>`, which most sinks strip anyway.
 */
import { describe, expect, it } from 'vitest';
import { cssUrl, escapeHtml, safeHtml } from './safeHtml';

describe('escapeHtml', () => {
    it('neutralises the five characters that can leave text position', () => {
        expect(escapeHtml(`&<>"'`)).toBe('&amp;&lt;&gt;&quot;&#39;');
    });

    it('escapes the ampersand so an escape cannot be smuggled through', () => {
        // If & were left alone, `&lt;script&gt;` typed by a user would be decoded
        // back into a tag by the browser. Escaping & first is what stops that.
        expect(escapeHtml('&lt;script&gt;')).toBe('&amp;lt;script&amp;gt;');
    });

    it('renders null and undefined as empty, not as the words', () => {
        // A plain template literal splices in "null"/"undefined", which users see.
        expect(escapeHtml(null)).toBe('');
        expect(escapeHtml(undefined)).toBe('');
    });

    it('passes ordinary text through untouched', () => {
        expect(escapeHtml("O'Brien & Sons")).toBe('O&#39;Brien &amp; Sons');
        expect(escapeHtml('Mumbai Branch')).toBe('Mumbai Branch');
    });

    it('stringifies non-strings rather than throwing', () => {
        expect(escapeHtml(42)).toBe('42');
        expect(escapeHtml(0)).toBe('0');
        expect(escapeHtml(false)).toBe('false');
    });
});

describe('safeHtml', () => {
    it('keeps the markup you wrote and escapes what you interpolate', () => {
        const name = 'Mumbai';
        expect(safeHtml`Delete <b>${name}</b>?`).toBe('Delete <b>Mumbai</b>?');
    });

    it('defuses an image payload — the exact shape of the reported bug', () => {
        const name = '<img src=x onerror="alert(1)">';
        const out = safeHtml`configured for <strong>${name}</strong>.`;
        expect(out).toBe(
            'configured for <strong>&lt;img src=x onerror=&quot;alert(1)&quot;&gt;</strong>.',
        );
        // The literal <strong> survives; nothing from the value does.
        expect(out).toContain('<strong>');
        expect(out).not.toContain('<img');
        expect(out).not.toContain('onerror="');
    });

    it('defuses a tag that closes the one it sits inside', () => {
        const name = '</strong><script>alert(1)</script><strong>';
        expect(safeHtml`<strong>${name}</strong>`).not.toContain('<script>');
    });

    it('defuses an attribute break-out', () => {
        const cls = '" onmouseover="alert(1)';
        expect(safeHtml`<div class="${cls}">x</div>`).not.toContain('onmouseover="alert');
    });

    it('escapes every interpolation, not just the first', () => {
        const a = '<b>a</b>';
        const b = '<i>b</i>';
        const out = safeHtml`${a} and ${b}`;
        expect(out).not.toContain('<b>');
        expect(out).not.toContain('<i>');
    });

    it('handles a template with no interpolation at all', () => {
        expect(safeHtml`<b>static</b>`).toBe('<b>static</b>');
    });

    it('handles interpolation at the very start and end', () => {
        const x = '<x>';
        expect(safeHtml`${x}mid${x}`).toBe('&lt;x&gt;mid&lt;x&gt;');
    });
});

/**
 * A user-typed logo / photo URL inside `style="background-image: url(…)"` (the CRM map marker).
 * HTML escaping alone is not enough there: the HTML parser decodes `&#39;` back to `'` before
 * CSS runs, so `')` still closed the url() — and an unescaped `"` closed the attribute itself.
 */
describe('cssUrl', () => {
    const marker = (url: unknown) => {
        const bg = cssUrl(url);
        const el = document.createElement('div');
        el.innerHTML = `<div style="background-image: ${escapeHtml(bg)};"></div>`;
        return el;
    };

    it('keeps a normal logo URL working (presigned query string included)', () => {
        const url = 'https://bucket.s3.ap-south-1.amazonaws.com/logos/a.png?X-Amz-Signature=abc&X-Amz-Date=1';
        expect(cssUrl(url)).toBe(`url("${url}")`);
    });

    it('an attribute break-out never becomes an element or an event handler', () => {
        const el = marker('https://x.example/a.png" onmouseover="alert(1)" x="');
        expect(el.querySelectorAll('*')).toHaveLength(1);
        expect(el.firstElementChild!.getAttributeNames()).toEqual(['style']);
    });

    it('a CSS break-out stays inside the url() string', () => {
        const bg = cssUrl("https://x.example/a.png'); background: url(https://evil.example/t");
        expect(bg).not.toMatch(/['()]\s*;|'\)/);
        // Exactly one url( … ) — the injected second one is now just percent-encoded text.
        expect(bg!.match(/url\(/g)).toHaveLength(1);
        expect(bg!.endsWith('")')).toBe(true);
    });

    it('refuses non-http(s) schemes and junk', () => {
        for (const v of ['javascript:alert(1)', 'data:image/svg+xml,<svg onload=alert(1)>', 'vbscript:x', '', '   ', null, undefined, 42]) {
            expect(cssUrl(v)).toBeNull();
        }
    });
});
