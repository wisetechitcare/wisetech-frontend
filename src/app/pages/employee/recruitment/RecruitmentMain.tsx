import MaterialHeaderTab, {
  TabItem,
} from "@app/modules/common/components/MaterialHeaderTab";
import { useSearchParams } from "react-router-dom";
import { PageTitle } from "@metronic/layout/core";
import RecruitmentOverview from "./RecruitmentOverview";
import RequisitionsView from "./RequisitionsView";
import PostingsView from "./PostingsView";
import PipelineView from "./PipelineView";
import CandidatesView from "./CandidatesView";
import RecruitmentConfigurationMain from "./RecruitmentConfigurationMain";

/**
 * Recruitment / ATS module shell. Mirrors LeadsMain (MaterialHeaderTab +
 * ?tab= URL sync). Phase 0 ships the tabbed shell with placeholder bodies;
 * each phase replaces a tab with its real view:
 *   Overview     -> funnel analytics dashboard
 *   Requisitions -> requisition list + approvals
 *   Postings     -> public job adverts
 *   Pipeline     -> applications list + kanban board
 *   Candidates   -> applicant directory (full CRUD, audited server-side)
 *   Configure    -> stages / reasons / sources / templates
 */
const TAB_KEYS = ["overview", "requisitions", "postings", "pipeline", "candidates", "configure"] as const;

const RecruitmentMain = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabKey = searchParams.get("tab") || "overview";
  const activeTab = Math.max(0, TAB_KEYS.indexOf(tabKey as any));
  const setActiveTab = (index: number) => {
    setSearchParams({ tab: TAB_KEYS[index] ?? "overview" }, { replace: true });
  };

  const tabItems: TabItem[] = [
    { title: "Overview", component: <RecruitmentOverview />, icon: "bi-grid-1x2" },
    { title: "Requisitions", component: <RequisitionsView />, icon: "bi-briefcase" },
    { title: "Postings", component: <PostingsView />, icon: "bi-megaphone" },
    { title: "Pipeline", component: <PipelineView />, icon: "bi-kanban" },
    { title: "Candidates", component: <CandidatesView />, icon: "bi-people" },
    { title: "Configure", component: <RecruitmentConfigurationMain />, icon: "bi-gear" },
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
