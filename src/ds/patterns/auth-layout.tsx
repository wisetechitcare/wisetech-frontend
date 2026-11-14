import * as React from "react"
import { cn } from "cn"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/ds/ui/card"
import { SmartAvatar } from "@/ds/ui/smart-avatar"
import { Typewriter, type TypewriterLine } from "@/ds/effects/typewriter"
import { LiquidSwirl } from "@/ds/effects/liquid-swirl"
import { GradientText } from "@/ds/effects/gradient-text"
import { titleCaseChildren } from "@/ds/lib/text"

/**
 * The sign-in pages' frame (Sign In, Forgot / Reset Password, Account Inactive): a brand panel and the form
 * Card, side by side from `lg`, stacked above it on tablets and phones.
 *
 * - **One continuous page**, as the original sign-in: no divider and no separate panel colour between the
 *   columns — the form Card (lifted) floats beside the brand content, over the Liquid Swirl background, which
 *   settles with the headline (or as soon as the form is focused) and is still under reduced motion.
 * - **The logo is the organisation's real logo** in the kit's company-logo tile (Smart Avatar's Logo recipe — a
 *   rounded plate, the whole image inset, never cropped; the initials stay if it fails to load).
 * - **The logo stays outside the form card** at every size (user decisions 2026-11-14): pinned to the page's
 *   top-left corner from `lg` (as the original sign-in; the page actions sit top-right), and at the top of the
 *   stacked brand row, centred, on tablets and phones — 56px there, 84px from `lg`.
 * - **Centred text** at every size: the headline and tagline, and the card's title and description.
 * - **Brand panel:** the Typewriter headline and one supporting line.
 * - **The headline settles the moment anything in the form takes focus** — it jumps to its landing line and
 *   stops, so it never competes with typing a password (WCAG 2.2.2). Every auth screen gets this from here.
 *   Don't autofocus a field on load, or the headline settles before anyone sees it.
 * - **One page heading:** the Card's `title` is the page's `h1` (a structural heading, UPPERCASE) in Gradient Text —
 *   the brand gradient in readable ink, two shimmer passes, then still (none under reduced motion). The headline
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
        className="flex flex-col items-center gap-6 px-4 pt-10 pb-6 text-center sm:px-8 lg:justify-center lg:p-16"
      >
        {/* The logo: top-centre of the stacked brand row below lg; pinned to the page's top-left corner from lg
            (absolute to the layout). Two sizes for two layouts — SmartAvatar's size is a prop, not a class; the
            hidden one is display:none, so assistive tech meets the logo once. */}
        <span data-slot="auth-logo" className="lg:hidden">
          <SmartAvatar name={brandName} src={logoSrc} seed={brandName} shape="rounded" fit="contain" size="lg" />
        </span>
        <span data-slot="auth-logo" className="absolute top-8 left-8 z-10 max-lg:hidden xl:top-10 xl:left-12">
          <SmartAvatar name={brandName} src={logoSrc} seed={brandName} shape="rounded" fit="contain" size="xl" />
        </span>
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
          {/* Centred title and description, as the brand panel beside it. */}
          <CardHeader className="justify-items-center text-center">
            <CardTitle>
              <h1 data-slot="auth-title" className="heading-case">
                <GradientText tone="brand" ink="text">{titleCaseChildren(title)}</GradientText>
              </h1>
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
