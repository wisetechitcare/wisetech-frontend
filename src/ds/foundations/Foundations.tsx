import type { ReactNode } from "react"

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">{title}</h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  )
}

function Swatch({ name, varName, fg }: { name: string; varName: string; fg?: string }) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
      <div className="flex h-16 items-end p-2" style={{ background: `var(${varName})`, color: fg ? `var(${fg})` : undefined }}>
        {fg && <span className="text-xs font-semibold">Aa</span>}
      </div>
      <div className="px-3 py-2">
        <p className="text-xs font-medium">{name}</p>
        <p className="font-mono text-[11px] text-muted-foreground">{varName}</p>
      </div>
    </div>
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
          <div key={n} className="rounded-xl border bg-card p-3 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="size-3 rounded-full" style={{ background: `var(${solid})` }} />
              <p className="text-sm font-medium">{n}</p>
            </div>
            <div className="mt-3 rounded-lg px-3 py-2 text-xs font-medium" style={{ background: `var(${soft})`, color: `var(${fg})` }}>
              {n} message on its soft fill
            </div>
          </div>
        ))}
      </div>
    </Section>
  )
}

const HUES: Array<[string, string, string]> = [
  ["Blue", "blue", "Annual leave"],
  ["Green", "green", "Engineering"],
  ["Amber", "amber", "Comp-off"],
  ["Rose", "rose", "Sick leave"],
  ["Purple", "purple", "Recruitment"],
  ["Cyan", "cyan", "Work from home"],
  ["Slate", "slate", "Unpaid leave"],
]

export function CategoryHues() {
  return (
    <Section
      title="Category hues"
      description="Identity, not meaning: tell leave types, departments and modules apart. A hue never signals good or bad — that is what Status is for."
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {HUES.map(([n, key, example]) => (
          <div key={key} className="rounded-xl border bg-card p-3 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="size-3 rounded-full" style={{ background: `var(--tone-${key})` }} />
              <p className="text-sm font-medium">{n}</p>
            </div>
            <div
              className="mt-3 rounded-lg px-3 py-2 text-xs font-medium"
              style={{ background: `var(--tone-${key}-soft)`, color: `var(--tone-${key}-foreground)` }}
            >
              {example}
            </div>
          </div>
        ))}
      </div>
    </Section>
  )
}

export function TypeScale() {
  return (
    <Section title="Type scale" description="Inter (self-hosted) on shadcn's Tailwind scale. Body copy is text-sm; numbers use tabular figures so columns align.">
      <div className="divide-y rounded-xl border bg-card shadow-xs">
        {TYPE.map(([n, cls, sample]) => (
          <div key={n} className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-baseline sm:gap-6">
            <p className="w-24 shrink-0 text-xs text-muted-foreground">{n}</p>
            <p className={cls}>{sample}</p>
          </div>
        ))}
      </div>
    </Section>
  )
}

export function TypesetArticle() {
  return (
    <Section
      title="Reading typography"
      description="shadcn/typeset styles rendered markdown inside a typeset container; the content itself carries no classes. typeset-article is the long-form preset. Kit components (data-slot) and anything marked not-typeset keep their own styles."
    >
      <div className="rounded-xl border bg-card p-6 shadow-xs">
        <article className="typeset typeset-article max-w-[42em]">
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
      </div>
    </Section>
  )
}

export function RadiusElevation() {
  return (
    <Section title="Radius & shadow" description="shadcn's radius scale from one --radius base; base-maia uses the large radii for pills and cards.">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        {["rounded-sm", "rounded-md", "rounded-lg", "rounded-xl", "rounded-2xl", "rounded-4xl"].map((r) => (
          <div key={r} className={`flex h-20 items-center justify-center border bg-card text-xs text-muted-foreground ${r}`}>
            {r.replace("rounded-", "")}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {["shadow-xs", "shadow-md", "shadow-lg"].map((s) => (
          <div key={s} className={`flex h-24 items-center justify-center rounded-xl bg-card text-xs text-muted-foreground ${s}`}>
            {s}
          </div>
        ))}
      </div>
    </Section>
  )
}

export function SpacingDensity() {
  return (
    <Section title="Spacing & density" description="A 4-point scale. Compact density shrinks the whole scale — switch it in the toolbar.">
      <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-5 shadow-xs">
        {[1, 2, 3, 4, 6, 8, 10, 12, 16].map((n) => (
          <div key={n} className="flex flex-col items-center gap-1.5">
            <div className="rounded-sm bg-primary/80" style={{ width: `calc(var(--spacing) * ${n})`, height: `calc(var(--spacing) * ${n})` }} />
            <span className="font-mono text-[11px] text-muted-foreground">{n}</span>
          </div>
        ))}
      </div>
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
      <div className="space-y-2 rounded-xl border bg-card p-5 shadow-xs">
        {EASES.map(([name, use, curve]) => (
          <div key={name} className="group/ease grid grid-cols-[9rem_minmax(0,1fr)] items-center gap-4 sm:grid-cols-[9rem_14rem_minmax(0,1fr)]">
            <code className="font-mono text-xs">{name}</code>
            <span className="hidden text-xs text-muted-foreground sm:block">
              {use} ({curve})
            </span>
            <div className="relative h-6 rounded-full bg-muted">
              <span
                aria-hidden
                className={`absolute top-1 left-1 size-4 rounded-full bg-primary transition-[left] duration-(--duration-screen) motion-reduce:transition-none group-hover/ease:left-[calc(100%-1.25rem)] ${name}`}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {DURATIONS.map(([token, use]) => (
          <div key={token} className="rounded-xl border bg-card p-4 shadow-xs">
            <code className="font-mono text-xs">{token}</code>
            <p className="mt-1 text-xs text-muted-foreground">{use}</p>
          </div>
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
