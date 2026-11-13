/**
 * icons-to-lucide codemod — input -> expected output, one block per brief case.
 *
 * Glyph names and pixel sizes are COMPUTED from the live registry (`iconFor`) and size table
 * (`iconPixelSize`), never hard-coded, so a registry or calibration change cannot leave the
 * codemod emitting a glyph or size the app itself would not draw.
 */
import { describe, expect, test } from 'vitest';
import * as lucide from 'lucide-react';
import { iconFor } from '../../src/ds/lib/icons/registry';
import { iconPixelSize, SIZE_SCALE } from '../../src/ds/lib/icons/size';
import { processFile, transformFileSafely, transformSource } from './icons-to-lucide';

/** Canonical lucide export name of whatever the registry resolves `name` to. */
function glyph(name: string): string {
    const component = iconFor(name);
    if (!component) throw new Error(`test setup: registry does not resolve "${name}"`);
    const icons = (lucide as unknown as { icons: Record<string, unknown> }).icons;
    const key = Object.keys(icons).find((k) => icons[k] === component);
    if (!key) throw new Error(`test setup: "${name}" is not a lucide icon`);
    return key;
}

const px = (className: string | undefined) => `size-[${iconPixelSize(className)}px]`;
const KT = `import { KTIcon } from '@metronic/helpers'\n`;
const APP = `import { AppIcon } from '@app/modules/common/components/ui'\n`;
const run = (code: string) => transformSource(code, 'Example.tsx');

describe('1. static KTIcon', () => {
    test('becomes the bare Lucide glyph at the fs-4 default size; the KTIcon import goes', () => {
        const Calendar = glyph('calendar');
        const out = run(`${KT}export const A = () => <KTIcon iconName="calendar" />\n`);
        expect(out.code).toBe(
            `import { ${Calendar} } from 'lucide-react'\nexport const A = () => <${Calendar} className="${px('fs-4')}" />\n`,
        );
        expect(out.manual).toEqual([]);
    });

    test('other specifiers of the same import survive; iconType is dropped', () => {
        const Calendar = glyph('calendar');
        const out = run(
            `import { KTIcon, toAbsoluteUrl } from '@metronic/helpers';\n` +
                `export const A = () => <KTIcon iconName="calendar" iconType="duotone" className="fs-2 me-1" />;\n`,
        );
        expect(out.code).toBe(
            `import { toAbsoluteUrl } from '@metronic/helpers';\n` +
                `import { ${Calendar} } from 'lucide-react';\n` +
                `export const A = () => <${Calendar} className="me-1 ${px('fs-2')}" />;\n`,
        );
    });

    test('an empty className means fs-4, exactly as KTIcon defaulted it', () => {
        const out = run(`${KT}export const A = () => <KTIcon iconName="calendar" className="" />\n`);
        expect(out.code).toContain(`<${glyph('calendar')} className="${px('fs-4')}" />`);
    });

    test('the import stays when KTIcon is still referenced elsewhere', () => {
        const out = run(`${KT}const C = KTIcon\nexport const A = () => <KTIcon iconName="calendar" />\n`);
        expect(out.code).toContain(`import { KTIcon } from '@metronic/helpers'`);
    });
});

