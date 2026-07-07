import React from "react";
import { useFormikContext } from "formik";
import dayjs from "dayjs";
import { EnterpriseFormWizard, EnterpriseWizardStep, SummaryRow } from "@/shared/form-engine";
import * as L from "./LeadSections";
import {
  AssignmentOutlined,
  PeopleAlt,
  Business,
  MonetizationOn,
  LocationOn,
  SettingsOutlined,
  EventNote,
  DescriptionOutlined,
  TrackChanges,
} from "@mui/icons-material";

/**
 * Placeholder body for wizard steps that exist in the flow but are not built yet.
 * Keeps the step visible/navigable while clearly signalling it is non-functional.
 */
const ComingSoonSection: React.FC<{ title: string }> = ({ title }) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
      padding: "64px 24px",
      color: "#94A3B8",
    }}
  >
    <SettingsOutlined style={{ fontSize: 48, marginBottom: 12, color: "#CBD5E1" }} />
    <div style={{ fontFamily: "Inter, sans-serif", fontSize: 18, fontWeight: 700, color: "#475569" }}>
      {title}
    </div>
    <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, marginTop: 6, maxWidth: 360 }}>
      This section is currently in development. It will be available in a future update — no input is required here for now.
    </div>
  </div>
);

interface LeadWorkspaceProps {
  // ── Dropdown arrays ────────────────────────────────────────────────────────
  categories: any[];
  subcategories: any[];
  services: any[];
  leadStatuses: any[];
  leadProjectStatuses?: any[];   // execution statuses shown after lead becomes "Received"
  cancellationReasons?: any[];   // master list for closure reason (Canceled / Lost)
  employees: any[];
  teams: any[];
  countries: any[];
  leadDirectSources: any[];
  referralTypes: any[];
  companies: any[];
  contacts: any[];
  companyTypes: any[];
  proposalTemplates?: any[];

  // ── Inline create / modal triggers ────────────────────────────────────────
  setShowCategoryModal: (show: boolean) => void;
  setShowSubcategoryModal: (show: boolean) => void;
  setShowServiceModal: (show: boolean) => void;
  setShowCompanyModal: (show: boolean) => void;
  setShowSubCompanyModal: (show: boolean) => void;
  setShowBranchModal: (show: boolean) => void;
  setShowContactModal: (show: boolean) => void;
  setShowDirectSourceModal: (show: boolean) => void;
  setShowReferralTypeModal: (show: boolean) => void;
  setShowCompanyTypeModal: (show: boolean) => void;

  // ── Refresh callbacks ──────────────────────────────────────────────────────
  fetchProjectCategories: () => void;
  fetchProjectSubcategories: () => void;
  fetchProjectServices: () => void;

  // ── Address cascade ────────────────────────────────────────────────────────
  addressStatesOptions: any[];
  addressCitiesOptions: any[];
  handleAddressCountryChange: (index: number, countryId: string, setFieldValue: Function) => void;
  handleAddressStateChange: (index: number, stateId: string, countryId: string, setFieldValue: Function) => void;

  // ── Company / team cascade ─────────────────────────────────────────────────
  teamFilteredCompanies: any;
  teamFilteredSubCompanies: any;
  handleCompanyTypeChange: (index: number, typeId: string, setFieldValue: Function) => void;
  handleCompanyChange: (index: number, companyId: string, setFieldValue: Function) => void;
  handleSubCompanyChange: (index: number, subCompanyId: string, companyId: string, setFieldValue: Function) => void;
  teamFilteredContacts: any;

  // ── Misc ───────────────────────────────────────────────────────────────────
  prefix: string;
  setPrefix: (val: string) => void;
  isEditMode: boolean;
  currLeadData?: any;
  hasDefaultStatus: () => boolean;
  onHide: () => void;
  onSaveUpdate?: () => void;
  onSaveRevision?: () => void;
  onFinalSave?: () => void;
  onSaveDraft?: () => void;
  isSavingDraft?: boolean;
  onStepChange?: (step: number) => void;
  initialStep?: number;
  formikProps: any;
}

