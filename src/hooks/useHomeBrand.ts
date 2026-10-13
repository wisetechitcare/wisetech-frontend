import { useEffect } from 'react';
import { useHomeRootOrg } from './useRootOrgNames';

const DEFAULT_TITLE = 'Wisetech MEP Consultants Pvt Ltd';

/**
 * Sync the browser tab title (and favicon when a logo exists) to the logged-in
 * user's home org — the same root that drives the sidebar brand logo.
 *
 * Static `index.html` still ships the WiseTech defaults for the auth splash /
 * first paint; this takes over once the session home root resolves.
 */
export function useHomeBrand(): void {
  const { name, logo } = useHomeRootOrg();

  useEffect(() => {
    const previousTitle = document.title;
    document.title = name.trim() || DEFAULT_TITLE;
    return () => {
      document.title = previousTitle;
    };
  }, [name]);

  useEffect(() => {
    if (!logo) return;

    const selector = 'link[rel="shortcut icon"], link[rel="icon"]';
    const existing = document.querySelectorAll<HTMLLinkElement>(selector);
    const previous: Array<{ el: HTMLLinkElement; href: string }> = [];
    for (const el of Array.from(existing)) {
      previous.push({ el, href: el.href });
      el.href = logo;
    }

    // Ensure at least one icon link exists when the page only had a relative
    // shortcut that some browsers ignore after a dynamic swap.
    let created: HTMLLinkElement | null = null;
    if (existing.length === 0) {
      created = document.createElement('link');
      created.rel = 'icon';
      created.href = logo;
      document.head.appendChild(created);
    }

    return () => {
      for (const { el, href } of previous) {
        el.href = href;
      }
      if (created) created.remove();
    };
  }, [logo]);
}