describe('2. static AppIcon', () => {
    test('size token replaced by size-[Npx]; spacing and colour classes kept', () => {
        const Trash = glyph('bi-trash');
        const out = run(`${APP}export const A = () => <AppIcon name="bi-trash" className="fs-2x me-2 text-danger" />\n`);
        expect(out.code).toBe(
            `import { ${Trash} } from 'lucide-react'\n` +
                `export const A = () => <${Trash} className="me-2 text-danger ${px('fs-2x')}" />\n`,
        );
        expect(px('fs-2x')).toBe('size-[26px]');
    });

    test('only the AppIcon specifier leaves a shared barrel import', () => {
        const out = run(
            `import { AppIcon, GlassCard } from '@app/modules/common/components/ui'\n` +
                `export const A = () => <GlassCard><AppIcon name="bi-trash" /></GlassCard>\n`,
        );
        expect(out.code).toContain(`import { GlassCard } from '@app/modules/common/components/ui'`);
        expect(out.code).not.toContain('AppIcon');
    });

    test('a default AppIcon import is removed too', () => {
        const out = run(
            `import AppIcon from '../ui/AppIcon'\nexport const A = () => <AppIcon name="bi-trash" className="fs-6" />\n`,
        );
        expect(out.code).toBe(
            `import { ${glyph('bi-trash')} } from 'lucide-react'\nexport const A = () => <${glyph('bi-trash')} className="${px('fs-6')}" />\n`,
        );
    });

    test('key, id, data-* and aria-* carry over to the Lucide element', () => {
        const out = run(
            `${APP}export const A = () => <AppIcon key="k" name="bi-trash" className="fs-7" data-icon="inline-start" aria-hidden />\n`,
        );
        expect(out.code).toContain(`<${glyph('bi-trash')} key="k" className="${px('fs-7')}" data-icon="inline-start" aria-hidden />`);
        expect(out.manual).toEqual([]);
    });
});

describe('3. imports', () => {
    test('an existing lucide-react import is merged into, never duplicated', () => {
        const Calendar = glyph('calendar');
        const out = run(`import { Plus } from 'lucide-react'\n${KT}export const A = () => <><Plus /><KTIcon iconName="calendar" /></>\n`);
        expect(out.code).toBe(
            `import { Plus, ${Calendar} } from 'lucide-react'\nexport const A = () => <><Plus /><${Calendar} className="${px(undefined)}" /></>\n`,
        );
        expect(out.code.match(/from 'lucide-react'/g)).toHaveLength(1);
    });

    test('an already-imported glyph is reused under its local name', () => {
        const Calendar = glyph('calendar');
        const out = run(`import { ${Calendar} as Cal } from 'lucide-react'\n${KT}export const A = () => <KTIcon iconName="calendar" />\n`);
        expect(out.code).toBe(`import { ${Calendar} as Cal } from 'lucide-react'\nexport const A = () => <Cal className="${px(undefined)}" />\n`);
    });

    test('a local identifier clash imports the <Name>Icon alias', () => {
        const Calendar = glyph('calendar');
        expect(Object.keys(lucide)).toContain(`${Calendar}Icon`);
        const out = run(`${KT}function ${Calendar}() { return <KTIcon iconName="calendar" /> }\n`);
        expect(out.code).toBe(
            `import { ${Calendar}Icon } from 'lucide-react'\nfunction ${Calendar}() { return <${Calendar}Icon className="${px(undefined)}" /> }\n`,
        );
    });

    test('the same glyph used twice is imported once', () => {
        const out = run(`${KT}export const A = () => <><KTIcon iconName="calendar" /><KTIcon iconName="calendar" className="fs-1" /></>\n`);
        expect(out.code.match(new RegExp(`\\b${glyph('calendar')}\\b`, 'g'))).toHaveLength(3);
    });

    test('quote style and semicolons follow the file', () => {
        const out = run(`import { KTIcon } from "@metronic/helpers";\nimport React from "react";\nexport const A = () => <KTIcon iconName="calendar" />;\n`);
        expect(out.code).toBe(
            `import React from "react";\nimport { ${glyph('calendar')} } from "lucide-react";\nexport const A = () => <${glyph('calendar')} className="${px(undefined)}" />;\n`,
        );
    });
});

