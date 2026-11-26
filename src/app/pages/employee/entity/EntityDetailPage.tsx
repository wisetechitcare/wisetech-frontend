import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useTabKeyRoute } from "@app/hooks/useTabRoute";
import { Button } from "@/ds/ui/button";
import { useDispatch } from "react-redux";
import { getLeadById } from "@services/leads";
import {
  getClientCompanyById,
  getClientContactById,
} from "@services/companies";
import { useEventBus } from "@hooks/useEventBus";
import { EVENT_KEYS } from "@constants/eventKeys";
import { mapLeadToFormInitialValues } from "@pages/employee/leads/lead/utils";
import { canSection, canViewCommercial } from "@utils/can";
import { loadAllEmployeesIfNeeded } from "@redux/slices/allEmployees";
import type { AppDispatch } from "@redux/store";

import LeadWizardModal from "@pages/employee/leads/lead/LeadWizardModal";
import { DMSProvider } from "@pages/employee/leads/lead/components/dms/store/DmsContext";

import {
  isProjectEntity,
  getProjectPhase,
  projectNumberOf,
  PHASE_THEMES,
} from "./entityUtils";
import { DensityProvider } from "./detail/density";
import { buildEntityVM, ENTITY_TABS } from "./detail/facets";

import SummarySection from "./detail/sections/SummarySection";
import {
  TasksTab,
  TimesheetTab,
  ReimbursementTab,
} from "./detail/sections/ProjectModuleTabs";
import DocumentsTab from "./detail/sections/DocumentsTab";
import ProjectGalleryTab from "@app/modules/project-gallery/ProjectGalleryTab";
import { ProjectAvatar } from "@app/modules/project-gallery/ProjectAvatar";
import { initialsOf } from "@app/modules/project-gallery/media";
import AuditSection from "./detail/sections/AuditSection";
import TeamsSection from "./detail/sections/TeamsSection";
import BillingSection from "./detail/sections/BillingSection";
import DeliverablesSection from "./detail/sections/DeliverablesSection";
import ProjectMeetings from "./detail/sections/ProjectMeetings";
import ProjectStatusControl from "./detail/ProjectStatusControl";
import { RecordHeader } from "@/ds/patterns/record-header";
import { OptionPickerTrigger } from "@/ds/patterns/option-picker-dialog";
import { Badge } from "@/ds/ui/badge";
import { KanbanSquare, Pencil, Star } from "lucide-react";
import { UnderlineTabs, WtEmptyState } from "@app/modules/common/components/ui";
import NoAccessPage from "@app/modules/common/components/NoAccessPage";
import SensitiveDataProvider, {
  SensitiveDataBarToggle,
} from "@app/modules/common/components/SensitiveData";

/** Tabs carrying money, and so the eye that blurs it. */
const EYE_TABS = ["commercial"];

const NOT_AUTHORIZED = "not-authorized";

/**
 * Unified Entity detail page. ONE entity, ONE page. The Lead is the master; the
 * Project is an extension that surfaces — inside the SAME tabs — once the lead
 * reaches a project-trigger status (exactly like the wizard reveals its
 * execution step). The only conditional tab is Execution. There is no separate
 * "project view": `isProject` is driven purely by the data, not navigation.
 */
