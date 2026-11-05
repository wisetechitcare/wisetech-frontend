import { useRef, useState } from "react"
import { Download, Presentation } from "lucide-react"
import { Box } from "@mui/material"
import { ListHeader, ToneChip, WtButton, toast } from "@app/modules/common/components/ui"
import { DEMO_DATA } from "@app/modules/company-profile/fixtures"
import { MAX_SLIDES } from "@app/modules/company-profile/profile"
import { useHomeRootOrg } from "@hooks/useRootOrgNames"
import { DeckPrint } from "./DeckPrint"
import { DeckStage } from "./DeckStage"
import { ProfileSlide } from "./ProfileSlide"
import { ProjectsPicker } from "./ProjectsPicker"
import { SectionList } from "./SectionList"
import { ServicesPicker } from "./ServicesPicker"
import { sectionMeta, sectionSlides, type EditableSection, type SlideSpec } from "./profileBuilder"
import { useProfileBuilder } from "./useProfileBuilder"

/**
 * CRM → Company Profile (Phase 1): Cover, About us, Who we are, Services we offer and High-rise.
 * Sample data for now (no API yet); only the cover's logo comes from the app, the organisation's own.
 */
export default function CompanyProfilePage() {
  const data = DEMO_DATA
  const { logo } = useHomeRootOrg()
  const b = useProfileBuilder(data)
  const [editing, setEditing] = useState<EditableSection | null>(null)
  const [printWin, setPrintWin] = useState<Window | null>(null)
  const stage = useRef<HTMLElement>(null)
  const save = (s: EditableSection) => b.save(s) && setEditing(null)
  const render = (spec: SlideSpec) => <ProfileSlide spec={spec} data={data} logo={logo} />
  const present = () => stage.current?.requestFullscreen?.().then(() => stage.current?.focus())
  const exportPdf = () => {
    const win = window.open("", "_blank", "width=1280,height=800")
    if (win) setPrintWin(win)
    else void toast({ icon: "warning", title: "Pop-up blocked", text: "Allow pop-ups for this site to export the PDF." })
  }

  return (
    <Box className="mx-auto w-full max-w-[1600px]" sx={{ p: { xs: 2, md: 3 } }}>
      <ListHeader
        title="Company Profile"
        subtitle={`Built from ${data.projects.length} projects and ${data.services.length} CRM services (sample data)`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ToneChip tone={b.slides.length >= MAX_SLIDES ? "warning" : "neutral"} label={`${b.slides.length} of ${MAX_SLIDES} slides`} data-testid="slide-budget" />
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
            onRemove={b.remove}
            onToggle={b.toggle}
            onToggleSlide={b.toggleSlide}
            onReorderSlides={b.reorderSlides}
          />
        </aside>
        <DeckStage slides={b.slides} current={b.current} onGo={b.go} render={render} stageRef={stage} />
      </div>

      {editing?.kind === "services" && <ServicesPicker section={editing} services={data.services} onSave={save} onClose={() => setEditing(null)} />}
      {editing?.kind === "projects" && (
        <ProjectsPicker section={editing} projects={data.projects} budget={b.budgetFor(editing)} onSave={save} onClose={() => setEditing(null)} />
      )}
      {printWin && <DeckPrint win={printWin} slides={b.slides} render={render} onDone={() => setPrintWin(null)} />}
    </Box>
  )
}
