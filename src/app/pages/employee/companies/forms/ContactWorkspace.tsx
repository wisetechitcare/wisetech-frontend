import React, { useMemo } from "react";
import { useFormikContext } from "formik";
import {
  EnterpriseFormWizard,
  type EnterpriseWizardStep,
  type SummaryRow,
} from "@/shared/form-engine";
import { AppIcon } from "@app/modules/common/components/ui";
import "./crmWizardTheme.css";

export type ContactWizardSection = {
  id: string;
  label: string;
  title: string;
  subtitle?: string;
  fields: string[];
  requiredFields?: string[];
  icon?: string;
  content: React.ReactNode;
};

type Props = {
  isEdit: boolean;
  onCancel: () => void;
  isSubmitting?: boolean;
  sections: ContactWizardSection[];
};

/**
 * Contact form shell — same EnterpriseFormWizard chrome as Leads / Onboarding.
 * Flow: Profile → Company → Contact → Address → Notes.
 */
export function ContactWorkspace({ isEdit, onCancel, isSubmitting, sections }: Props) {
  const { values } = useFormikContext<any>();

  const summaryRows: SummaryRow[] = useMemo(
    () => [
      { label: "Name", value: values.fullName || "—", isStrong: true },
      { label: "Phone", value: values.phone || "—" },
      { label: "Email", value: values.email || "—" },
      { label: "Gender", value: values.gender || "—" },
      {
        label: "Status",
        value: values.isContactActive === false ? "Inactive" : "Active",
      },
      { label: "Visibility", value: values.visibility || "—" },
    ],
    [values],
  );

  const steps: EnterpriseWizardStep[] = useMemo(
    () =>
      sections.map((s, i) => ({
        id: s.id,
        label: s.label,
        title: s.title,
        subtitle: s.subtitle,
        fields: s.fields,
        requiredFields: s.requiredFields,
        isSubmitStep: i === sections.length - 1,
        icon: <AppIcon name={s.icon || "bi-circle"} />,
        render: () => <>{s.content}</>,
      })),
    [sections],
  );

  return (
    <EnterpriseFormWizard
      module="contact"
      moduleIcon="bi-person-lines-fill"
      headerTitle={isEdit ? "Edit Contact" : "Add New Contact"}
      headerSub={
        isEdit
          ? "Update company link, personal and contact details"
          : "Photo, company link, personal and contact details"
      }
      sidebarTitle="Contact"
      steps={steps}
      summary={{ title: "Contact Summary", rows: summaryRows }}
      actions={{
        isSubmitting,
        isEditMode: isEdit,
        onCancel,
        submitText: isEdit ? "Save Contact" : "Create Contact",
      }}
    />
  );
}

export default ContactWorkspace;
