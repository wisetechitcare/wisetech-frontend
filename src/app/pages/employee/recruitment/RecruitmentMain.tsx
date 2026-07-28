import MaterialHeaderTab, {
  TabItem,
} from "@app/modules/common/components/MaterialHeaderTab";
import { useSearchParams } from "react-router-dom";
import { PageTitle } from "@metronic/layout/core";
import RequisitionsView from "./RequisitionsView";
import RequisitionStagesConfig from "./RequisitionStagesConfig";
import PipelineView from "./PipelineView";
import PipelineConfig from "./PipelineConfig";

/**
 * Recruitment / ATS module shell. Mirrors LeadsMain (MaterialHeaderTab +
 * ?tab= URL sync). Phase 0 ships the tabbed shell with placeholder bodies;
 * each phase replaces a tab with its real view:
 *   Overview     -> funnel analytics dashboard (Phase 6)
 *   Requisitions -> requisition list + approvals (Phase 1)
 *   Pipeline     -> applications list + kanban board (Phase 2)
 *   Candidates   -> applicant directory (Phase 2)
 *   Configure    -> stages / reasons / sources / templates (Phase 1+)
 */
const TAB_KEYS = ["overview", "requisitions", "pipeline", "candidates", "configure"] as const;

const ComingSoon = ({ label }: { label: string }) => (
  <div
    className="d-flex flex-column align-items-center justify-content-center text-center"
    style={{ minHeight: 320, gap: 8 }}
  >
    <i className="bi bi-cone-striped" style={{ fontSize: 40, opacity: 0.5 }} />
    <div className="fs-4 fw-semibold">{label}</div>
    <div className="text-muted">This section is coming soon.</div>
  </div>
);

const RecruitmentMain = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabKey = searchParams.get("tab") || "overview";
  const activeTab = Math.max(0, TAB_KEYS.indexOf(tabKey as any));
  const setActiveTab = (index: number) => {
    setSearchParams({ tab: TAB_KEYS[index] ?? "overview" }, { replace: true });
  };

  const tabItems: TabItem[] = [
    { title: "Overview", component: <ComingSoon label="Recruitment Overview" />, icon: "bi-grid-1x2" },
    { title: "Requisitions", component: <RequisitionsView />, icon: "bi-briefcase" },
    { title: "Pipeline", component: <PipelineView />, icon: "bi-kanban" },
    { title: "Candidates", component: <ComingSoon label="Candidates" />, icon: "bi-people" },
    {
      title: "Configure",
      component: (
        <>
          <RequisitionStagesConfig />
          <PipelineConfig />
        </>
      ),
      icon: "bi-gear",
    },
  ];

  const breadcrumbs = [
    { title: "Recruitment", path: "/recruitment", isSeparator: false, isActive: false },
    { title: "", path: "", isSeparator: true, isActive: false },
  ];

  return (
    <div>
      <PageTitle breadcrumbs={breadcrumbs}>{tabItems[activeTab].title}</PageTitle>
      <MaterialHeaderTab
        tabItems={tabItems}
        onTabChange={setActiveTab}
        activeTab={activeTab}
      />
    </div>
  );
};

export default RecruitmentMain;
