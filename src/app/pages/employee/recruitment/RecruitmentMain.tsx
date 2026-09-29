import { canSection } from "@utils/can";
import MaterialHeaderTab, {
  TabItem,
} from "@app/modules/common/components/MaterialHeaderTab";
import { useTabRoute } from "@app/hooks/useTabRoute";
import { PageTitle } from "@metronic/layout/core";
import { useState } from "react";
import { Box, Menu, MenuItem, useMediaQuery, useTheme } from "@mui/material";
import { WtField } from "@app/modules/common/components/ui";
import { AppIcon } from "@app/modules/common/components/ui/AppIcon";
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
  const isPhone = useMediaQuery(useTheme().breakpoints.down("sm"));
  const [orgMenuAnchor, setOrgMenuAnchor] = useState<HTMLElement | null>(null);
  const scopedToOne = scopeId !== ALL_ORGS;

  /**
   * Phones: the filter as one 36px icon button, the same size and frosted fill as the tab icons
   * beside it. A 200px select cannot share a ~360px bar with seven tabs. A white dot on the
   * icon says a specific organization is selected; the menu names it.
   */
  const phoneOrgFilter = hasChoice ? (
    <>
      <Box
        component="button"
        type="button"
        aria-label={`Organization: ${selectOptions.find((o) => o.value === scopeId)?.label ?? ""}. Change organization`}
        aria-haspopup="menu"
        aria-expanded={Boolean(orgMenuAnchor)}
        title="Organization"
        onClick={(e: React.MouseEvent<HTMLElement>) => setOrgMenuAnchor(e.currentTarget)}
        sx={{
          // Dressed like a phone tab cell: the bar stretches it to the tabs' height.
          position: "relative",
          width: 44,
          minHeight: 36,
          display: "grid",
          placeItems: "center",
          border: 0,
          borderRadius: "10px",
          color: "#fff",
          backgroundColor: scopedToOne || orgMenuAnchor ? "rgba(255,255,255,0.18)" : "transparent",
          cursor: "pointer",
          "&:focus-visible": { outline: "2px solid rgba(255,255,255,0.8)", outlineOffset: "-2px" },
        }}
      >
        <AppIcon name="bank" className="fs-3" />
        {scopedToOne && (
          <Box component="span" sx={{ position: "absolute", top: 7, right: 7, width: 7, height: 7, borderRadius: "50%", bgcolor: "background.paper" }} />
        )}
      </Box>
      <Menu
        anchorEl={orgMenuAnchor}
        open={Boolean(orgMenuAnchor)}
        onClose={() => setOrgMenuAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { sx: { mt: 0.75, minWidth: 220, borderRadius: "12px", boxShadow: "0 12px 32px rgba(15,23,42,0.18)" } } }}
      >
        {selectOptions.map((option) => {
          const selected = option.value === scopeId;
          return (
            <MenuItem
              key={option.value}
              selected={selected}
              onClick={() => { setOrgMenuAnchor(null); setScopeId(option.value); }}
              sx={{
                minHeight: 44, gap: 1, fontSize: 14,
                fontWeight: selected ? 700 : 500,
                color: selected ? "#1E3A8A" : "#334155",
                "&.Mui-selected": { backgroundColor: "action.selected" },
                "&.Mui-selected:hover": { backgroundColor: "action.hover" },
              }}
            >
              <Box component="span" sx={{ flex: 1 }}>{option.label}</Box>
              {selected && (
                <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
              )}
            </MenuItem>
          );
        })}
      </Menu>
    </>
  ) : null;

  const orgFilter = !hasChoice ? null : isPhone ? phoneOrgFilter : (
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
  );

  /**
   * Import and Configure are not organization-scoped, so the filter would be a control that
   * does nothing on those two tabs. Hiding it there is more honest than disabling it.
   * Keyed on the TITLE, like the tab slugs — one name per tab, not a parallel key list.
   */
  const UNSCOPED_TABS = new Set(["Import", "Configure"]);

  // Configure changes stages and sources for everyone — Write only.
  const canConfigure = canSection("recruitment", "write");
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
    ...(canConfigure ? [{ title: "Configure", component: <RecruitmentConfigurationMain />, icon: "bi-gear" }] : []),
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
