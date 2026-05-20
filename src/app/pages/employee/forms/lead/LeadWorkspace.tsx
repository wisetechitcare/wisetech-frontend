import React from "react";
import { useFormikContext } from "formik";
import { EnterpriseFormWizard, EnterpriseWizardStep, SummaryRow } from "@/shared/form-engine";
import * as L from "./LeadSections";
import {
  AssignmentOutlined,
  PeopleAlt,
  Business,
  MonetizationOn,
  LocationOn,
  FactCheckOutlined,
} from "@mui/icons-material";

interface LeadWorkspaceProps {
  // ── Dropdown arrays ────────────────────────────────────────────────────────
  categories: any[];
  subcategories: any[];
  services: any[];
  leadStatuses: any[];
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
  handleAddressCountryChange: (index: number, countryId: string, setFieldValue: Function) => void;
  handleAddressStateChange: (index: number, stateId: string, countryId: string, setFieldValue: Function) => void;

  // ── Company / team cascade ─────────────────────────────────────────────────
  teamFilteredCompanies: any;
  teamFilteredSubCompanies: any;
  handleCompanyTypeChange: (index: number, typeId: string, setFieldValue: Function) => void;
  handleCompanyChange: (index: number, companyId: string, setFieldValue: Function) => void;
  handleSubCompanyChange: (index: number, subCompanyId: string, companyId: string, setFieldValue: Function) => void;

  // ── Misc ───────────────────────────────────────────────────────────────────
  prefix: string;
  setPrefix: (val: string) => void;
  isEditMode: boolean;
  currLeadData?: any;
  hasDefaultStatus: () => boolean;
  onHide: () => void;
  exportPdf?: () => void;
  exportDocx?: () => void;
  formikProps: any;
}

export const LeadWorkspace: React.FC<LeadWorkspaceProps> = (props) => {
  const { values, isSubmitting } = useFormikContext<any>();

  const currentStatusName = props.leadStatuses.find((x) => x.id === values.statusId)?.name;

  // ── 6 Wizard Pages ─────────────────────────────────────────────────────────
  // Each page is its own focused viewport — no accordion, no scrolling between steps.
  // Business logic is preserved identically inside each section component.
  // ──────────────────────────────────────────────────────────────────────────

  const steps: EnterpriseWizardStep<LeadWorkspaceProps>[] = [

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
        "telemarketerId",
        "coordinatorId",
        "statusId",
      ],
      icon: <AssignmentOutlined />,
      render: (p) => (
        <>
          {/* Lead basic info — uses wt-section-card internally */}
          <L.LeadBasicInfoSection {...p} />
          {/* Internal team: assigned head, telemarketer, coordinator */}
          <L.TeamDetailsSection {...p} />
          {/* Lead lifecycle status */}
          <L.StatusSection {...p} />
        </>
      ),
    },

    // ── STEP 2: Company & Relationships ────────────────────────────────────
    {
      id: "company-relations",
      label: "Company & Relationships",
      title: "Company & Relationships",
      subtitle: "Client companies, referrals and contact management",
      fields: ["leadTeams"],
      icon: <PeopleAlt />,
      render: (p) => (
        <>
          {/* Linked client companies — uses wt-section-card internally */}
          <L.ClientCompaniesSection {...p} />
          {/* Referrals and direct sources — has its own card wrapper */}
          <L.ReferralSection {...p} />
          {/* File location company — has its own card wrapper */}
          <L.FileLocationSection {...p} />
        </>
      ),
    },

    // ── STEP 3: Project & Service Details ──────────────────────────────────
    {
      id: "project-details",
      label: "Project & Service Details",
      title: "Project & Service Details",
      subtitle: "Technical specifications and project scope",
      fields: ["plotArea", "builtUpArea", "buildingDetail", "remarks", "description"],
      icon: <Business />,
      render: (_p) => (
        <>
          {/* Plot area, built-up area, building detail — has its own card wrapper */}
          <L.ProjectDetailsSection />
          {/* Remarks and description — has its own card wrapper */}
          <L.AdditionalDetailsSection />
        </>
      ),
    },

    // ── STEP 4: Commercials & Costing ──────────────────────────────────────
    {
      id: "commercials",
      label: "Commercials & Costing",
      title: "Commercials & Costing",
      subtitle: "Work areas, rates and total commercial value",
      fields: ["projectAreas"],
      icon: <MonetizationOn />,
      // CommercialsSection has its own card wrapper
      render: (_p) => <L.CommercialsSection />,
    },

    // ── STEP 5: Address, Location & Documents ──────────────────────────────
    {
      id: "address-docs",
      label: "Address, Location & Docs",
      title: "Address, Location & Documents",
      subtitle: "Project address, location details and documents",
      fields: ["addresses"],
      icon: <LocationOn />,
      // AddressSection has its own card wrapper
      component: L.AddressSection,
    },

    // ── STEP 6: Review & Workflow ───────────────────────────────────────────
    // Consolidates: review summary + conditional PO / Handle By / Cancellation
    {
      id: "review",
      label: "Review & Workflow",
      title: "Review & Conversion",
      subtitle: "Review all details and complete the lead workflow",
      fields: ["statusId", "poStatus", "poNumber", "poDate", "handledByEntries", "cancellationRemarks"],
      icon: <FactCheckOutlined />,
      component: L.LeadReviewStep,
    },
  ];

  // ── Right panel: Live summary rows ────────────────────────────────────────
  const getSummaryRows = (): SummaryRow[] => {
    const statusObj = props.leadStatuses.find((x) => x.id === values.statusId);
    const assignedEmp = props.employees.find((x) => x.employeeId === values.leadAssignedTo);

    const totalCommercials = (values.projectAreas || []).reduce(
      (total: number, area: any) => total + (parseFloat(area.cost) || 0),
      0
    );

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
      {
        label: "Lead Name",
        value: values.projectName || undefined,
        isStrong: true,
      },
      {
        label: "Assigned Head",
        value: assignedEmp?.employeeName || undefined,
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
      actions={{
        isSubmitting,
        isEditMode: props.isEditMode,
        onCancel: props.onHide,
        exportPdf: props.exportPdf,
        exportDocx: props.exportDocx,
        submitDisabled: !props.hasDefaultStatus(),
        submitText: props.isEditMode ? "Save Lead" : "Create Lead",
      }}
      headerTitle={
        props.isEditMode
          ? `Edit Lead: ${values.projectName || ""}`
          : "Create New Lead"
      }
      headerSub={
        props.isEditMode
          ? `ID: ${props.currLeadData?.id || ""} · Revision: ${props.currLeadData?.revisionCount || 0}`
          : "Manage inquiry details and conversion workflow"
      }
      sidebarTitle="Lead Creation"
    />
  );
};

export default LeadWorkspace;
