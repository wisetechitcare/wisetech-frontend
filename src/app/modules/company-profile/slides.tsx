import { createContext, useContext, type ReactNode } from "react"
import { BadgeCheck, Building2, Cog, Handshake, Lightbulb, ShieldCheck, Users } from "lucide-react"
import { cn } from "@/ds/lib/utils"
import { INDIA, WORLD, WORLD_INDIA, type DotGrid } from "./mapGrid"
import { formatArea, initialsOf, plus, type CaptionField, type Facet, type Group, type Place, type ProfileCompany, type ProfileData, type ProfileProject, type ProfileService } from "./profile"

/*
 * Sizes are container units (cqw) so one slide renders identically as stage, thumbnail, fullscreen and PDF page.
 * Slides are print artwork (the PDF page), not app chrome: they keep the brochure's light palette in both
 * themes, the way the logo plates always did. One palette from cover to contact: navy #1b2a4e ink, red #c62828
 * accent; the logo's blue #2b5797 appears only in the wordmark.
 */

/** Set by the deck per slide: the page number and the two-tone wordmark the footer prints. */
export const SlideContext = createContext<{ page: number; wordmark: [string, string] }>({ page: 0, wordmark: ["", ""] })

function Wordmark() {
  const [a, b] = useContext(SlideContext).wordmark
  return (
    <span className="font-extrabold tracking-wide">
      <span className="text-[#2b5797]">{a}</span>
      <span className="text-[#c62828]">{b}</span>
    </span>
  )
}

function Frame({ children, className, footer = true }: { children: ReactNode; className?: string; footer?: boolean }) {
  const { page } = useContext(SlideContext)
  return (
    <div className="@container aspect-video w-full overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm">
      <div className={cn("relative flex size-full flex-col", footer && "px-[4.4cqw] pt-[3.4cqw] pb-[2cqw]")}>
        <div className={cn("flex min-h-0 flex-1 flex-col", className)}>{children}</div>
        {footer && (
          <footer className="relative mt-[1.6cqw] flex items-center justify-between border-t border-slate-200 pt-[1.1cqw] text-[1.25cqw]">
            <Wordmark />
            <span className="text-slate-500 tabular-nums">{String(page).padStart(2, "0")}</span>
          </footer>
        )}
      </div>
    </div>
  )
}

/** A slide title under a red rule, or under a red letter-spaced eyebrow when one is given. */
function Heading({ children, eyebrow, className }: { children: ReactNode; eyebrow?: string; className?: string }) {
  return (
    <div className={className}>
      {eyebrow ? (
        <p className="text-[1.15cqw] font-bold tracking-[0.3em] text-[#c62828] uppercase">{eyebrow}</p>
      ) : (
        <span aria-hidden className="block h-[0.35cqw] w-[3cqw] bg-[#c62828]" />
      )}
      <h3 className="mt-[0.8cqw] text-[3.2cqw] leading-tight font-bold tracking-tight text-[#1b2a4e]">{children}</h3>
    </div>
  )
}

/** A big blue figure over its label. */
function Figure({ n, label }: { n: ReactNode; label: string }) {
  return (
    <p className="text-[1.4cqw] text-slate-600">
      <span className="block text-[4.6cqw] leading-none font-bold text-[#c62828] tabular-nums">{n}</span>
      {label}
    </p>
  )
}

function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-[1cqw] bg-slate-100 p-[2.4cqw] text-[1.45cqw] leading-relaxed text-slate-600", className)}>{children}</div>
}

/* ---------- Hardcoded slides (copy lives in OrgProfile; About's numbers are live) ---------- */

const PILLAR_ICONS = [Building2, Cog, Handshake, ShieldCheck]

