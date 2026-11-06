import type { ReactNode } from "react"
import { matches, places, projectsOf, type ProfileData } from "./profile"
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

/**
 * Draws one presentation slide; `cover` replaces the default cover (the CRM's carries the organisation logo).
 * `data-artwork` makes Bootstrap's element rules (h3, p, ul) step aside in the app (see scripts/postcss-kit-exemption.ts).
 */
export function ProfileSlide({ spec, data, cover }: { spec: SlideSpec; data: ProfileData; cover?: ReactNode }) {
  return (
    <div data-artwork="">
      <SlideContext.Provider value={{ page: spec.page, total: spec.total, wordmark: data.org.wordmark }}>
        <SlideBody spec={spec} data={data} cover={cover} />
      </SlideContext.Provider>
    </div>
  )
}
