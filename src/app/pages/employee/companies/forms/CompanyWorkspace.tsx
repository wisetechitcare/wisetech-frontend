import React from "react";
import type { SummaryRow } from "@/shared/form-engine";
import { CrmWorkspace, type CrmWizardSection } from "./CrmWorkspace";

export type CompanyWizardSection = CrmWizardSection;

type Props = {
  isEdit: boolean;
  onCancel: () => void;
  isSubmitting?: boolean;
  headerMeta?: React.ReactNode;
  headerActions?: React.ReactNode;
  /** Multi-step sections. When omitted, `children` is one Details step. */
  sections?: CompanyWizardSection[];
  children?: React.ReactNode;
};

const summaryRows = (values: any): SummaryRow[] => [
  { label: "Company", value: values.companyName || "—", isStrong: true },
  {
    label: "Status",
    value: values.status === "ACTIVE" ? "Active" : values.status === "CLOSED" ? "Inactive" : values.status || "—",
  },
  { label: "Phone", value: values.phone || "—" },
  { label: "Email", value: values.email || "—" },
  { label: "City", value: values.city || "—" },
];

export function CompanyWorkspace({ isEdit, onCancel, isSubmitting, headerMeta, headerActions, sections, children }: Props) {
  const resolvedSections: CompanyWizardSection[] = sections?.length
    ? sections
    : [
        {
          id: "details",
          label: "Company Details",
          title: "Company Details",
          subtitle: "Profile, contacts, address and status",
          fields: ["companyName", "companyTypes", "status", "phone", "email", "country", "note"],
          requiredFields: ["companyName"],
          icon: "bi-building",
          content: <>{children}</>,
        },
      ];

  return (
    <CrmWorkspace
      module="company"
      moduleIcon="bi-building"
      headerTitle={isEdit ? "Edit Company" : "Add New Company"}
      headerSub={headerMeta || (isEdit ? "Update company profile, types and location" : "Name, types, contact details and location")}
      headerActions={headerActions}
      sidebarTitle="Company"
      summaryTitle="Company Summary"
      summaryRows={summaryRows}
      isEdit={isEdit}
      isSubmitting={isSubmitting}
      onCancel={onCancel}
      submitText={isEdit ? "Save Company" : "Create Company"}
      sections={resolvedSections}
    />
  );
}

export default CompanyWorkspace;
