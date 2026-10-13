import React, { useState } from "react";
import { Formik } from "formik";
import * as Yup from "yup";
import { createSingleSourceOfHire, updateSourceOfHire } from "@services/options";
import { apiErrorMessage } from "@utils/apiError";
import {
  ConfigureFormDialog,
  InlineHint,
  WtFieldFormik,
  toast,
} from "@app/modules/common/components/ui";

export interface SourceOfHireItem {
  id: string;
  /** Display name. Mapped from the row's `source` column by the caller. */
  name: string;
  companyId?: string;
}

interface SourceOfHireFormProps {
  show: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialData?: SourceOfHireItem | null;
  isEditing?: boolean;
  /** Company to file a NEW type under; resolved by the parent from the list. */
  companyId?: string;
}

const validationSchema = Yup.object().shape({
  name: Yup.string().trim().required("Source of hire is required"),
});

/**
 * Create / rename a source of hire.
 *
 * Backed by company_source_of_hire — the table the onboarding "Source Of Hire"
 * dropdown reads. It used to be maintainable ONLY through a "+ Add" button inside
 * the onboarding form itself, which meant the master list could be appended to while
 * hiring somebody but never corrected or pruned. It belongs with every other
 * onboarding dropdown, in Employees → Configure.
 *
 * The column is `source`, not `name`; the label follows the form's wording.
 */
const SourceOfHireConfigureForm: React.FC<SourceOfHireFormProps> = ({
  show,
  onClose,
  onSuccess,
  initialData,
  isEditing = false,
  companyId,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialValues = { name: initialData?.name || "" };

  const handleSubmit = async (values: typeof initialValues) => {
    setError(null);
    setIsSubmitting(true);
    try {
      const source = values.name.trim();
      if (isEditing && initialData?.id) {
        await updateSourceOfHire(initialData.id, { source });
        toast({ icon: "success", title: "Source of hire updated" });
      } else {
        const owner = companyId || initialData?.companyId;
        if (!owner) {
          setError("Could not determine the company to add this source to.");
          return;
        }
        await createSingleSourceOfHire({ source, companyId: owner });
        toast({ icon: "success", title: "Source of hire created" });
      }
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      setError(apiErrorMessage(err, `Failed to ${isEditing ? "update" : "create"} source of hire`));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={validationSchema}
      onSubmit={handleSubmit}
      enableReinitialize
    >
      {(fk) => (
        <ConfigureFormDialog
          open={show}
          onClose={onClose}
          title={`${isEditing ? "Edit" : "New"} Source Of Hire`}
          saving={isSubmitting}
          error={error}
          onSubmit={fk.handleSubmit}
          submitLabel={isEditing ? "Update" : "Create"}
        >
          <WtFieldFormik
            name="name"
            label="Source Of Hire"
            required
            autoFocus
            placeholder="e.g. LinkedIn, Referral, Job Portal, Walk-in"
            disabled={isSubmitting}
          />
          <InlineHint>
            Employee records keep the source they were hired from, so a value that is
            already in use can be renamed but not deleted.
          </InlineHint>
        </ConfigureFormDialog>
      )}
    </Formik>
  );
};

export default SourceOfHireConfigureForm;
