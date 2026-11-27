import { useLayoutEffect, useRef, useState, type ReactNode } from "react"

import { SectionHeader } from "@/ds/patterns/section-header"
import { Card, CardContent } from "@/ds/ui/card"

import { titleCase } from "@/ds/lib/text"
import { HUE_TONES, type HueTone } from "@/ds/lib/tone"
import { cn } from "@/ds/lib/utils"

interface SectionProps {
  title: string
  description?: string
  children: ReactNode
}

interface SwatchProps {
  name: string
  varName: string
  fg?: string
}

interface RadiusTileProps {
  utility: string
}

function Section({ title, description, children }: SectionProps) {
  return (
    <section className="space-y-4">
      <SectionHeader title={title} description={description} />
      {children}
    </section>
  )
}

function Swatch({ name, varName, fg }: SwatchProps) {
  return (
    <Card size="sm" className="gap-0 py-0">
      <div className="flex h-16 items-end p-2" style={{ background: `var(${varName})`, color: fg ? `var(${fg})` : undefined }}>
        {fg && <span className="text-xs font-semibold">Aa</span>}
      </div>
      <CardContent className="py-2">
        <p className="text-xs font-medium">{name}</p>
        <p className="font-mono text-xs text-muted-foreground">{varName}</p>
      </CardContent>
    </Card>
  )
}

const ROLES: Array<[string, string, string?]> = [
  ["Brand / Primary", "--primary", "--primary-foreground"],
  ["Background", "--background", "--foreground"],
  ["Card", "--card", "--card-foreground"],
  ["Muted", "--muted", "--muted-foreground"],
  ["Accent (brand tint)", "--accent", "--accent-foreground"],
  ["Secondary", "--secondary", "--secondary-foreground"],
  ["Border", "--border"],
  ["Focus ring", "--ring"],
]

const STATUS: Array<[string, string, string, string]> = [
  ["Success", "--success", "--success-soft", "--success-foreground"],
  ["Warning", "--warning", "--warning-soft", "--warning-foreground"],
  ["Danger", "--destructive", "--destructive-soft", "--destructive-foreground"],
  ["Info", "--info", "--info-soft", "--info-foreground"],
]

const TYPE: Array<[string, string]> = [
  ["text-3xl font-semibold tracking-tight tabular-nums", "₹4,82,500 payroll this month"],
  ["text-2xl font-semibold tracking-tight", "Employee onboarding"],
  ["text-base font-medium", "Personal information"],
  ["text-sm", "Leave balances update in real time as requests are approved."],
  ["text-xs text-muted-foreground", "Required fields"],
]

const RADII = ["rounded-sm", "rounded-md", "rounded-lg", "rounded-xl", "rounded-2xl", "rounded-3xl", "rounded-4xl"]

function ColourRoles() {
  return (
    <Section
      title="Colour roles"
      description="Components use roles, never raw colours. The brand role follows each tenant's Appearance setting — switch Brand and Theme in the toolbar to see tenant brands and dark mode."
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {ROLES.map(([n, v, f]) => (
          <Swatch key={v} name={n} varName={v} fg={f} />
        ))}
      </div>
    </Section>
  )
}

