import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { iconFor, registeredNames } from './iconRegistry';

const SRC = join(__dirname, '..', '..', '..', '..', '..');

function tsxFiles(dir: string, out: string[] = []): string[] {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
            if (entry.name !== 'node_modules') tsxFiles(full, out);
        } else if (entry.name.endsWith('.tsx')) {
            out.push(full);
        }
    }
    return out;
}

/** Static icon-name literals only — a template literal has no name to check at rest. */
function iconNamesIn(source: string): string[] {
    const names: string[] = [];
    for (const [, name] of source.matchAll(/<AppIcon[^>]*?\sname=\{?"([a-z0-9-]+)"/g)) names.push(name);
    for (const [, name] of source.matchAll(/<KTIcon[^>]*?\siconName=\{?"([a-z0-9-]+)"/g)) names.push(name);
    // Names that reach an icon through an OPTIONS ARRAY or lookup map rather than JSX —
    // `{ value: 'table', icon: 'burger-menu-1' }`. Scanning JSX alone missed every one of
    // them, so the font migration left the Tasks board's Table toggle rendering a blank
    // button, and ~40 others like it, with the suite green.
    for (const [, , name] of source.matchAll(/(?:^|[\s,{(])(icon|iconName)\s*:\s*['"]([a-z0-9-]{3,})['"]/g)) {
        // `bi-*` are Bootstrap Icon CLASSES drawn by the icon font, not registry keys.
        if (!name.startsWith('bi-')) names.push(name);
    }
    return names;
}

describe('iconRegistry', () => {
    it('resolves every icon name written at a call site', () => {
        const missing = new Map<string, string>();
        for (const file of tsxFiles(SRC)) {
            for (const name of iconNamesIn(readFileSync(file, 'utf8'))) {
                if (!iconFor(name)) missing.set(name, file.slice(SRC.length + 1));
            }
        }
        // Reported as name -> first file, so a failure says what to add and where it is used.
        expect(Object.fromEntries(missing)).toEqual({});
    });

    it('points every registered name at a real component', () => {
        // Guards the upgrade path: Lucide renames icons between majors (HelpCircle became
        // CircleQuestionMark, Filter became Funnel), and a dropped export lands here as
        // `undefined` rather than as a blank square someone notices in production.
        //
        // Checked for presence, not for `typeof === 'function'` — Lucide wraps its icons in
        // `forwardRef`, so a perfectly good icon is an object.
        const broken = registeredNames().filter((name) => !iconFor(name));
        expect(broken).toEqual([]);
    });
});
