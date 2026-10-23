import React, { useMemo } from "react";
import { useFormikContext } from "formik";
import {
  EnterpriseFormWizard,
  type EnterpriseWizardStep,
  type SummaryRow,
} from "@/shared/form-engine";
import { AppIcon } from "@app/modules/common/components/ui";
import "./crmWizardTheme.css";

export type CompanyWizardSection = {
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
  headerMeta?: React.ReactNode;
  headerActions?: React.ReactNode;
  /** Multi-step sections. When omitted, `children` is one Details step. */
  sections?: CompanyWizardSection[];
  children?: React.ReactNode;
};

export function CompanyWorkspace({
  isEdit,
  onCancel,
  isSubmitting,
  headerMeta,
  headerActions,
  sections,
  children,
}: Props) {
  const { values } = useFormikContext<any>();

  const summaryRows: SummaryRow[] = useMemo(
    () => [
      { label: "Company", value: values.companyName || "—", isStrong: true },
      {
        label: "Status",
        value:
          values.status === "ACTIVE"
            ? "Active"
            : values.status === "CLOSED"
              ? "Inactive"
              : values.status || "—",
      },
      { label: "Phone", value: values.phone || "—" },
      { label: "Email", value: values.email || "—" },
      { label: "City", value: values.city || "—" },
    ],
    [values],
  );

  const resolvedSections: CompanyWizardSection[] = sections?.length
    ? sections
    : [
        {
          id: "details",
          label: "Company Details",
          title: "Company Details",
          subtitle: "Profile, contacts, address and status",
          fields: [
            "companyName",
            "companyTypes",
            "status",
            "phone",
            "email",
            "country",
            "note",
          ],
          requiredFields: ["companyName"],
          icon: "bi-building",
          content: <>{children}</>,
        },
      ];

  const steps: EnterpriseWizardStep[] = useMemo(
    () =>
      resolvedSections.map((s, i) => ({
        id: s.id,
        label: s.label,
        title: s.title,
        subtitle: s.subtitle,
        fields: s.fields,
        requiredFields: s.requiredFields,
        isSubmitStep: i === resolvedSections.length - 1,
        icon: <AppIcon name={s.icon || "bi-circle"} />,
        render: () => <>{s.content}</>,
      })),
    [resolvedSections],
  );

  return (
    <EnterpriseFormWizard
      module="company"
      moduleIcon="bi-building"
      headerTitle={isEdit ? "Edit Company" : "Add New Company"}
      headerSub={
        headerMeta ||
        (isEdit
          ? "Update company profile, types and location"
          : "Name, types, contact details and location")
      }
      headerActions={headerActions}
      sidebarTitle="Company"
      steps={steps}
      summary={{ title: "Company Summary", rows: summaryRows }}
      actions={{
        isSubmitting,
        isEditMode: isEdit,
        onCancel,
        submitText: isEdit ? "Save Company" : "Create Company",
      }}
    />
  );
}

export default CompanyWorkspace;
