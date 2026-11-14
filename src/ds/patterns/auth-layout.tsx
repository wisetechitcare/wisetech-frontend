import * as React from "react"
import { cn } from "cn"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/ds/ui/card"
import { SmartAvatar } from "@/ds/ui/smart-avatar"
import { Typewriter, type TypewriterLine } from "@/ds/effects/typewriter"
import { LiquidSwirl } from "@/ds/effects/liquid-swirl"
import { titleCaseChildren } from "@/ds/lib/text"

/** The organisation's logo, whole and at its own proportions; initials beside the name if there is none or it fails. */
function BrandMark({ brandName, logoSrc, className }: { brandName: string; logoSrc?: string | null; className?: string }) {
  const [failed, setFailed] = React.useState(false)
  React.useEffect(() => setFailed(false), [logoSrc])
  if (!logoSrc || failed) {
    return (
      <span data-slot="auth-brand-mark" className={cn("inline-flex items-center gap-3", className)}>
        <SmartAvatar name={brandName} seed={brandName} shape="rounded" size="default" decorative />
        <span className="font-heading text-lg font-semibold text-foreground">{brandName}</span>
      </span>
    )
  }
  return (
    <img
      data-slot="auth-brand-mark"
      src={logoSrc}
      alt={brandName}
      onError={() => setFailed(true)}
      className={cn("h-10 w-auto max-w-60 object-contain dark:rounded-lg dark:bg-foreground dark:px-3 dark:py-1.5", className)}
    />
  )
}

/**
 * The sign-in pages' frame (Sign In, Forgot / Reset Password, Account Inactive): a brand panel and the form
 * Card, side by side from `lg`, stacked above it on tablets and phones.
 *
 * - **One continuous page**, as the original sign-in: no divider and no separate panel colour between the
 *   columns — the form Card (lifted) floats beside the brand content, over the Liquid Swirl background, which
 *   settles with the headline (or as soon as the form is focused) and is still under reduced motion.
 * - **The logo is the organisation's real logo**, whole, at its own proportions (a wordmark stays a wordmark), on
 *   a light plate in dark mode so any logo stays legible. Only if there is none, or it fails to load, does it
 *   fall back to Smart Avatar initials beside the name.
 * - **Phones:** the logo heads the form card, centred with the title and description; the stacked brand row keeps
 *   the headline.
 * - **Brand panel:** the logo, the Typewriter headline and one supporting line.
 * - **The headline settles the moment anything in the form takes focus** — it jumps to its landing line and
 *   stops, so it never competes with typing a password (WCAG 2.2.2). Every auth screen gets this from here.
 *   Don't autofocus a field on load, or the headline settles before anyone sees it.
 * - **One page heading:** the Card's `title` is the page's `h1` (a structural heading, UPPERCASE). The headline
 *   is a brand moment, not a heading; assistive tech reads only its landing line.
 * - The form Card is a still `panel` (no glow, no hover motion), `max-w-md`.
 */
export function AuthLayout({
  brandName,
  logoSrc,
  headline,
  tagline,
  title,
  description,
  children,
  footer,
  actions,
  className,
}: {
  /** The organisation's name — the logo's accessible name, and its initials when there is no logo. */
  brandName: string
  logoSrc?: string | null
  /** Typewriter lines; the last is where it lands. */
  headline: readonly TypewriterLine[]
  /** One supporting line under the headline. */
  tagline?: React.ReactNode
  /** The form's title — the page's `h1`. */
  title: React.ReactNode
  description?: React.ReactNode
  /** The form. */
  children: React.ReactNode
  /** Under the form, inside the card (e.g. "Back to sign in"). */
  footer?: React.ReactNode
  /** Page actions in the top-right corner (e.g. the Theme Toggle). */
  actions?: React.ReactNode
  className?: string
}) {
  /** A form field took focus: the headline jumps to its landing line and the background settles. */
  const [settled, setSettled] = React.useState(false)
  /** The headline has landed: the background eases to a stop with it (WCAG 2.2.2 — motion ends, ~5s). */
  const [landed, setLanded] = React.useState(false)
  const onLanded = React.useCallback(() => setLanded(true), [])

  return (
    // Stacked (below lg) the brand row is as tall as its content and the form takes the rest — otherwise the
    // min-height is split between the rows and a gap opens between the tagline and the form.
    <div data-slot="auth-layout" className={cn("relative isolate grid min-h-svh grid-rows-[auto_1fr] bg-background lg:grid-cols-2 lg:grid-rows-1", className)}>
      {/* The background: Liquid Swirl — marbled brand swirls under a 90% veil of the page colour, as the reference
          (uiable Housiq sign-in). Moves while the headline types; settles when it lands or the form is focused;
          still under reduced motion. Decorative — never focusable or clickable. */}
      <div data-slot="auth-background" aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <LiquidSwirl settled={settled || landed} />
        <div className="absolute inset-0 bg-background/90" />
      </div>
      <section
        data-slot="auth-brand"
        aria-label={brandName}
        className="flex flex-col items-center gap-6 px-4 pt-10 pb-6 text-center sm:px-8 lg:items-start lg:justify-center lg:gap-10 lg:p-16 lg:text-left"
      >
        {/* On phones the logo moves into the form card (below), so it is shown once. */}
        <BrandMark brandName={brandName} logoSrc={logoSrc} className="h-12 max-lg:hidden" />
        <div className="max-w-xl">
          {/* The typed text sits at the BOTTOM of the box reserved for the longest line, so a one-line phrase
              stays right above the tagline and the spare room falls into the gap above, by the logo. */}
          <p
            data-slot="auth-headline"
            className="font-heading text-[clamp(22px,7vw,30px)] leading-[1.12] font-bold tracking-[-0.025em] text-foreground lg:text-[clamp(30px,3.2vw,44px)] [&_[data-slot=typewriter-text]]:self-end"
          >
            <Typewriter lines={headline} settled={settled} onLanded={onLanded} />
          </p>
          {tagline && <p data-slot="auth-tagline" className="mt-4 text-base text-muted-foreground">{tagline}</p>}
        </div>
      </section>

      <main
        data-slot="auth-main"
        className="flex items-start justify-center px-4 pb-10 sm:px-8 lg:items-center lg:p-16"
        onFocusCapture={() => setSettled(true)}
      >
        {/* `panel`: a still form surface — no corner glow, no hover lift or accent underline (user decision
            2026-11-14; a sign-in form is a place to type, not a tile to hover). Lifted (shadow-lg, the top of the
            Foundations elevation scale) so it floats clearly over the moving background. */}
        <Card variant="panel" className="w-full max-w-md shadow-lg">
          {/* Phones: the organisation's logo heads the form, centred with the title (the brand row above keeps the
              headline). */}
          <CardHeader className="max-lg:justify-items-center max-lg:text-center">
            <div data-slot="auth-card-brand" className="mb-3 flex justify-center lg:hidden">
              <BrandMark brandName={brandName} logoSrc={logoSrc} />
            </div>
            <CardTitle>
              <h1 data-slot="auth-title" className="heading-case">{titleCaseChildren(title)}</h1>
            </CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </CardHeader>
          <CardContent>{children}</CardContent>
          {footer && <CardFooter>{footer}</CardFooter>}
        </Card>
      </main>
      {/* Last in the DOM, so Tab reaches the form first; still pinned top-right on screen. */}
      {actions && <div data-slot="auth-actions" className="absolute top-4 right-4 z-10 flex items-center gap-2">{actions}</div>}
    </div>
  )
}
