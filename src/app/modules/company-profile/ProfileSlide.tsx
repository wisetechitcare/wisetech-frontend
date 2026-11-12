import type { CSSProperties, ReactNode } from "react"
import { isDark, matches, places, projectsOf, type ProfileData } from "./profile"
import { pick, type SlideSpec } from "./profileBuilder"
import { AboutSlide, ClientsSlide, ContactSlide, CoverSlide, MapSlide, ProjectsSlide, RepeatSlide, ServicesSlide, SlideContext, VisionSlide } from "./slides"

function SlideBody({ spec, data, cover }: { spec: SlideSpec; data: ProfileData; cover?: ReactNode }) {
  const s = spec.section
  switch (s.kind) {
    case "cover":
      return cover ?? <CoverSlide data={data} />
    case "about":
      return <AboutSlide data={data} />
    case "vision":
      return <VisionSlide data={data} />
    case "contact":
      return <ContactSlide data={data} />
    case "services":
      return <ServicesSlide title={s.title} services={pick(data.services, s.ids)} />
    case "projects":
      return (
        <ProjectsSlide
          title={s.title}
          facet={s.facet}
          items={spec.projects}
          total={data.projects.filter((p) => matches(p, s.facet, s.value)).length}
          part={spec.part}
          parts={spec.parts}
          captions={s.captions}
        />
      )
    case "companies":
      return s.display === "logos" ? (
        <ClientsSlide title={s.title} shelves={spec.shelves} projects={data.projects} />
      ) : (
        <RepeatSlide
          title={s.title}
          total={data.projects.length}
          rows={pick(data.companies, s.ids)
            .map((company) => ({ company, count: projectsOf(data.projects, company.name) }))
            .sort((a, b) => b.count - a.count)}
        />
      )
    case "map": {
      const pins = pick(places(data.projects, s.region), s.ids)
      return <MapSlide title={s.title} region={s.region} pins={pins} projects={pins.reduce((n, p) => n + p.count, 0)} />
    }
  }
}

/** Ink the slides read from (`text-(--s-ink)` …): navy on light backgrounds, white on dark ones. Cards and photos keep their own. */
const LIGHT_INK = "[--s-ink:#1b2a4e] [--s-body:#475569] [--s-muted:#64748b] [--s-line:#e2e8f0] [--s-brand:#2b5797]"
const DARK_INK = "[--s-ink:#ffffff] [--s-body:rgb(255_255_255/0.82)] [--s-muted:rgb(255_255_255/0.62)] [--s-line:rgb(255_255_255/0.2)] [--s-brand:#ffffff]"

/**
 * Draws one presentation slide; `cover` replaces the default cover (the CRM's carries the organisation logo).
 * `bg` colours every slide but the cover, which is fixed artwork (its photo sits on white).
 * `data-artwork` makes Bootstrap's element rules (h3, p, ul) step aside in the app (see scripts/postcss-kit-exemption.ts).
 */
export function ProfileSlide({ spec, data, cover, bg = "#ffffff" }: { spec: SlideSpec; data: ProfileData; cover?: ReactNode; bg?: string }) {
  const fill = spec.section.kind === "cover" ? "#ffffff" : bg
  return (
    // A user-picked colour has no class; the custom property is the one inline style.
    <div data-artwork="" className={isDark(fill) ? DARK_INK : LIGHT_INK} style={{ "--slide-bg": fill } as CSSProperties}>
      <SlideContext.Provider value={{ page: spec.page, total: spec.total, wordmark: data.org.wordmark }}>
        <SlideBody spec={spec} data={data} cover={cover} />
      </SlideContext.Provider>
    </div>
  )
}
