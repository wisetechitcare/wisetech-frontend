// Proves the cascade bug and the fix against the app's REAL compiled stylesheet.
// No login and no dev server needed: the header and the utilities are plain CSS, so a
// faithful DOM plus the real sheet is enough to measure what the browser actually does.
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const assert = require('assert');

// Needs a build: the whole point is to measure against the SHIPPED cascade, where
// Bootstrap's utilities land after Tailwind's layer.  `pnpm build && node .harness/sticky.cjs`
const cssFile = fs.existsSync('dist/assets')
    ? fs.readdirSync('dist/assets').filter((f) => /^index-.*\.css$/.test(f))[0]
    : null;
assert.ok(cssFile, 'no dist/assets/index-*.css — run `pnpm build` first');
const css = fs.readFileSync(path.join('dist/assets', cssFile), 'utf8');

// What emotion emits at runtime for the new `stickySx`, injected unlayered into <head>
// exactly as MUI does.
const EMOTION = '.harness-fix{position:sticky;top:0}@media (min-width:992px){.harness-fix{top:74px}}';

// The rule the removed utilities compiled to, injected so this check keeps demonstrating
// the mechanism now that the component no longer carries those classes (Tailwind only emits
// classes it finds in source). Injected LAST on purpose: Bootstrap's `.top-0` carries
// !important, so it wins from anywhere in the sheet — source order is not what decides it.
const LEGACY = '@media (min-width:1025px){.min-\[1025px\]\:top-\[74px\]{top:74px}}';

// Split in two so Tailwind's scanner cannot read a candidate out of THIS file and keep
// emitting the dead utility into the shipped CSS — it scans every source file, and while
// the class was spelled out here the build kept shipping the rule the component no longer
// uses. `sticky` and `top-0` are real classes used elsewhere in the app, so those come
// from the real sheet, which is the point.
const LEGACY_VARIANT = 'min-[1025px]';
const LEGACY_UTILITY = 'top-[74px]';

const HTML = `
<div class="page d-flex flex-row flex-column-fluid">
  <div class="wrapper d-flex flex-column flex-row-fluid" id="kt_wrapper">
    <div id="kt_header" class="header align-items-stretch"><div class="header-brand">HEADER</div></div>
    <div id="kt_content" class="content d-flex flex-column flex-column-fluid p-0 m-0">
      <div class="post d-flex flex-column-fluid p-0 m-0" id="kt_post">
        <div style="width:100%">
          <div id="before" class="sticky top-0 ${LEGACY_VARIANT}:${LEGACY_UTILITY} z-50 min-h-11">OLD</div>
          <div id="after" class="harness-fix z-50 min-h-11">NEW</div>
        </div>
      </div>
    </div>
  </div>
          <div style="height:3000px"></div>
        </div>
      </div>
    </div>
  </div>
</div>`;

(async () => {
    const browser = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    const results = [];

    for (const width of [1920, 1000, 800]) {
        await page.setViewport({ width, height: 900 });
        // Body classes come from LayoutSetup.initHeader — both fixed flags are true in
        // DefaultLayoutConfig, so both classes are always present in the real app.
        await page.setContent(
            `<!doctype html><html><head></head><body class="header-fixed header-tablet-and-mobile-fixed">${HTML}</body></html>`
        );
        await page.addStyleTag({ content: css });
        await page.addStyleTag({ content: LEGACY });
        await page.addStyleTag({ content: EMOTION });

        const r = await page.evaluate(() => {
            // This layout scrolls an inner element, not the document — find it.
            const all = [document.scrollingElement, ...document.querySelectorAll('*')];
            const scrollers = [...new Set(all)].filter((e) => e && e.scrollHeight > e.clientHeight + 200);
            scrollers.forEach((e) => { e.scrollTop = 600; });
            window.scrollTo(0, 600);
            const g = (id) => {
                const el = document.getElementById(id);
                const cs = getComputedStyle(el);
                return { top: cs.top, position: cs.position, y: Math.round(el.getBoundingClientRect().top) };
            };
            const h = document.getElementById('kt_header');
            const hcs = getComputedStyle(h);
            // On tablet/mobile the fixed strip is .header-brand, not .header.
            const strip = hcs.position === 'fixed' ? h : document.querySelector('.header-brand');
            const scs = getComputedStyle(strip);
            return {
                scrollY: Math.max(Math.round(window.scrollY), ...scrollers.map((e) => Math.round(e.scrollTop)), 0),
                scrollers: scrollers.map((e) => `${e.tagName}${e.id ? '#' + e.id : ''}`).join(' , ') || 'none',
                header: {
                    position: scs.position,
                    display: scs.display,
                    height: scs.height,
                    zIndex: scs.zIndex,
                    bottom: Math.round(strip.getBoundingClientRect().bottom),
                },
                before: g('before'),
                after: g('after'),
            };
        });

        const hb = r.header.bottom;
        const over = (b) => (b.y < hb ? hb - b.y : 0);
        console.log(`\n── viewport ${width}px — scrolled ${r.scrollY}px on [${r.scrollers}] | strip ${r.header.position} h=${r.header.height} z=${r.header.zIndex} bottom=${hb}px`);
        console.log(`   OLD  top=${r.before.top.padEnd(6)} pinned y=${String(r.before.y).padEnd(4)} ${over(r.before) ? `OVERLAPS by ${over(r.before)}px` : 'clear'}`);
        console.log(`   NEW  top=${r.after.top.padEnd(6)} pinned y=${String(r.after.y).padEnd(4)} ${over(r.after) ? `OVERLAPS by ${over(r.after)}px` : 'clear'}`);
        results.push({ width, r, overBefore: over(r.before), overAfter: over(r.after) });
    }

    await browser.close();

    // The check: the old utilities are pinned to 0 at EVERY width (Bootstrap's
    // `.top-0{top:0!important}` outranks the 74px variant), and the new sx offset
    // clears the fixed strip at every width.
    for (const { width, r, overBefore, overAfter } of results) {
        // The defect: Bootstrap's `.top-0{top:0!important}` outranks the 74px variant,
        // so the offset the code asks for is never the offset the browser uses.
        assert.strictEqual(r.before.top, '0px', `viewport ${width}: expected OLD to compute top:0px`);
        // The fix, and the reason this file exists: the offset must equal the height of
        // whatever strip is actually fixed at this width. Measured, not assumed — this is
        // what catches the header height changing in either of the two places that define
        // it (sass/layout/_variables.scss and premium-layout.css).
        // The offset must equal the height of the strip that is FIXED at this width, or
        // 0 where nothing is fixed and the masthead scrolls away with the page.
        const expected = r.header.position === 'fixed' ? r.header.height : '0px';
        assert.strictEqual(r.after.top, expected,
            `viewport ${width}: NEW offset ${r.after.top} != expected ${expected} (strip ${r.header.position} h=${r.header.height})`);
        if (r.scrollY === 0) continue;   // harness page did not scroll at this width
            // Overlap is only possible where something is fixed to overlap WITH.
            if (r.header.position === 'fixed') {
                assert.ok(overBefore > 0, `viewport ${width}: expected the OLD bar to overlap`);
            }
        assert.strictEqual(overAfter, 0, `viewport ${width}: NEW bar overlaps the fixed strip by ${overAfter}px`);
    }
    console.log('\nPASS — old pins to 0 at every width; new matches whatever is fixed there.');
})();
