import * as React from "react"

/**
 * Live CSS media query: re-renders when it starts or stops matching (window resize, rotation, zoom). For
 * behaviour CSS can't express — e.g. not even DOWNLOADING a large asset below a breakpoint, which `hidden`
 * alone doesn't prevent. Layout itself stays in Tailwind breakpoints. False on the server.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = React.useCallback(
    (onChange: () => void) => {
      const mq = window.matchMedia?.(query)
      mq?.addEventListener?.("change", onChange)
      return () => mq?.removeEventListener?.("change", onChange)
    },
    [query],
  )
  const read = React.useCallback(() => typeof window !== "undefined" && !!window.matchMedia?.(query).matches, [query])
  return React.useSyncExternalStore(subscribe, read, () => false)
}
