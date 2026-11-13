import {
  createContext,
  useContext,
  type ComponentProps,
  type ReactNode,
} from "react";
import {
  AirVent,
  BadgeCheck,
  BrickWall,
  Building,
  Building2,
  CalendarDays,
  Cctv,
  CircleCheck,
  Clipboard,
  ClipboardCheck,
  Cog,
  Cpu,
  DraftingCompass,
  Droplets,
  FileCheck,
  FireExtinguisher,
  Globe,
  Handshake,
  Leaf,
  Lightbulb,
  MapPin,
  Network,
  ShieldCheck,
  Sofa,
  Trees,
  Users,
  Wrench,
  Zap,
  Box,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/ds/lib/utils";
import { Badge } from "@/ds/ui/badge";
import { INDIA, WORLD, WORLD_INDIA, type DotGrid } from "./mapGrid";
import {
  LOGO_COLS,
  formatArea,
  initialsOf,
  plural,
  plus,
  projectsOf,
  type CaptionField,
  type Facet,
  type Group,
  type OrgProfile,
  type Place,
  type ProfileCompany,
  type ProfileData,
  type ProfileProject,
  type ProfileService,
} from "./profile";

/*
 * Sizes are container units (cqw) so one slide renders identically as stage, thumbnail, fullscreen and PDF page.
 * Slides are print artwork (the PDF page), not app chrome: they keep the brochure's light palette in both
 * themes, the way the logo plates always did. One palette from cover to contact: navy #1b2a4e ink, red #c62828
 * accent; the logo's blue #2b5797 appears only in the wordmark.
 */

/** Set by the deck per slide: its place in the presentation (`page` of `total` shown slides) and the two-tone wordmark the footer prints. */
export const SlideContext = createContext<{
  page: number;
  total: number;
  wordmark: [string, string];
}>({ page: 0, total: 0, wordmark: ["", ""] });

function Wordmark() {
  const [a, b] = useContext(SlideContext).wordmark;
  return (
    <span className="font-extrabold tracking-wide">
      <span className="text-(--s-brand)">{a}</span>
      <span className="text-[#c62828]">{b}</span>
    </span>
  );
}

function Frame({
  children,
  className,
  footer = true,
}: {
  children: ReactNode;
  className?: string;
  footer?: boolean;
}) {
  const { page, total } = useContext(SlideContext);
  return (
    <div className="@container aspect-video w-full overflow-hidden rounded-xl border border-slate-200 bg-(--slide-bg) text-(--s-body) shadow-sm">
      <div
        className={cn(
          "relative flex size-full flex-col",
          footer && "px-[4.4cqw] pt-[3.4cqw] pb-[2cqw]",
        )}
      >
        <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
          {children}
        </div>
        {footer && (
          <footer className="relative mt-[1.6cqw] flex items-center justify-between border-t border-(--s-line) pt-[1.1cqw] text-[1.25cqw]">
            <Wordmark />
            <span
              className="text-(--s-muted) tabular-nums"
              data-testid="slide-page"
            >
              {page} of {total}
            </span>
          </footer>
        )}
      </div>
    </div>
  );
}

/** A slide title under a red rule, or under a red letter-spaced eyebrow when one is given. */
function Heading({
  children,
  eyebrow,
  className,
}: {
  children: ReactNode;
  eyebrow?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      {eyebrow ? (
        <p className="text-[1.15cqw] font-bold tracking-[0.3em] text-[#c62828] uppercase">
          {eyebrow}
        </p>
      ) : (
        <span aria-hidden className="block h-[0.35cqw] w-[3cqw] bg-[#c62828]" />
      )}
      <h3 className="mt-[0.8cqw] text-[3.2cqw] leading-tight font-bold tracking-tight text-(--s-ink)">
        {children}
      </h3>
    </div>
  );
}

/** A big blue figure over its label. */
function Figure({ n, label }: { n: ReactNode; label: string }) {
  return (
    <p className="text-[1.4cqw] text-(--s-body)">
      <span className="block text-[4.6cqw] leading-none font-bold text-[#c62828] tabular-nums">
        {n}
      </span>
      {label}
    </p>
  );
}

/* ---------- Hardcoded slides (copy lives in OrgProfile; About's numbers are live) ---------- */

const PILLAR_ICONS = [Building2, Cog, Handshake, ShieldCheck];

/** The app's own WT mark: its PWA icon, cropped by the circle to the grey ring. */
const LOGO = `${import.meta.env.BASE_URL}icons/pwa-512.png`;

export function CoverSlide({ data }: { data: ProfileData }) {
  const { org, totals } = data;
  const [tag, tagAccent] = org.tagline;
  const stats: Array<[LucideIcon, ReactNode, string]> = [
    [Clipboard, plus(totals.projects), "Projects\nTotal"],
    [FileCheck, plus(totals.completed), "Projects\nCompleted"],
    [Globe, totals.countries, "Projects in\nCountries"],
    [MapPin, totals.cities, "Projects in\nCities in India"],
    [Building, plus(totals.inHomeCity), `Projects in\n${org.homeCity}`],
    [Users, plus(totals.clients), "Clients"],
    [
      CalendarDays,
      plus(new Date().getFullYear() - org.foundedIn),
      "Years of\nExperience",
    ],
    [Network, plus(totals.team), "Team"],
  ];
  return (
    <Frame footer={false}>
      <img
        src={org.hero}
        alt=""
        className="absolute top-[3%] left-[13.5%] h-[74%] w-[48%] object-contain object-bottom"
      />
      <div className="relative flex items-center gap-[1.7cqw] px-[2.2cqw] pt-[1.5cqw]">
        <span className="size-[7.3cqw] shrink-0 overflow-hidden rounded-full">
          <img src={LOGO} alt="" className="size-full scale-150" />
        </span>
        <div>
          <p className="text-[2.7cqw] leading-none [&>span]:tracking-[0.2em]">
            <Wordmark />
          </p>
          <p className="mt-[0.6cqw] text-[1.15cqw] font-bold tracking-[0.12em] text-slate-500 uppercase">
            {org.legalName.replace(/^\S+\s/, "")}
          </p>
        </div>
      </div>
      <p className="relative mt-[0.4cqw] px-[2.9cqw] text-[1.55cqw] font-bold text-[#1b2a4e]">
        {tag} <span className="text-[#c62828]">{tagAccent}</span>
      </p>
      <div className="absolute top-[3.9cqw] right-[3cqw]">
        <h3 className="text-[3.6cqw] leading-none font-bold whitespace-nowrap text-[#1b2a4e]">
          Company <span className="text-[#c62828]">Profile</span>
        </h3>
        <span
          aria-hidden
          className="mt-[1.2cqw] ml-[0.8cqw] block h-[0.4cqw] w-[15.6cqw] bg-[#1b2a4e]"
        />
      </div>
      <ul className="absolute top-[14.8cqw] right-[3cqw] left-[66cqw] flex flex-col gap-[0.6cqw]">
        {org.pillars.map((p, i) => {
          const Icon = PILLAR_ICONS[i % PILLAR_ICONS.length];
          return (
            <li key={p.title} className="flex gap-[2.3cqw]">
              <span
                className={cn(
                  "grid size-[4cqw] shrink-0 place-items-center rounded-full text-white [&>svg]:size-[1.8cqw]",
                  i % 2 ? "bg-[#c62828]" : "bg-[#1b2a4e]",
                )}
              >
                <Icon />
              </span>
              <div>
                <p className="text-[1.25cqw] font-bold text-[#1b2a4e] uppercase">
                  {p.title}
                </p>
                <p className="text-[1.18cqw] leading-[1.6cqw] text-slate-600">
                  {p.text}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="absolute inset-x-0 bottom-0 h-[31.6%] text-white">
        <svg
          aria-hidden
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 size-full fill-[#1b2a4e]"
        >
          <path d="M0 22Q50 6 100 0V100H0Z" />
        </svg>
        <p className="absolute top-[2cqw] right-[2.3cqw] text-[1.05cqw] font-bold text-[#e53935]">
          {org.slogan}
        </p>
        <ul className="absolute inset-x-[3cqw] bottom-[0.7cqw] grid grid-cols-8">
          {stats.map(([Icon, n, label]) => (
            <li key={label} className="flex flex-col items-center text-center">
              <Icon aria-hidden strokeWidth={1.25} className="size-[2.6cqw]" />
              <span className="mt-[1.4cqw] font-[Cambria,Georgia,serif] text-[3.3cqw] leading-none font-bold tabular-nums">
                {n}
              </span>
              <span className="mt-[0.9cqw] min-h-[3.7cqw] text-[1.35cqw] leading-[1.85cqw] whitespace-pre-line">
                {label}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Frame>
  );
}

/** Our journey: the company's milestones on one horizontal line, oldest first (the cover already carries the numbers). */
function MilestoneTimeline({
  milestones,
}: {
  milestones: OrgProfile["milestones"];
}) {
  if (!milestones.length) return null;
  return (
    <section className="mt-auto">
      <p className="text-[1.15cqw] font-bold tracking-[0.3em] text-[#c62828] uppercase">
        Our journey
      </p>
      <ol className="relative mt-[1.6cqw] grid auto-cols-fr grid-flow-col gap-[2.4cqw] before:absolute before:inset-x-0 before:top-[0.7cqw] before:h-[0.2cqw] before:bg-(--s-line) before:content-['']">
        {milestones.map((m) => (
          <li key={`${m.year}-${m.title}`} className="relative">
            <span
              aria-hidden
              className="block size-[1.6cqw] rounded-full border-[0.4cqw] border-(--s-ink) bg-(--slide-bg)"
            />
            <p className="mt-[1cqw] text-[2.6cqw] leading-none font-bold text-[#c62828] tabular-nums">
              {m.year}
            </p>
            <p className="mt-[0.6cqw] text-[1.4cqw] leading-tight font-bold text-(--s-ink)">
              {m.title}
            </p>
            <p className="mt-[0.4cqw] line-clamp-3 text-[1.15cqw] leading-snug text-(--s-body)">
              {m.text}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}

export type JourneyDesign = typeof MilestoneTimeline;

/** `Journey` swaps the Our journey design (Storybook trials in OurJourney.stories.tsx; the default is the live one). */
export function AboutSlide({
  data,
  Journey = MilestoneTimeline,
}: {
  data: ProfileData;
  Journey?: JourneyDesign;
}) {
  const { org } = data;
  return (
    <Frame>
      <Heading>About us</Heading>
      <div className="mt-[2.2cqw] grid grid-cols-2 gap-[3cqw]">
        {org.about.map((t) => (
          <p key={t} className="text-[1.45cqw] leading-relaxed text-(--s-body)">
            {t}
          </p>
        ))}
      </div>
      <Journey milestones={org.milestones} />
    </Frame>
  );
}

/** The two panel looks shared by Who we are and Services: each capped by an accent bar (navy on white, red on deep navy) with a tinted icon tile. */
const PANEL = {
  light: {
    card: "bg-[#1b2a4e]/[0.15] text-slate-600 shadow-md ring-slate-200 before:absolute before:inset-x-0 before:top-0 before:h-[0.45cqw] before:bg-[#1b2a4e]",
    mark: "text-[#1b2a4e]/[0.15]",
    // Same gradient as the app's primary Button (ds/ui/button.tsx): follows the tenant's brand colour.
    tile: "bg-linear-135/srgb from-(--brand-bright) to-(--brand) shadow-md shadow-(--brand)/30",
    title: "text-[#1b2a4e]",
    count: "text-[#c62828]",
  },
  dark: {
    card: "bg-linear-to-b from-[#3d5a94] to-[#2a4072] text-slate-100 shadow-xl ring-white/10 before:absolute before:inset-x-0 before:top-0 before:h-[0.45cqw] before:bg-[#c62828]",
    mark: "text-white/40",
    // Crimson, tying the tile to the red accent bar and underline on the same card.
    tile: "bg-linear-135/srgb from-[#e53935] to-[#9f1d1d] shadow-lg shadow-black/30 ring-1 ring-white/15",
    title: "text-white",
    count: "text-sky-300",
    // count: "text-red-600",
  },
};

/** Watermark number, drawn as CSS content: decorative, so it is faint on purpose and kept out of the a11y tree. */
const Mark = ({ n, className }: { n: number; className: string }) => (
  <span
    data-n={String(n).padStart(2, "0")}
    className={cn(
      "absolute leading-none font-black tabular-nums before:content-[attr(data-n)]",
      className,
    )}
  />
);

export function VisionSlide({ data }: { data: ProfileData }) {
  const { org } = data;
  const cols: Array<{ Icon: LucideIcon; title: string; body: ReactNode }> = [
    { Icon: Lightbulb, title: "Vision", body: <p>{org.vision}</p> },
    { Icon: BadgeCheck, title: "Mission", body: <p>{org.mission}</p> },
    {
      Icon: Users,
      title: "Values",
      body: (
        <ul className="flex flex-col gap-[1.1cqw]">
          {org.values.map((v) => (
            <li key={v.label} className="flex gap-[0.9cqw]">
              <CircleCheck
                aria-hidden
                className="mt-[0.35cqw] size-[1.7cqw] shrink-0 text-[#c62828]"
              />
              <p>
                <b className="text-[#1b2a4e]">{v.label}</b> · {v.text}
              </p>
            </li>
          ))}
        </ul>
      ),
    },
  ];
  return (
    <Frame>
      <Heading>Who we are</Heading>
      {/* Three numbered panels; the middle one (Mission) is the navy focal point. */}
      <ol className="mt-[2.4cqw] grid min-h-0 flex-1 grid-cols-3 gap-[1.6cqw]">
        {cols.map(({ Icon, title, body }, i) => {
          const p = PANEL[i === 1 ? "dark" : "light"];
          return (
            <li
              key={title}
              className={cn(
                "relative flex flex-col overflow-hidden rounded-[1.2cqw] p-[2.6cqw] text-[1.55cqw] leading-relaxed ring-1",
                p.card,
              )}
            >
              <Mark
                n={i + 1}
                className={cn(
                  "top-[1.2cqw] right-[2cqw] text-[6.4cqw]",
                  p.mark,
                )}
              />
              <span
                className={cn(
                  "grid size-[4.8cqw] place-items-center rounded-[1cqw] text-white [&>svg]:size-[2.3cqw]",
                  p.tile,
                )}
              >
                <Icon aria-hidden />
              </span>
              <p className={cn("mt-[1.8cqw] text-[2.3cqw] font-bold", p.title)}>
                {title}
              </p>
              <span
                aria-hidden
                className="mt-[0.8cqw] mb-[1.4cqw] block h-[0.3cqw] w-[3.2cqw] bg-[#c62828]"
              />
              {body}
            </li>
          );
        })}
      </ol>
    </Frame>
  );
}

export function ContactSlide({ data }: { data: ProfileData }) {
  const { org } = data;
  const rows: Array<[string, ReactNode]> = [
    ["Address", org.address],
    ["Telephone", org.phone],
    [
      "Website",
      <span className="text-(--s-ink) underline">{org.website}</span>,
    ],
  ];
  return (
    <Frame>
      <img
        src={org.site}
        alt=""
        className="absolute top-0 right-0 h-[calc(100%-5.2cqw)] w-[46%] object-cover"
      />
      <div className="w-[46%]">
        <Heading>Reach us at · Head office</Heading>
        <p className="mt-[2.2cqw] text-[2cqw] font-semibold text-(--s-ink)">
          {org.legalName}
        </p>
        <dl className="mt-[1.4cqw] divide-y divide-(--s-line)">
          {rows.map(([label, value]) => (
            <div key={label} className="py-[1.4cqw]">
              <dt className="text-[1.2cqw] font-semibold text-(--s-muted)">
                {label}
              </dt>
              <dd className="mt-[0.4cqw] text-[1.5cqw] leading-relaxed text-(--s-body)">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </Frame>
  );
}

/* ---------- Fetched slides, each showing only what was picked ---------- */

/** Icon and one-line pitch per service, matched on its CRM name (first match wins); an unknown service gets a wrench and no pitch. */
const SERVICE_INFO: Array<[RegExp, LucideIcon, string]> = [
  [
    /fire/i,
    FireExtinguisher,
    "Sprinklers, hydrants, detection and alarms, built to code.",
  ],
  [
    /elv|security|cctv/i,
    Cctv,
    "Data, CCTV, access control and PA on one low-voltage backbone.",
  ],
  [/bms/i, Cpu, "One control layer to monitor and tune every building system."],
  [
    /hvac|mechanical|air/i,
    AirVent,
    "Cooling, fresh air and smoke control, sized to the real load.",
  ],
  [
    /electric/i,
    Zap,
    "Safe, efficient power from the incoming supply to every outlet.",
  ],
  [
    /plumb|public health|phe/i,
    Droplets,
    "Water supply, drainage and reuse planned as one system.",
  ],
  [
    /\bbim\b/i,
    Box,
    "Coordinated 3D models that settle clashes on screen, not on site.",
  ],
  [
    /audit|testing/i,
    ClipboardCheck,
    "Independent checks of installed systems against design and code.",
  ],
  [
    /green/i,
    Leaf,
    "Energy and water strategies that support IGBC, GRIHA and LEED ratings.",
  ],
  [
    /moef|environment/i,
    Trees,
    "Environmental clearance documentation and compliance support.",
  ],
  [
    /interior/i,
    Sofa,
    "Services planned around the fit-out, through our associates.",
  ],
  [
    /structur/i,
    BrickWall,
    "Structural design through our associates, coordinated with MEP.",
  ],
  [
    /architect/i,
    DraftingCompass,
    "Architecture through our associates, integrated from day one.",
  ],
];

function serviceInfo(name: string): [LucideIcon, string] {
  const hit = SERVICE_INFO.find(([re]) => re.test(name));
  return hit ? [hit[1], hit[2]] : [Wrench, ""];
}

/** Up to 8 services as 4 × 2 cards with an icon and pitch; 9–12 pack into three rows without the pitch. */
export function ServicesSlide({
  title,
  services,
}: {
  title: string;
  services: ProfileService[];
}) {
  const dense = services.length > 8;
  return (
    <Frame>
      <Heading>{title}</Heading>
      {/* Who we are's panels, light and navy in a checkerboard. */}
      <ul className="mt-[2.2cqw] grid min-h-0 flex-1 auto-rows-fr grid-cols-4 gap-[1.4cqw]">
        {services.map((s, i) => {
          const [Icon, pitch] = serviceInfo(s.name);
          const p = PANEL[(i + Math.floor(i / 4)) % 2 ? "dark" : "light"];
          return (
            <li
              key={s.id}
              className={cn(
                "relative flex min-h-0 flex-col overflow-hidden rounded-[1cqw] p-[1.6cqw] text-[1.15cqw] leading-snug ring-1",
                p.card,
              )}
            >
              <Mark
                n={i + 1}
                className={cn(
                  "top-[1cqw] right-[1.4cqw] text-[3.6cqw]",
                  p.mark,
                )}
              />
              <span
                className={cn(
                  "grid size-[3.6cqw] shrink-0 place-items-center rounded-[0.8cqw] text-white [&>svg]:size-[1.9cqw]",
                  p.tile,
                )}
              >
                <Icon aria-hidden strokeWidth={1.75} />
              </span>
              <p
                className={cn(
                  "mt-[1cqw] text-[1.55cqw] leading-tight font-bold",
                  p.title,
                )}
              >
                {s.name}
              </p>
              <span
                aria-hidden
                className="mt-[0.6cqw] mb-[0.6cqw] block h-[0.25cqw] w-[2.4cqw] shrink-0 bg-[#c62828]"
              />
              {!dense && pitch && (
                <p className="line-clamp-2 shrink-0">{pitch}</p>
              )}
              <p
                className={cn(
                  "mt-auto pt-[0.6cqw] font-semibold tabular-nums",
                  p.count,
                )}
              >
                {plural(s.projects, "project")}
              </p>
            </li>
          );
        })}
      </ul>
    </Frame>
  );
}

/** Tile columns beside the hero. */
const COLS = ["", "grid-cols-1", "grid-cols-2", "grid-cols-3", "grid-cols-4"];

const EYEBROW: Record<Facet, string> = {
  typology: "Project category",
  tag: "Project category",
  city: "Projects in",
  client: "Projects for",
  architect: "Designed with",
};

type BadgeVariant = NonNullable<ComponentProps<typeof Badge>["variant"]>;
const STATUS_VARIANT: Record<string, BadgeVariant> = {
  completed: "success",
  ongoing: "info",
  "on going": "info",
  "on hold": "warning",
  cancelled: "danger",
};

/** A project status as the kit's status badge, one colour per meaning; an unknown status reads neutral. Size it with `className`. */
export function ProjectStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  return (
    <Badge
      variant={STATUS_VARIANT[status.toLowerCase()] ?? "neutral"}
      dot
      className={className}
    >
      {status}
    </Badge>
  );
}

function ProjectTile({
  p,
  captions,
  hero,
}: {
  p: ProfileProject;
  captions: CaptionField[];
  hero?: boolean;
}) {
  const line = [
    captions.includes("architect") && p.architect && `Arch. ${p.architect}`,
    captions.includes("client") && p.client,
    captions.includes("area") && p.areaSqft && formatArea(p.areaSqft),
  ].filter(Boolean);
  return (
    <div className="relative size-full min-h-0 overflow-hidden rounded-[0.4cqw] border border-slate-300 bg-slate-100">
      {p.cover && (
        <img
          src={p.cover}
          alt=""
          className="absolute inset-0 size-full object-cover"
        />
      )}
      {captions.includes("status") && p.status && (
        <ProjectStatusBadge
          status={p.status}
          className={cn(
            "absolute top-[0.8cqw] right-[0.8cqw] h-auto gap-[0.4cqw] px-[0.9cqw] py-[0.3cqw] font-bold shadow-sm before:size-[0.55cqw]",
            hero ? "text-[1.2cqw]" : "text-[0.9cqw]",
          )}
        />
      )}
      <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-[#1b2a4e] via-[#1b2a4e]/70 to-transparent p-[1cqw] pt-[3cqw] text-white">
        <p
          className={cn(
            "leading-tight font-bold",
            hero ? "text-[1.7cqw]" : "line-clamp-2 text-[1.1cqw]",
          )}
        >
          {p.name}
        </p>
        <p
          className={cn(
            "truncate opacity-90",
            hero ? "text-[1.2cqw]" : "text-[0.9cqw]",
          )}
        >
          {[p.city, ...line].join(" · ")}
        </p>
      </div>
    </div>
  );
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
  title: string;
  facet: Facet;
  items: ProfileProject[];
  /** Every project in this section's typology / tag / city, not just the ones on show. */
  total: number;
  part: number;
  parts: number;
  captions: CaptionField[];
}) {
  const [hero, ...rest] = items;
  // The grid fits however many tiles this slide has (4 to 8 beside the hero): two rows, and with an odd
  // count the first tile runs both rows, so no cell is ever left empty.
  const cols = Math.ceil(rest.length / 2);
  const tall = rest.length % 2 === 1;
  return (
    <Frame className="grid grid-cols-[minmax(0,0.95fr)_minmax(0,2fr)] grid-rows-[minmax(0,1fr)] gap-[3.4cqw]">
      <div className="flex min-h-0 flex-col">
        <Heading
          eyebrow={`${EYEBROW[facet]}${parts > 1 ? ` · ${part} / ${parts}` : ""}`}
        >
          {title}
        </Heading>
        <p className="mt-[0.8cqw] flex items-center gap-[1.4cqw]">
          <span className="text-[5.4cqw] leading-none font-bold text-[#c62828] tabular-nums">
            {total}
          </span>
          <span className="text-[1.15cqw] font-bold tracking-[0.25em] text-(--s-muted) uppercase">
            Projects
          </span>
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
            <li
              key={p.id}
              className={cn("min-h-0", tall && i === 0 && "row-span-2")}
            >
              <ProjectTile p={p} captions={captions} />
            </li>
          ))}
        </ul>
      )}
    </Frame>
  );
}

const PLATE_COLS = [
  "",
  "grid-cols-[repeat(1,13.4cqw)]",
  "grid-cols-[repeat(2,13.4cqw)]",
  "grid-cols-[repeat(3,13.4cqw)]",
  "grid-cols-[repeat(4,13.4cqw)]",
  "grid-cols-[repeat(5,13.4cqw)]",
  "grid-cols-[repeat(6,13.4cqw)]",
];

/**
 * Client logo wall: company-type groups side by side on shelves; what does not fit flows onto the next slide.
 * Each plate carries the logo, the name and how many projects the company did with us (as client or architect).
 */
export function ClientsSlide({
  title,
  shelves,
  projects,
}: {
  title: string;
  shelves: Group<ProfileCompany>[][];
  projects: ProfileProject[];
}) {
  return (
    <Frame>
      <Heading>{title}</Heading>
      <div className="mt-[2cqw] flex flex-col gap-[1.2cqw]">
        {shelves.map((shelf) => (
          <div
            key={shelf.map((g) => g.name).join()}
            className="flex gap-[2.2cqw]"
          >
            {shelf.map((g) => (
              <section key={g.name}>
                <p className="mb-[0.6cqw] text-[1.1cqw] font-bold tracking-[0.2em] text-[#c62828] uppercase">
                  {g.name}
                </p>
                <ul
                  className={cn(
                    "grid gap-[0.8cqw]",
                    PLATE_COLS[Math.min(g.items.length, LOGO_COLS)],
                  )}
                >
                  {g.items.map((c) => (
                    <li
                      key={c.id}
                      className="flex h-[7.4cqw] flex-col items-center justify-center gap-[0.3cqw] overflow-hidden rounded-[0.7cqw] border border-slate-200 bg-white px-[0.8cqw] text-center"
                    >
                      <span className="grid h-[3.4cqw] w-full place-items-center text-[1.2cqw] font-bold text-slate-800">
                        {c.logo ? (
                          <img
                            src={c.logo}
                            alt=""
                            className="max-h-full max-w-full object-contain"
                          />
                        ) : (
                          initialsOf(c.name)
                        )}
                      </span>
                      <span className="w-full truncate text-[0.95cqw] font-semibold text-slate-700">
                        {c.name}
                      </span>
                      <span className="text-[0.9cqw] font-bold text-[#c62828] tabular-nums">
                        {plural(projectsOf(projects, c.name), "project")}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        ))}
      </div>
    </Frame>
  );
}

/** 1, 2 or 5 × 10ⁿ: about five gridlines whatever the range. */
function niceStep(max: number) {
  const raw = max / 5;
  const p = 10 ** Math.floor(Math.log10(raw));
  return Math.max(
    1,
    [1, 2, 5, 10].map((m) => m * p).find((s) => s >= raw) ?? p * 10,
  );
}

/** Bar with only its data end rounded, so it stays anchored to the baseline. */
const barPath = (x0: number, x1: number, y: number, h: number) => {
  const r = Math.min(4, x1 - x0, h / 2);
  return `M${x0} ${y}H${x1 - r}a${r} ${r} 0 0 1 ${r} ${r}V${y + h - r}a${r} ${r} 0 0 1 ${-r} ${r}H${x0}Z`;
};

/** Repeat clients: projects per client, ranked, with logo and share of the whole portfolio. */
export function RepeatSlide({
  title,
  rows,
  total,
}: {
  title: string;
  rows: Array<{ company: ProfileCompany; count: number }>;
  total: number;
}) {
  const W = 1000;
  const ROW = 42;
  const AXIS = 30;
  const X0 = 400;
  const X1 = 880;
  const H = rows.length * ROW + AXIS;
  const step = niceStep(Math.max(1, ...rows.map((r) => r.count)));
  const top = Math.ceil(Math.max(1, ...rows.map((r) => r.count)) / step) * step;
  const x = (v: number) => X0 + (v / top) * (X1 - X0);
  return (
    <Frame>
      <Heading>{title}</Heading>
      <p className="mt-[0.6cqw] text-[1.3cqw] text-(--s-muted)">
        Ranked by projects with us · share of all {total} projects
      </p>
      <div className="mt-[1.6cqw] min-h-0 flex-1">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="size-full"
          preserveAspectRatio="xMidYMin meet"
          role="img"
          aria-label={`${title}: ${rows.map((r) => `${r.company.name} ${r.count}`).join(", ")}`}
        >
          {Array.from({ length: top / step + 1 }, (_, i) => i * step).map(
            (t) => (
              <g key={t}>
                <line
                  x1={x(t)}
                  x2={x(t)}
                  y1={0}
                  y2={H - AXIS}
                  className="stroke-(--s-line)"
                />
                <text
                  x={x(t)}
                  y={H - 8}
                  textAnchor="middle"
                  fontSize={14}
                  className="fill-(--s-muted)"
                >
                  {t}
                </text>
              </g>
            ),
          )}
          {rows.map(({ company: c, count }, i) => {
            const cy = ROW * (i + 0.5);
            return (
              <g key={c.id}>
                <rect
                  x={X0 - 86}
                  y={cy - 16}
                  width={72}
                  height={32}
                  rx={5}
                  className="fill-white stroke-slate-200"
                />
                {c.logo ? (
                  <image
                    href={c.logo}
                    x={X0 - 82}
                    y={cy - 13}
                    width={64}
                    height={26}
                    preserveAspectRatio="xMidYMid meet"
                  />
                ) : (
                  <text
                    x={X0 - 50}
                    y={cy + 5}
                    textAnchor="middle"
                    fontSize={14}
                    fontWeight={800}
                    className="fill-slate-700"
                  >
                    {initialsOf(c.name)}
                  </text>
                )}
                <text
                  x={X0 - 100}
                  y={cy + 6}
                  textAnchor="end"
                  fontSize={17}
                  fontWeight={600}
                  className="fill-(--s-ink)"
                >
                  {c.name.length > 22 ? `${c.name.slice(0, 21)}…` : c.name}
                </text>
                <path
                  d={barPath(X0, x(count), cy - 11, 22)}
                  className="fill-(--s-ink)"
                />
                <text
                  x={x(count) + 10}
                  y={cy + 6}
                  fontSize={16}
                  className="fill-(--s-body)"
                >
                  <tspan fontWeight={700} className="fill-(--s-ink)">
                    {count}
                  </tspan>
                  {` · ${+((count / Math.max(1, total)) * 100).toFixed(1)}%`}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </Frame>
  );
}

/** One path for every land dot: round caps on zero-length segments draw circles, so thousands of dots stay one DOM node. */
function dotsPath(g: DotGrid) {
  let d = "";
  g.rows.forEach((hex, y) => {
    for (let i = 0; i < hex.length; i++) {
      const v = parseInt(hex[i], 16);
      for (let k = 0; k < 4; k++)
        if (v & (8 >> k)) d += `M${i * 4 + k + 0.5} ${y + 0.5}h0`;
    }
  });
  return d;
}

function DotMap({
  grid,
  highlight,
  pins,
  label,
}: {
  grid: DotGrid;
  highlight?: DotGrid;
  pins: Place[];
  label: string;
}) {
  const w = grid.rows[0].length * 4;
  const h = grid.rows.length;
  const at = (p: Place) =>
    [(p.lng - grid.lon0) / grid.step, (grid.lat0 - p.lat) / grid.step] as const;
  const unit = w / 100;
  // Label the busiest pins first and skip any label that would land on one already placed.
  const labelled: Array<readonly [number, number]> = [];
  const showLabel = pins.map((p) => {
    const [x, y] = at(p);
    const clear = labelled.every(
      ([lx, ly]) =>
        Math.abs(lx - x) > 9 * unit || Math.abs(ly - y) > 2.6 * unit,
    );
    if (clear) labelled.push([x, y]);
    return clear;
  });
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="size-full"
      role="img"
      aria-label={label}
    >
      <path
        d={dotsPath(grid)}
        className="text-slate-300"
        stroke="currentColor"
        strokeWidth={0.62}
        strokeLinecap="round"
      />
      {highlight && (
        <path
          d={dotsPath(highlight)}
          className="text-(--s-ink)"
          stroke="currentColor"
          strokeWidth={0.62}
          strokeLinecap="round"
        />
      )}
      {pins.map((p, i) => {
        const [x, y] = at(p);
        const r = unit * (0.6 + Math.min(p.count, 40) / 40);
        return (
          <g key={p.id}>
            <circle
              cx={x}
              cy={y}
              r={r}
              className="fill-(--s-ink) stroke-(--slide-bg)"
              strokeWidth={unit * 0.25}
            />
            {showLabel[i] && (
              <text
                x={x + r * 1.7}
                y={y + unit * 0.7}
                fontSize={unit * 2}
                fontWeight={600}
                className="fill-(--s-ink) stroke-(--slide-bg)"
                strokeWidth={unit * 0.5}
                paintOrder="stroke"
              >
                {p.name}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/** Most places the list beside the map shows; the map itself pins every picked one. */
const LIST_MAX = 20;

export function MapSlide({
  title,
  region,
  pins,
  projects,
}: {
  title: string;
  region: "india" | "world";
  pins: Place[];
  projects: number;
}) {
  const unit = region === "india" ? "cities" : "countries";
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
            <li
              key={p.id}
              className="flex break-inside-avoid justify-between gap-[0.6cqw] border-b border-(--s-line) py-[0.45cqw]"
            >
              <span className="truncate text-(--s-body)">{p.name}</span>
              <span className="font-bold text-(--s-ink) tabular-nums">
                {p.count}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="min-h-0 min-w-0">
        <DotMap
          grid={region === "india" ? INDIA : WORLD}
          highlight={region === "world" ? WORLD_INDIA : undefined}
          pins={pins}
          label={`Map of ${pins.length} ${unit} with projects`}
        />
      </div>
    </Frame>
  );
}
