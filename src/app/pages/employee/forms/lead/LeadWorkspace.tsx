import { AppIcon } from '@app/modules/common/components/ui/AppIcon';
import { ToneChip } from '@app/modules/common/components/ui';
import React from "react";
import { useFormikContext } from "formik";
import dayjs from "dayjs";
import { EnterpriseFormWizard, EnterpriseWizardStep, SummaryRow, WizardHeaderBadge } from "@/shared/form-engine";
import * as L from "./LeadSections";
import {
  AssignmentOutlined,
  PeopleAlt,
  Business,
  MonetizationOn,
  LocationOn,
  SettingsOutlined,
  EventNote,
  TrackChanges,
} from "@mui/icons-material";
import { getCurrencySymbol, getCurrencyLocale } from '@utils/currency';
import { canViewCommercial } from '@utils/can';
import CategoryRevisionHistory from "@/modules/audit/CategoryRevisionHistory";

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
  handleAddressCountryChange: (index: number, countryId: string, setFieldValue: L.LeadSetFieldValue) => void;
  handleAddressStateChange: (index: number, stateId: string, countryId: string, setFieldValue: L.LeadSetFieldValue) => void;

  // ── Company / team cascade ─────────────────────────────────────────────────
  teamFilteredCompanies: any;
  teamFilteredSubCompanies: any;
  handleCompanyTypeChange: (index: number, typeId: string, setFieldValue: L.LeadSetFieldValue) => void;
  handleCompanyChange: (index: number, companyId: string, setFieldValue: L.LeadSetFieldValue) => void;
  handleSubCompanyChange: (index: number, subCompanyId: string, companyId: string, setFieldValue: L.LeadSetFieldValue) => void;
  handleContactChange: (index: number, contactId: string, setFieldValue: L.LeadSetFieldValue) => void;
  teamFilteredContacts: any;

  // ── Misc ───────────────────────────────────────────────────────────────────
  prefix: string;
  setPrefix: (val: string) => void;
  /** Organizations the user may file a lead under, as `{ value, label }`. */
  organizationOptions?: { value: string; label: string }[];
  /** Switch the lead's organization; also re-numbers it (see LeadWizardModal). */
  onOrganizationChange?: (organizationId: string, setFieldValue: L.LeadSetFieldValue) => void;
  /** Why no inquiry number could be generated, if that happened. */
  prefixError?: string | null;
  /** Called when the number is edited by hand, so re-numbering can ask first. */
  onPrefixManualEdit?: () => void;
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
      titleAdornment: props.currLeadData?.revisionCount != null && (
        <ToneChip
          tone="brand"
          label={`Revision No. R${props.currLeadData.revisionCount}`}
          title="Revision number is managed automatically by the audit system"
        />
      ),
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
          {/* Lead basic info — renders CrmSection cards */}
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
          {/* Linked client companies — renders CrmSection cards */}
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


    // ── STEP 9: Lead Status ─────────────────────────────────────────────────
    // Placed last so it acts as the submit gate: NOT received → this is the final
    // step (Save → revision dialog); received → the Project Execution step is
    // appended after this, so here the footer shows "Save & Continue →".
    {
      id: "lead-status",
      label: "Lead Status",
      title: "Lead Status",
      subtitle: "Set the lead status — converting it to a project unlocks execution",
      fields: ["statusId", "poStatus", "poNumber", "poDate", "receivedDate"],
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
  const steps = baseSteps.filter((s) => s.id !== "commercials" || canViewCommercial('crm.leads'));

  // ── Right panel: Live summary rows ────────────────────────────────────────
  const getSummaryRows = (values: any, activeStep?: any): SummaryRow[] => {
    const statusObj = props.leadStatuses.find((x) => x.id === values.statusId);
    const projectStatusObj = isReceivedStatus
      ? (props.leadProjectStatuses || []).find((x: any) => x.id === values.projectStatusId)
      : null;
    const assignedEmp = props.employees.find((x) => x.employeeId === values.leadAssignedTo);

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

    const allRows = [
      {
        label: "Lead Status",
        value: (
          <ToneChip
            dense
            tone={
              props.leadStatuses.find((x) => x.id === values.statusId)?.isProjectTrigger
                ? "success"
                : currentStatusName === "Canceled"
                  ? "danger"
                  : "brand"
            }
            label={statusObj?.name || "Pending"}
            sx={{ textTransform: "capitalize" }}
          />
        ),
        stepId: "lead-status",
      },
      ...(isReceivedStatus ? [{
        label: "Project Status",
        value: (
          <ToneChip
            dense
            tone="brand"
            label={projectStatusObj?.name || "—"}
            sx={{ textTransform: "capitalize" }}
          />
        ),
        stepId: "lead-status",
      }] : []),
      {
        label: "Lead Name",
        value: values.projectName || "—",
        isStrong: true,
        stepId: "overview",
      },
      {
        // Kept visible through every step: it drives the inquiry number, so it
        // should not be something the user has to go back to step 1 to recall.
        label: "Organization",
        value:
          props.organizationOptions?.find((o) => o.value === values.organizationId)?.label ||
          "—",
        stepId: "overview",
      },
      {
        label: "Inquiry Date",
        value: formattedInquiryDate,
        stepId: "overview",
      },
      {
        label: "Lead Source",
        value: leadSourceStr,
        stepId: "referral-details",
      },
      ...(values.leadSourceType ? [
        {
          label: "Source Detail",
          value: sourceDetailStr || "—",
          stepId: "referral-details",
        }
      ] : []),
      {
        label: "Client Companies",
        value: clientCompaniesStr || "—",
        stepId: "company-relations",
      },
      {
        label: "Plot Area",
        value: values.plotArea ? `${values.plotArea} ${values.plotAreaUnit || "SFT"}` : "—",
        stepId: "project-details",
      },
      {
        label: "Built-up Area",
        value: values.builtUpArea ? `${values.builtUpArea} ${values.builtUpAreaUnit || "SFT"}` : "—",
        stepId: "project-details",
      },
      {
        label: "Services",
        value: selectedServices || "—",
        stepId: "overview",
      },
      {
        label: "Categories",
        value: selectedCategories || "—",
        stepId: "overview",
      },
      {
        label: "Sub Categories",
        value: selectedSubcategories || "—",
        stepId: "overview",
      },
      {
        label: "Assigned Head",
        value: assignedEmp?.employeeName || "—",
        stepId: "overview",
      },
      {
        label: "File Company",
        value: fileCompanyStr,
        stepId: "company-relations",
      },
      {
        label: "Location Address",
        value: googleAddressStr || "—",
        stepId: "address-docs",
      },
      {
        label: "Commercial Value",
        value: `${getCurrencySymbol()} ${totalCommercials.toLocaleString(getCurrencyLocale(), {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
        isStrong: totalCommercials > 0,
        stepId: "commercials",
      },
    ].filter((row) => row.stepId !== "commercials" || canViewCommercial('crm.leads'));

    if (activeStep?.id) {
      return allRows.filter((row: any) => row.stepId === activeStep.id);
    }
    return allRows;
  };

  return (
    <EnterpriseFormWizard
      module="lead"
      steps={steps}
      stepProps={props}
      summary={{
        title: "Lead Summary",
        // On the Commercials step of an existing lead the sidebar is the revision trail alone.
        rows: (values, currentStep) =>
          props.isEditMode && props.currLeadData?.id && currentStep?.id === "commercials" ? [] : getSummaryRows(values, currentStep),
        // The commercial revision trail lives beside the figures it explains, on the
        // Commercials step of an existing lead only.
        extra: (_values, currentStep) =>
          props.isEditMode && props.currLeadData?.id && currentStep?.id === "commercials" ? (
            <CategoryRevisionHistory type="LEAD" id={props.currLeadData.id} fieldPrefix="commercials" compact />
          ) : null,
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
            <WizardHeaderBadge accent icon="bi-clock-history">Revision {props.currLeadData?.revisionCount ?? 0}</WizardHeaderBadge>
            {currentStatusName && <WizardHeaderBadge icon="bi-flag">{currentStatusName}</WizardHeaderBadge>}
            {props.currLeadData?.prefix && <WizardHeaderBadge icon="bi-hash">{props.currLeadData.prefix}</WizardHeaderBadge>}
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
