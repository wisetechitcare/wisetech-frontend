import { useRef, useState } from "react"
import { Download, PaintBucket, Presentation, RotateCcw } from "lucide-react"
import { Box } from "@mui/material"
import { ListHeader, ToneChip, WtButton, confirmDialog, toast } from "@app/modules/common/components/ui"
import { DeckStage } from "@app/modules/company-profile/DeckStage"
import { ProfileSlide } from "@app/modules/company-profile/ProfileSlide"
import { SectionList } from "@app/modules/company-profile/SectionList"
import { SlideBackground } from "@app/modules/company-profile/SlideBackground"
import { DEMO_DATA, DEMO_SECTIONS } from "@app/modules/company-profile/fixtures"
import { MAX_SLIDES, places, plural, projectsOf, type PickSection, type ProfileData, type Section } from "@app/modules/company-profile/profile"
import { sectionMeta, sectionSlides, takenElsewhere, type EditableSection, type SlideSpec } from "@app/modules/company-profile/profileBuilder"
import { useProfileBuilder } from "@app/modules/company-profile/useProfileBuilder"
import { useHomeRootOrg } from "@hooks/useRootOrgNames"
import { CoverSlide } from "./CoverSlide"
import { DeckPrint } from "./DeckPrint"
import { ListPicker, type ListItem } from "./ListPicker"
import { ProjectsPicker } from "./ProjectsPicker"


/** Picker heading and rows for a list section: services, companies (logo wall or repeat chart) or map pins. */
function itemsFor(s: PickSection, data: ProfileData): { heading: string; items: ListItem[] } {
  if (s.kind === "services") return { heading: "Choose services", items: data.services.map((x) => ({ id: x.id, label: x.name, sub: `${x.projects} projects` })) }
  if (s.kind === "companies")
    return { heading: "Choose companies", items: data.companies.map((c) => ({ id: c.id, label: c.name, sub: plural(projectsOf(data.projects, c.name), "project"), image: c.logo })) }
  return {
    heading: s.region === "india" ? "Choose cities to pin on the India map" : "Choose countries to pin on the world map",
    items: places(data.projects, s.region).map((p) => ({ id: p.id, label: p.name, sub: plural(p.count, "project") })),
  }
}

// ponytail: the Storybook deck as-is while the page runs on sample data; build sections from live data when the API lands.
const SECTIONS = DEMO_SECTIONS
const notify = (text: string) => void toast({ icon: "warning", title: "Slide limit reached", text })

/**
 * CRM → Company Profile: Cover, About us, Who we are, Services, every project category, Our Clients, Repeat
 * clients, the India and world maps and Contact. At most MAX_SLIDES are shown; the rest stay listed, hidden.
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
  const render = (spec: SlideSpec) => <ProfileSlide spec={spec} data={data} bg={b.bg} cover={<CoverSlide data={data} logo={logo} />} />
  const reset = async () => {
    if (await confirmDialog({ title: "Reset the presentation?", text: "Sections, order, picked items and background go back to the original deck.", confirmText: "Reset" })) b.reset()
  }
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
            <WtButton ghost startIcon={<RotateCcw />} disabled={!b.changed} onClick={reset}>
              Reset
            </WtButton>
            <SlideBackground value={b.bg} onChange={b.setBg} trigger={<WtButton ghost startIcon={<PaintBucket />}>Background</WtButton>} />
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
          {b.slides.length >= MAX_SLIDES && (
            <p className="mt-3 text-sm text-muted-foreground" data-testid="slide-limit-note">
              The presentation is at {MAX_SLIDES} slides. Hide a slide to show another.
            </p>
          )}
        </aside>
        <DeckStage slides={b.slides} current={b.current} onGo={b.go} render={render} stageRef={stage} />
      </div>

      {editing && editing.kind !== "projects" && <ListPicker {...itemsFor(editing, data)} section={editing} onSave={save} onClose={() => setEditing(null)} />}
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
