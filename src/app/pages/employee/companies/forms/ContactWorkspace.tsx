import React from "react";
import type { SummaryRow } from "@/shared/form-engine";
import { CrmWorkspace, type CrmWizardSection } from "./CrmWorkspace";

export type ContactWizardSection = CrmWizardSection;

type Props = {
  isEdit: boolean;
  onCancel: () => void;
  isSubmitting?: boolean;
  sections: ContactWizardSection[];
  /** Resolved company name for the summary. The form only stores the id. */
  companyName?: string;
};

/** Contact form shell. Flow: Profile → Company → Contact → Address → Notes. */
export function ContactWorkspace({ isEdit, onCancel, isSubmitting, sections, companyName }: Props) {
  const summaryRows = (values: any): SummaryRow[] => [
    { label: "Name", value: values.fullName || "—", isStrong: true },
    { label: "Company", value: companyName || "—" },
    // The primary ones — what greetings, invites and every other screen will use.
    { label: "Phone", value: values.phones?.find((p: any) => p.isPrimary)?.value || "—" },
    { label: "Email", value: values.emails?.find((e: any) => e.isPrimary)?.value || "—" },
    { label: "Gender", value: values.gender || "—" },
    { label: "Status", value: values.isContactActive === false ? "Inactive" : "Active" },
    { label: "Visibility", value: values.visibility || "—" },
  ];

  return (
    <CrmWorkspace
      module="contact"
      moduleIcon="bi-person-lines-fill"
      headerTitle={isEdit ? "Edit Contact" : "Add New Contact"}
      headerSub={isEdit ? "Update company link, personal and contact details" : "Photo, company link, personal and contact details"}
      sidebarTitle="Contact"
      summaryTitle="Contact Summary"
      summaryRows={summaryRows}
      isEdit={isEdit}
      isSubmitting={isSubmitting}
      onCancel={onCancel}
      submitText={isEdit ? "Save Contact" : "Create Contact"}
      sections={sections}
    />
  );
}

export default ContactWorkspace;
