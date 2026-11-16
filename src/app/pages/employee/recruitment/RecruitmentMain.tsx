import { canTab } from "@utils/can";
import MaterialHeaderTab, {
  TabItem,
} from "@app/modules/common/components/MaterialHeaderTab";
import { tabSlug, useTabRoute } from "@app/hooks/useTabRoute";
import { PageTitle } from "@metronic/layout/core";
import ModuleOrgFilter from "@app/modules/common/components/ModuleOrgFilter";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { useApprovalRealtime } from "@/hooks/useApprovalRealtime";
import { useOrgScope, ALL_ORGS, toCompanyIdParam } from "@/hooks/useOrgScope";
import RecruitmentOverview from "./RecruitmentOverview";
import RequisitionsView from "./RequisitionsView";
import PostingsView from "./PostingsView";
import PipelineView from "./PipelineView";
import CandidatesView from "./CandidatesView";
import RecruitmentConfigurationMain from "./RecruitmentConfigurationMain";
import ImportView from "./ImportView";
import ArchiveView from "./ArchiveView";
import { TERMS } from "./terms";

/**
 * Recruitment / ATS module shell. Mirrors LeadsMain (MaterialHeaderTab + the tab in the
 * PATH, /recruitment/pipeline — see useTabRoute; old ?tab= links are rewritten once).
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
const RecruitmentMain = () => {
  const { scopeId, setScopeId, selectOptions, hasChoice } = useOrgScope({
    allLabel: "All organizations",
  });
  // Undefined when "All" is selected, which the API reads as the whole family.
  const companyId = toCompanyIdParam(scopeId);

  /**
   * A requisition approved elsewhere shows up here without a refresh.
   *
   * Requisitions go through the approval engine, and the person who APPROVES one is almost
   * never the person looking at this board — so every recruitment screen showed a role as
   * still pending until somebody reloaded, and "Open Roles" on the Overview disagreed with
   * the Requisitions tab in front of two people at once.
   *
   * Mounted at the SHELL rather than per tab: the key invalidated is the module root, so one
   * subscription refreshes whichever tab happens to be open and every cached one behind it.
   * React Query refetches only what is actually being observed, so the cost of the wide key
   * is the tab you are looking at, not all seven.
   */
  const qc = useQueryClient();
  useApprovalRealtime(() => qc.invalidateQueries({ queryKey: queryKeys.recruitment.all }));

  // The organization filter sits in the tab bar itself — see ModuleOrgFilter.
  const orgFilter = (
    <ModuleOrgFilter scopeId={scopeId} setScopeId={setScopeId} selectOptions={selectOptions} hasChoice={hasChoice} />
  );

  /**
   * Import and Configure are not organization-scoped, so the filter would be a control that
   * does nothing on those two tabs. Hiding it there is more honest than disabling it.
   * Keyed on the TITLE, like the tab slugs — one name per tab, not a parallel key list.
   */
  const UNSCOPED_TABS = new Set(["Import", "Configure"]);

  // canTab: Configure needs Write; any tab can be turned off under Access → Advanced (SECTION_TABS).
  const tabItems: TabItem[] = ([
    { title: "Overview", component: <RecruitmentOverview companyId={companyId} />, icon: "bi-grid-1x2" },
    // Tab LABELS come from TERMS, and the URL slug is derived from the label, so the two
    // cannot disagree. The module used to say "Requisitions" here and "role" inside every
    // dialog, which is one thing with two names.
    { title: TERMS.Requisitions, component: <RequisitionsView companyId={companyId} />, icon: "bi-briefcase" },
    { title: TERMS.Postings, component: <PostingsView companyId={companyId} />, icon: "bi-megaphone" },
    { title: "Pipeline", component: <PipelineView companyId={companyId} />, icon: "bi-kanban" },
    { title: "Candidates", component: <CandidatesView companyId={companyId} />, icon: "bi-people" },
    // Sits before Configure: it is a migration tool, used heavily for a short while and
    // then rarely, so it belongs beside the day-to-day tabs rather than buried in settings.
    { title: "Import", component: <ImportView />, icon: "bi-upload" },
    { title: "Archive", component: <ArchiveView companyId={companyId} />, icon: "bi-archive" },
    { title: "Configure", component: <RecruitmentConfigurationMain />, icon: "bi-gear" },
  ] as TabItem[]).filter((t) => canTab("recruitment", tabSlug(t.title)));

  // The tab is the path segment (/recruitment/pipeline), so it survives a refresh, a shared
  // link and the remount the header does at the mobile breakpoint. Slugs come from the titles,
  // so a renamed tab in TERMS renames its URL — keep routing/tabPaths.ts in step.
  const { activeTab, setActiveTab } = useTabRoute("/recruitment", tabItems.map((t) => t.title));

  const breadcrumbs = [
    { title: "Recruitment", path: "/recruitment", isSeparator: false, isActive: false },
    { title: "", path: "", isSeparator: true, isActive: false },
  ];

  const activeTitle = tabItems[activeTab]?.title ?? "Recruitment";

  return (
    <div>
      <PageTitle breadcrumbs={breadcrumbs}>{activeTitle}</PageTitle>

      <MaterialHeaderTab
        headerAction={UNSCOPED_TABS.has(activeTitle) ? undefined : orgFilter}
        tabItems={tabItems}
        onTabChange={setActiveTab}
        activeTab={activeTab}
      />
    </div>
  );
};

export { ALL_ORGS };
export default RecruitmentMain;
