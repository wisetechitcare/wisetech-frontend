import type { ReactNode } from "react"
import { Building, Building2, CalendarDays, Clipboard, Cog, FileCheck, Globe, Handshake, MapPin, Network, ShieldCheck, Users, type LucideIcon } from "lucide-react"
import { cn } from "@/ds/lib/utils"
import { plus, type ProfileData } from "@app/modules/company-profile/profile"

const PILLAR_ICONS = [Building2, Cog, Handshake, ShieldCheck]

/**
 * The cover, as designed in the Storybook prototype, except the brand block: only the organisation's own logo
 * (Settings → Organisation profile → Organization logo), fetched from the app, never a bundled file or typed
 * name; the logo carries the name. Its own copy because the prototype's cover bundles its logo and wordmark
 * and the prototype is not edited.
 */
export function CoverSlide({ data, logo }: { data: ProfileData; logo: string | null }) {
  const { org, totals } = data
  const [tag, tagAccent] = org.tagline
  const stats: Array<[LucideIcon, ReactNode, string]> = [
    [Clipboard, plus(totals.projects), "Projects\nTotal"],
    [FileCheck, plus(totals.completed), "Projects\nCompleted"],
    [Globe, totals.countries, "Projects in\nCountries"],
    [MapPin, totals.cities, "Projects in\nCities in India"],
    [Building, plus(totals.inHomeCity), `Projects in\n${org.homeCity}`],
    [Users, plus(totals.clients), "Clients"],
    [CalendarDays, plus(new Date().getFullYear() - org.foundedIn), "Years of\nExperience"],
    [Network, plus(totals.team), "Team"],
  ]
  return (
    <div className="@container aspect-video w-full overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm">
      <div className="relative flex size-full flex-col">
        <img src={org.hero} alt="" className="absolute top-[3%] left-[13.5%] h-[74%] w-[48%] object-contain object-bottom" />
        <div className="relative h-[8cqw] px-[3cqw] pt-[1.5cqw]">{logo && <img src={logo} alt={org.legalName} className="h-full max-w-[22cqw] object-contain object-left" />}</div>
        <p className="relative mt-[0.4cqw] px-[2.9cqw] text-[1.55cqw] font-bold text-[#1b2a4e]">
          {tag} <span className="text-[#c62828]">{tagAccent}</span>
        </p>
        <div className="absolute top-[3.9cqw] right-[3cqw]">
          <h3 className="text-[3.6cqw] leading-none font-bold whitespace-nowrap text-[#1b2a4e]">
            Company <span className="text-[#c62828]">Profile</span>
          </h3>
          <span aria-hidden className="mt-[1.2cqw] ml-[0.8cqw] block h-[0.4cqw] w-[15.6cqw] bg-[#1b2a4e]" />
        </div>
        <ul className="absolute top-[14.8cqw] right-[3cqw] left-[66cqw] flex flex-col gap-[0.6cqw]">
          {org.pillars.map((p, i) => {
            const Icon = PILLAR_ICONS[i % PILLAR_ICONS.length]
            return (
              <li key={p.title} className="flex gap-[2.3cqw]">
                <span className={cn("grid size-[4cqw] shrink-0 place-items-center rounded-full text-white [&>svg]:size-[1.8cqw]", i % 2 ? "bg-[#c62828]" : "bg-[#1b2a4e]")}>
                  <Icon />
                </span>
                <div>
                  <p className="text-[1.25cqw] font-bold text-[#1b2a4e] uppercase">{p.title}</p>
                  <p className="text-[1.18cqw] leading-[1.6cqw] text-slate-600">{p.text}</p>
                </div>
              </li>
            )
          })}
        </ul>
        <div className="absolute inset-x-0 bottom-0 h-[31.6%] text-white">
          <svg aria-hidden viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full fill-[#1b2a4e]">
            <path d="M0 22Q50 6 100 0V100H0Z" />
          </svg>
          <p className="absolute top-[2cqw] right-[2.3cqw] text-[1.05cqw] font-bold text-[#e53935]">{org.slogan}</p>
          <ul className="absolute inset-x-[3cqw] bottom-[0.7cqw] grid grid-cols-8">
            {stats.map(([Icon, n, label]) => (
              <li key={label} className="flex flex-col items-center text-center">
                <Icon aria-hidden strokeWidth={1.25} className="size-[2.6cqw]" />
                <span className="mt-[1.4cqw] font-[Cambria,Georgia,serif] text-[3.3cqw] leading-none font-bold tabular-nums">{n}</span>
                <span className="mt-[0.9cqw] min-h-[3.7cqw] text-[1.35cqw] leading-[1.85cqw] whitespace-pre-line">{label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
