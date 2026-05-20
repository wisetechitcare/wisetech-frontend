import { EnterpriseWizardStep } from "@/shared/form-engine";

export const leadWizardConfig: EnterpriseWizardStep[] = [
  {
    id: "lead-details",
    label: "Lead & Client Details",
    title: "Lead & Client Details",
    fields: ["projectName", "serviceIds", "categoryIds", "subcategoryIds", "leadInquiryDate"],
    defaultOpen: true,
  },
  {
    id: "team-details",
    label: "Internal Team Assignment",
    title: "Internal Team Assignment",
    fields: ["leadAssignedTo", "telemarketerId", "coordinatorId"],
    defaultOpen: true,
  },
  {
    id: "project-details",
    label: "Project Specifications",
    title: "Project Specifications",
    fields: ["plotArea", "builtUpArea", "buildingDetail"],
  },
  {
    id: "referrals",
    label: "Referrals & Sources",
    title: "Referrals & Direct Sources",
    fields: ["leadSourceType"],
  },
  {
    id: "commercials",
    label: "Commercial Work Areas",
    title: "Commercial Work Areas",
    fields: ["projectAreas"],
    defaultOpen: true,
  },
  {
    id: "status-section",
    label: "Lead Lifecycle Status",
    title: "Lead Lifecycle Status",
    fields: ["statusId"],
    defaultOpen: true,
  },
];

export default leadWizardConfig;