describe('4. conditional names', () => {
    test('JSX-child position: a braced conditional of two glyphs', () => {
        const Check = glyph('check');
        const Cross = glyph('cross');
        const out = run(`${KT}export const A = ({ ok }) => <div><KTIcon iconName={ok ? 'check' : 'cross'} className="fs-5" /></div>\n`);
        expect(out.code).toContain(
            `<div>{ok ? <${Check} className="${px('fs-5')}" /> : <${Cross} className="${px('fs-5')}" />}</div>`,
        );
        expect(px('fs-5')).toBe('size-[17px]');
        expect(out.code).toContain(`import { ${Check}, ${Cross} } from 'lucide-react'`);
    });

    test('attribute-value position: a parenthesised conditional', () => {
        const out = run(`${KT}export const A = ({ ok }) => <Btn icon={<KTIcon iconName={ok ? 'check' : 'cross'} className="fs-5" />} />\n`);
        expect(out.code).toContain(
            `<Btn icon={(ok ? <${glyph('check')} className="${px('fs-5')}" /> : <${glyph('cross')} className="${px('fs-5')}" />)} />`,
        );
    });

    test('a conditional with an unknown literal branch is left for manual review', () => {
        const src = `${KT}export const A = ({ ok }) => <KTIcon iconName={ok ? 'check' : 'no-such-icon-x'} />\n`;
        const out = run(src);
        expect(out.code).toBe(src);
        expect(out.manual[0].reason).toMatch(/no registry entry/);
    });
});

describe('5. data-driven names', () => {
    test('become DynamicIcon with the computed size', () => {
        const out = run(`${KT}export const A = ({ item }) => <KTIcon iconName={item.icon} className="fs-3" />\n`);
        expect(out.code).toBe(
            `import { DynamicIcon } from '@/ds/ui/dynamic-icon'\n` +
                `export const A = ({ item }) => <DynamicIcon name={item.icon} className="${px('fs-3')}" />\n`,
        );
        expect(px('fs-3')).toBe('size-[21px]');
    });
});

describe('6. AppIcon colour, style and fallbackSize', () => {
    test('color merges into style, after the existing keys', () => {
        const out = run(`${APP}export const A = () => <AppIcon name="bi-pencil" color="#999" style={{ marginTop: 2 }} />\n`);
        expect(out.code).toContain(`<${glyph('bi-pencil')} className="${px(undefined)}" style={{ marginTop: 2, color: '#999' }} />`);
    });

    test('color alone becomes a style; an expression colour is kept verbatim', () => {
        const out = run(`${APP}export const A = () => <AppIcon name="bi-pencil" className="fs-9" color={C.purple} />\n`);
        expect(out.code).toContain(`<${glyph('bi-pencil')} className="${px('fs-9')}" style={{ color: C.purple }} />`);
    });

    test('style keys AppIcon overrode are dropped (they never applied)', () => {
        const out = run(`${APP}export const A = () => <AppIcon name="bi-pencil" style={{ display: "block", marginBottom: "8px", lineHeight: 1 }} />
`);
        expect(out.code).toContain(`<${glyph('bi-pencil')} className="${px(undefined)}" style={{ marginBottom: "8px" }} />`);
        const gone = run(`${APP}export const A = () => <AppIcon name="bi-pencil" style={{ verticalAlign: 'middle' }} />
`);
        expect(gone.code).toContain(`<${glyph('bi-pencil')} className="${px(undefined)}" />`);
    });

    test('a style that is not an object literal goes to review', () => {
        const src = `${APP}export const A = () => <AppIcon name="bi-pencil" style={base} color="red" />
`;
        const out = run(src);
        expect(out.code).toBe(src);
        expect(out.manual).toHaveLength(1);
    });

    test('fallbackSize wins over the fs-* class', () => {
        const out = run(`${APP}export const A = () => <AppIcon name="bi-pencil" className="fs-2 me-1" fallbackSize={12} />\n`);
        expect(out.code).toContain(`<${glyph('bi-pencil')} className="me-1 size-[12px]" />`);
    });
});

