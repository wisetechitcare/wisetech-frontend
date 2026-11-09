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
