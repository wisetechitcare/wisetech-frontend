import React, { useMemo } from "react";
import { useFormikContext } from "formik";
import {
  EnterpriseFormWizard,
  type EnterpriseWizardStep,
  type SummaryRow,
} from "@/shared/form-engine";
import { AppIcon } from "@app/modules/common/components/ui";
import "./crmWizardTheme.css";

export type CrmWizardSection = {
  id: string;
  label: string;
  title: string;
  subtitle?: string;
  fields: string[];
  requiredFields?: string[];
  icon?: string;
  content: React.ReactNode;
};

export type CrmWorkspaceProps = {
  /** `data-form-module` on the wizard root, e.g. "contact", "branch". */
  module: string;
  moduleIcon: string;
  headerTitle: string;
  headerSub?: React.ReactNode;
  headerActions?: React.ReactNode;
  sidebarTitle: string;
  summaryTitle: string;
  summaryRows: (values: any) => SummaryRow[];
  isEdit: boolean;
  isSubmitting?: boolean;
  onCancel: () => void;
  submitText: string;
  sections: CrmWizardSection[];
};

/**
 * The one CRM form shell — Company, Contact, Sub-company and Branch all render through it,
 * so a fix to the wizard chrome (footer, header, mobile layout) lands on every form at once.
 */
export function CrmWorkspace({
  module, moduleIcon, headerTitle, headerSub, headerActions, sidebarTitle, summaryTitle,
  summaryRows, isEdit, isSubmitting, onCancel, submitText, sections,
}: CrmWorkspaceProps) {
  const { values } = useFormikContext<any>();
  const rows = useMemo(() => summaryRows(values), [summaryRows, values]);

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
      module={module}
      moduleIcon={moduleIcon}
      headerTitle={headerTitle}
      headerSub={headerSub}
      headerActions={headerActions}
      sidebarTitle={sidebarTitle}
      steps={steps}
      summary={{ title: summaryTitle, rows }}
      actions={{ isSubmitting, isEditMode: isEdit, onCancel, submitText }}
    />
  );
}

export default CrmWorkspace;
