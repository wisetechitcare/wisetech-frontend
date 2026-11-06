import { useRef, useState } from "react"
import { Download, Presentation } from "lucide-react"
import { Box } from "@mui/material"
import { ListHeader, ToneChip, WtButton, toast } from "@app/modules/common/components/ui"
import { DeckStage } from "@app/modules/company-profile/DeckStage"
import { ProfileSlide } from "@app/modules/company-profile/ProfileSlide"
import { SectionList } from "@app/modules/company-profile/SectionList"
import { DEMO_DATA } from "@app/modules/company-profile/fixtures"
import { MAX_SLIDES, plural, projectsOf, type ProfileData, type Section } from "@app/modules/company-profile/profile"
import { categorySections, clientsSection, sectionMeta, sectionSlides, takenElsewhere, type EditableSection, type SlideSpec } from "@app/modules/company-profile/profileBuilder"
import { useProfileBuilder } from "@app/modules/company-profile/useProfileBuilder"
import { useHomeRootOrg } from "@hooks/useRootOrgNames"
import { CoverSlide } from "./CoverSlide"
import { DeckPrint } from "./DeckPrint"
import { ListPicker } from "./ListPicker"
import { ProjectsPicker } from "./ProjectsPicker"


/** The starting deck: the copy slides, Services, a section per project category and the client logo wall. */
const initialSections = (data: ProfileData): Section[] => [
  { id: "cover", kind: "cover", title: "Cover", enabled: true },
  { id: "about", kind: "about", title: "About us", enabled: true },
  { id: "vision", kind: "vision", title: "Who we are", enabled: true },
  { id: "services", kind: "services", title: "Services we offer", enabled: true, ids: data.services.slice(0, 8).map((s) => s.id) },
  ...categorySections(data.projects),
  clientsSection(data),
]

const SECTIONS = initialSections(DEMO_DATA)
const notify = (text: string) => void toast({ icon: "warning", title: "Slide limit reached", text })

/**
 * CRM → Company Profile: Cover, About us, Who we are, Services, every project category and Our Clients.
 * Sample data for now (no API yet); only the cover's logo comes from the app, the organisation's own.
 */
export default function CompanyProfilePage() {
  const data = DEMO_DATA
  const { logo } = useHomeRootOrg()
  const b = useProfileBuilder(data, SECTIONS, notify)
  const [editing, setEditing] = useState<EditableSection | null>(null)
  const [printWin, setPrintWin] = useState<Window | null>(null)
  const stage = useRef<HTMLElement>(null)
  const save = (s: Section) => b.save(s) && setEditing(null)
  const render = (spec: SlideSpec) => <ProfileSlide spec={spec} data={data} cover={<CoverSlide data={data} logo={logo} />} />
  const present = () => stage.current?.requestFullscreen?.().then(() => stage.current?.focus())
  const exportPdf = () => {
    const win = window.open("", "_blank", "width=1280,height=800")
    if (win) setPrintWin(win)
    else void toast({ icon: "warning", title: "Pop-up blocked", text: "Allow pop-ups for this site to export the PDF." })
  }

  return (
    <Box className="mx-auto w-full max-w-[1600px]" sx={{ p: { xs: 2, md: 3 } }}>
      <ListHeader
        title="Company Showcase"
        subtitle={`Built from ${data.projects.length} projects, ${data.companies.length} companies and ${data.services.length} CRM services (sample data) · ${b.generated} slides generated`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ToneChip tone={b.slides.length >= MAX_SLIDES ? "warning" : "neutral"} label={`${b.slides.length} of ${MAX_SLIDES} slides selected`} data-testid="slide-budget" />
            <WtButton ghost startIcon={<Download />} disabled={!b.slides.length || !!printWin} onClick={exportPdf}>
              Export PDF
            </WtButton>
            <WtButton tone="accent" startIcon={<Presentation />} disabled={!b.slides.length} onClick={present}>
              Present
            </WtButton>
          </div>
        }
      />
      {/* Phone: preview first, sections below. Desktop: sections left, preview right. (No `order-*`: Bootstrap's
          are !important and win over Tailwind's in the app.) */}
      <div className="flex flex-col-reverse gap-6 lg:grid lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside aria-label="Sections">
          <SectionList
            sections={b.sections}
            slidesOf={(s) => sectionSlides(s, data)}
            metaOf={(s) => sectionMeta(s, data)}
            onReorder={b.reorder}
            onOpen={b.open}
            onEdit={setEditing}
            onToggle={b.toggle}
            onToggleSlide={b.toggleSlide}
            onReorderSlides={b.reorderSlides}
          />
        </aside>
        <DeckStage slides={b.slides} current={b.current} onGo={b.go} render={render} stageRef={stage} />
      </div>

      {editing?.kind === "services" && (
        <ListPicker
          heading="Choose services"
          section={editing}
          items={data.services.map((x) => ({ id: x.id, label: x.name, sub: `${x.projects} projects` }))}
          onSave={save}
          onClose={() => setEditing(null)}
        />
      )}
      {editing?.kind === "companies" && (
        <ListPicker
          heading="Choose companies"
          section={editing}
          items={data.companies.map((c) => ({ id: c.id, label: c.name, sub: plural(projectsOf(data.projects, c.name), "project"), image: c.logo }))}
          onSave={save}
          onClose={() => setEditing(null)}
        />
      )}
      {editing?.kind === "projects" && (
        <ProjectsPicker
          section={editing}
          projects={data.projects}
          taken={takenElsewhere(b.sections, editing.id)}
          budget={b.budgetFor(editing)}
          onSave={save}
          onClose={() => setEditing(null)}
        />
      )}
      {printWin && <DeckPrint win={printWin} slides={b.slides} render={render} onDone={() => setPrintWin(null)} />}
    </Box>
  )
}
