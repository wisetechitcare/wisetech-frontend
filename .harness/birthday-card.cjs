// Renders BirthdayCard for the cases that differ, rasterises each, and asserts the
// branches that matter. The card is artwork: a typecheck says nothing about whether
// the age line is there, so this draws it and looks.
//
//   node .harness/birthday-card.cjs [outDir]
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const esbuild = require('esbuild');
const puppeteer = require('puppeteer');

const OUT = process.argv[2] || path.join('.harness', 'out');
fs.mkdirSync(OUT, { recursive: true });

// A 2×2 PNG, so the photo branch is exercised with a real decodable image rather than
// a URL the renderer would silently drop.
const PIXEL =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAHElEQVQI12P8z8Dwn4GBgYGJAQ0MLwFGmDEEJQBpiwQBnLZa1gAAAABJRU5ErkJggg==';

// The REAL brand assets, not stand-ins. The knockout only behaves for a mark with an
// alpha channel, so a synthetic logo drawn on white would render a white rectangle here
// and prove nothing -- these are the exact files the endpoint serves.
const asDataUri = (file) =>
    'data:image/png;base64,' + fs.readFileSync(path.join('.harness', 'fixtures', file)).toString('base64');

// What production actually serves: the ROOT organisation's mark, the one Organization
// Profile shows. Stacked, 1147 x 673, and OPAQUE -- a white background baked in. Rendering
// the transparent lockup here instead would hide the very case the filter exists for.
const ORG = { name: 'WISETECH GROUP', logo: asDataUri('root-WISETECH-GROUP.png'), logoWidth: 1147, logoHeight: 673 };
/**
 * The mark the card is handed is OPAQUE — a white background baked in — so the artwork
 * keys the white out rather than drawing the file as-is. Pinning the colour type here is
 * what makes that visible: if the organisation ever uploads a transparent mark the filter
 * still behaves (it subtracts from the incoming alpha), but the assumption has changed
 * and this check says so out loud.
 *
 * PNG colour type is byte 25, inside the IHDR: 2 = RGB, 6 = RGBA, 4 = grey+alpha.
 */
const assertColourType = (file, allowed) => {
    const buf = fs.readFileSync(path.join('.harness', 'fixtures', file));
    assert.ok(allowed.includes(buf[25]),
        `${file}: expected PNG colour type in ${allowed}, got ${buf[25]}`);
};
assertColourType('root-WISETECH-GROUP.png', [2]);
assertColourType('sub-MEP-CONSULTANTS.png', [4, 6]);

/** No mark on file. The sign-off must still finish -- in type, centred, both shapes. */
const NO_LOGO_ORG = { name: 'WISETECH GROUP', logo: null, logoWidth: null, logoHeight: null };

const CASES = [
    { key: 'employee-full', label: 'employee, photo + DOB',
      person: { id: '1', name: 'Aabid Patel', photo: PIXEL, dateOfBirth: '1995-07-19', subtitle: 'Junior Engineers' } },
    { key: 'contact-dob-nophoto', label: 'contact, DOB, no photo',
      person: { id: '2', name: 'Ar Aasim', photo: null, dateOfBirth: '1985-06-17', subtitle: 'Director · SURI REALTY LLP' } },
    { key: 'contact-generic', label: 'contact, no DOB, no photo — the generic card',
      person: { id: '3', name: 'Shaikhs', photo: null, dateOfBirth: null, subtitle: null } },
    { key: 'long-name', label: 'name long enough to wrap',
      person: { id: '4', name: 'Suwarnadurgakar Venkataraman Krishnamurthy', photo: PIXEL, dateOfBirth: '1990-03-02', subtitle: 'MEP Co-Ordinator (D) (L1)' } },
    { key: 'no-logo', label: 'organisation with no mark on file', org: NO_LOGO_ORG,
      person: { id: '5', name: 'Kanhai Gandhi', photo: PIXEL, dateOfBirth: '1980-11-04', subtitle: 'Director · KNS Architect' } },
];


