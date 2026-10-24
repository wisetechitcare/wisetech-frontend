import React, { useState } from "react";
import { Formik } from "formik";
import * as Yup from "yup";
import { createOnboardingDocs, updateOnboardingDocs } from "@services/options";
import { apiErrorMessage } from "@utils/apiError";
import {
  ConfigureFormDialog,
  WtFieldFormik,
  WtSwitchField,
  toast,
} from "@app/modules/common/components/ui";

export interface OnboardingDocItem {
  id: string;
  /** Display name. Mapped from the row's `fieldName` column by the caller. */
  name: string;
  isEnabled: boolean;
  hasIdentityNumber: boolean;
  companyId?: string;
}

interface OnboardingDocFormProps {
  show: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialData?: OnboardingDocItem | null;
  isEditing?: boolean;
  /** Company to file a NEW document under; resolved by the parent from the list. */
  companyId?: string;
}

const validationSchema = Yup.object().shape({
  fieldName: Yup.string().trim().required("Document name is required"),
});

/**
 * Create / edit an onboarding document requirement.
 *
 * These are the documents the onboarding form asks a new employee to upload, so they
 * live with the rest of the onboarding configuration rather than under Organization,
 * where they previously sat two modules away from the form they drive.
 */
const OnboardingDocConfigureForm: React.FC<OnboardingDocFormProps> = ({
  show,
  onClose,
  onSuccess,
  initialData,
  isEditing = false,
  companyId,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialValues = {
    fieldName: initialData?.name || "",
    isEnabled: initialData?.isEnabled ?? true,
    hasIdentityNumber: initialData?.hasIdentityNumber ?? true,
  };

  const handleSubmit = async (values: typeof initialValues) => {
    setError(null);
    setIsSubmitting(true);
    try {
      const fieldName = values.fieldName.trim();

      if (isEditing && initialData?.id) {
        await updateOnboardingDocs(initialData.id, {
          fieldName,
          isEnabled: values.isEnabled,
          hasIdentityNumber: values.hasIdentityNumber,
        });
        toast({ icon: "success", title: "Onboarding document updated" });
      } else {
        const owner = companyId || initialData?.companyId;
        if (!owner) {
          setError("Could not determine the company to add this document to.");
          return;
        }
        await createOnboardingDocs({
          companyId: owner,
          documents: [
            {
              fieldName,
              isEnabled: values.isEnabled,
              hasIdentityNumber: values.hasIdentityNumber,
            },
          ],
        });
        toast({ icon: "success", title: "Onboarding document created" });
      }
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      setError(apiErrorMessage(err, `Failed to ${isEditing ? "update" : "create"} onboarding document`));
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
          title={`${isEditing ? "Edit" : "New"} Onboarding Document`}
          saving={isSubmitting}
          dirty={fk.dirty}
          error={error}
          onSubmit={fk.handleSubmit}
          submitLabel={isEditing ? "Update" : "Create"}
        >
          <WtFieldFormik
            name="fieldName"
            label="Document Name"
            required
            autoFocus
            placeholder="e.g. Aadhar, PAN Card, Passport"
            disabled={isSubmitting}
          />
          <WtSwitchField
            title="Ask for this document during onboarding"
            size="sm"
            checked={fk.values.isEnabled}
            onChange={(e) => void fk.setFieldValue("isEnabled", e.target.checked)}
            disabled={isSubmitting}
          />
          <WtSwitchField
            title="Also collect an identity number for it"
            size="sm"
            checked={fk.values.hasIdentityNumber}
            onChange={(e) => void fk.setFieldValue("hasIdentityNumber", e.target.checked)}
            disabled={isSubmitting}
          />
        </ConfigureFormDialog>
      )}
    </Formik>
  );
};

export default OnboardingDocConfigureForm;
