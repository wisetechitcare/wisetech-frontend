import * as React from "react"
import { MotionConfig } from "motion/react"
import { I18nProvider } from "react-aria-components"
import { TooltipProvider } from "@/ds/ui/tooltip"

/**
 * Animate UI's sliding highlights (filter rails, tabs, toggle groups) COPY the selected item's background
 * once and paint it on their own element. They re-read it when a class changes inside their root — but a
 * theme switch changes classes on <html>, outside every root, so after light → dark the highlight kept the
 * light colour: a white blob with unreadable text. On a theme change, touch each highlight root's class
 * list (add + remove: the observer still sees both) so every one re-samples. No remount, no lost state.
 */
function useHighlightThemeSync() {
  React.useEffect(() => {
    if (typeof MutationObserver === "undefined") return
    const resample = () =>
      requestAnimationFrame(() => {
        document.querySelectorAll<HTMLElement>("[data-animate-ui-surfaces]").forEach((root) => {
          root.classList.add("wt-theme-resample")
          root.classList.remove("wt-theme-resample")
        })
      })
    const observer = new MutationObserver(resample)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-bs-theme", "data-theme", "style"] })
    return () => observer.disconnect()
  }, [])
}

/**
 * Everything the v2 kit needs above it, mounted once: Storybook's preview and the app root both use
 * this, so a component never works in one and not the other. `locale` drives React Aria's date, time
 * and number formatting (en-IN: day-first dates, 1,00,000 grouping). MotionConfig makes every Animate UI
 * (Motion) component honour the OS reduced-motion setting, which Motion ignores by default.
 * No toaster here — the app has its own.
 */
export function KitProvider({ locale = "en-IN", children }: { locale?: string; children: React.ReactNode }) {
  useHighlightThemeSync()
  return (
    <MotionConfig reducedMotion="user">
      <I18nProvider locale={locale}>
        <TooltipProvider delay={150}>{children}</TooltipProvider>
      </I18nProvider>
    </MotionConfig>
  )
}
