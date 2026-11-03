import type { ReactNode } from "react"
import { Eye, Globe, HeartHandshake, MapPin, Phone, Target } from "lucide-react"
import { Progress } from "@/ds/ui/progress"
import { cn } from "@/ds/lib/utils"
import { INDIA, WORLD, WORLD_INDIA, type DotGrid } from "./mapGrid"
import {
  countBy,
  formatArea,
  plus,
  projectsOf,
  type CaptionField,
  type OrgProfile,
  type PerSlide,
  type Place,
  type ProfileCompany,
  type ProfileData,
  type ProfileProject,
  type ProfileService,
} from "./profile"

/* Sizes are container units (cqw) so one slide renders identically as stage, thumbnail, fullscreen and PDF page. */

function Frame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="@container aspect-video w-full overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-sm">
      <div className={cn("relative flex size-full flex-col p-[4cqw]", className)}>{children}</div>
    </div>
  )
}

function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="text-[1.2cqw] font-semibold tracking-[0.18em] text-primary uppercase">{children}</p>
}

function Title({ children }: { children: ReactNode }) {
  return <h3 className="mt-[0.4cqw] text-[3.2cqw] leading-tight font-bold tracking-tight">{children}</h3>
}

function Logo({ initials, className }: { initials: string; className?: string }) {
  return <div className={cn("grid aspect-square shrink-0 place-items-center rounded-[1cqw] bg-primary font-black text-primary-foreground", className)}>{initials}</div>
}

/** The brochure's laurel: a ringed count that says "this many". */
function CountBadge({ n, label }: { n: number | string; label: string }) {
  return (
    <div className="grid aspect-square w-[7cqw] shrink-0 place-content-center rounded-full border-[0.35cqw] border-primary text-center">
      <span className="text-[2.4cqw] leading-none font-black text-primary tabular-nums">{n}</span>
      <span className="text-[0.9cqw] font-semibold tracking-wider text-muted-foreground uppercase">{label}</span>
    </div>
  )
}

/** A full-bleed photo with a dark scrim, so white text reads in both themes. */
function Backdrop({ src, children, className }: { src: string; children: ReactNode; className?: string }) {
  return (
    <Frame className="p-0">
      <img src={src} alt="" className="absolute inset-0 size-full object-cover" />
      <div className={cn("relative flex size-full flex-col text-white", className)}>{children}</div>
    </Frame>
  )
}

function Bars({ rows }: { rows: Array<{ name: string; count: number }> }) {
  const max = Math.max(1, ...rows.map((r) => r.count))
  return (
    <ul className="flex flex-col gap-[1.1cqw]">
      {rows.map((r) => (
        <li key={r.name} className="grid grid-cols-[20cqw_minmax(0,1fr)_4cqw] items-center gap-[1.4cqw] text-[1.4cqw]">
          <span className="truncate font-semibold">{r.name}</span>
          <Progress value={(r.count / max) * 100} aria-label={`${r.name}: ${r.count} projects`} />
          <span className="text-right font-bold tabular-nums">{r.count}</span>
        </li>
      ))}
    </ul>
  )
}

/* ---------- Hardcoded slides (copy lives in OrgProfile; About's numbers are live) ---------- */

export function CoverSlide({ data }: { data: ProfileData }) {
  const { org, totals } = data
  return (
    <Backdrop src={org.hero} className="justify-between bg-linear-to-r from-black/85 via-black/55 to-black/10 p-[5cqw]">
      <div className="flex items-center gap-[1.4cqw]">
        <Logo initials={org.initials} className="w-[5.5cqw] text-[2cqw]" />
        <span className="text-[1.5cqw] font-semibold tracking-[0.2em] uppercase">{org.legalName}</span>
      </div>
      <div className="max-w-[62%]">
        <p className="text-[1.3cqw] font-semibold tracking-[0.2em] uppercase opacity-80">{org.edition}</p>
        <h3 className="mt-[1cqw] text-[4.8cqw] leading-[1.05] font-black tracking-tight">{org.tagline}</h3>
      </div>
      <p className="text-[1.4cqw] opacity-85">
        {plus(totals.projects)} projects · {plus(totals.clients)} clients · since {org.foundedIn}
      </p>
    </Backdrop>
  )
}

