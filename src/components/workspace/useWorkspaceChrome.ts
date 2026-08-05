import { useLayoutEffect } from 'react';

/**
 * Hides the legacy Metronic rail for as long as the workspace shell is mounted.
 *
 * ─── WHY AN ATTRIBUTE AND NOT A PROP ─────────────────────────────────────────
 * The rail, the header brand cell and the content offset are all driven by one CSS variable
 * (`--wt-aside-eff`) in premium-layout.css, and they live in MasterLayout — above this shell
 * and outside its provider. A body attribute is the only seam that reaches them without
 * either lifting shell state into vendored Metronic scaffolding or duplicating the layout
 * rules. The matching CSS block is at the very end of premium-layout.css.
 *
 * ─── WHY A NEW ATTRIBUTE AND NOT `data-nav-transform` ────────────────────────
 * NavTransformContext already owns `data-nav-transform` and rewrites it from its own layout
 * effect. Two writers on one attribute is a race whose loser is whichever effect happens to
 * re-run last. A separate `data-workspace-shell` cannot conflict: both may apply at once,
 * and the CSS block is ordered so the workspace wins the `--wt-aside-eff` tie.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * SCOPE: mount-scoped, never persisted. The attribute is set when the shell mounts and
 * removed when it unmounts, so the legacy sidebar is untouched on all ~65 routes outside
 * /workspace/*. Nothing is written to localStorage and no user preference changes.
 *
 * `useLayoutEffect`, not `useEffect`: it runs before paint, so entering the shell never
 * shows a frame of the 265px rail before removing it.
 */
export function useWorkspaceChrome(enabled: boolean): void {
  useLayoutEffect(() => {
    if (!enabled) {
      // Classic sidebar mode: leave the rail entirely alone. Removing the attribute rather
      // than never setting it matters because the two modes are switchable at runtime —
      // toggling back must hand the sidebar its width back in the same frame.
      document.body.removeAttribute('data-workspace-shell');
      return;
    }
    document.body.setAttribute('data-workspace-shell', 'true');
    return () => { document.body.removeAttribute('data-workspace-shell'); };
  }, [enabled]);
}
