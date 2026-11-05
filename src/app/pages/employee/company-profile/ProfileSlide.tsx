import { matches, type ProfileData } from "@app/modules/company-profile/profile"
import { AboutSlide, ProjectsSlide, ServicesSlide, SlideContext, VisionSlide } from "@app/modules/company-profile/slides"
import { CoverSlide } from "./CoverSlide"
import { pick, type SlideSpec } from "./profileBuilder"

/**
 * Draws one deck slide with the prototype's layouts (the cover is the CRM's own, for the app logo).
 * `data-artwork` makes Bootstrap's element rules (h3, p, ul) step aside, so slides render as in Storybook
 * (see scripts/postcss-kit-exemption.ts).
 */
export function ProfileSlide({ spec, data, logo }: { spec: SlideSpec; data: ProfileData; logo: string | null }) {
  const s = spec.section
  return (
    <div data-artwork="">
      <SlideContext.Provider value={{ page: spec.page, wordmark: data.org.wordmark }}>
        {s.kind === "cover" ? (
          <CoverSlide data={data} logo={logo} />
        ) : s.kind === "about" ? (
          <AboutSlide data={data} />
        ) : s.kind === "vision" ? (
          <VisionSlide data={data} />
        ) : s.kind === "services" ? (
          <ServicesSlide title={s.title} services={pick(data.services, s.ids)} />
        ) : (
          <ProjectsSlide
            title={s.title}
            facet={s.facet}
            items={spec.projects}
            total={data.projects.filter((p) => matches(p, s.facet, s.value)).length}
            part={spec.part}
            parts={spec.parts}
            captions={s.captions}
          />
        )}
      </SlideContext.Provider>
    </div>
  )
}
