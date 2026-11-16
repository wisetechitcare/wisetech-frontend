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
    // A card-shaped surface drawn by hand (bg-card with a border or radius), in className="…" or inside cn("…").
    [/["'`][^"'`]*\bbg-card\b[^"'`]*\b(border|rounded-\w+)\b|["'`][^"'`]*\b(border|rounded-\w+)\b[^"'`]*\bbg-card\b/, 'hand-built card — use Card (rows: Item)'],
    [/duration-\[var\(/, 'arbitrary duration variable — use a Tailwind duration'],
    [/from ['"]@(base-ui|animate-ui)\//, 'primitive imported directly — compose from src/ds/ui (it carries the Animate UI motion and kit styling)'],
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

    // A command list's rows sit inside CommandGroup: its inset keeps each row's rounded highlight fully visible
    // (rows placed straight in CommandList ran flush against the search box — the phone field's country list).
    it('command rows are grouped', () => {
        const hits = SCANNED.flatMap((d) => tsxFiles(join(DS, d)))
            .filter((file) => !file.endsWith('.stories.tsx'))
            .filter((file) => {
                const src = readFileSync(file, 'utf8');
                return /<CommandItem\b/.test(src) && !/<CommandGroup\b/.test(src);
            })
            .map((file) => relative(DS, file));
        expect(hits).toEqual([]);
    });

    // ONE calendar engine (ui/calendar.tsx): pickers, Apply Leave, the fiscal year — every calendar inherits it and
    // customises through its props (getDayState, rangeStyle, size). A second grid would drift in look and behaviour.
    it('only the calendar engine builds a calendar', () => {
        const ENGINE = join('ui', 'calendar.tsx');
        const ARIA_CALENDAR = /\b(Calendar|RangeCalendar|CalendarGrid\w*|CalendarCell|CalendarHeaderCell|\w*CalendarStateContext)\b/;
        const hits = tsxFiles(DS)
            .filter((file) => relative(DS, file) !== ENGINE)
            .flatMap((file) => {
                const src = readFileSync(file, 'utf8');
                const aria = [...src.matchAll(/import\s*(?:type\s*)?\{([^}]*)\}\s*from\s*["']react-aria-components["']/g)]
                    .some((m) => ARIA_CALENDAR.test(m[1]));
                const thirdParty = /from\s*["'](react-day-picker|react-datepicker|react-calendar)["']/.test(src);
                return aria || thirdParty ? [relative(DS, file)] : [];
            });
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
