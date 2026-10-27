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

/** All foundations on one page. */
export function Foundations() {
  return (
    <div className="space-y-12">
      <ColourRoles />
      <StatusColours />
      <TypeScale />
      <RadiusElevation />
      <SpacingDensity />
    </div>
  )
}
