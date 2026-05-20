import { EnterpriseWizardStep } from "@/shared/form-engine";

export const projectWizardConfig: EnterpriseWizardStep[] = [
  {
    id: "project-details",
    label: "Project Details",
    title: "Project Details",
    fields: ["title", "startDate", "endDate", "serviceIds", "categoryIds", "subcategoryIds"],
    defaultOpen: true,
  },
  {
    id: "project-specifications",
    label: "Specifications",
    title: "Project Specifications",
    fields: ["plotArea", "builtUpArea", "buildingDetail"],
  },
  {
    id: "assignment",
    label: "Assignment",
    title: "Lead Assigned",
    fields: ["projectManagerId"],
    defaultOpen: true,
  },
  {
    id: "file-location",
    label: "File Location",
    title: "File Location In Computer",
    fields: ["fileLocationCompanyType", "fileLocationCompany"],
  },
  {
    id: "commercials",
    label: "Commercials",
    title: "Commercials",
    fields: ["commercials"],
    defaultOpen: true,
  },
  {
    id: "status",
    label: "Status",
    title: "Status",
    fields: ["statusId"],
    defaultOpen: true,
  },
];

export default projectWizardConfig;
