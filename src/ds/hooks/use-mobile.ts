import * as React from "react"

const MOBILE_BREAKPOINT = 768

/** The default phone query: narrower than 768px. */
export const MOBILE_QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

/**
 * Whether a media query matches, correct on the FIRST client render (no one-frame flash of the wrong
 * layout) and kept live. `query` defaults to the phone breakpoint; pass another for a different cut, e.g.
 * `"(max-width: 768px)"`. The server snapshot is `false`.
 */
export function useIsMobile(query: string = MOBILE_QUERY) {
  const subscribe = React.useCallback(
    (onChange: () => void) => {
      if (typeof window === "undefined" || !window.matchMedia) return () => undefined
      const mql = window.matchMedia(query)
      mql.addEventListener("change", onChange)
      return () => mql.removeEventListener("change", onChange)
    },
    [query],
  )
  const getSnapshot = React.useCallback(
    () => (typeof window !== "undefined" && !!window.matchMedia ? window.matchMedia(query).matches : false),
    [query],
  )
  return React.useSyncExternalStore(subscribe, getSnapshot, () => false)
}
