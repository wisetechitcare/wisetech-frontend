import React from "react";
import { useFormikContext } from "formik";
import { EnterpriseFormWizard, EnterpriseWizardStep, SummaryRow } from "@/shared/form-engine";
import * as P from "./ProjectSections";
import {
  AssignmentOutlined,
  Business,
  PeopleAlt,
  MonetizationOn,
  LocationOn,
  FactCheckOutlined,
} from "@mui/icons-material";

interface ProjectWorkspaceProps {
  // ── Dropdown arrays ────────────────────────────────────────────────────────
  categories: any[];
  subcategories: any[];
  services: any[];
  statuses: any[];
  employees: any[];
  teams: any[];
  countries: any[];
  companies: any[];
  contacts: any[];
  companyTypes: any[];

  // ── Inline create / modal triggers ────────────────────────────────────────
  setShowCategoryModal: (show: boolean) => void;
  setShowSubcategoryModal: (show: boolean) => void;
  setShowServiceModal: (show: boolean) => void;
  setShowCompanyModal: (show: boolean) => void;
  setShowSubCompanyModal: (show: boolean) => void;
  setShowContactModal: (show: boolean) => void;
  setShowStatusModal: (show: boolean) => void;
  setShowCompanyTypeModal: (show: boolean) => void;

  // ── Refresh callbacks ──────────────────────────────────────────────────────
  fetchProjectCategories: () => void;
  fetchProjectSubcategories: () => void;
  fetchProjectServices: () => void;
  fetchProjectStatuses: () => void;

  // ── Address cascade ────────────────────────────────────────────────────────
  states: any[];
  cities: any[];
  handleCountryChange: (countryId: string) => void;
  handleStateChange: (countryId: string, stateId: string) => void;
  getFilteredAndSortedOptions: (options: any[], inputValue: string) => any[];
  viewLocation: (latitude: string, longitude: string) => void;

  // ── Client (team details) & Relation Company cascade ───────────────────────
  clientFilteredCompanies: any;
  clientFilteredSubCompanies: any;
  clientFilteredContacts: any;
  fetchClientCompaniesByCompanyTypeId: (companyTypeId: string, index: number) => void;
  fetchClientSubCompaniesByCompanyId: (companyId: string, index: number) => void;
  fetchClientContactsBySubCompanyId: (subCompanyId: string, index: number, companyId?: string) => void;
  setClientFilteredSubCompanies: any;
  setClientFilteredContacts: any;

  relationFilteredCompanies: any;
  relationFilteredSubCompanies: any;
  relationFilteredContacts: any;
  fetchRelationCompaniesByCompanyTypeId: (companyTypeId: string, index: number) => void;
  fetchRelationSubCompaniesByCompanyId: (companyId: string, index: number) => void;
  fetchRelationContactsBySubCompanyId: (subCompanyId: string, index: number, companyId?: string) => void;
  setRelationFilteredSubCompanies: any;
  setRelationFilteredContacts: any;

  // ── Utilities ──────────────────────────────────────────────────────────────
  sortCompaniesByName: (list: any[]) => any[];
  sortContactsByName: (list: any[]) => any[];
  buildEmployeeOptions: (employees: any[], currentValueId?: string) => any[];
  uploadFile: (event: any, formikProps: any, size: number) => void;
  getFileNameFromUrl: (url: string) => string;

  // ── Misc ───────────────────────────────────────────────────────────────────
  prefix: string;
  setPrefix: (val: string) => void;
  isEditMode: boolean;
  projectData?: any;
  onHide: () => void;
  exportPdf?: () => void;
  exportDocx?: () => void;
  formikProps: any;
  isDatesInvalid: () => boolean;
  getDateValidationMessage: () => string;
  userId: string;
  editablePrefix: string;
  setEditablePrefix: (val: string) => void;
}

