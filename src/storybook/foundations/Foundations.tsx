import type { ReactNode } from "react"

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

const TYPE: Array<[string, string, string]> = [
  ["text-3xl", "text-3xl font-semibold tracking-tight", "₹4,82,500 payroll this month"],
  ["text-2xl", "text-2xl font-semibold tracking-tight", "Employee onboarding"],
  ["text-base", "text-base font-medium", "Personal information"],
  ["text-sm", "text-sm", "Leave balances update in real time as requests are approved."],
  ["text-xs", "text-xs text-muted-foreground", "Required fields"],
]

export function ColourRoles() {
  return (
    <Section title="Colour roles" description="Components use roles, never raw colours. The brand role follows each tenant's Appearance setting.">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {ROLES.map(([n, v, f]) => (
          <Swatch key={v} name={n} varName={v} fg={f} />
        ))}
      </div>
    </Section>
  )
}

export function StatusColours() {
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

export function CategoryHues() {
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

export function TypeScale() {
  return (
    <Section title="Type scale" description="Inter (self-hosted) on shadcn's Tailwind scale. Body copy is text-sm; numbers use tabular figures so columns align.">
      <Card className="py-0">
        <div className="divide-y">
          {TYPE.map(([n, cls, sample]) => (
            <div key={n} className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-baseline sm:gap-6">
              <p className="w-24 shrink-0 text-xs text-muted-foreground">{n}</p>
              <p className={cls}>{sample}</p>
            </div>
          ))}
        </div>
      </Card>
    </Section>
  )
}

export function TypesetArticle() {
  return (
    <Section
      title="Reading typography"
      description="shadcn/typeset styles rendered markdown inside a typeset container; the content itself carries no classes. typeset-article is the long-form preset. Kit components (data-slot) and anything marked not-typeset keep their own styles."
    >
      <Card>
        <CardContent>
          <article className="typeset typeset-article max-w-prose">
            <h1>Leave carry-forward and encashment</h1>
            <p>
              Unused <strong>Annual</strong> leave moves into the next leave year, up to the carry-forward limit set on the leave
              type. Anything above that limit is <a href="#worked-example">encashed at year end</a>, never mid-year.
            </p>
            <h2>How the balance is worked out</h2>
            <ol>
              <li>Take the closing balance on <code>2026.12.31</code>.</li>
              <li>Carry forward up to the leave type's limit.</li>
              <li>
                Encash the excess:
                <ul>
                  <li>full days at the daily rate;</li>
                  <li>a half day counts as <code>0.5</code>.</li>
                </ul>
              </li>
            </ol>
            <blockquote>
              <p>Probation does not pause accrual. The balance keeps growing; it is only hidden from the employee until confirmation.</p>
            </blockquote>
            <h3 id="worked-example">Worked example</h3>
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th align="right">Closing</th>
                  <th align="right">Carried</th>
                  <th align="right">Encashed</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Asha Rao</td>
                  <td align="right">14.5</td>
                  <td align="right">10</td>
                  <td align="right">4.5</td>
                </tr>
                <tr>
                  <td>Vikram Shah</td>
                  <td align="right">6</td>
                  <td align="right">6</td>
                  <td align="right">0</td>
                </tr>
              </tbody>
            </table>
            <h4>Formula</h4>
            <pre>
              <code>{`carried  = min(closing, carryForwardLimit)
  encashed = closing - carried`}</code>
            </pre>
            <hr />
            <p>
              Open the command palette with <kbd>Ctrl</kbd> <kbd>K</kbd> and search <mark>leave policy</mark> to find this page.
            </p>
          </article>
        </CardContent>
      </Card>
    </Section>
  )
}

export function RadiusElevation() {
  return (
    <Section title="Radius & shadow" description="shadcn's radius scale from one --radius base; base-maia uses the large radii for pills and cards.">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        {["rounded-sm", "rounded-md", "rounded-lg", "rounded-xl", "rounded-2xl", "rounded-4xl"].map((r) => (
          <Card key={r} variant="panel" className={cn("h-20 items-center justify-center py-0 text-xs text-muted-foreground", r)}>
            {r.replace("rounded-", "")}
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {["shadow-xs", "shadow-md", "shadow-lg"].map((s) => (
          <Card key={s} variant="panel" className={cn("h-24 items-center justify-center rounded-xl py-0 text-xs text-muted-foreground ring-0", s)}>
            {s}
          </Card>
        ))}
      </div>
    </Section>
  )
}

export function SpacingDensity() {
  return (
    <Section title="Spacing & density" description="A 4-point scale. Compact density shrinks the whole scale — switch it in the toolbar.">
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3">
          {[1, 2, 3, 4, 6, 8, 10, 12, 16].map((n) => (
            <div key={n} className="flex flex-col items-center gap-1.5">
              <div className="rounded-sm bg-primary/80" style={{ width: `calc(var(--spacing) * ${n})`, height: `calc(var(--spacing) * ${n})` }} />
              <span className="font-mono text-xs text-muted-foreground">{n}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </Section>
  )
}

const EASES: Array<[string, string, string]> = [
  ["ease-enter", "Arriving, answering a tap", "easeOutCubic"],
  ["ease-exit", "Leaving (with a shorter duration)", "easeInCubic"],
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

/** All foundations on one page. */
export function Foundations() {
  return (
    <div className="space-y-12">
      <ColourRoles />
      <StatusColours />
      <CategoryHues />
      <TypeScale />
      <TypesetArticle />
      <RadiusElevation />
      <SpacingDensity />
      <Motion />
    </div>
  )
}
