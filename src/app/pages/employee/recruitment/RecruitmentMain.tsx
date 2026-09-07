import MaterialHeaderTab, {
  TabItem,
} from "@app/modules/common/components/MaterialHeaderTab";
import { useSearchParams } from "react-router-dom";
import { PageTitle } from "@metronic/layout/core";
import { MenuItem, Select, Stack, Typography } from "@mui/material";
import { useOrgScope, ALL_ORGS, toCompanyIdParam } from "@/hooks/useOrgScope";
import RecruitmentOverview from "./RecruitmentOverview";
import RequisitionsView from "./RequisitionsView";
import PostingsView from "./PostingsView";
import PipelineView from "./PipelineView";
import CandidatesView from "./CandidatesView";
import RecruitmentConfigurationMain from "./RecruitmentConfigurationMain";

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
const TAB_KEYS = ["overview", "requisitions", "postings", "pipeline", "candidates", "configure"] as const;

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

  const tabItems: TabItem[] = [
    { title: "Overview", component: <RecruitmentOverview companyId={companyId} />, icon: "bi-grid-1x2" },
    { title: "Requisitions", component: <RequisitionsView companyId={companyId} />, icon: "bi-briefcase" },
    { title: "Postings", component: <PostingsView companyId={companyId} />, icon: "bi-megaphone" },
    { title: "Pipeline", component: <PipelineView companyId={companyId} />, icon: "bi-kanban" },
    { title: "Candidates", component: <CandidatesView companyId={companyId} />, icon: "bi-people" },
    { title: "Configure", component: <RecruitmentConfigurationMain />, icon: "bi-gear" },
  ];

  const breadcrumbs = [
    { title: "Recruitment", path: "/recruitment", isSeparator: false, isActive: false },
    { title: "", path: "", isSeparator: true, isActive: false },
  ];

  return (
    <div>
      <PageTitle breadcrumbs={breadcrumbs}>{tabItems[activeTab].title}</PageTitle>

      {/* Only worth showing when there is more than one organization to choose between. */}
      {hasChoice && (
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="flex-end"
          spacing={1.25}
          sx={{ mb: 1.5, px: { xs: 1.5, sm: 2 }, flexWrap: "wrap" }}
        >
          <Typography sx={{ fontSize: 13, fontWeight: 600, color: "text.secondary" }}>
            Organization
          </Typography>
          <Select
            size="small"
            value={scopeId}
            onChange={(e) => setScopeId(e.target.value)}
            sx={{ minWidth: 220, fontSize: 14, bgcolor: "background.paper" }}
            inputProps={{ "aria-label": "Filter recruitment by organization" }}
          >
            {selectOptions.map((o) => (
              <MenuItem key={o.value} value={o.value} sx={{ fontSize: 14 }}>
                {o.label}
              </MenuItem>
            ))}
          </Select>
        </Stack>
      )}

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