export function AboutSlide({ data }: { data: ProfileData }) {
  const { org, totals } = data
  const stats = [
    [plus(totals.projects), "Projects"],
    [plus(totals.completed), "Completed"],
    [plus(totals.clients), "Clients"],
    [plus(new Date().getFullYear() - org.foundedIn), "Years"],
    [plus(totals.team), "Team"],
  ]
  return (
    <Frame className="gap-[2.6cqw]">
      <ul className="grid grid-cols-5 gap-[1.2cqw]">
        {stats.map(([value, label]) => (
          <li key={label} className="rounded-[1cqw] bg-primary px-[1.4cqw] py-[1.2cqw] text-primary-foreground">
            <p className="text-[3cqw] leading-none font-black tabular-nums">{value}</p>
            <p className="mt-[0.4cqw] text-[1.1cqw] font-semibold tracking-wider uppercase opacity-90">{label}</p>
          </li>
        ))}
      </ul>
      <div>
        <Eyebrow>About us</Eyebrow>
        <Title>{org.legalName}</Title>
      </div>
      <div className="grid grid-cols-2 gap-[3cqw]">
        {org.about.map((t) => (
          <p key={t} className="text-[1.45cqw] leading-relaxed text-muted-foreground">
            {t}
          </p>
        ))}
      </div>
    </Frame>
  )
}

export function VisionSlide({ data }: { data: ProfileData }) {
  const { org } = data
  const cols = [
    { icon: <Eye />, title: "Vision", body: <p>{org.vision}</p> },
    { icon: <Target />, title: "Mission", body: <p>{org.mission}</p> },
    {
      icon: <HeartHandshake />,
      title: "Values",
      body: (
        <dl className="flex flex-col gap-[0.8cqw]">
          {org.values.map((v) => (
            <div key={v.label}>
              <dt className="font-bold text-primary">{v.label}</dt>
              <dd>{v.text}</dd>
            </div>
          ))}
        </dl>
      ),
    },
  ]
  return (
    <Frame>
      <Eyebrow>Who we are</Eyebrow>
      <Title>Vision, mission &amp; values</Title>
      <div className="mt-[2.4cqw] grid flex-1 grid-cols-3 gap-[1.8cqw]">
        {cols.map((c) => (
          <div key={c.title} className="flex flex-col gap-[1.2cqw] rounded-[1.2cqw] border border-border bg-background p-[2.2cqw] text-[1.45cqw] leading-snug">
            <div className="grid size-[5cqw] place-items-center rounded-full bg-accent text-accent-foreground [&>svg]:size-[2.4cqw]">{c.icon}</div>
            <p className="text-[2cqw] font-bold">{c.title}</p>
            {c.body}
          </div>
        ))}
      </div>
    </Frame>
  )
}

export function ScopeSlide({ data }: { data: ProfileData }) {
  return (
    <Frame>
      <Eyebrow>From concept to handover</Eyebrow>
      <Title>Scope of services</Title>
      <ol className="mt-[2.4cqw] grid flex-1 auto-rows-min grid-flow-col grid-cols-3 grid-rows-8 gap-x-[2.4cqw] gap-y-[0.9cqw] text-[1.3cqw]">
        {data.org.scope.map((s, i) => (
          <li key={s} className="flex items-baseline gap-[0.8cqw]">
            <span className="w-[2.2cqw] shrink-0 text-right font-bold text-primary tabular-nums">{String(i + 1).padStart(2, "0")}</span>
            <span>{s}</span>
          </li>
        ))}
      </ol>
    </Frame>
  )
}

export function ContactSlide({ data }: { data: ProfileData }) {
  const { org } = data
  return (
    <Backdrop src={org.hero} className="justify-center bg-black/72 p-[6cqw]">
      <Logo initials={org.initials} className="w-[6cqw] text-[2.2cqw]" />
      <p className="mt-[2cqw] text-[1.3cqw] font-semibold tracking-[0.2em] uppercase opacity-80">Reach us at · Head office</p>
      <h3 className="mt-[0.6cqw] text-[4cqw] leading-tight font-black">{org.legalName}</h3>
      <ul className="mt-[2cqw] flex flex-col gap-[1cqw] text-[1.5cqw]">
        {(
          [
            [<MapPin key="a" />, org.address],
            [<Phone key="p" />, org.phone],
            [<Globe key="w" />, org.website],
          ] as const
        ).map(([icon, text]) => (
          <li key={text} className="flex items-center gap-[1.2cqw] [&>svg]:size-[1.8cqw] [&>svg]:shrink-0">
            {icon}
            {text}
          </li>
        ))}
      </ul>
    </Backdrop>
  )
}

/* ---------- Fetched slides, each showing only what was picked ---------- */