describe('7. behaviour attributes are not moved by machine', () => {
    for (const attr of ['title="Sensitive"', 'onClick={go}']) {
        test(attr, () => {
            const src = `${APP}export const A = () => <AppIcon name="bi-pencil" ${attr} />\n`;
            const out = run(src);
            expect(out.code).toBe(src);
            expect(out.manual).toEqual([{ line: 2, reason: expect.stringMatching(/move title\/onClick to parent control/) }]);
        });
    }

    test('a non-literal className cannot be sized statically', () => {
        const src = `${APP}export const A = () => <AppIcon name="bi-pencil" className={cn('fs-2', x)} />\n`;
        const out = run(src);
        expect(out.code).toBe(src);
        expect(out.manual[0].reason).toMatch(/non-literal className/);
    });

    test('a template literal without expressions IS a literal', () => {
        const out = run(`${APP}export const A = () => <AppIcon name="bi-pencil" className={\`fs-2 me-1\`} />\n`);
        expect(out.code).toContain(`<${glyph('bi-pencil')} className="me-1 ${px('fs-2')}" />`);
    });
});

describe('8. unknown literal name', () => {
    test('is left untouched with a manual entry; import kept', () => {
        const src = `${KT}export const A = () => <KTIcon iconName="no-such-icon-x" />\n`;
        const out = run(src);
        expect(out.code).toBe(src);
        expect(out.manual).toEqual([{ line: 2, reason: expect.stringMatching(/no registry entry/) }]);
    });
});

describe('9. raw <i> Bootstrap icons', () => {
    test('fontSize px becomes the size through the SAME calibration as fs-*; the emptied style goes', () => {
        // A 12px font glyph -> round(12 x SIZE_SCALE): Lucide's viewBox margin needs the same
        // compensation whether the old size came from a class or from inline style.
        const sized = `size-[${Math.round(12 * SIZE_SCALE)}px]`;
        expect(sized).toBe('size-[14px]');
        const out = run(`export const A = () => <i className="bi bi-pencil" style={{ fontSize: 12 }} />\n`);
        expect(out.code).toBe(`import { ${glyph('bi-pencil')} } from 'lucide-react'\nexport const A = () => <${glyph('bi-pencil')} className="${sized}" />\n`);
    });

    test("'Npx' strings count; other style keys and utility classes stay", () => {
        const out = run(`export const A = () => <i className="bi bi-pencil me-2 text-muted" style={{ fontSize: '14px', marginTop: 1 }}></i>\n`);
        expect(out.code).toContain(`<${glyph('bi-pencil')} className="me-2 text-muted size-[${Math.round(14 * SIZE_SCALE)}px]" style={{ marginTop: 1 }} />`);
    });

    test('an fs-* class sizes it through iconPixelSize', () => {
        const out = run(`export const A = () => <i className="bi-pencil fs-3" />\n`);
        expect(out.code).toContain(`<${glyph('bi-pencil')} className="${px('fs-3')}" />`);
    });

    test('no size at all inherits the parent font-size: manual', () => {
        const src = `export const A = () => <i className="bi bi-pencil" />\n`;
        const out = run(src);
        expect(out.code).toBe(src);
        expect(out.manual[0].reason).toMatch(/inherited size/);
    });

    test('any other unknown class: untouched + manual', () => {
        const src = `export const A = () => <i className="bi bi-pencil fs-3 some-custom" />\n`;
        const out = run(src);
        expect(out.code).toBe(src);
        expect(out.manual).toHaveLength(1);
    });

    test('an <i> that is not an icon is ignored silently', () => {
        const src = `export const A = () => <p><i>italic</i><i className="text-muted">x</i></p>\n`;
        expect(run(src)).toEqual({ code: src, manual: [] });
    });

    test('FontAwesome names resolve through the registry', () => {
        const out = run(`export const A = () => <i className="fa-solid fa-crown text-danger fs-2" />
`);
        expect(out.code).toContain(`<${glyph('fa-crown')} className="text-danger ${px('fs-2')}" />`);
    });

    test('a FontAwesome name the registry lacks: untouched + manual', () => {
        expect(iconFor('fa-trash')).toBeNull();
        const src = `export const A = () => <i className="fa-solid fa-trash fs-2" />
`;
        const out = run(src);
        expect(out.code).toBe(src);
        expect(out.manual[0].reason).toMatch(/no registry entry/);
    });
});

