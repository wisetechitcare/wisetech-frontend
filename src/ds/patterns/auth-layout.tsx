import * as React from "react"
import { cn } from "cn"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/ds/ui/card"
import { SmartAvatar } from "@/ds/ui/smart-avatar"
import { Typewriter, type TypewriterLine } from "@/ds/effects/typewriter"
import { titleCaseChildren } from "@/ds/lib/text"

/**
 * The sign-in pages' frame (Sign In, Forgot / Reset Password, Account Inactive): a brand panel and the form
 * Card, side by side from `lg`, stacked above it on tablets and phones.
 *
 * - **Brand panel:** the tenant's logo (Smart Avatar's Logo recipe — whole image, never cropped; the initials
 *   stay if the logo fails to load), the Typewriter headline and one supporting line.
 * - **The headline settles the moment anything in the form takes focus** — it jumps to its landing line and
 *   stops, so it never competes with typing a password (WCAG 2.2.2). Every auth screen gets this from here.
 *   Don't autofocus a field on load, or the headline settles before anyone sees it.
 * - **One page heading:** the Card's `title` is the page's `h1` (a structural heading, UPPERCASE). The headline
 *   is a brand moment, not a heading; assistive tech reads only its landing line.
 * - The form Card is the kit's default tile, `max-w-md`.
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
  className?: string
}) {
  const [settled, setSettled] = React.useState(false)

  return (
    // Stacked (below lg) the brand row is as tall as its content and the form takes the rest — otherwise the
    // min-height is split between the rows and a gap opens between the tagline and the form.
    <div data-slot="auth-layout" className={cn("grid min-h-svh grid-rows-[auto_1fr] bg-background lg:grid-cols-2 lg:grid-rows-1", className)}>
      <section
        data-slot="auth-brand"
        aria-label={brandName}
        className="flex flex-col items-center gap-6 px-4 pt-10 pb-6 text-center sm:px-8 lg:items-start lg:justify-center lg:gap-10 lg:border-r lg:border-border lg:bg-muted/40 lg:p-16 lg:text-left"
      >
        <SmartAvatar name={brandName} src={logoSrc} seed={brandName} shape="rounded" fit="contain" size="xl" />
        <div className="max-w-xl">
          {/* The typed text sits at the BOTTOM of the box reserved for the longest line, so a one-line phrase
              stays right above the tagline and the spare room falls into the gap above, by the logo. */}
          <p
            data-slot="auth-headline"
            className="font-heading text-[clamp(22px,7vw,30px)] leading-[1.12] font-bold tracking-[-0.025em] text-foreground lg:text-[clamp(30px,3.2vw,44px)] [&_[data-slot=typewriter-text]]:self-end"
          >
            <Typewriter lines={headline} settled={settled} />
          </p>
          {tagline && <p data-slot="auth-tagline" className="mt-4 text-base text-muted-foreground">{tagline}</p>}
        </div>
      </section>

      <main
        data-slot="auth-main"
        className="flex items-start justify-center px-4 pb-10 sm:px-8 lg:items-center lg:p-16"
        onFocusCapture={() => setSettled(true)}
      >
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>
              <h1 data-slot="auth-title" className="heading-case">{titleCaseChildren(title)}</h1>
            </CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </CardHeader>
          <CardContent>{children}</CardContent>
          {footer && <CardFooter>{footer}</CardFooter>}
        </Card>
      </main>
    </div>
  )
}
