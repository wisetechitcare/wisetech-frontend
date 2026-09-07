import MaterialHeaderTab, {
  TabItem,
} from "@app/modules/common/components/MaterialHeaderTab";
import { useSearchParams } from "react-router-dom";
import { PageTitle } from "@metronic/layout/core";
import { Box, Stack } from "@mui/material";
import { ToolbarFilterSelect } from "@app/modules/common/components/ui";
import { useOrgScope, ALL_ORGS, toCompanyIdParam } from "@/hooks/useOrgScope";
import RecruitmentOverview from "./RecruitmentOverview";
import RequisitionsView from "./RequisitionsView";
import PostingsView from "./PostingsView";
import PipelineView from "./PipelineView";
import CandidatesView from "./CandidatesView";
import RecruitmentConfigurationMain from "./RecruitmentConfigurationMain";
import ImportView from "./ImportView";

/**
 * Recruitment / ATS module shell. Mirrors LeadsMain (MaterialHeaderTab +
 * ?tab= URL sync).
 *   Overview     -> funnel analytics dashboard
 *   Requisitions -> requisition list + approvals
 *   Postings     -> public job adverts
 *   Pipeline     -> applications list + kanban board
 *   Candidates   -> applicant directory (full CRUD, audited server-side)
 *   Configure    -> stages / reasons / sources / templates
 *
 * The organization filter lives HERE rather than on each tab: recruitment reads are
 * scoped to the whole org family (one careers page, one candidate pool), so a group
 * with several sub-orgs sees every org's candidates on one board. One control at the
 * shell keeps the same org selected as you move between tabs, instead of six
 * independent filters that silently disagree.
 *
 * Configure is deliberately excluded — stages, reasons and sources are owned by the
 * family root and shared by every sub-org, so filtering them by org would imply an
 * ownership that does not exist.
 */
const TAB_KEYS = ["overview", "requisitions", "postings", "pipeline", "candidates", "import", "configure"] as const;

const RecruitmentMain = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabKey = searchParams.get("tab") || "overview";
  const activeTab = Math.max(0, TAB_KEYS.indexOf(tabKey as any));
  const setActiveTab = (index: number) => {
    setSearchParams({ tab: TAB_KEYS[index] ?? "overview" }, { replace: true });
  };

  const { scopeId, setScopeId, selectOptions, hasChoice } = useOrgScope({
    allLabel: "All organizations",
  });
  // Undefined when "All" is selected, which the API reads as the whole family.
  const companyId = toCompanyIdParam(scopeId);

  /**
   * The organization filter, rendered at the top of each scoped tab rather than above the
   * tab bar. Everywhere else in the app, controls live BELOW the navigation — a filter
   * floating above it reads as chrome belonging to the page, not to the tab beneath.
   *
   * Stacks on mobile so the select gets the full width instead of being squeezed beside
   * its label; right-aligned from sm upward, where there is room.
   */
  const orgFilter = hasChoice ? (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      alignItems={{ xs: "stretch", sm: "center" }}
      justifyContent={{ sm: "flex-end" }}
      spacing={1.25}
      sx={{ px: { xs: 1.5, sm: 2 }, pt: { xs: 1.5, sm: 2 } }}
    >
      {/* The app's standard toolbar filter, not a bespoke select: it carries its own
          label and tints when a non-default value is chosen, so this control behaves
          exactly like the org filters on payroll and the employee list. */}
      <Box sx={{ width: { xs: "100%", sm: "auto" } }}>
        <ToolbarFilterSelect
          label="Organization"
          icon="bank"
          value={scopeId}
          onChange={setScopeId}
          options={selectOptions}
          minWidth={240}
        />
      </Box>
    </Stack>
  ) : null;

  /** Puts the filter above a tab body without each view having to know about it. */
  const scoped = (node: React.ReactNode) => (
    <>
      {orgFilter}
      {node}
    </>
  );

  const tabItems: TabItem[] = [
    { title: "Overview", component: scoped(<RecruitmentOverview companyId={companyId} />), icon: "bi-grid-1x2" },
    { title: "Requisitions", component: scoped(<RequisitionsView companyId={companyId} />), icon: "bi-briefcase" },
    { title: "Postings", component: scoped(<PostingsView companyId={companyId} />), icon: "bi-megaphone" },
    { title: "Pipeline", component: scoped(<PipelineView companyId={companyId} />), icon: "bi-kanban" },
    { title: "Candidates", component: scoped(<CandidatesView companyId={companyId} />), icon: "bi-people" },
    // Sits before Configure: it is a migration tool, used heavily for a short while and
    // then rarely, so it belongs beside the day-to-day tabs rather than buried in settings.
    { title: "Import", component: <ImportView />, icon: "bi-upload" },
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

export { ALL_ORGS };
export default RecruitmentMain;