export function ServicesSlide({ title, services }: { title: string; services: ProfileService[] }) {
  return (
    <Frame>
      <Eyebrow>What we do</Eyebrow>
      <Title>{title}</Title>
      <ul className="mt-auto grid grid-cols-4 gap-[1.4cqw]">
        {services.map((s) => (
          <li key={s.id} className="flex min-h-[9cqw] flex-col justify-between rounded-[1.2cqw] border border-border bg-background p-[1.6cqw]">
            <p className="text-[1.7cqw] leading-tight font-bold">{s.name}</p>
            <p className="text-[1.25cqw] font-semibold text-primary">{s.projects} projects</p>
          </li>
        ))}
      </ul>
    </Frame>
  )
}

const GRID: Record<PerSlide, string> = { 3: "grid-cols-3", 5: "grid-cols-4", 7: "grid-cols-5" }

function ProjectTile({ p, captions, hero }: { p: ProfileProject; captions: CaptionField[]; hero: boolean }) {
  const line = [
    captions.includes("architect") && p.architect && `Arch. ${p.architect}`,
    captions.includes("client") && p.client,
    captions.includes("area") && p.areaSqft && formatArea(p.areaSqft),
  ].filter(Boolean)
  return (
    <li className={cn("relative min-h-0 overflow-hidden rounded-[1cqw]", hero && "col-span-2 row-span-2")}>
      {p.cover && <img src={p.cover} alt="" className="absolute inset-0 size-full object-cover" />}
      {captions.includes("metric") && p.metric && (
        <span className={cn("absolute top-[0.8cqw] right-[0.8cqw] rounded-full bg-black/65 px-[0.9cqw] py-[0.3cqw] font-bold text-white", hero ? "text-[1.3cqw]" : "text-[0.95cqw]")}>
          {p.metric}
        </span>
      )}
      <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/85 via-black/55 to-transparent p-[1cqw] pt-[3cqw] text-white">
        <p className={cn("leading-tight font-bold", hero ? "text-[1.9cqw]" : "truncate text-[1.15cqw]")}>{p.name}</p>
        <p className={cn("truncate opacity-90", hero ? "text-[1.3cqw]" : "text-[0.95cqw]")}>{[p.city, ...line].join(" · ")}</p>
      </div>
    </li>
  )
}

export function ProjectsSlide({
  title,
  items,
  total,
  part,
  parts,
  perSlide,
  captions,
  repeat,
}: {
  title: string
  items: ProfileProject[]
  /** Every project in this section's typology / tag / city, not just the ones on show. */
  total: number
  part: number
  parts: number
  perSlide: PerSlide
  captions: CaptionField[]
  repeat?: { name: string; count: number }
}) {
  return (
    <Frame className="gap-[1.8cqw] p-[3cqw]">
      <header className="flex items-center gap-[1.6cqw]">
        <CountBadge n={total} label="projects" />
        <div className="min-w-0">
          <Eyebrow>Portfolio{parts > 1 && ` · ${part} of ${parts}`}</Eyebrow>
          <Title>{title}</Title>
        </div>
        {repeat && (
          <p className="ml-auto rounded-full bg-accent px-[1.4cqw] py-[0.6cqw] text-[1.2cqw] font-semibold text-accent-foreground">
            {repeat.count} repeat projects · {repeat.name}
          </p>
        )}
      </header>
      <ul className={cn("grid min-h-0 flex-1 grid-rows-2 gap-[1cqw]", GRID[perSlide])}>
        {items.map((p, i) => (
          <ProjectTile key={p.id} p={p} captions={captions} hero={i === 0} />
        ))}
      </ul>
    </Frame>
  )
}

