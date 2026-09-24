import MaterialHeaderTab, {
  TabItem,
} from "@app/modules/common/components/MaterialHeaderTab";
import { useTabRoute } from "@app/hooks/useTabRoute";
import { PageTitle } from "@metronic/layout/core";
import { WtField } from "@app/modules/common/components/ui";
import { useOrgScope, ALL_ORGS, toCompanyIdParam } from "@/hooks/useOrgScope";
import RecruitmentOverview from "./RecruitmentOverview";
import RequisitionsView from "./RequisitionsView";
import PostingsView from "./PostingsView";
import PipelineView from "./PipelineView";
import CandidatesView from "./CandidatesView";
import RecruitmentConfigurationMain from "./RecruitmentConfigurationMain";
import ImportView from "./ImportView";
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
   * The organization filter, in the tab bar itself.
   *
   * It used to sit on its own row underneath, repeated inside every scoped tab, which cost
   * a full line of vertical space on every screen in the module before any content showed.
   * `MaterialHeaderTab` has a `headerAction` slot on the right of the bar for precisely
   * this.
   *
   * NO LABEL, deliberately. `WtField` never styles its label — MUI sizes the notch from the
   * label's default metrics, so restyling one for a dark gradient is how a label ends up
   * sitting on the border line. It is redundant anyway: the control reads
   * "All organizations" beside a bank icon, which says what it is without a caption.
   *
   * Only the surface is themed for the bar, which is allowed. The white tone also carries
   * the icon and the focus ring, so one prop covers all three.
   */
  const orgFilter = hasChoice ? (
    <WtField
      icon="bank"
      value={scopeId}
      onChange={setScopeId}
      options={selectOptions}
      tone="#ffffff"
      fullWidth={false}
      minWidth={200}
      sx={{
        "& .MuiOutlinedInput-root": {
          color: "#fff",
          backgroundColor: "rgba(255,255,255,0.14)",
        },
        "& .MuiSelect-icon": { color: "rgba(255,255,255,0.85)" },
      }}
    />
  ) : null;

  /**
   * Import and Configure are not organization-scoped, so the filter would be a control that
   * does nothing on those two tabs. Hiding it there is more honest than disabling it.
   * Keyed on the TITLE, like the tab slugs — one name per tab, not a parallel key list.
   */
  const UNSCOPED_TABS = new Set(["Import", "Configure"]);

  const tabItems: TabItem[] = [
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
    { title: "Configure", component: <RecruitmentConfigurationMain />, icon: "bi-gear" },
  ];

  // The tab is the path segment (/recruitment/pipeline), so it survives a refresh, a shared
  // link and the remount the header does at the mobile breakpoint. Slugs come from the titles,
  // so a renamed tab in TERMS renames its URL — keep routing/tabPaths.ts in step.
  const { activeTab, setActiveTab } = useTabRoute("/recruitment", tabItems.map((t) => t.title));

  const breadcrumbs = [
    { title: "Recruitment", path: "/recruitment", isSeparator: false, isActive: false },
    { title: "", path: "", isSeparator: true, isActive: false },
  ];

  return (
    <div>
      <PageTitle breadcrumbs={breadcrumbs}>{tabItems[activeTab].title}</PageTitle>


      <MaterialHeaderTab
        headerAction={UNSCOPED_TABS.has(tabItems[activeTab].title) ? undefined : orgFilter}
        tabItems={tabItems}
        onTabChange={setActiveTab}
        activeTab={activeTab}
      />
    </div>
  );
};

export { ALL_ORGS };
export default RecruitmentMain;