function StatusColours() {
  return (
    <Section title="Status" description="One meaning per colour. Each has a solid, a soft fill and readable text — in both themes.">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {STATUS.map(([n, solid, soft, fg]) => (
          <Card key={n} size="sm">
            <CardContent>
              <div className="flex items-center gap-2">
                <span className="size-3 rounded-full" style={{ background: `var(${solid})` }} />
                <p className="text-sm font-medium">{n}</p>
              </div>
              <div className="mt-3 rounded-lg px-3 py-2 text-xs font-medium" style={{ background: `var(${soft})`, color: `var(${fg})` }}>
                {n} message on its soft fill
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </Section>
  )
}

const HUE_EXAMPLES: Record<HueTone, string> = {
  blue: "Annual leave",
  green: "Engineering",
  amber: "Comp-off",
  rose: "Sick leave",
  purple: "Recruitment",
  indigo: "Training",
  cyan: "Work from home",
  slate: "Unpaid leave",
}

function CategoryHues() {
  return (
    <Section
      title="Category hues"
      description="Identity, not meaning: tell leave types, departments and modules apart. A hue never signals good or bad — that is what Status is for."
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        {HUE_TONES.map((hue) => (
          <Card key={hue} size="sm" tone={hue}>
            <CardContent>
              <div className="flex items-center gap-2">
                <span className="size-3 rounded-full" style={{ background: `var(--tone-${hue})` }} />
                <p className="text-sm font-medium">{titleCase(hue)}</p>
              </div>
              <div
                className="mt-3 rounded-lg px-3 py-2 text-xs font-medium"
                style={{ background: `var(--tone-${hue}-soft)`, color: `var(--tone-${hue}-foreground)` }}
              >
                {HUE_EXAMPLES[hue]}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </Section>
  )
}

/** Colour roles, status and category hues: every colour a component may use. */
export function Colours() {
  return (
    <div className="space-y-12">
      <ColourRoles />
      <StatusColours />
      <CategoryHues />
    </div>
  )
}

export function TypeScale() {
  return (
    <Section
      title="Type scale"
      description="Inter (self-hosted) on Tailwind's built-in type scale — no custom typography tokens. Body copy is text-sm; numbers use tabular-nums so columns align."
    >
      <Card className="py-0">
        <div className="divide-y">
          {TYPE.map(([cls, sample]) => (
            <div key={cls} className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-baseline sm:gap-6">
              <code className="shrink-0 font-mono text-xs text-muted-foreground sm:w-72">{cls}</code>
              <p className={cls}>{sample}</p>
            </div>
          ))}
        </div>
      </Card>
    </Section>
  )
}

/** Reads the radius the browser actually computed, so the label always matches tokens.css. */
function RadiusTile({ utility }: RadiusTileProps) {
  const tile = useRef<HTMLDivElement>(null)
  const [radius, setRadius] = useState<string>("")
  useLayoutEffect(() => {
    if (tile.current) setRadius(getComputedStyle(tile.current).borderTopLeftRadius)
  }, [])
  return (
    <Card ref={tile} variant="panel" className={cn("h-20 items-center justify-center gap-0.5 py-0 text-xs", utility)}>
      <code className="font-mono">{utility.replace("rounded-", "")}</code>
      <span className="text-muted-foreground">{radius}</span>
    </Card>
  )
}

export function RadiusShadow() {
  return (
    <Section
      title="Radius & shadow"
      description="Tailwind's rounded-* utilities, sized from one --radius base (shadcn's scale), so the px differ from Tailwind's defaults. Shadows are Tailwind's built-in shadow-* utilities — there is no custom elevation scale; Button's own depth stays inside Button."
    >
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
        {RADII.map((r) => (
          <RadiusTile key={r} utility={r} />
        ))}
      </div>
    </Section>
  )
}

const EASES: Array<[string, string, string]> = [
  ["ease-enter", "Arriving, answering a tap", "easeOutCubic"],
  ["ease-move", "Between two places on screen", "easeInOutCubic"],
  ["ease-spring", "Buttons: quick, slightly springy", "WtButton recipe"],
]
const DURATIONS: Array<[string, string]> = [
  ["--duration-control", "160ms · toggles, chips, hovers"],
  ["--duration-panel", "300ms · popovers, drawers, dialogs, cards"],
  ["--duration-screen", "450ms · full-screen changes"],
]

export function Motion() {
  return (
    <Section
      title="Motion"
      description="The curve follows the direction of travel; the duration follows the size of what moves. Hover a row to run it. Reduced motion skips the travel."
    >
      <Card>
        <CardContent className="space-y-2">
          {EASES.map(([name, use, curve]) => (
            <div key={name} className="group/ease flex items-center gap-4">
              <code className="w-36 shrink-0 font-mono text-xs">{name}</code>
              <span className="hidden w-56 shrink-0 text-xs text-muted-foreground sm:block">
                {use} ({curve})
              </span>
              <div className="relative h-6 min-w-0 flex-1 rounded-full bg-muted">
                <span aria-hidden className="absolute inset-y-1 right-5 left-1">
                  <span
                    className={cn(
                      "absolute top-0 left-0 size-4 rounded-full bg-primary transition-all duration-(--duration-screen) motion-reduce:transition-none group-hover/ease:left-full",
                      name,
                    )}
                  />
                </span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {DURATIONS.map(([token, use]) => (
          <Card key={token} size="sm">
            <CardContent>
              <code className="font-mono text-xs">{token}</code>
              <p className="mt-1 text-xs text-muted-foreground">{use}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </Section>
  )
}