const EntityDetailPage: React.FC = () => {
  const params = useParams<{ leadId?: string; id?: string }>();
  const leadId = params.leadId || params.id;
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch<AppDispatch>();

  // ── Entry context lives in the PATH, not in history.state. ─────────────────
  //    /project/:id  → project view: land on the Projects tab, full project tab set.
  //    /leads/:id    → lead view: land on Leads, project-only tabs hidden entirely
  //                    (Projects/Tasks/Timesheet/…), even for a received lead.
  //
  //    It used to ride on location.state, which broke twice over: writing the
  //    ?tab= param navigated without carrying state forward, so the first tab
  //    click silently turned a lead into a project; and the choice was invisible
  //    in the URL, so it could not be shared or bookmarked. A path segment has
  //    neither problem — it survives refresh, copy-paste and every navigation.
  const fromProjects = location.pathname.startsWith("/project/");
  const fromLeads = !fromProjects;

  // ── Tab lives in the URL (?tab=billing) ─────────────────────────────────────
  //    Not cosmetic: a tab held only in component state cannot be linked to,
  //    survives no refresh, and gives a page navigated away from nowhere to
  //    return to. The Project Financial Workspace hands `?tab=billing` to Billing
  //    as its return address, so this has to be addressable for "Back" to land
  //    anywhere but the default tab.
  //
  //    Written with `replace` so flipping tabs does not stack history entries —
  //    browser Back should leave the project, not walk back through its tabs.
  // The tab is a path segment (/leads/<id>/billing), so it survives a refresh, is
  // shareable, and gives Billing a return address. `useTabKeyRoute` carries
  // `history.state` through every tab navigation — without it the entry context
  // (opened from Leads vs Projects) is erased on the first tab click, and every
  // project-only tab appears on a lead opened from the Leads table.
  // Old `?tab=` links are rewritten to the path form once.
  const [lead, setLead] = useState<any | null>(null);
  const [company, setCompany] = useState<any | null>(null);
  const [contact, setContact] = useState<any | null>(null);

  const [formValues, setFormValues] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // The lead IS a project once it reaches a project-trigger status — data-driven, not nav-driven.
  const isProject = isProjectEntity(lead);
  const canWrite = canSection(isProject ? "projects" : "crm.leads", "write");
  const projectId = lead?.projectId || lead?.project?.id || null;
  const phase = getProjectPhase(lead);
  const phaseTheme = PHASE_THEMES[phase] ?? PHASE_THEMES.none;

  // Project-only tabs (Tasks/Timesheet/Reimbursement) show for ANY project-trigger
  // lead — they fetch operational data by lead id, so a linked project row is no
  // longer required (lead-as-master). Entering from the Leads table suppresses
  // them entirely (lead-focused view), regardless of project status.
  const tabs = useMemo(
    () =>
      ENTITY_TABS.filter(
        (t) =>
          (!t.projectOnly || (isProject && !fromLeads)) &&
          // Money tabs: Commercial follows the page (a lead page also shows the project's
          // commercials once converted), Billing is project money.
          (t.key !== "commercial" ||
            canViewCommercial(
              isProject && !fromLeads ? "projects" : "crm.leads",
            )) &&
          (t.key !== "billing" || canViewCommercial("projects")),
      ),
    [isProject, fromLeads],
  );

  // Entering from the Projects table lands on Projects, from Leads on Leads.
  // No keys until the lead loads: the project-only tabs depend on it, and a partial list
  // would read `/project/:id/teams` as an unknown tab and redirect away from it on refresh.
  // An empty list tells the route hook to leave the URL alone (the page shows a loader).
  const { activeKey: activeTab, setActiveKey: setActiveTab } = useTabKeyRoute(
    undefined,
    lead ? tabs.map((t) => t.key) : [],
    fromProjects ? "projects" : "leads",
  );
  const vm = useMemo(() => (lead ? buildEntityVM(lead) : null), [lead]);

  // Live counts surfaced AS TAB BADGES (replaces the redundant related-records
  // strip, which just re-navigated to these same tabs). Only shown when > 0.
  const tabCounts = useMemo<Record<string, number>>(() => {
    const p = lead?.project || {};
    return {
      tasks: p?._count?.tasks ?? 0,
      timesheet: p?._count?.timesheets ?? 0,
      reimbursement: p?._count?.reimbursements ?? 0,
    };
  }, [lead]);

  // A tab that is no longer in the list (project-only tabs on a lead) resolves to the
  // first one inside useTabKeyRoute, so nothing has to correct it here.

  const fetchLeadDetails = useCallback(async () => {
    if (!leadId) {
      setError("No lead ID provided");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      // Add cache-busting parameter to ensure fresh data
      const leadResponse = await getLeadById(leadId, { _t: Date.now() });
      const leadData = leadResponse.data.data.lead;
      setLead(leadData);
      const promises: Promise<any>[] = [];
      if (leadData.companyId)
        promises.push(
          getClientCompanyById(leadData.companyId)
            .then((r) => setCompany(r?.data?.company || null))
            .catch(console.error),
        );
      if (leadData.contactId)
        promises.push(
          getClientContactById(leadData.contactId)
            .then((r) => setContact(r?.data?.contact || null))
            .catch(console.error),
        );
      await Promise.all(promises);
      setError(null);
    } catch (err: any) {
      console.error("Error fetching lead details:", err);
      // 404 / 403: the server's by-id rule — not theirs (or gone). Say so instead of "failed".
      const status = err?.response?.status;
      setLead(null);
      setError(
        status === 404 || status === 403
          ? NOT_AUTHORIZED
          : "Failed to load details. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    dispatch(loadAllEmployeesIfNeeded());
  }, [dispatch]);

  useEffect(() => {
    fetchLeadDetails();
  }, [fetchLeadDetails]);

  useEventBus(EVENT_KEYS.leadUpdated, (payload) => {
    // A saver that already holds the updated lead hands it over and the page takes it as
    // given: the PATCH read it back AFTER its own transaction committed, so there is nothing
    // fresher to fetch. Every save used to wait 150ms and then re-fetch the whole lead behind
    // this page's loading spinner — a second round-trip whose only job was to see what the
    // first had already returned.
    //
    // Only when company/contact are unmoved: those two drive side fetches this page also
    // holds, so a save that changes either still takes the full path.
    const next = (payload as any)?.lead;
    if (
      next?.id &&
      lead?.companyId === next.companyId &&
      lead?.contactId === next.contactId
    ) {
      setLead(next);
      return;
    }
    // Small delay to ensure backend has persisted the change
    setTimeout(fetchLeadDetails, 150);
  });
  useEventBus(EVENT_KEYS.projectUpdated, () => {
    setTimeout(fetchLeadDetails, 150);
  });
  useEventBus(EVENT_KEYS.projectCreated, () => {
    setTimeout(fetchLeadDetails, 150);
  });

  // The Gallery tab changes the cover; the header avatar follows without refetching the lead.
  const onCoverChange = useCallback(
    (url: string | null) =>
      setLead((l: any) => (l ? { ...l, coverImageUrl: url } : l)),
    [],
  );

  const openEdit = useCallback(
    () => lead && setFormValues(mapLeadToFormInitialValues(lead)),
    [lead],
  );

  const renderTab = () => {
    if (error || !lead || !vm)
      return (
        <div className="alert alert-danger">{error || "No data available"}</div>
      );
    switch (activeTab) {
      case "leads":
      case "projects":
      case "commercial":
        return (
          <SummarySection
            lead={lead}
            vm={vm}
            company={company}
            contact={contact}
            onJump={openEdit}
            view={activeTab}
          />
        );
      case "tasks":
        return <TasksTab lead={lead} projectId={projectId} />;
      case "deliverables":
        return <DeliverablesSection lead={lead} />;
      case "timesheet":
        return <TimesheetTab lead={lead} projectId={projectId} />;
      case "reimbursement":
        return <ReimbursementTab lead={lead} projectId={projectId} />;
      case "documents":
        return (
          <DocumentsTab
            lead={lead}
            vm={vm}
            isProject={isProject}
            projectId={projectId}
          />
        );
      case "gallery":
        return (
          <ProjectGalleryTab
            leadId={lead.id}
            projectName={lead.title || "Project"}
            onCoverChange={onCoverChange}
          />
        );
      case "audit":
        return (
          <AuditSection
            leadId={leadId}
            isProject={isProject}
            projectId={projectId}
            onChanged={fetchLeadDetails}
          />
        );
      case "teams":
        return <TeamsSection lead={lead} />;
      case "meetings":
        // Meetings are linked by projectId = the lead id (lead-as-master).
        // A lead that is not yet a project is on nobody's project list, so the meeting form
        // needs its name handed over (same as the Leads table does).
        return (
          <ProjectMeetings
            leadId={lead.id}
            leadName={
              isProject ? undefined : lead.title || lead.prefix || "Lead"
            }
          />
        );
      case "billing":
        return <BillingSection lead={lead} />;
      default:
        return null;
    }
  };

  if (!isLoading && !lead && error) {
    if (error === NOT_AUTHORIZED) {
      return (
        <NoAccessPage
          kind="record"
          title="You don't have access to this lead or project"
        />
      );
    }
    return (
      <div className="py-10">
        <WtEmptyState
          variant="error"
          title="Couldn't load this record"
          hint={error}
          actionLabel="Try again"
          onAction={fetchLeadDetails}
        />
      </div>
    );
  }

  if (isLoading || !lead) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  const showProjectView = isProject && !fromLeads && activeTab !== "leads";

  return (
    <DMSProvider
      leadId={lead.id}
      inquiryNumber={lead.inquiryNo || lead.prefix || "N/A"}
      leadTitle={lead.title || lead.name || "Lead"}
    >
      <div className="d-flex flex-column flex-lg-row p-6">
        <div className="flex-lg-row-fluid">
          {/* ── Header ── */}
          {/* Which number identifies this record follows the VIEW, not just the tab: in the lead view every tab is
              looking at the lead, so it stays the lead/OFFER number throughout. Status follows the tab: Lead status
              on the Leads tab, Project status everywhere else (once the lead is a project). */}
          <RecordHeader
            title={lead?.title || "Unnamed Entity"}
            reference={showProjectView ? projectNumberOf(lead) || "N/A" : lead?.prefix || "N/A"}
            referenceTone={showProjectView ? "brand" : "muted"}
            onBack={() => navigate(-1)}
            avatar={
              isProject && !fromLeads ? (
                <ProjectAvatar src={lead?.coverImageUrl} label={initialsOf(lead?.title || "")} className="size-11 text-sm" />
              ) : undefined
            }
            meta={
              <>
                {lead?.revisionCount !== undefined && lead?.revisionCount !== null && (
                  <Badge variant="neutral" title="Revision">Rev {lead.revisionCount}</Badge>
                )}
                {lead?.priority && (
                  <Badge variant="amber"><Star aria-hidden /> {lead.priority}</Badge>
                )}
              </>
            }
            actions={
              <>
                {showProjectView ? (
                  <ProjectStatusControl
                    leadId={leadId!}
                    projectStatusId={lead?.execution?.projectStatusId}
                    projectStatus={lead?.execution?.projectStatus}
                    actualEndDate={lead?.actualEndDate}
                    onChanged={fetchLeadDetails}
                    prefix="Project"
                  />
                ) : (
                  <OptionPickerTrigger
                    label="Lead"
                    value={lead?.status?.name || "Set status"}
                    color={lead?.status?.color || "#64748B"}
                  />
                )}
                {/* The lead view hides every project tab by design, so a lead that IS a project needs a door through
                    to the project view — without it an old /leads/:id link to a project is a dead end. */}
                {isProject && fromLeads && (
                  <Button variant="outline" size="sm" onClick={() => navigate(`/project/${leadId}`)}>
                    <KanbanSquare data-icon="inline-start" />
                    Project view
                  </Button>
                )}
                {canWrite && activeTab === "leads" && (
                  <Button size="sm" onClick={openEdit}>
                    <Pencil data-icon="inline-start" />
                    Edit
                  </Button>
                )}
              </>
            }
          />

          {/* ── Sticky tab nav ── */}
          {/* The provider wraps the bar AND the content so one eye governs both. Disabled
              off the money tabs: blurring a figure on a tab with no switch would hide it
              with no way to read it back. */}
          <SensitiveDataProvider disabled={!EYE_TABS.includes(activeTab)}>
            <UnderlineTabs
              sticky
              tabs={tabs.map((t) => ({ ...t, count: tabCounts[t.key] }))}
              value={activeTab}
              onChange={setActiveTab}
              ariaLabel="Record sections"
              sx={{ mt: 3 }}
              actions={
                EYE_TABS.includes(activeTab) ? (
                  <SensitiveDataBarToggle />
                ) : undefined
              }
            />

            <div className="tab-content">
              <DensityProvider mode="advanced">{renderTab()}</DensityProvider>
            </div>
          </SensitiveDataProvider>
        </div>
      </div>

      {formValues && (
        <LeadWizardModal
          key={formValues?.id || "edit-lead-modal"}
          leadTemplateId={formValues?.leadTemplateId}
          open={true}
          onClose={() => setFormValues(null)}
          title={formValues?.id ? `Edit Lead / Project` : "New Lead"}
          initialData={
            formValues?.id
              ? { id: formValues?.leadTemplateId }
              : { ...formValues, title: "" }
          }
          initialFormData={formValues}
          isEditMode={!!formValues?.id}
        />
      )}
    </DMSProvider>
  );
};

export default EntityDetailPage;