export const LeadWorkspace: React.FC<LeadWorkspaceProps> = (props) => {
  const { values, isSubmitting, setFieldValue } = useFormikContext<any>();

  const currentStatusName = props.leadStatuses.find((x) => x.id === values.statusId)?.name;

  const lastTemplateIdRef = React.useRef<string | null>(null);
  const loadedTemplatesRef = React.useRef<any[]>([]);

  React.useEffect(() => {
    const templatesLoaded = props.proposalTemplates && props.proposalTemplates.length > 0;
    const templateIdChanged = values.proposalTemplateId !== lastTemplateIdRef.current;
    
    // Robust check using IDs to avoid infinite loops from new array references
    const currentTplIds = (props.proposalTemplates || []).map((t: any) => t.id).join(',');
    const loadedTplIds = (loadedTemplatesRef.current || []).map((t: any) => t.id).join(',');
    const templatesListChanged = currentTplIds !== loadedTplIds;

    if (templateIdChanged || (templatesListChanged && templatesLoaded)) {
      lastTemplateIdRef.current = values.proposalTemplateId;
      loadedTemplatesRef.current = props.proposalTemplates || [];

      const tpl = props.proposalTemplates?.find((t: any) => t.id === values.proposalTemplateId);
      if (tpl) {
        // Always reload on user-initiated template switch; only guard on passive list refresh
        const hasStages = values.globalPaymentStages && values.globalPaymentStages.length > 0;
        const hasRules = values.rules && values.rules.length > 0;

        if (templateIdChanged || (!hasStages && !hasRules)) {
          const globalPaymentStages: any[] = [];
          const rules: any[] = [];
          if (Array.isArray(tpl.rules)) {
            tpl.rules.forEach((r: any) => {
              const type = r.configType || r.config_type;
              const min = r.minArea !== undefined ? r.minArea : r.min_area;
              const max = r.maxArea !== undefined ? r.maxArea : r.max_area;
              const key = r.configKey || r.config_key;
              const val = r.value !== undefined ? r.value : r.config_value;

              const mappedRule = {
                id: r.id,
                config_type: type,
                config_key: key,
                configType: type,
                configKey: key,
                value: val,
                config_value: val,
                minArea: min,
                maxArea: max,
                min_area: min,
                max_area: max,
                completionYear: r.completionYear ?? r.completion_year ?? 0,
                completionMonth: r.completionMonth ?? r.completion_month ?? 0,
              };

              if (
                type === "percentage" ||
                type === "payment" ||
                (Number(min) === -1 && Number(max) === -1)
              ) {
                globalPaymentStages.push(mappedRule);
              } else {
                rules.push(mappedRule);
              }
            });
          }
          setFieldValue("globalPaymentStages", globalPaymentStages);
          setFieldValue("rules", rules);
        }
      } else {
        // If we selected nothing or invalid template, clear it
        if (!values.proposalTemplateId) {
          setFieldValue("globalPaymentStages", []);
          setFieldValue("rules", []);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values.proposalTemplateId, props.proposalTemplates, setFieldValue]);

  // ── Wizard Pages ───────────────────────────────────────────────────────────
  // Step 8 (Project Execution) is dynamically appended when status.isProjectTrigger
  // is true — no reload, smooth animated reveal.
  // ──────────────────────────────────────────────────────────────────────────

  const isReceivedStatus = React.useMemo(() => {
    const status = props.leadStatuses.find((x: any) => x.id === values.statusId);
    return !!(status?.isProjectTrigger);
  }, [values.statusId, props.leadStatuses]);

  const baseSteps: EnterpriseWizardStep<LeadWorkspaceProps>[] = [

    // ── STEP 1: Overview & Assignment ──────────────────────────────────────
    {
      id: "overview",
      label: "Overview & Assignment",
      title: "Overview & Assignment",
      subtitle: "Basic lead information and assignment details",
      fields: [
        "projectName",
        "serviceIds",
        "categoryIds",
        "subcategoryIds",
        "leadInquiryDate",
        "leadAssignedTo",
      ],
      requiredFields: ["projectName"],
      icon: <AssignmentOutlined />,
      render: (p) => (
        <>
          {/* Lead basic info — uses wt-section-card internally */}
          <L.LeadBasicInfoSection {...p} />
          {/* Internal team: assigned head, telemarketer, coordinator */}
          <L.TeamDetailsSection {...p} />
        </>
      ),
    },

    // ── STEP 2: Company & Relationships ────────────────────────────────────
    {
      id: "company-relations",
      label: "Company & Relationships",
      title: "Company & Relationships",
      subtitle: "Client companies and contact management",
      fields: ["leadTeams"],
      icon: <PeopleAlt />,
      render: (p) => (
        <>
          {/* Linked client companies — uses wt-section-card internally */}
          <L.ClientCompaniesSection {...p} />
          {/* File location company — has its own card wrapper */}
          <L.FileLocationSection {...p} />
        </>
      ),
    },

    // ── STEP 3: Referral Details ──────────────────────────────────────────
    {
      id: "referral-details",
      label: "Referral Details",
      title: "Referral Details",
      subtitle: "Lead sources and referral information",
      fields: ["leadSourceType"],
      icon: <PeopleAlt />,
      render: (p) => <L.ReferralSection {...p} />,
    },

    // ── STEP 4: Project & Service Details ──────────────────────────────────
    {
      id: "project-details",
      label: "Project & Service Details",
      title: "Project & Service Details",
      subtitle: "Technical specifications and project scope",
      fields: ["plotArea", "builtUpArea", "buildingDetail"],
      icon: <Business />,
      render: (_p) => (
        <>
          {/* Plot area, built-up area, building detail — has its own card wrapper */}
          <L.ProjectDetailsSection />
        </>
      ),
    },

    // ── STEP 5: Commercials & Costing ──────────────────────────────────────
    {
      id: "commercials",
      label: "Commercials & Costing",
      title: "Commercials & Costing",
      subtitle: "Work areas, rates, payment stages and total commercial value",
      fields: ["projectAreas"],
      icon: <MonetizationOn />,
      // CommercialsSection has its own card wrapper
      render: (_p) => <L.CommercialsSection />,
    },

    // ── STEP 6: Address, Location & Documents ──────────────────────────────
    {
      id: "address-docs",
      label: "Address, Location & Docs",
      title: "Address, Location & Documents",
      subtitle: "Project address, location details and documents",
      fields: ["addresses"],
      icon: <LocationOn />,
      component: L.AddressSection,
    },

    // ── STEP 7: Meeting Schedule ────────────────────────────────────────────
    {
      id: "meeting-schedule",
      label: "Meeting Schedule",
      title: "Meeting Schedule",
      subtitle: "Schedule and manage project meetings",
      fields: [],
      icon: <EventNote />,
      render: (p) => <L.MeetingDetailsSection {...p} />,
    },

    // ── STEP 8: Follow-up & Documents ───────────────────────────────────────
    {
      id: "remarks-docs",
      label: "Follow-up & Documents",
      title: "Follow-up, Description & Documents",
      subtitle: "Set the follow-up, add a detailed description, and document attachments",
      fields: ["nextFollowUpDate", "description", "fileLocation"],
      icon: <DescriptionOutlined />,
      render: (p) => <L.RemarksAndDocumentsSection {...p} />,
    },

    // ── STEP 9: Lead Status ─────────────────────────────────────────────────
    // Placed last so it acts as the submit gate: NOT received → this is the final
    // step (Save → revision dialog); received → the Project Execution step is
    // appended after this, so here the footer shows "Save & Continue →".
    {
      id: "lead-status",
      label: "Lead Status",
      title: "Lead Status",
      subtitle: "Set the lead status — converting it to a project unlocks execution",
      fields: ["statusId"],
      requiredFields: ["statusId"],
      icon: <TrackChanges />,
      render: (p) => (
        <L.StatusSection
          {...p}
          isReceivedStatus={isReceivedStatus}
          leadProjectStatuses={props.leadProjectStatuses ?? []}
        />
      ),
    },
  ];

  // Project Execution is no longer a wizard step. Execution team, timeline,
  // contract financials, purchase order and custody are edited INLINE on the
  // Project section of the entity detail page (section-scoped PATCH → audited
  // revision). The wizard now covers lead capture only; execution defaults
  // (PRIVATE / not-live / open) apply on create and are refined on the detail page.
  const steps = baseSteps;

  // ── Right panel: Live summary rows ────────────────────────────────────────
  const getSummaryRows = (): SummaryRow[] => {
    const statusObj = props.leadStatuses.find((x) => x.id === values.statusId);
    const projectStatusObj = isReceivedStatus
      ? (props.leadProjectStatuses || []).find((x: any) => x.id === values.projectStatusId)
      : null;
    const assignedEmp = props.employees.find((x) => x.employeeId === values.leadAssignedTo);

    const templateObj = props.proposalTemplates?.find((t) => t.id === values.proposalTemplateId);
    const templateName = templateObj ? (templateObj.templateName || templateObj.templateCode || templateObj.id) : undefined;

    const selectedServices = (values.serviceIds || [])
      .map((id: any) => props.services.find((s) => s.id === id)?.name)
      .filter(Boolean)
      .join(", ");

    const selectedCategories = (values.categoryIds || [])
      .map((id: any) => props.categories.find((c) => c.id === id)?.name)
      .filter(Boolean)
      .join(", ");

    const selectedSubcategories = (values.subcategoryIds || [])
      .map((id: any) => props.subcategories.find((sc) => sc.id === id)?.name)
      .filter(Boolean)
      .join(", ");

    const leadSourceStr = values.leadSourceType
      ? values.leadSourceType === "DIRECT"
        ? "Direct Source"
        : values.leadSourceType === "REFERRAL"
        ? "Referrals"
        : values.leadSourceType
      : "—";

    let sourceDetailStr = "";
    if (values.leadSourceType === "DIRECT") {
      const src = props.leadDirectSources.find((x) => x.id === values.leadDirectSource);
      sourceDetailStr = src?.name || "—";
    } else if (values.leadSourceType === "REFERRAL") {
      const count = (values.referrals || []).length;
      sourceDetailStr = count > 0 ? `${count} Referral(s)` : "—";
    }

    const clientCompaniesStr = (values.leadTeams || [])
      .map((t: any) => props.companies.find((c) => c.id === t.companyId)?.companyName)
      .filter(Boolean)
      .join(", ");

    const googleAddressStr = (values.addresses || [])
      .map((a: any) => a.projectAddress)
      .filter(Boolean)
      .join(", ");

    const fileCompanyObj = props.companies.find((c) => c.id === values.fileLocationCompany);
    const fileCompanyStr = fileCompanyObj?.companyName || "—";

    const totalCommercials = (values.projectAreas || []).reduce(
      (total: number, area: any) => total + (parseFloat(area.cost) || 0),
      0
    );

    const formattedInquiryDate = values.leadInquiryDate && dayjs(values.leadInquiryDate).isValid()
      ? dayjs(values.leadInquiryDate).format("DD-MMM-YYYY")
      : "—";

    return [
      {
        label: "Lead Status",
        value: (
          <span
            className={`badge px-2 py-1 fs-8 fw-bold ${
              currentStatusName === "Received"
                ? "bg-light-success text-success"
                : currentStatusName === "Canceled"
                ? "bg-light-danger text-danger"
                : "bg-light-primary text-primary"
            }`}
            style={{ textTransform: "capitalize" }}
          >
            {statusObj?.name || "Pending"}
          </span>
        ),
      },
      ...(isReceivedStatus ? [{
        label: "Project Status",
        value: (
          <span
            className="badge px-2 py-1 fs-8 fw-bold bg-light-primary text-primary"
            style={{ textTransform: "capitalize" }}
          >
            {projectStatusObj?.name || "—"}
          </span>
        ),
      }] : []),
      {
        label: "Lead Name",
        value: values.projectName || "—",
        isStrong: true,
      },
      {
        label: "Inquiry Date",
        value: formattedInquiryDate,
      },
      {
        label: "Lead Source",
        value: leadSourceStr,
      },
      ...(values.leadSourceType ? [
        {
          label: "Source Detail",
          value: sourceDetailStr || "—",
        }
      ] : []),
      {
        label: "Client Companies",
        value: clientCompaniesStr || "—",
      },
      {
        label: "Plot Area",
        value: values.plotArea ? `${values.plotArea} ${values.plotAreaUnit || "SFT"}` : "—",
      },
      {
        label: "Built-up Area",
        value: values.builtUpArea ? `${values.builtUpArea} ${values.builtUpAreaUnit || "SFT"}` : "—",
      },
      {
        label: "Services",
        value: selectedServices || "—",
      },
      {
        label: "Categories",
        value: selectedCategories || "—",
      },
      {
        label: "Sub Categories",
        value: selectedSubcategories || "—",
      },
      {
        label: "Assigned Head",
        value: assignedEmp?.employeeName || "—",
      },
      {
        label: "Proposal Template",
        value: templateName || "—",
      },
      {
        label: "File Company",
        value: fileCompanyStr,
      },
      {
        label: "Location Address",
        value: googleAddressStr || "—",
      },
      {
        label: "Commercial Value",
        value: `₹ ${totalCommercials.toLocaleString("en-IN", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
        isStrong: totalCommercials > 0,
      },
    ];
  };

  return (
    <EnterpriseFormWizard
      module="lead"
      steps={steps}
      stepProps={props}
      summary={{
        title: "Lead Summary",
        rows: getSummaryRows(),
        warningMessage: !props.hasDefaultStatus()
          ? "Please configure a default status in Lead configuration settings first."
          : undefined,
      }}
      onStepChange={props.onStepChange}
      initialStep={props.initialStep}
      actions={{
        isSubmitting,
        isEditMode: props.isEditMode,
        onCancel: props.onHide,
        onSaveUpdate: props.onSaveUpdate,
        onSaveRevision: props.onSaveRevision,
        onFinalSave: props.onFinalSave,
        onSaveDraft: props.onSaveDraft,
        isSavingDraft: props.isSavingDraft,
        submitDisabled: !props.hasDefaultStatus(),
        submitText: props.isEditMode ? "Save Lead" : "Create Lead",
      }}
      headerTitle={
        props.isEditMode
          ? `Edit Lead: ${values.projectName || ""}`
          : "Create New Lead"
      }
      headerSub={
        props.isEditMode ? (
          <>
            <span className={`wizard-meta-chip is-accent`}>
              <i className="bi bi-clock-history" /> Revision {props.currLeadData?.revisionCount ?? 0}
            </span>
            {currentStatusName && (
              <span className="wizard-meta-chip">
                <i className="bi bi-flag" /> {currentStatusName}
              </span>
            )}
            {props.currLeadData?.prefix && (
              <span className="wizard-meta-chip">
                <i className="bi bi-hash" /> {props.currLeadData.prefix}
              </span>
            )}
          </>
        ) : (
          "Manage inquiry details and conversion workflow"
        )
      }
      sidebarTitle="Lead Creation"
    />
  );
};

export default LeadWorkspace;
