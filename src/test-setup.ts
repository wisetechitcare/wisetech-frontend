import { configure } from '@testing-library/dom';

/**
 * There are TWO clocks in a render test, and raising one does nothing for the other.
 *
 * `testTimeout` (vitest.config.ts, 35s) bounds the whole test. Testing Library's `asyncUtilTimeout`
 * bounds every single `findBy*` / `waitFor` inside it, and it defaults to **1000ms** — it does not
 * read `testTimeout` and is not affected by it.
 *
 * That 1000ms was the real cause of this suite's "flakiness": different files failing on each run,
 * all of them passing when run alone. vitest.config.ts measured the per-file cost at ~9.7s of import
 * and jsdom setup plus a ~2.5s first render, and more parallel workers make that worse. A first
 * render of ~2.5s against a 1000ms query budget fails WHENEVER the awaited element only appears
 * after that render — while the test itself still has 34 seconds left. It surfaces as an ordinary
 * assertion, never as a timeout, which is what made it read as cross-file pollution:
 *
 *   await screen.findByRole('button', { name: /reschedule or edit/i })
 *     → "Unable to find an accessible element with the role button…"   (InterviewsPanel)
 *   await waitFor(() => expect(el.getAttribute('aria-disabled')).not.toBe('true'))
 *     → "expected 'true' not to be 'true'"  — waitFor reporting its LAST failure, not a timeout
 *                                                     (DepartmentDesignationFields)
 *
 * Nothing leaks between files: vitest isolates each test file by default, and these tests mock their
 * own API modules. The victims just differ per run because the scheduler decides which file renders
 * while contention peaks.
 *
 * 10s, not 35s: a query budget should absorb CPU contention but still fail WELL before the test
 * ceiling, so a genuinely missing element is reported as the query failure it is — with Testing
 * Library's DOM dump naming what it looked for — rather than as an opaque "test timed out". This
 * costs nothing on a green run: `findBy*` and `waitFor` resolve the moment their condition holds,
 * so only a failing assertion ever spends the budget.
 */
configure({ asyncUtilTimeout: 10_000 });

/**
 * jsdom has no `window.matchMedia`, and the design system asks it on every render (Motion's reduced-motion
 * check, responsive dialogs). One default here — "no media query matches" — instead of a copy in each test
 * file. A test that needs a phone or reduced motion still defines its own, which replaces this one.
 */
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

/**
 * jsdom has no `ResizeObserver`, and the kit's Animate UI primitives construct one on mount — the tabs'
 * sliding indicator measures the selected tab to place itself. Without this, any test that renders a kit
 * tab strip dies on `new ResizeObserver(...)` before a single assertion runs, which is how
 * RecruitmentOverview started failing with "ResizeObserver is not defined".
 *
 * A no-op is the correct default rather than a measuring fake: jsdom reports every box as 0x0 anyway, and
 * these tests assert content and behaviour, never geometry. A test that genuinely needs a size can still
 * define its own.
 *
 * One default here instead of a copy per file — the same argument as matchMedia above, and
 * MaterialHeaderTab.test.tsx is the copy that had to exist before this. (It installs its own only when the
 * global is absent, so it now leaves this one alone and no longer deletes it in teardown.)
 */
if (typeof globalThis.ResizeObserver === 'undefined') {
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

/**
 * jsdom never fetches or decodes images, so every `<img>` stays at `naturalWidth: 0` and
 * `complete: false` forever. That is invisible for a plain `<img>`, but Base UI's Avatar (which
 * SmartAvatar is built on) renders NO `<img>` at all until loading succeeds — so a photo avatar was
 * permanently stuck on its initials fallback under test, and EntityIdentityHeader's "renders a photo
 * when src is given" could never pass.
 *
 * Base UI has a synchronous escape hatch, and this aims at exactly it: `useImageLoadingStatus` ends
 * with a "fast path for cached/decoded images" — `if (image.complete) status = naturalWidth > 0`.
 * Reporting an image that HAS a src as already decoded takes that path inside the layout effect, so
 * the avatar resolves to `loaded` during the same commit and synchronous tests keep working. No faked
 * load event, no async rewrite of every avatar test.
 *
 * An image with NO src still reports `complete: false` / `naturalWidth: 0`, so Base UI sets `error`
 * and the initials fallback renders — which is what EntityIdentityHeader's first test asserts.
 */
if (typeof window !== 'undefined' && typeof window.HTMLImageElement === 'function') {
  const proto = window.HTMLImageElement.prototype;
  const decoded = (el: HTMLImageElement) => Boolean(el.getAttribute('src'));
  Object.defineProperty(proto, 'complete', {
    configurable: true,
    get(this: HTMLImageElement) { return decoded(this); },
  });
  for (const dimension of ['naturalWidth', 'naturalHeight'] as const) {
    Object.defineProperty(proto, dimension, {
      configurable: true,
      get(this: HTMLImageElement) { return decoded(this) ? 1 : 0; },
    });
  }
}
