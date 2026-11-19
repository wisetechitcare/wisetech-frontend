import * as React from "react"

/**
 * The floating label's NOTCH — a real gap in the control's border where the floated label sits, so the label
 * needs no background (it used to be painted with the surface colour, which showed as a patch wherever the
 * surface behind it was not exactly that colour, and is not what the design asks for).
 *
 * CSS can cut the gap (styles/components.css, "The notch") but cannot know how wide the label is. This publishes
 * the label's layout width as `--label-w` on its `.field-floating` field; the CSS scales it by the floated label's
 * own scale, so the two are one source and cannot drift. A ResizeObserver keeps it right when the text, the
 * font or the floated weight changes.
 *
 * Returns a callback ref (React 19 cleanup form) that also forwards to the caller's ref.
 */
export function useFloatingNotchRef<T extends HTMLElement>(forwarded?: React.Ref<T>) {
  return React.useCallback(
    (el: T | null) => {
      assignRef(forwarded, el)
      if (!el) return
      const field = el.parentElement
      if (!field?.classList.contains("field-floating") || typeof ResizeObserver === "undefined") {
        return () => assignRef(forwarded, null)
      }
      const publish = () => field.style.setProperty("--label-w", `${el.offsetWidth}px`)
      publish()
      const observer = new ResizeObserver(publish)
      observer.observe(el)
      return () => {
        observer.disconnect()
        field.style.removeProperty("--label-w")
        assignRef(forwarded, null)
      }
    },
    [forwarded],
  )
}

function assignRef<T>(ref: React.Ref<T> | undefined, value: T | null) {
  if (typeof ref === "function") ref(value)
  else if (ref) (ref as React.RefObject<T | null>).current = value
}
