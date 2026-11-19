import type { AxiosInstance } from 'axios';

/**
 * When the pre-React splash (index.html) goes away.
 *
 * It used to be hidden the moment React mounted, but the first page is a lazy chunk, so the user landed on an empty
 * shell (header + nav, blank body) until it arrived. Now:
 *   1. The splash waits for the first route's code (route Suspense fallbacks `holdSplash('route')`) — always.
 *   2. Then it waits for the page's data to settle (no call in flight for QUIET_MS), capped at DATA_MAX_MS so a slow
 *      or never-ending call can't hold the app back — so the splash lifts straight onto a filled page.
 *   3. A failsafe ends it regardless, so a stuck chunk can never trap the user behind the splash.
 * An organization splash video is just the loading screen's look: it never delays this. Its only hold (`data-hold`,
 * set by index.html) keeps its first frame on screen a moment so a fast load doesn't flash it.
 */
const FADE_MS = 350;
const SETTLE_MS = 120; // lets a nested Suspense mount right after its parent resolves, so there is no flash between them
// The page's data: the splash lifts once no call has been in flight for QUIET_MS (the first page has settled — a
// follow-up call that starts right after another finishes resets it), or after DATA_MAX_MS whatever is still running
// (a slow or never-ending call must not hold the whole app back).
const QUIET_MS = 250;
const DATA_MAX_MS = 3500;
// Only for something genuinely stuck. Normal startup (session → access → route code → first data) ends well before;
// lower it and a slow-but-healthy load lifts onto the top progress bar — the "loads twice" look.
const FAILSAFE_MS = 8000;

type HoldKind = 'route' | 'request';
const pending: Record<HoldKind, number> = { route: 0, request: 0 };
let requested = false;
let released = false;
let settleTimer: number | undefined;
let graceTimer: number | undefined;
let failsafeTimer: number | undefined;
let hideTimer: number | undefined;
// Bumped by showSplashAgain: a hold taken during an earlier showing must not count against the new one.
let generation = 0;

/** Fade the splash out and remove it — once a just-started video has had its first moment on screen. */
export const hideSplash = (): void => {
  const el = document.getElementById('splash-screen');
  if (!el) return;
  const hide = () => {
    el.classList.add('splash--leaving');
    window.clearTimeout(hideTimer);
    hideTimer = window.setTimeout(() => {
      el.style.setProperty('display', 'none');
      // A looping splash video would otherwise keep decoding behind the app. Removed outright (not just emptied):
      // index.html's resize handler sees it disconnected and detaches instead of restarting it.
      el.querySelectorAll('video').forEach((v) => { v.pause(); v.removeAttribute('src'); v.load(); v.remove(); });
      el.querySelectorAll('.splash-video-backdrop').forEach((c) => c.remove());
    }, FADE_MS);
  };
  if (el.hasAttribute('data-hold')) el.addEventListener('splash-release', hide, { once: true });
  else hide();
};

const release = () => {
  if (released) return;
  released = true;
  window.clearTimeout(settleTimer);
  window.clearTimeout(graceTimer);
  window.clearTimeout(failsafeTimer);
  hideSplash();
};

const afterPaint = (fn: () => void) => requestAnimationFrame(() => requestAnimationFrame(fn));

const settle = () => {
  window.clearTimeout(settleTimer);
  if (released || !requested || pending.route > 0) return;
  settleTimer = window.setTimeout(() => {
    if (pending.route > 0) return;
    // The page's code is in. Now its data — until it settles, capped.
    graceTimer ??= window.setTimeout(() => {
      graceTimer = undefined;
      // Never lift onto a route still loading its code (that is the "second loading" look); its settle() re-arms this.
      if (pending.route === 0) afterPaint(release);
    }, DATA_MAX_MS);
    if (pending.request > 0) return; // the hold's own completion calls settle() again
    settleTimer = window.setTimeout(() => {
      if (pending.route === 0 && pending.request === 0) afterPaint(release);
    }, QUIET_MS);
  }, SETTLE_MS);
};

/** The app has mounted: hide the splash once its first route has loaded. */
export const requestSplashHide = (): void => {
  if (released) return;
  requested = true;
  failsafeTimer ??= window.setTimeout(release, FAILSAFE_MS);
  settle();
};

/** Hold the splash while something is loading; call the returned function when it is done (a useEffect fits). */
export const holdSplash = (kind: HoldKind = 'route'): (() => void) => {
  if (released) return () => {};
  pending[kind] += 1;
  if (kind === 'route') window.clearTimeout(settleTimer);
  const gen = generation;
  let done = false;
  return () => {
    if (done || gen !== generation) return;
    done = true;
    pending[kind] -= 1;
    settle();
  };
};

/**
 * Bring the splash back (with the organization's logo or video) to cover a load that happens without a page reload —
 * signing in, where the dashboard otherwise loads in the open. It lifts by the same rules as at startup.
 */
export const showSplashAgain = (): void => {
  const el = document.getElementById('splash-screen');
  if (!el) return;
  generation += 1;
  pending.route = 0;
  pending.request = 0;
  released = false;
  requested = false;
  [settleTimer, graceTimer, failsafeTimer, hideTimer].forEach((t) => window.clearTimeout(t));
  graceTimer = undefined;
  failsafeTimer = undefined;

  el.querySelectorAll('video, .splash-video-backdrop').forEach((v) => v.remove());
  el.classList.remove('splash--leaving', 'splash--video', 'splash--has-video', 'splash--letterbox', 'splash--bars-y', 'splash--bars-x');
  el.removeAttribute('data-hold');
  el.style.removeProperty('display');
  (window as unknown as { wtSplashBrand?: () => void }).wtSplashBrand?.(); // index.html: logo + video, from storage
  // The app is already mounted, so nothing else will ask — arm it now; the loads that follow hold it as usual.
  requestSplashHide();
};

const requestHolds = new WeakMap<object, () => void>();

/**
 * Let the first page's API calls land before the splash lifts (within DATA_MAX_MS). Startup only — once the splash
 * is gone `holdSplash` is a no-op. Install on an axios instance BEFORE its other interceptors, so its response handler
 * runs first and always sees the raw outcome.
 */
export const holdSplashDuringRequests = (instance: AxiosInstance): void => {
  instance.interceptors.request.use((config) => {
    requestHolds.get(config)?.(); // a replayed request: settle the previous attempt first
    requestHolds.set(config, holdSplash('request'));
    return config;
  });
  const done = (config: object | undefined) => {
    if (!config) return;
    requestHolds.get(config)?.();
    requestHolds.delete(config);
  };
  instance.interceptors.response.use(
    (response) => { done(response.config); return response; },
    (error) => { done(error?.config); return Promise.reject(error); },
  );
};
