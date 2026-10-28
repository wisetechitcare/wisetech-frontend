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
