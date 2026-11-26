import type { AxiosInstance } from 'axios';

/**
 * When the pre-React splash (index.html) goes away.
 *
 * index.html decides what it looks like: on the first open in a browser tab, the full intro (the logo with a filling
 * bar, or the organization's video played through once); on every later load in that tab (reloads, signing in) only a
 * slim progress bar along the top. Either way it lifts when BOTH:
 *   1. its intro has finished (`data-intro-done`; the top bar has no intro) — so the intro always plays to the end, and
 *   2. the app is ready: the first route's code is in (route Suspense fallbacks `holdSplash('route')`) and the page's
 *      data has settled (no call in flight for QUIET_MS), capped at DATA_MAX_MS.
 * Once the intro is over it waits for the app at most INTRO_GRACE_MS; whatever is still loading then continues under
 * the app's own top progress bar. A failsafe ends the wait regardless, so a stuck chunk can never trap the user.
 */
const FINISH_MS = 350; // the bar runs to 100% (and glows) before the exit
// The exit in splash-screen.css: the full splash's staged fade (0.15s delay + 0.6s), the top bar's plain one.
const FADE_MS = 750;
const BAR_FADE_MS = 300;
const SETTLE_MS = 120; // lets a nested Suspense mount right after its parent resolves, so there is no flash between them
// The page's data: the splash lifts once no call has been in flight for QUIET_MS (the first page has settled — a
// follow-up call that starts right after another finishes resets it), or after DATA_MAX_MS whatever is still running
// (a slow or never-ending call must not hold the whole app back).
const QUIET_MS = 250;
const DATA_MAX_MS = 3500;
// After the intro the page is shown promptly: slow data finishes behind its own skeletons, not behind the splash.
const INTRO_GRACE_MS = 300;
// Only for something genuinely stuck. Normal startup (session → access → route code → first data) ends well before.
const FAILSAFE_MS = 8000;

type HoldKind = 'route' | 'request';
const pending: Record<HoldKind, number> = { route: 0, request: 0 };
let requested = false;
let released = false;
let introGraceArmed = false;
let settleTimer: number | undefined;
let graceTimer: number | undefined;
let failsafeTimer: number | undefined;
let hideTimer: number | undefined;
let introGraceTimer: number | undefined;
let cancelPendingHide: (() => void) | undefined;
// Bumped by showSplashAgain: a hold taken during an earlier showing must not count against the new one.
let generation = 0;

const splashEl = () => document.getElementById('splash-screen');

let showing = !!splashEl();
const listeners = new Set<() => void>();
const setShowing = (value: boolean) => {
  if (showing === value) return;
  showing = value;
  listeners.forEach((fn) => fn());
};

/** For useSyncExternalStore: whether the startup splash (or its top bar) is on screen. */
export const subscribeSplash = (fn: () => void): (() => void) => {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
};
export const isSplashShowing = (): boolean => showing;

const whenIntroDone = (el: HTMLElement, fn: () => void): (() => void) => {
  if (el.hasAttribute('data-intro-done')) {
    fn();
    return () => {};
  }
  el.addEventListener('splash-intro-done', fn, { once: true });
  return () => el.removeEventListener('splash-intro-done', fn);
};

/** Finish the bar, fade the splash out and remove it — once its intro has played to the end. */
export const hideSplash = (): void => {
  const el = splashEl();
  if (!el) return;
  cancelPendingHide?.();
  cancelPendingHide = whenIntroDone(el, () => {
    cancelPendingHide = undefined;
    el.classList.add('splash--finishing');
    el.style.setProperty('--splash-progress-ms', `${FINISH_MS}ms`);
    el.style.setProperty('--splash-progress', '100%');
    window.clearTimeout(hideTimer);
    hideTimer = window.setTimeout(() => {
      el.classList.add('splash--leaving');
      setShowing(false);
      hideTimer = window.setTimeout(() => {
        el.style.setProperty('display', 'none');
        // A splash video would otherwise keep decoding behind the app. Removed outright (not just emptied):
        // index.html's resize handler sees it disconnected and detaches.
        el.querySelectorAll('video').forEach((v) => { v.pause(); v.removeAttribute('src'); v.load(); v.remove(); });
        el.querySelectorAll('.splash-video-backdrop').forEach((c) => c.remove());
      }, el.classList.contains('splash--bar') ? BAR_FADE_MS : FADE_MS);
    }, FINISH_MS);
  });
};

const release = () => {
  if (released) return;
  released = true;
  window.clearTimeout(settleTimer);
  window.clearTimeout(graceTimer);
  window.clearTimeout(failsafeTimer);
  window.clearTimeout(introGraceTimer);
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

/** The full intro has played: give the app a short moment more, then hand over to the app's own top bar. */
const armIntroGrace = () => {
  const el = splashEl();
  if (introGraceArmed || !el || el.classList.contains('splash--bar')) return;
  introGraceArmed = true;
  whenIntroDone(el, () => {
    window.clearTimeout(introGraceTimer);
    introGraceTimer = window.setTimeout(release, INTRO_GRACE_MS);
  });
};

/** The app has mounted: hide the splash once its first route has loaded. */
export const requestSplashHide = (): void => {
  if (released) return;
  requested = true;
  failsafeTimer ??= window.setTimeout(release, FAILSAFE_MS);
  armIntroGrace();
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
 * Cover a load that happens without a page reload — signing in, where the dashboard otherwise loads in the open.
 * index.html picks the look: the intro has already played in this tab, so this is the top bar. It lifts by the same
 * rules as at startup.
 */
export const showSplashAgain = (): void => {
  const el = splashEl();
  if (!el) return;
  generation += 1;
  pending.route = 0;
  pending.request = 0;
  released = false;
  requested = false;
  introGraceArmed = false;
  cancelPendingHide?.();
  cancelPendingHide = undefined;
  [settleTimer, graceTimer, failsafeTimer, hideTimer, introGraceTimer].forEach((t) => window.clearTimeout(t));
  graceTimer = undefined;
  failsafeTimer = undefined;

  el.querySelectorAll('video, .splash-video-backdrop').forEach((v) => v.remove());
  el.classList.remove('splash--leaving', 'splash--finishing', 'splash--video', 'splash--has-video', 'splash--letterbox', 'splash--bars-y', 'splash--bars-x');
  el.style.removeProperty('display');
  setShowing(true);
  (window as unknown as { wtSplashStart?: () => void }).wtSplashStart?.(); // index.html
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
    // Only reads fill the first page. Writes at startup are background work (e.g. the push subscription, seconds
    // long) and must not hold the splash.
    if ((config.method ?? 'get').toLowerCase() === 'get') requestHolds.set(config, holdSplash('request'));
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