/** Logo wall grouped by company type (the brochure's Hotel / Stores / Hospital / Builder rows), or a repeat-projects chart. */
export function CompaniesSlide({ title, companies, display, projects }: { title: string; companies: ProfileCompany[]; display: "logos" | "chart"; projects: ProfileProject[] }) {
  if (display === "chart")
    return (
      <Frame>
        <Eyebrow>Trust, measured</Eyebrow>
        <Title>{title}</Title>
        <div className="mt-auto">
          <Bars rows={companies.map((c) => ({ name: c.name, count: projectsOf(projects, c.name) })).sort((a, b) => b.count - a.count)} />
        </div>
      </Frame>
    )
  const groups = countBy(companies.map((c) => c.types[0] ?? "Other")).map((g) => ({ ...g, items: companies.filter((c) => (c.types[0] ?? "Other") === g.name) }))
  return (
    <Frame>
      <Eyebrow>Working with</Eyebrow>
      <Title>{title}</Title>
      <div className="mt-[2.4cqw] flex flex-wrap content-start gap-x-[2.4cqw] gap-y-[1.6cqw]">
        {groups.map((g) => (
          <section key={g.name} className="flex flex-col gap-[0.8cqw]">
            <p className="text-[1.15cqw] font-semibold tracking-wider text-muted-foreground uppercase">{g.name}</p>
            <ul className="flex max-w-[86cqw] flex-wrap gap-[0.9cqw]">
              {g.items.map((c) => (
                // White plate on purpose: company logos are artwork drawn for a light background, in either theme.
                <li key={c.id} className="grid h-[5.6cqw] w-[13cqw] place-items-center overflow-hidden rounded-[0.9cqw] border border-border bg-white p-[0.6cqw] text-center text-[1.2cqw] font-bold text-slate-800">
                  {c.logo ? <img src={c.logo} alt={c.name} className="max-h-full max-w-full object-contain" /> : c.name}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Frame>
  )
}

/** One path for every land dot: round caps on zero-length segments draw circles, so thousands of dots stay one DOM node. */
function dotsPath(g: DotGrid) {
  let d = ""
  g.rows.forEach((hex, y) => {
    for (let i = 0; i < hex.length; i++) {
      const v = parseInt(hex[i], 16)
      for (let k = 0; k < 4; k++) if (v & (8 >> k)) d += `M${i * 4 + k + 0.5} ${y + 0.5}h0`
    }
  })
  return d
}

function DotMap({ grid, highlight, pins, label }: { grid: DotGrid; highlight?: DotGrid; pins: Place[]; label: string }) {
  const w = grid.rows[0].length * 4
  const h = grid.rows.length
  const at = (p: Place) => [(p.lng - grid.lon0) / grid.step, (grid.lat0 - p.lat) / grid.step] as const
  const unit = w / 100
  // Label the busiest pins first and skip any label that would land on one already placed.
  const labelled: Array<readonly [number, number]> = []
  const showLabel = pins.map((p) => {
    const [x, y] = at(p)
    const clear = labelled.every(([lx, ly]) => Math.abs(lx - x) > 9 * unit || Math.abs(ly - y) > 2.6 * unit)
    if (clear) labelled.push([x, y])
    return clear
  })
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="size-full" role="img" aria-label={label}>
      <path d={dotsPath(grid)} className="text-muted-foreground/35" stroke="currentColor" strokeWidth={0.62} strokeLinecap="round" />
      {highlight && <path d={dotsPath(highlight)} className="text-primary/55" stroke="currentColor" strokeWidth={0.62} strokeLinecap="round" />}
      {pins.map((p, i) => {
        const [x, y] = at(p)
        const r = unit * (0.7 + Math.min(p.count, 40) / 40)
        return (
          <g key={p.id}>
            <circle cx={x} cy={y} r={r * 2.2} className="fill-primary/20" />
            <circle cx={x} cy={y} r={r} className="fill-primary stroke-card" strokeWidth={unit * 0.3} />
            {showLabel[i] && (
              <text x={x + r * 1.8} y={y + unit * 0.7} fontSize={unit * 2} fontWeight={700} className="fill-foreground stroke-card" strokeWidth={unit * 0.5} paintOrder="stroke">
                {p.name}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

export function MapSlide({ title, region, pins, projects }: { title: string; region: "india" | "world"; pins: Place[]; projects: number }) {
  const unit = region === "india" ? "cities" : "countries"
  return (
    <Frame className="grid grid-cols-[minmax(0,0.75fr)_minmax(0,2fr)] grid-rows-[minmax(0,1fr)] gap-[2cqw]">
      <div className="flex min-w-0 flex-col">
        <Eyebrow>{region === "india" ? "Pan India" : "Worldwide"}</Eyebrow>
        <Title>{title}</Title>
        <div className="mt-[2cqw] flex gap-[2.4cqw]">
          {[
            [pins.length, unit],
            [projects, "projects"],
          ].map(([n, l]) => (
            <p key={l} className="text-[1.3cqw] font-semibold">
              <span className="block text-[4.6cqw] leading-none font-black text-primary tabular-nums">{n}</span>
              {l}
            </p>
          ))}
        </div>
        <ul className="mt-auto columns-2 gap-[1.4cqw] text-[1.1cqw] leading-relaxed">
          {pins.slice(0, 24).map((p) => (
            <li key={p.id} className="truncate">
              <span className="font-semibold">{p.name}</span> <span className="text-muted-foreground tabular-nums">{p.count}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="min-h-0 min-w-0">
        <DotMap grid={region === "india" ? INDIA : WORLD} highlight={region === "world" ? WORLD_INDIA : undefined} pins={pins} label={`Map of ${pins.length} ${unit} with projects`} />
      </div>
    </Frame>
  )
}
