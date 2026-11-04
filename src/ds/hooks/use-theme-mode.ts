import { useSyncExternalStore } from "react"

/**
 * Light/dark as the app actually renders it: the `.dark` class on <html>, which the
 * appearance engine owns. Components read this instead of keeping their own theme state.
 */
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
  return () => observer.disconnect()
}

const read = () => (document.documentElement.classList.contains("dark") ? "dark" : "light")

export function useThemeMode(): "light" | "dark" {
  return useSyncExternalStore(subscribe, read, () => "light")
}
