/**
 * The splash screen's branding — the logged-in user's own organization: its logo, and its splash videos when it has
 * uploaded them (Organization Profile → Splash Screen), instead of a hardcoded WiseTech logo.
 *
 * The splash is drawn by index.html before the app (or the server) is up, so it cannot ask whose organization this
 * is. Instead the app REMEMBERS the home organization's branding once it is known (useHomeBrand) and the splash reads
 * it on the next load. It is kept across logout, and the login screen re-syncs it to the company's public branding
 * (/api/company/logo), so the login screen's splash is the organization's too. On a device that has never opened the
 * app the very first splash is the built-in default — nothing is known yet.
 *
 * The keys are repeated in index.html's inline script — keep the two in sync.
 */
export const SPLASH_LOGO_KEY = "wt-splash-logo";
export const SPLASH_VIDEO_DESKTOP_KEY = "wt-splash-video-desktop";

/**
 * Only a plain http(s) URL is ever stored or read back: it ends up in an <img>/<video> src, and main.tsx's offline
 * screens write it into an HTML string — so no whitespace, quotes or angle brackets, which could close the attribute.
 */
const isMediaUrl = (value: string | null | undefined): value is string =>
  !!value && /^https?:\/\/[^\s"'<>]+$/i.test(value);

const write = (key: string, value: string | null | undefined) => {
  try {
    if (isMediaUrl(value)) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {
    // Private mode / blocked storage: the splash simply keeps its default.
  }
};

export const rememberSplashLogo = (url: string | null | undefined) => {
  // A missing logo is "not loaded yet" as often as "none": keep the last known one rather than flash the default.
  if (isMediaUrl(url)) write(SPLASH_LOGO_KEY, url);
};

/**
 * The organization's splash video. Unlike the logo, null here is a real answer (the organization has none, or removed
 * it), so it is forgotten — the splash must not keep playing a video the organization took down.
 */
export const rememberSplashVideo = (url: string | null) => {
  write(SPLASH_VIDEO_DESKTOP_KEY, url);
  // ponytail: clears the retired phone-video key left in browsers; drop after a release or two.
  write("wt-splash-video-mobile", null);
};

export const storedSplashLogo = (): string | null => {
  try {
    const value = localStorage.getItem(SPLASH_LOGO_KEY);
    return isMediaUrl(value) ? value : null;
  } catch {
    return null;
  }
};

/** For the offline screens drawn as HTML strings: the remembered logo, else the built-in icon. */
export const splashLogoSrc = (fallback: string): string => storedSplashLogo() ?? fallback;
