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
 * - **The logo is shown as itself** — the organisation's real logo at its own proportions (a stacked lockup stays
 *   a lockup, a square mark stays square), never cropped or boxed into a tile; Smart Avatar's initials if there is
 *   no logo or it fails to load.
 * - **The logo stays outside the form card** at every size (user decisions 2026-11-14): pinned to the page's
 *   top-left corner from `lg` (as the original sign-in; the page actions sit top-right), and at the top of the
 *   stacked brand row, centred, on tablets and phones — 64px tall there, 80px from `lg`, 96px from `xl`.
 * - **Centred text** at every size: the headline and tagline, and the card's title and description.
 * - **Brand panel:** the Typewriter headline and one supporting line. The headline is sized by its column (a
 *   container query), so its longest line stays on ONE line whenever the column can hold it at a readable size
 *   (≥ 22px; every phone from 360px); narrower than that it wraps, balanced.
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
            (absolute to the layout, clear of the page actions top-right). */}
        <div
          data-slot="auth-logo"
          className="flex h-16 max-w-full justify-center lg:absolute lg:top-8 lg:left-8 lg:z-10 lg:h-20 lg:max-w-72 lg:justify-start xl:top-10 xl:left-12 xl:h-24"
        >
          <BrandLogo name={brandName} src={logoSrc} />
        </div>
        {/* A size container: the headline's font follows the column, not the viewport. In px, not rem: the live
            app's root is still Metronic's 13px, which would shrink a rem cap (and the headline) by a fifth. */}
        <div className="@container w-full max-w-[672px]">
          {/* The typed text sits at the BOTTOM of the box reserved for the longest line, so a one-line phrase
              stays right above the tagline and the spare room falls into the gap above, by the logo.
              6.8cqi: the longest line is ~14.5em wide, so it fills ~99% of the column at most — one line. */}
          <p
            data-slot="auth-headline"
            className="font-heading text-[clamp(22px,6.8cqi,32px)] leading-[1.12] font-bold tracking-[-0.025em] text-balance text-foreground lg:text-[clamp(22px,6.8cqi,44px)] [&_[data-slot=typewriter-text]]:self-end"
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

/**
 * The organisation's logo at its own proportions, as tall as its slot (and never wider); Smart Avatar's initials
 * when there is no logo or it fails to load — never an empty or broken image.
 */
function BrandLogo({ name, src }: { name: string; src?: string | null }) {
  const [failed, setFailed] = React.useState(false)
  React.useEffect(() => setFailed(false), [src])
  if (!src || failed) return <SmartAvatar name={name} seed={name} shape="rounded" size="lg" className="self-center" />
  return (
    <img
      data-slot="auth-logo-image"
      src={src}
      alt={name}
      decoding="async"
      className="h-full w-auto max-w-full object-contain"
      onError={() => setFailed(true)}
    />
  )
}