describe('brand marks', () => {
    test('resolve to their named export from brandIcons', () => {
        expect(iconFor('whatsapp')).toBeTruthy();
        const out = run(`${KT}export const A = () => <KTIcon iconName="whatsapp" className="fs-3" />\n`);
        expect(out.code).toBe(
            `import { WhatsAppIcon } from '@/ds/lib/icons/brandIcons'\nexport const A = () => <WhatsAppIcon className="${px('fs-3')}" />\n`,
        );
    });
});

describe('classes that do not mean the same on an svg', () => {
    // Real call sites: PublicHolidayListTwo.tsx:940 and EmployeeAccessTab.tsx:311. `d-block` made
    // AppIcon's SPAN a block whose inline svg still centred under text-center; on the svg itself
    // the icon would sit flush left.
    const realSites = [
        `${KT}export const A = () => <div className="text-center"><KTIcon iconName="calendar-slash" className="fs-2x mb-3 text-gray-400 d-block" /></div>\n`,
        `${KT}export const A = () => <div className="text-center"><KTIcon iconName="calendar" className="fs-3x text-primary mb-3 d-block" /></div>\n`,
    ];
    realSites.forEach((src, i) => {
        test(`d-block real site ${i + 1}: untouched + manual`, () => {
            const out = run(src);
            expect(out.code).toBe(src);
            expect(out.manual).toEqual([{ line: 2, reason: "class d-block behaves differently on svg than on AppIcon's span" }]);
        });
    });

    test.each(['md:size-5', '!size-4'])('%s counts as an existing size class: manual', (cls) => {
        const src = `${APP}export const A = () => <AppIcon name="bi-pencil" className="fs-3 ${cls}" />
`;
        const out = run(src);
        expect(out.code).toBe(src);
        expect(out.manual[0].reason).toBe('className already has a size-* class');
    });

    test('w-*/h-* would beat size-[N]: manual', () => {
        const src = `${APP}export const A = () => <AppIcon name="bi-pencil" className="fs-3 w-25px" />\n`;
        const out = run(src);
        expect(out.code).toBe(src);
        expect(out.manual[0].reason).toMatch(/class w-25px behaves differently/);
    });

    test('padding shrinks the glyph on a border-box svg (it grew the span): manual', () => {
        const src = `${APP}export const A = () => <AppIcon name="bi-trash" className="fs-4 p-2" />\n`;
        const out = run(src);
        expect(out.code).toBe(src);
        expect(out.manual).toEqual([{ line: 2, reason: "class p-2 behaves differently on svg than on AppIcon's span" }]);
        for (const t of ['px-1', 'py-2', 'ps-3', 'pe-1', 'pt-0', 'pb-2']) {
            expect(run(`${APP}export const A = () => <AppIcon name="bi-trash" className="${t}" />\n`).manual).toHaveLength(1);
        }
    });

    test('raw <i> refuses padding too', () => {
        const src = `export const A = () => <i className="bi bi-pencil fs-3 px-1" />\n`;
        const out = run(src);
        expect(out.code).toBe(src);
        expect(out.manual[0].reason).toMatch(/unrecognised class "px-1"/);
    });

    test('cursor, no-shrink, pointer-events and responsive margins are allowed', () => {
        const cls = 'cursor-pointer shrink-0 flex-shrink-0 pe-none ms-md-2 mt-lg-n1 mx-xl-auto';
        const out = run(`${APP}export const A = () => <AppIcon name="bi-trash" className="fs-5 ${cls}" />\n`);
        expect(out.manual).toEqual([]);
        expect(out.code).toContain(`<${glyph('bi-trash')} className="${cls} ${px('fs-5')}" />`);
    });

    test('an allowed mix converts', () => {
        const out = run(`${KT}export const A = () => <KTIcon iconName="calendar" className="fs-3 me-2 mb-n1 text-primary opacity-75 align-top rotate-90 ci-spin d-md-none" />\n`);
        expect(out.manual).toEqual([]);
        expect(out.code).toContain(`<${glyph('calendar')} className="me-2 mb-n1 text-primary opacity-75 align-top rotate-90 ci-spin d-md-none ${px('fs-3')}" />`);
    });
});

