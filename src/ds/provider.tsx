import * as React from "react"
import { I18nProvider } from "react-aria-components"
import { TooltipProvider } from "@/ds/ui/tooltip"

/**
 * Everything the v2 kit needs above it, mounted once: Storybook's preview and the app root both use
 * this, so a component never works in one and not the other. `locale` drives React Aria's date, time
 * and number formatting (en-IN: day-first dates, 1,00,000 grouping). No toaster here — the app has its own.
 */
export function KitProvider({ locale = "en-IN", children }: { locale?: string; children: React.ReactNode }) {
  return (
    <I18nProvider locale={locale}>
      <TooltipProvider delay={150}>{children}</TooltipProvider>
    </I18nProvider>
  )
}
