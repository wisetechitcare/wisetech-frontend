import React, { useState } from "react";
import { Formik } from "formik";
import * as Yup from "yup";
import { createWorkingMethod, updateWorkingMethodById } from "@services/options";
import { apiErrorMessage } from "@utils/apiError";
import {
  ConfigureFormDialog,
  InlineHint,
  WtFieldFormik,
  toast,
} from "@app/modules/common/components/ui";

export interface WorkingTypeItem {
  id: string;
  /** Display name. Mapped from the row's `type` column by the caller. */
  name: string;
  companyId?: string;
}

interface WorkingTypeFormProps {
  show: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialData?: WorkingTypeItem | null;
  isEditing?: boolean;
  /** Company to file a NEW type under; resolved by the parent from the list. */
  companyId?: string;
}

const validationSchema = Yup.object().shape({
  name: Yup.string().trim().required("Working location type is required"),
});

/**
 * Create / rename a working location type.
 *
 * Backed by company_working_methods — the table the onboarding "Working Location Type"
 * dropdown reads. Those rows had no management screen at all: only a bulk seed endpoint
 * existed, so the three values shipped with the company could never be changed. The
 * WORKING_TYPE entry under Organization Config looks like it belongs to this field but
 * feeds nothing.
 *
 * The column is `type`, not `name`; the label follows the form's wording.
 */
const WorkingTypeConfigureForm: React.FC<WorkingTypeFormProps> = ({
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
      const type = values.name.trim();
      if (isEditing && initialData?.id) {
        await updateWorkingMethodById(initialData.id, { type });
        toast({ icon: "success", title: "Working location type updated" });
      } else {
        const owner = companyId || initialData?.companyId;
        if (!owner) {
          setError("Could not determine the company to add this type to.");
          return;
        }
        await createWorkingMethod({ type, companyId: owner });
        toast({ icon: "success", title: "Working location type created" });
      }
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      setError(apiErrorMessage(err, `Failed to ${isEditing ? "update" : "create"} working location type`));
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
          title={`${isEditing ? "Edit" : "New"} Working Location Type`}
          saving={isSubmitting}
          dirty={fk.dirty}
          error={error}
          onSubmit={fk.handleSubmit}
          submitLabel={isEditing ? "Update" : "Create"}
        >
          <WtFieldFormik
            name="name"
            label="Working Location Type"
            required
            autoFocus
            placeholder="e.g. Office, Hybrid, On-site, Remote"
            disabled={isSubmitting}
          />
          <InlineHint>
            Attendance records store the type an employee checked in and out under, so
            one that is already in use can be renamed but not deleted.
          </InlineHint>
        </ConfigureFormDialog>
      )}
    </Formik>
  );
};

export default WorkingTypeConfigureForm;