describe('color prop and style.color together', () => {
    test('the prop wins (AppIcon applied it after style) and replaces the key in place; no duplicate key', () => {
        const out = run(`${APP}export const A = () => <AppIcon name="bi-pencil" style={{ color: 'red', marginTop: 2 }} color="#999" />\n`);
        expect(out.code).toContain(`style={{ color: '#999', marginTop: 2 }}`);
        expect(out.code.match(/color:/g)).toHaveLength(1);
    });

    test('quoted key form too', () => {
        const out = run(`${APP}export const A = () => <AppIcon name="bi-pencil" style={{ 'color': x }} color={y} />\n`);
        expect(out.code).toContain(`style={{ color: y }}`);
    });
});

describe('robustness', () => {
    test('a file with a syntax error is returned unchanged with a manual entry', () => {
        const src = `${KT}export const A = () => <div><KTIcon iconName="calendar" /></div\nconst B = (\n`;
        for (const fn of [transformSource, transformFileSafely]) {
            const out = fn(src, 'Broken.tsx');
            expect(out.code).toBe(src);
            expect(out.manual).toHaveLength(1);
            expect(out.manual[0].reason).toMatch(/^syntax error, file skipped/);
        }
    });

    test('an I/O error on one file is a manual entry, not a crash', () => {
        const out = processFile('Z:/definitely/missing/Nope.tsx', true);
        expect(out.changed).toBe(false);
        expect(out.manual).toHaveLength(1);
        expect(out.manual[0].reason).toMatch(/^codemod error /);
    });

    test('bi-trash is Trash2 (pinned literally, not only via the canonical lookup)', () => {
        const out = run(`${APP}export const A = () => <AppIcon name="bi-trash" />\n`);
        expect(out.code).toBe(`import { Trash2 } from 'lucide-react'\nexport const A = () => <Trash2 className="size-[18px]" />\n`);
    });

    test('CRLF files stay CRLF byte for byte', () => {
        const src = [
            `import { KTIcon, toAbsoluteUrl } from '@metronic/helpers';`,
            `import React from 'react';`,
            `export const A = () => (`,
            `  <div>`,
            `    <KTIcon iconName="calendar" className="fs-5" />`,
            `  </div>`,
            `);`,
            ``,
        ].join('\r\n');
        const out = run(src).code;
        expect(out).not.toBe(src);
        expect(out).toContain(`import { ${glyph('calendar')} } from 'lucide-react';`);
        expect(out.split('\r\n')).toHaveLength(src.split('\r\n').length + 1);
        expect(/(^|[^\r])\n/.test(out)).toBe(false);
        expect(/\r(?!\n)/.test(out)).toBe(false);
    });
});

describe('10. idempotent', () => {
    const inputs = [
        `${KT}export const A = ({ ok, item }) => <div><KTIcon iconName={ok ? 'check' : 'cross'} className="fs-5" /><KTIcon iconName={item.icon} /></div>\n`,
        `${APP}export const A = () => <><AppIcon name="bi-pencil" color="#999" style={{ marginTop: 2 }} /><AppIcon name="bi-pencil" title="t" /></>\n`,
        `export const A = () => <i className="bi bi-pencil" style={{ fontSize: 12 }} />\n`,
    ];
    inputs.forEach((input, i) => {
        test(`input ${i + 1}`, () => {
            const once = run(input).code;
            expect(run(once).code).toBe(once);
        });
    });
});
