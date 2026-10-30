import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * v2 consistency guard (ADR-001): screens and patterns are composed from the shadcn kit in
 * src/ds/ui and never re-draw what it already provides. A hand-built card or control drifts on
 * the next style update (that is how the prototype search box kept its old square corners after
 * the switch to base-maia). src/ds/ui is shadcn's own code and is not scanned; foundations draws
 * token swatches on purpose.
 */
const DS = __dirname;
const SCANNED = ['prototypes', 'patterns'];

const RULES: Array<[RegExp, string]> = [
    [/<button\b/, 'raw <button> — use Button (or SidebarMenuButton, TabsTrigger…)'],
    [/<input\b/, 'raw <input> — use Input / InputGroupInput'],
    [/<textarea\b/, 'raw <textarea> — use Textarea'],
    [/<select\b/, 'raw <select> — use Select'],
    [/<kbd\b/, 'raw <kbd> — use Kbd'],
    [/className="[^"]*\bborder\b[^"]*\bbg-card\b|className="[^"]*\bbg-card\b[^"]*\bborder\b/, 'hand-built card — use Card'],
    [/duration-\[var\(/, 'arbitrary duration variable — use a Tailwind duration'],
];

function tsxFiles(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? tsxFiles(join(dir, e.name)) : e.name.endsWith('.tsx') ? [join(dir, e.name)] : [],
    );
}

describe('v2 kit consistency', () => {
    it('screens and patterns use kit components instead of hand-built ones', () => {
        const hits: string[] = [];
        for (const file of SCANNED.flatMap((d) => tsxFiles(join(DS, d)))) {
            readFileSync(file, 'utf8')
                .split('\n')
                .forEach((line, i) => {
                    for (const [re, why] of RULES) {
                        if (re.test(line)) hits.push(`${relative(DS, file)}:${i + 1} ${why}`);
                    }
                });
        }
        expect(hits).toEqual([]);
    });

    // Tokens retired when the kit moved to shadcn's type/shadow scale: a leftover class silently does nothing.
    it('nothing in src/ds uses a retired design token', () => {
        const RETIRED = /\b(text-(display|headline|title|body|label)|shadow-e[123]|subtle-foreground|duration-(fast|base|slow)|ease-standard)\b/;
        const hits = tsxFiles(DS).flatMap((file) =>
            readFileSync(file, 'utf8')
                .split('\n')
                .flatMap((line, i) => (RETIRED.test(line) ? [`${relative(DS, file)}:${i + 1} ${line.match(RETIRED)?.[0]}`] : [])),
        );
        expect(hits).toEqual([]);
    });
});
