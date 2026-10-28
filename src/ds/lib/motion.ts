import * as React from "react"

const QUERY = "(prefers-reduced-motion: reduce)"

/** Read at call time — for non-React code (celebrate) and effects that run once. */
export const prefersReducedMotion = () =>
  typeof window !== "undefined" && !!window.matchMedia?.(QUERY).matches

function subscribe(onChange: () => void) {
  const mq = window.matchMedia?.(QUERY)
  mq?.addEventListener?.("change", onChange)
  return () => mq?.removeEventListener?.("change", onChange)
}

/** Live: re-renders when the user changes the OS setting. Every v2 effect reads reduced motion through this module. */
export function useReducedMotion(): boolean {
  return React.useSyncExternalStore(subscribe, prefersReducedMotion, () => false)
}

/**
 * Resolves when every finite running animation (CSS and Motion's WAAPI) has finished. Tests and a11y
 * checks judge the end state, not a mid-fade frame; infinite loops (pulse, border beam) are skipped.
 */
export async function animationsSettled(root: Document = document) {
  const finite = root.getAnimations().filter((a) => a.effect?.getTiming().iterations !== Infinity)
  await Promise.all(finite.map((a) => a.finished.catch(() => undefined)))
}
