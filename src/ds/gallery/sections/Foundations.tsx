import type { ReactNode } from "react"

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-title font-semibold">{title}</h2>
        {description && <p className="text-body text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  )
}

function Swatch({ name, varName, fg }: { name: string; varName: string; fg?: string }) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-e1">
      <div className="flex h-16 items-end p-2" style={{ background: `var(${varName})`, color: fg ? `var(${fg})` : undefined }}>
        {fg && <span className="text-label font-semibold">Aa</span>}
      </div>
      <div className="px-3 py-2">
        <p className="text-label font-medium">{name}</p>
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
  ["Display", "text-display font-semibold", "₹4,82,500 payroll this month"],
  ["Headline", "text-headline font-semibold", "Employee onboarding"],
  ["Title", "text-title font-semibold", "Personal information"],
  ["Body", "text-body", "Leave balances update in real time as requests are approved."],
  ["Label", "text-label font-medium uppercase tracking-wider text-muted-foreground", "Required fields"],
]

export function Foundations() {
  return (
    <div className="space-y-12">
      <Section title="Colour roles" description="Components use roles, never raw colours. The brand role follows each tenant's Appearance setting.">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {ROLES.map(([n, v, f]) => (
            <Swatch key={v} name={n} varName={v} fg={f} />
          ))}
        </div>
      </Section>

      <Section title="Status" description="One meaning per colour. Each has a solid, a soft fill and readable text — in both themes.">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STATUS.map(([n, solid, soft, fg]) => (
            <div key={n} className="rounded-xl border bg-card p-3 shadow-e1">
              <div className="flex items-center gap-2">
                <span className="size-3 rounded-full" style={{ background: `var(${solid})` }} />
                <p className="text-body font-medium">{n}</p>
              </div>
              <div className="mt-3 rounded-lg px-3 py-2 text-label font-medium" style={{ background: `var(${soft})`, color: `var(${fg})` }}>
                {n} message on its soft fill
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Type scale" description="Inter (self-hosted), five roles. Numbers use tabular figures so columns align.">
        <div className="divide-y rounded-xl border bg-card shadow-e1">
          {TYPE.map(([n, cls, sample]) => (
            <div key={n} className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-baseline sm:gap-6">
              <p className="w-24 shrink-0 text-label text-muted-foreground">{n}</p>
              <p className={cls}>{sample}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Radius & elevation" description="One radius scale; three elevation steps tuned to the canvas.">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {["rounded-sm", "rounded-md", "rounded-lg", "rounded-xl", "rounded-2xl"].map((r) => (
            <div key={r} className={`flex h-20 items-center justify-center border bg-card text-label text-muted-foreground ${r}`}>
              {r.replace("rounded-", "")}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {["shadow-e1", "shadow-e2", "shadow-e3"].map((s) => (
            <div key={s} className={`flex h-24 items-center justify-center rounded-xl bg-card text-label text-muted-foreground ${s}`}>
              {s.replace("shadow-", "elevation ")}
            </div>
          ))}
        </div>
      </Section>

      <Section title="Spacing & density" description="A 4-point scale. Compact density shrinks the whole scale — switch it in the toolbar.">
        <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-5 shadow-e1">
          {[1, 2, 3, 4, 6, 8, 10, 12, 16].map((n) => (
            <div key={n} className="flex flex-col items-center gap-1.5">
              <div className="rounded-sm bg-primary/80" style={{ width: `calc(var(--spacing) * ${n})`, height: `calc(var(--spacing) * ${n})` }} />
              <span className="font-mono text-[11px] text-muted-foreground">{n}</span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  )
}