(async () => {
    // Bundle the component with a render entry. React ships with the app, so nothing
    // is stubbed — this is the same code the browser runs.
    const entry = `
        import React from 'react';
        import { renderToStaticMarkup } from 'react-dom/server';
        import BirthdayCard from '../src/app/pages/employee/components/birthdaycard/BirthdayCard';
        export const render = (data, orientation) =>
            renderToStaticMarkup(React.createElement(BirthdayCard, { data, orientation }));
    `;
    const bundle = path.join(OUT, '_bundle.cjs');
    await esbuild.build({
        stdin: { contents: entry, resolveDir: '.harness', loader: 'tsx' },
        bundle: true, platform: 'node', format: 'cjs', outfile: bundle, logLevel: 'silent',
        // The component imports its payload type from the services module; `import type`
        // is erased, but the path alias still has to resolve for esbuild to parse it.
        alias: { '@services': path.resolve('src/services') },
    });
    const { render } = require(path.resolve(bundle));

    const browser = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    let checked = 0;

    for (const c of CASES) {
        for (const orientation of ['portrait', 'landscape']) {
            const svg = render({ person: c.person, organization: c.org || ORG }, orientation);

            // The card must never say how old anyone is -- not for an employee, not for a
            // contact, not in any shape. A date of birth decides only THAT it is someone's
            // birthday. This is the one assertion here that guards a decision rather than
            // a layout, so it runs on every case.
            assert.ok(!/\b(?:Turning|age|years old)\b/i.test(svg),
                `${c.key}/${orientation}: the card must not print an age`);
            // The card PRINTS a date now, which is the one place an age could leak back
            // in: the year on it is always the current one, never the year on file, so a
            // reader cannot subtract. Both halves are asserted -- that the birth year is
            // absent, and that a date is actually there to be absent from.
            const birthYear = c.person.dateOfBirth && c.person.dateOfBirth.slice(0, 4);
            if (birthYear) {
                assert.ok(!svg.includes(birthYear),
                    `${c.key}/${orientation}: the card must not print the year of birth`);
            }
            const dateLine = (svg.match(/>(\d{2}\.\d{2}\.\d{4})</) || [])[1];
            assert.strictEqual(dateLine && dateLine.slice(6), String(new Date().getFullYear()),
                `${c.key}/${orientation}: expected a DD.MM.YYYY date carrying the current year`);
            // No photo must fall back to a monogram, never an empty circle.
            if (!c.person.photo) {
                assert.ok(svg.includes('<text') && /<text[^>]*>[A-Z?]{1,2}<\/text>/.test(svg),
                    `${c.key}/${orientation}: expected an initials monogram`);
            }
            // The greeting is CALLIGRAPHY, drawn as outlines, so there is no "HAPPY
            // BIRTHDAY" string in the markup to look for any more -- the label is. That
            // label is also the only thing a screen reader gets from it, which is exactly
            // why it is what this asserts on.
            assert.ok(svg.includes('aria-label="Happy Birthday"'),
                `${c.key}/${orientation}: missing the greeting`);
            assert.ok(!/>HAPPY BIRTHDAY</.test(svg),
                `${c.key}/${orientation}: the greeting must be outlines, not live text -- a webfont does not survive the PNG export`);
            if (c.org === NO_LOGO_ORG) {
                // Type, and NOT dragged off centre by a slot the card never drew: the
                // side-by-side sign-off exists only because a MARK is tall.
                assert.ok(/>WISETECH GROUP</.test(svg),
                    `${c.key}/${orientation}: with no mark on file the sign-off must finish in type`);
                assert.ok(!/text-anchor="start"/.test(svg),
                    `${c.key}/${orientation}: nothing is set beside a mark that does not exist`);
            } else {
                assert.ok(svg.includes('data:image'),
                    `${c.key}/${orientation}: missing the company mark`);
            }
            // The mark's white ground is keyed out AND its ink is lifted -- see the
            // filter in the artwork. Both halves are asserted because each has been
            // shipped alone and each was wrong alone: the key-out without the saturate
            // put navy ink on a navy card, and the plate that avoided that put a white
            // sticker at the head of the design.
            assert.ok(svg.includes('feColorMatrix'),
                `${c.key}/${orientation}: the mark's white ground must be keyed out`);
            assert.ok(svg.includes('type="saturate"'),
                `${c.key}/${orientation}: the mark's ink must be lifted, or #304070 lands on navy`);
            // The alpha ramp must stay a TABLE. As a linear gain it multiplies the
            // ground along with the edges, and the file's scan-white ground is not
            // #FFFFFF -- so a gain of 3 painted a ~9% white veil over the mark's whole
            // rectangle, which is what "the logo looks blurry" turned out to be.
            assert.ok(/<feFuncA type="table"/.test(svg),
                `${c.key}/${orientation}: the mark's alpha ramp must be a table -- a linear gain lifts the white ground back in as a haze`);
            assert.ok(!/<rect[^>]*fill="#FFFFFF"/.test(svg),
                `${c.key}/${orientation}: no white plate behind the mark`);

            // Collision check, measured rather than eyeballed. Every drawn box is asked
            // for its real bounding box and no two may overlap — this is what caught a
            // wrapped name printing its subtitle through the company logo, and confetti
            // landing on the footer line. Text only: the background arcs are meant to sit
            // under everything.
            await page.setContent(`<!doctype html><body style="margin:0">${svg}</body>`);
            const clashes = await page.evaluate(() => {
                // `[data-hit]` does two jobs. It opts a drawn shape into the check -- the
                // photo's gilt ring needed that, since it sits 26 units outside the image
                // box and an image-only sweep called it clear while it sat on the logo. And
                // a SHARED value groups parts that are stacked on purpose (photo + ring +
                // monogram), so the check skips those pairs instead of crying wolf.
                //
                // Elements with neither an attribute nor text fall back to a per-element
                // key, NOT their tag: two unrelated <image>s must still be compared, which
                // is the whole point.
                // `[data-decor]` opts OUT. The balloon bunches are <image> elements now,
                // and decoration is meant to sit behind the words -- a bunch flanking a
                // name overlaps it by design, exactly as the background arcs always did.
                // Without this the sweep would fail on every card and the real finding it
                // exists for (text through text, text through the logo) would be buried.
                const svg = document.querySelector('svg');
                const toRoot = svg.getScreenCTM().inverse();
                const boxes = [...document.querySelectorAll('text, image, [data-hit]')]
                    .filter((el) => !el.hasAttribute('data-decor'))
                    .map((el, i) => {
                    const b = el.getBBox();
                    // getBBox returns the box in the element's OWN coordinate system,
                    // BEFORE its own transform. The greeting is a <g> that is translated
                    // and scaled into place, so measuring it raw put it at the origin --
                    // 1000 units wide and straddling y 0 -- and it sat there quietly
                    // colliding with nothing real while missing everything it could have
                    // hit. Mapping through the CTM puts every box in the same space.
                    const m = toRoot.multiply(el.getScreenCTM());
                    const xs = [];
                    const ys = [];
                    for (const [px, py] of [[b.x, b.y], [b.x + b.width, b.y],
                                            [b.x, b.y + b.height], [b.x + b.width, b.y + b.height]]) {
                        const pt = svg.createSVGPoint();
                        pt.x = px; pt.y = py;
                        const q = pt.matrixTransform(m);
                        xs.push(q.x); ys.push(q.y);
                    }
                    // Read the fields, do NOT spread. getBBox returns an SVGRect whose
                    // x/y/width/height live on the PROTOTYPE, so `{...b}` copies nothing and
                    // every comparison below silently comes out false -- a check that can
                    // never fail. It was written that way and caught nothing for a while.
                    const group = el.getAttribute('data-hit') || el.textContent || `${el.tagName}#${i}`;
                    return {
                        group,
                        label: group.slice(0, 28),
                        x: Math.min(...xs),
                        y: Math.min(...ys),
                        w: Math.max(...xs) - Math.min(...xs),
                        h: Math.max(...ys) - Math.min(...ys),
                    };
                });
                const hits = [];
                for (let i = 0; i < boxes.length; i += 1) {
                    for (let j = i + 1; j < boxes.length; j += 1) {
                        const a = boxes[i]; const b = boxes[j];
                        if (a.group === b.group) continue;   // stacked on purpose
                        const dx = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
                        const dy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
                        // 2px of tolerance: glyph boxes carry a hair of side bearing.
                        if (dx > 2 && dy > 2) hits.push(`"${a.label}" x "${b.label}"`);
                    }
                }
                // Inside the frame, with air. Overlap alone said nothing about the last
                // element in the column: the mark cleared everything above it and still
                // sat 2 units off the gold rule, which reads as a logo running off the
                // card. MARGIN is the property that was actually wanted, so it is the one
                // asserted -- and it is asserted against the frame the design draws
                // rather than against a number repeated here.
                const frame = document.querySelector('rect[fill="none"][rx="8"]');
                const fy = +frame.getAttribute('y');
                const fh = +frame.getAttribute('height');
                const cramped = boxes
                    .map((b) => ({ b, top: b.y - fy, bottom: fy + fh - (b.y + b.h) }))
                    .filter(({ top, bottom }) => Math.min(top, bottom) < 12)
                    .map(({ b, top, bottom }) => `"${b.label}" (${Math.round(Math.min(top, bottom))} from the frame)`);

                // The mark closes the card ON the card's centre line, in both shapes.
                // It sat beside the sign-off phrase for a while, with the PAIR centred --
                // which puts the mark itself off centre, and a bright block off centre
                // beside muted grey type reads as a mistake however the box measures.
                const mark = boxes.find((b) => b.group === 'mark');
                const offCentre = mark ? Math.abs(mark.x + mark.w / 2 - svg.viewBox.baseVal.width / 2) : 0;

                return { hits, cramped, offCentre };
            });
            assert.deepStrictEqual(clashes.hits, [],
                `${c.key}/${orientation}: overlapping elements -> ${clashes.hits.join(', ')}`);
            assert.deepStrictEqual(clashes.cramped, [],
                `${c.key}/${orientation}: too close to the frame -> ${clashes.cramped.join(', ')}`);
            assert.ok(clashes.offCentre < 1,
                `${c.key}/${orientation}: the mark is ${Math.round(clashes.offCentre)} units off the card's centre line`);

            const w = orientation === 'landscape' ? 1920 : 1080;
            const h = orientation === 'landscape' ? 1080 : 1350;
            await page.setViewport({ width: w / 2, height: h / 2, deviceScaleFactor: 1 });
            await page.setContent(
                `<!doctype html><body style="margin:0;width:${w / 2}px">${svg}</body>`,
            );
            await page.screenshot({ path: path.join(OUT, `${c.key}-${orientation}.png`) });
            checked += 1;
        }
    }

    await browser.close();
    fs.rmSync(bundle, { force: true });
    console.log(`PASS — ${checked} cards rendered to ${OUT}`);
    for (const c of CASES) console.log(`  ${c.key.padEnd(22)} ${c.label}`);
})();