export function CoverSlide({ data }: { data: ProfileData }) {
  const { org } = data
  const [tag, tagAccent] = org.tagline
  return (
    <Frame footer={false}>
      <img src={org.hero} alt="" className="absolute top-[16%] left-[10%] h-[72%] w-[52%] object-cover [mask-image:radial-gradient(ellipse_at_center,black_45%,transparent_75%)]" />
      <div className="relative flex items-center gap-[1.4cqw] p-[3cqw]">
        <span className="grid size-[7cqw] place-items-center rounded-full border-[0.6cqw] border-slate-400 text-[2.6cqw] font-black italic">
          <span>
            <span className="text-[#2b5797]">{org.initials[0]}</span>
            <span className="text-[#c62828]">{org.initials.slice(1)}</span>
          </span>
        </span>
        <div>
          <p className="text-[3.8cqw] leading-none tracking-[0.12em]">
            <Wordmark />
          </p>
          <p className="mt-[0.4cqw] text-[1.25cqw] font-bold tracking-[0.18em] text-slate-500 uppercase">{org.legalName.replace(/^\S+\s/, "")}</p>
        </div>
      </div>
      <p className="relative -mt-[1cqw] px-[3cqw] text-[1.9cqw] font-bold text-[#1b2a4e]">
        {tag} <span className="text-[#c62828]">{tagAccent}</span>
      </p>
      <div className="absolute top-[7%] right-[4cqw] w-[32%]">
        <h3 className="text-[4.6cqw] leading-none font-bold text-[#1b2a4e]">
          Company <span className="text-[#c62828]">Profile</span>
        </h3>
        <span aria-hidden className="mt-[1.2cqw] block h-[0.45cqw] w-[16cqw] bg-[#1b2a4e]" />
        <ul className="mt-[5cqw] flex flex-col gap-[1.6cqw]">
          {org.pillars.map((p, i) => {
            const Icon = PILLAR_ICONS[i % PILLAR_ICONS.length]
            return (
              <li key={p.title} className="flex gap-[1.6cqw]">
                <span className={cn("grid size-[4.4cqw] shrink-0 place-items-center rounded-full text-white [&>svg]:size-[2cqw]", i % 2 ? "bg-[#c62828]" : "bg-[#1b2a4e]")}>
                  <Icon />
                </span>
                <div>
                  <p className="text-[1.45cqw] font-bold text-[#1b2a4e] uppercase">{p.title}</p>
                  <p className="text-[1.2cqw] leading-snug text-slate-600">{p.text}</p>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
      <div className="absolute inset-x-0 bottom-0 flex h-[9%] items-end justify-between bg-[#1b2a4e] px-[3cqw] pb-[1.2cqw] text-[1.25cqw] text-white [clip-path:polygon(0_35%,100%_0,100%_100%,0_100%)]">
        <span>{org.edition}</span>
        <span className="font-bold">{org.slogan}</span>
      </div>
    </Frame>
  )
}

export function AboutSlide({ data }: { data: ProfileData }) {
  const { org, totals } = data
  const stats = [
    [plus(totals.projects), "Projects"],
    [plus(totals.completed), "Completed"],
    [plus(totals.clients), "Clients"],
    [plus(new Date().getFullYear() - org.foundedIn), "Years of experience"],
    [plus(totals.team), "Team"],
  ]
  return (
    <Frame>
      <Heading>About us</Heading>
      <div className="mt-[2.2cqw] grid grid-cols-2 gap-[3cqw]">
        {org.about.map((t) => (
          <p key={t} className="text-[1.45cqw] leading-relaxed text-slate-600">
            {t}
          </p>
        ))}
      </div>
      <ul className="mt-auto grid grid-cols-5 divide-x divide-slate-200 rounded-[1cqw] bg-slate-100 py-[2cqw]">
        {stats.map(([value, label]) => (
          <li key={label} className="px-[2cqw]">
            <Figure n={value} label={label} />
          </li>
        ))}
      </ul>
    </Frame>
  )
}

export function VisionSlide({ data }: { data: ProfileData }) {
  const { org } = data
  const cols = [
    { icon: <Lightbulb />, title: "Vision", body: <p>{org.vision}</p> },
    { icon: <BadgeCheck />, title: "Mission", body: <p>{org.mission}</p> },
    {
      icon: <Users />,
      title: "Values",
      body: (
        <div className="flex flex-col gap-[1cqw]">
          {org.values.map((v) => (
            <p key={v.label}>
              <b className="text-[#1b2a4e]">{v.label}:</b> {v.text}
            </p>
          ))}
        </div>
      ),
    },
  ]
  return (
    <Frame>
      <Heading>Who we are</Heading>
      <div className="mt-[2.4cqw] grid min-h-0 flex-1 grid-cols-3 gap-[1.4cqw]">
        {cols.map((c, i) => (
          <Card key={c.title}>
            <span className={cn("grid size-[4.4cqw] place-items-center rounded-full text-white [&>svg]:size-[2cqw]", i % 2 ? "bg-[#c62828]" : "bg-[#1b2a4e]")}>{c.icon}</span>
            <p className="mt-[1.4cqw] mb-[1.2cqw] text-[2.1cqw] font-bold text-[#1b2a4e]">{c.title}</p>
            {c.body}
          </Card>
        ))}
      </div>
    </Frame>
  )
}

export function ContactSlide({ data }: { data: ProfileData }) {
  const { org } = data
  const rows: Array<[string, ReactNode]> = [
    ["Address", org.address],
    ["Telephone", org.phone],
    ["Website", <span className="text-[#1b2a4e] underline">{org.website}</span>],
  ]
  return (
    <Frame>
      <img src={org.site} alt="" className="absolute top-0 right-0 h-[calc(100%-5.2cqw)] w-[46%] object-cover" />
      <div className="w-[46%]">
        <Heading>Reach us at · Head office</Heading>
        <p className="mt-[2.2cqw] text-[2cqw] font-semibold text-[#1b2a4e]">{org.legalName}</p>
        <dl className="mt-[1.4cqw] divide-y divide-slate-200">
          {rows.map(([label, value]) => (
            <div key={label} className="py-[1.4cqw]">
              <dt className="text-[1.2cqw] font-semibold text-slate-500">{label}</dt>
              <dd className="mt-[0.4cqw] text-[1.5cqw] leading-relaxed text-slate-600">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </Frame>
  )
}

/* ---------- Fetched slides, each showing only what was picked ---------- */

export function ServicesSlide({ title, services }: { title: string; services: ProfileService[] }) {
  return (
    <Frame>
      <Heading>{title}</Heading>
      <ul className="mt-auto grid grid-cols-4 gap-[1.4cqw]">
        {services.map((s) => (
          <li key={s.id}>
            <Card className="flex min-h-[9cqw] flex-col justify-between p-[1.6cqw]">
              <p className="text-[1.7cqw] leading-tight font-bold text-[#1b2a4e]">{s.name}</p>
              <p className="text-[1.25cqw] font-semibold text-[#c62828]">{s.projects} projects</p>
            </Card>
          </li>
        ))}
      </ul>
    </Frame>
  )
}

/** Tile columns beside the hero. */
const COLS = ["", "grid-cols-1", "grid-cols-2", "grid-cols-3", "grid-cols-4"]

const EYEBROW: Record<Facet, string> = { typology: "Project category", tag: "Project category", city: "Projects in", client: "Projects for", architect: "Designed with" }

function ProjectTile({ p, captions, hero }: { p: ProfileProject; captions: CaptionField[]; hero?: boolean }) {
  const line = [
    captions.includes("architect") && p.architect && `Arch. ${p.architect}`,
    captions.includes("client") && p.client,
    captions.includes("area") && p.areaSqft && formatArea(p.areaSqft),
  ].filter(Boolean)
  return (
    <div className="relative size-full min-h-0 overflow-hidden rounded-[0.4cqw] border border-slate-300 bg-slate-100">
      {p.cover && <img src={p.cover} alt="" className="absolute inset-0 size-full object-cover" />}
      {captions.includes("metric") && p.metric && (
        <span className={cn("absolute top-[0.8cqw] right-[0.8cqw] rounded-full bg-[#1b2a4e]/85 px-[0.9cqw] py-[0.3cqw] font-bold text-white", hero ? "text-[1.2cqw]" : "text-[0.9cqw]")}>
          {p.metric}
        </span>
      )}
      <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-[#1b2a4e] via-[#1b2a4e]/70 to-transparent p-[1cqw] pt-[3cqw] text-white">
        <p className={cn("leading-tight font-bold", hero ? "text-[1.7cqw]" : "line-clamp-2 text-[1.1cqw]")}>{p.name}</p>
        <p className={cn("truncate opacity-90", hero ? "text-[1.2cqw]" : "text-[0.9cqw]")}>{[p.city, ...line].join(" · ")}</p>
      </div>
    </div>
  )
}

export function ProjectsSlide({
  title,
  facet,
  items,
  total,
  part,
  parts,
  captions,
}: {
  title: string
  facet: Facet
  items: ProfileProject[]
  /** Every project in this section's typology / tag / city, not just the ones on show. */
  total: number
  part: number
  parts: number
  captions: CaptionField[]
}) {
  const [hero, ...rest] = items
  // The grid fits however many tiles this slide has (4 to 8 beside the hero): two rows, and with an odd
  // count the first tile runs both rows, so no cell is ever left empty.
  const cols = Math.ceil(rest.length / 2)
  const tall = rest.length % 2 === 1
  return (
    <Frame className="grid grid-cols-[minmax(0,0.95fr)_minmax(0,2fr)] grid-rows-[minmax(0,1fr)] gap-[3.4cqw]">
      <div className="flex min-h-0 flex-col">
        <Heading eyebrow={`${EYEBROW[facet]}${parts > 1 ? ` · ${part} / ${parts}` : ""}`}>{title}</Heading>
        <p className="mt-[0.8cqw] flex items-center gap-[1.4cqw]">
          <span className="text-[5.4cqw] leading-none font-bold text-[#c62828] tabular-nums">{total}</span>
          <span className="text-[1.15cqw] font-bold tracking-[0.25em] text-slate-500 uppercase">Projects</span>
        </p>
        {hero && (
          <div className="mt-[2cqw] min-h-0 flex-1">
            <ProjectTile p={hero} captions={captions} hero />
          </div>
        )}
      </div>
      {cols > 0 && (
        <ul className={cn("grid min-h-0 grid-rows-2 gap-[1.4cqw]", COLS[cols])}>
          {rest.map((p, i) => (
            <li key={p.id} className={cn("min-h-0", tall && i === 0 && "row-span-2")}>
              <ProjectTile p={p} captions={captions} />
            </li>
          ))}
        </ul>
      )}
    </Frame>
  )
}

/** Logo-wall geometry, shared with the deck's pagination: plates per row and plate rows per slide. */
export const LOGO_COLS = 6
export const LOGO_ROWS = 7

const PLATE_COLS = ["", "grid-cols-[repeat(1,13.4cqw)]", "grid-cols-[repeat(2,13.4cqw)]", "grid-cols-[repeat(3,13.4cqw)]", "grid-cols-[repeat(4,13.4cqw)]", "grid-cols-[repeat(5,13.4cqw)]", "grid-cols-[repeat(6,13.4cqw)]"]

/** Client logo wall: company-type groups side by side on shelves; what does not fit flows onto the next slide. */
export function ClientsSlide({ title, shelves }: { title: string; shelves: Group<ProfileCompany>[][] }) {
  return (
    <Frame>
      <Heading>{title}</Heading>
      <div className="mt-[2cqw] flex flex-col gap-[1.2cqw]">
        {shelves.map((shelf) => (
          <div key={shelf.map((g) => g.name).join()} className="flex gap-[2.2cqw]">
            {shelf.map((g) => (
              <section key={g.name}>
                <p className="mb-[0.6cqw] text-[1.1cqw] font-bold tracking-[0.2em] text-[#c62828] uppercase">{g.name}</p>
                <ul className={cn("grid gap-[0.8cqw]", PLATE_COLS[Math.min(g.items.length, LOGO_COLS)])}>
                  {g.items.map((c) => (
                    <li key={c.id} className="grid h-[4.8cqw] place-items-center overflow-hidden rounded-[0.7cqw] border border-slate-200 bg-white px-[0.8cqw] text-center text-[1.2cqw] font-bold text-slate-800">
                      {c.logo ? <img src={c.logo} alt={c.name} className="max-h-full max-w-full object-contain" /> : c.name}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        ))}
      </div>
    </Frame>
  )
}

/** 1, 2 or 5 × 10ⁿ: about five gridlines whatever the range. */
function niceStep(max: number) {
  const raw = max / 5
  const p = 10 ** Math.floor(Math.log10(raw))
  return Math.max(1, [1, 2, 5, 10].map((m) => m * p).find((s) => s >= raw) ?? p * 10)
}

/** Bar with only its data end rounded, so it stays anchored to the baseline. */
const barPath = (x0: number, x1: number, y: number, h: number) => {
  const r = Math.min(4, x1 - x0, h / 2)
  return `M${x0} ${y}H${x1 - r}a${r} ${r} 0 0 1 ${r} ${r}V${y + h - r}a${r} ${r} 0 0 1 ${-r} ${r}H${x0}Z`
}

/** Repeat clients: projects per client, ranked, with logo and share of the whole portfolio. */
export function RepeatSlide({ title, rows, total }: { title: string; rows: Array<{ company: ProfileCompany; count: number }>; total: number }) {
  const W = 1000
  const ROW = 42
  const AXIS = 30
  const X0 = 400
  const X1 = 880
  const H = rows.length * ROW + AXIS
  const step = niceStep(Math.max(1, ...rows.map((r) => r.count)))
  const top = Math.ceil(Math.max(1, ...rows.map((r) => r.count)) / step) * step
  const x = (v: number) => X0 + (v / top) * (X1 - X0)
  return (
    <Frame>
      <Heading>{title}</Heading>
      <p className="mt-[0.6cqw] text-[1.3cqw] text-slate-500">Ranked by projects with us · share of all {total} projects</p>
      <div className="mt-[1.6cqw] min-h-0 flex-1">
        <svg viewBox={`0 0 ${W} ${H}`} className="size-full" preserveAspectRatio="xMidYMin meet" role="img" aria-label={`${title}: ${rows.map((r) => `${r.company.name} ${r.count}`).join(", ")}`}>
          {Array.from({ length: top / step + 1 }, (_, i) => i * step).map((t) => (
            <g key={t}>
              <line x1={x(t)} x2={x(t)} y1={0} y2={H - AXIS} className="stroke-slate-200" />
              <text x={x(t)} y={H - 8} textAnchor="middle" fontSize={14} className="fill-slate-500">
                {t}
              </text>
            </g>
          ))}
          {rows.map(({ company: c, count }, i) => {
            const cy = ROW * (i + 0.5)
            return (
              <g key={c.id}>
                <rect x={X0 - 86} y={cy - 16} width={72} height={32} rx={5} className="fill-white stroke-slate-200" />
                {c.logo ? (
                  <image href={c.logo} x={X0 - 82} y={cy - 13} width={64} height={26} preserveAspectRatio="xMidYMid meet" />
                ) : (
                  <text x={X0 - 50} y={cy + 5} textAnchor="middle" fontSize={14} fontWeight={800} className="fill-slate-700">
                    {initialsOf(c.name)}
                  </text>
                )}
                <text x={X0 - 100} y={cy + 6} textAnchor="end" fontSize={17} fontWeight={600} className="fill-slate-700">
                  {c.name.length > 22 ? `${c.name.slice(0, 21)}…` : c.name}
                </text>
                <path d={barPath(X0, x(count), cy - 11, 22)} className="fill-[#1b2a4e]" />
                <text x={x(count) + 10} y={cy + 6} fontSize={16} className="fill-slate-600">
                  <tspan fontWeight={700} className="fill-slate-700">
                    {count}
                  </tspan>
                  {` · ${+((count / Math.max(1, total)) * 100).toFixed(1)}%`}
                </text>
              </g>
            )
          })}
        </svg>
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
      <path d={dotsPath(grid)} className="text-slate-300" stroke="currentColor" strokeWidth={0.62} strokeLinecap="round" />
      {highlight && <path d={dotsPath(highlight)} className="text-[#1b2a4e]" stroke="currentColor" strokeWidth={0.62} strokeLinecap="round" />}
      {pins.map((p, i) => {
        const [x, y] = at(p)
        const r = unit * (0.6 + Math.min(p.count, 40) / 40)
        return (
          <g key={p.id}>
            <circle cx={x} cy={y} r={r} className="fill-[#1b2a4e] stroke-white" strokeWidth={unit * 0.25} />
            {showLabel[i] && (
              <text x={x + r * 1.7} y={y + unit * 0.7} fontSize={unit * 2} fontWeight={600} className="fill-slate-700 stroke-white" strokeWidth={unit * 0.5} paintOrder="stroke">
                {p.name}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

/** Most places the list beside the map shows; the map itself pins every picked one. */
const LIST_MAX = 20

export function MapSlide({ title, region, pins, projects }: { title: string; region: "india" | "world"; pins: Place[]; projects: number }) {
  const unit = region === "india" ? "cities" : "countries"
  return (
    <Frame className="grid grid-cols-[minmax(0,0.85fr)_minmax(0,1.6fr)] grid-rows-[auto_minmax(0,1fr)] gap-x-[3cqw]">
      <Heading className="col-span-2">{title}</Heading>
      <div className="flex min-w-0 flex-col">
        <div className="mt-[2cqw] flex gap-[5cqw]">
          <Figure n={pins.length} label={unit} />
          {region === "india" && <Figure n={projects} label="projects" />}
        </div>
        <ul className="mt-[2cqw] columns-2 gap-[1.6cqw] text-[1.15cqw]">
          {pins.slice(0, LIST_MAX).map((p) => (
            <li key={p.id} className="flex break-inside-avoid justify-between gap-[0.6cqw] border-b border-slate-200 py-[0.45cqw]">
              <span className="truncate text-slate-600">{p.name}</span>
              <span className="font-bold text-[#1b2a4e] tabular-nums">{p.count}</span>
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
