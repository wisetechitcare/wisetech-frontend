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

/**
 * Marks an animated surface `data-settled` once its entrance has finished, so CSS can drop the entrance's
 * resting transform and filter (styles/globals.css, `[data-settled]`).
 *
 * Why: Animate UI's surfaces rest at `perspective(500px) rotateX(0deg) scale(1)` with `filter: blur(0px)`.
 * Identity values, but ANY 3D transform or filter keeps the element on its own GPU layer, drawn as a
 * texture — text loses its crisp (sub-pixel) rendering and the whole dialog looks soft. Dropping both at rest
 * gives normal text rendering; the exit animation is untouched because the flag goes the moment the surface
 * stops being open.
 *
 * Library-agnostic on purpose: "settled" is "the inline transform, filter and opacity stopped changing at
 * full opacity", not a match on Animate UI's token strings, so a library update cannot silently undo it.
 */
/** Takes the ELEMENT (from a callback ref), not a ref object: a portalled popup mounts after its owner. */
export function useSettledWhenOpen(el: HTMLElement | null, openAttr = "data-open") {
  React.useEffect(() => {
    if (!el) return
    let frame = 0
    let last = ""
    let stable = 0
    const read = () => `${el.style.transform}|${el.style.filter}|${el.style.opacity}`
    const tick = () => {
      if (!el.hasAttribute(openAttr)) return
      const now = read()
      const opaque = el.style.opacity === "" || el.style.opacity === "1"
      stable = now === last && opaque ? stable + 1 : 0
      last = now
      // Two unchanged frames at full opacity = the entrance is done.
      if (stable >= 2) el.setAttribute("data-settled", "")
      else frame = requestAnimationFrame(tick)
    }
    const sync = () => {
      cancelAnimationFrame(frame)
      if (el.hasAttribute(openAttr)) {
        stable = 0
        last = ""
        frame = requestAnimationFrame(tick)
      } else {
        el.removeAttribute("data-settled")
      }
    }
    const observer = new MutationObserver(sync)
    observer.observe(el, { attributes: true, attributeFilter: [openAttr] })
    sync()
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [el, openAttr])
}

/** `useSettledWhenOpen` as a callback ref — put it on an overlay's Popup: `<Popup ref={useSettledRef()} />`. */
export function useSettledRef<T extends HTMLElement = HTMLDivElement>(openAttr = "data-open") {
  const [el, setEl] = React.useState<T | null>(null)
  useSettledWhenOpen(el, openAttr)
  return setEl
}