export const ProjectWorkspace: React.FC<ProjectWorkspaceProps> = (props) => {
  const { values, isSubmitting } = useFormikContext<any>();

  // ── 6 Wizard Pages ─────────────────────────────────────────────────────────
  // Each page is its own focused viewport — no accordion, no scrolling between steps.
  // Business logic is preserved identically inside each section component.
  // ──────────────────────────────────────────────────────────────────────────

  const steps: EnterpriseWizardStep<ProjectWorkspaceProps>[] = [
    // ── STEP 1: Overview & Assignment ──────────────────────────────────────
    {
      id: "overview",
      label: "Overview & Assignment",
      title: "Overview & Details",
      subtitle: "Basic project information and assignment details",
      fields: [
        "title",
        "startDate",
        "endDate",
        "serviceIds",
        "categoryIds",
        "subcategoryIds",
        "projectManagerId",
        "statusId",
      ],
      icon: <AssignmentOutlined />,
      render: (p) => (
        <>
          <P.ProjectOverviewSection {...p} />
          <P.ProjectAssignmentSection {...p} />
        </>
      ),
    },

    // ── STEP 2: Project Specifications ──────────────────────────────────────
    {
      id: "specs",
      label: "Project Specs",
      title: "Project Specifications",
      subtitle: "Technical specifications, area details, and custom bullet points",
      fields: [
        "plotArea",
        "plotAreaUnit",
        "builtUpArea",
        "builtUpAreaUnit",
        "buildingDetail",
        "otherPoint1Heading",
        "otherPoint1Description",
        "otherPoint2Heading",
        "otherPoint2Description",
        "otherPoint3Heading",
        "otherPoint3Description",
      ],
      icon: <Business />,
      render: (p) => <P.ProjectSpecsSection {...p} />,
    },

    // ── STEP 3: Team Details ────────────────────────────────────────────────
    {
      id: "team-details",
      label: "Team & Companies",
      title: "Team Details (Client Companies)",
      subtitle: "Client company mappings and file location in computer",
      fields: ["companies", "fileLocationCompanyType", "fileLocationCompany"],
      icon: <PeopleAlt />,
      render: (p) => (
        <>
          <P.ProjectTeamSection {...p} />
          <P.ProjectFileLocationSection {...p} />
        </>
      ),
    },

    // ── STEP 4: Commercials ─────────────────────────────────────────────────
    {
      id: "commercials",
      label: "Commercials & Costing",
      title: "Commercial Details",
      subtitle: "Work areas, costing methods, and rates",
      fields: ["commercials"],
      icon: <MonetizationOn />,
      render: (p) => <P.ProjectCommercialsSection {...p} />,
    },

    // ── STEP 5: Address & Location ──────────────────────────────────────────
    {
      id: "address-location",
      label: "Address & Location",
      title: "Address & Location",
      subtitle: "Project physical address, map links, and GPS coordinates",
      fields: ["addresses"],
      icon: <LocationOn />,
      render: (p) => <P.ProjectAddressSection {...p} />,
    },

    // ── STEP 6: Review & Completion ─────────────────────────────────────────
    {
      id: "review",
      label: "Review & Workflow",
      title: "Review & Completion",
      subtitle: "Review all project details, team details, and workflow information",
      fields: [
        "handledByEntries",
        "poNumber",
        "poDate",
        "poFile",
        "projectCompanyMappings",
        "teamDetails",
        "documents",
        "description",
      ],
      icon: <FactCheckOutlined />,
      render: (p) => <P.ProjectReviewStep {...p} />,
    },
  ];

  // ── Right panel: Live summary rows ────────────────────────────────────────
  const getSummaryRows = (): SummaryRow[] => {
    const statusObj = props.statuses.find((x) => x.id === values.statusId);
    const assignedEmp = props.employees.find((x) => x.employeeId === values.projectManagerId);

    const totalCommercials = (values.commercials || []).reduce((total: number, c: any) => {
      if (c.costType === "RATE") return total + parseFloat(c.rateCost || "0");
      if (c.costType === "LUMPSUM") return total + parseFloat(c.lumpsumCost || "0");
      return total;
    }, 0);

    return [
      {
        label: "Project Status",
        value: (
          <span
            className="badge px-2 py-1 fs-8 fw-bold"
            style={{
              backgroundColor: statusObj?.color ? `${statusObj.color}15` : "#e2e8f0",
              color: statusObj?.color || "#64748b",
              textTransform: "capitalize",
            }}
          >
            {statusObj?.name || "Pending"}
          </span>
        ),
      },
      {
        label: "Project Name",
        value: values.title || undefined,
        isStrong: true,
      },
      {
        label: "Project Manager",
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
      module="project"
      steps={steps}
      stepProps={props}
      summary={{
        title: "Project Summary",
        rows: getSummaryRows(),
      }}
      actions={{
        isSubmitting,
        isEditMode: props.isEditMode,
        onCancel: props.onHide,
        exportPdf: props.exportPdf,
        exportDocx: props.exportDocx,
        submitText: props.isEditMode ? "Save Project" : "Create Project",
      }}
      headerTitle={
        props.isEditMode
          ? `Edit Project: ${values.title || ""}`
          : "Create New Project"
      }
      headerSub={
        props.isEditMode
          ? `ID: ${props.projectData?.id || ""} · Revision: ${props.projectData?.revisionCount || 0}`
          : "Manage project details and assignment workflow"
      }
      sidebarTitle="Project Creation"
    />
  );
};

export default ProjectWorkspace;
