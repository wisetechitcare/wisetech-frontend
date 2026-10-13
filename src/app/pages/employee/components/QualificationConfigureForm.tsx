import React, { useState } from "react";
import { Formik } from "formik";
import * as Yup from "yup";
import {
  createQualificationMaster,
  updateQualificationMaster,
} from "@services/employee";
import { apiErrorMessage } from "@utils/apiError";
import {
  ConfigureFormDialog,
  WtFieldFormik,
  toast,
} from "@app/modules/common/components/ui";

export interface QualificationItem {
  id: string;
  name: string;
}

interface QualificationFormProps {
  show: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialData?: QualificationItem | null;
  isEditing?: boolean;
}

const validationSchema = Yup.object().shape({
  name: Yup.string().trim().required("Qualification name is required"),
});

/**
 * Create / rename a qualification.
 *
 * Sibling of EmployeeConfigureForm, but deliberately NOT the same component: these
 * rows live in `qualification_master` behind their own endpoints, not in the generic
 * employee_configurations table, and they carry no colour — so reusing that form would
 * mean threading a second API and hiding half its fields.
 */
const QualificationConfigureForm: React.FC<QualificationFormProps> = ({
  show,
  onClose,
  onSuccess,
  initialData,
  isEditing = false,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialValues = { name: initialData?.name || "" };

  const handleSubmit = async (values: typeof initialValues) => {
    setError(null);
    setIsSubmitting(true);
    try {
      const name = values.name.trim();
      if (isEditing && initialData?.id) {
        await updateQualificationMaster(initialData.id, { name });
        toast({ icon: "success", title: "Qualification updated" });
      } else {
        await createQualificationMaster({ name });
        toast({ icon: "success", title: "Qualification created" });
      }
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      setError(apiErrorMessage(err, `Failed to ${isEditing ? "update" : "create"} qualification`));
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
          title={`${isEditing ? "Edit" : "New"} Qualification`}
          saving={isSubmitting}
          error={error}
          onSubmit={fk.handleSubmit}
          submitLabel={isEditing ? "Update" : "Create"}
        >
          <WtFieldFormik
            name="name"
            label="Qualification Name"
            required
            autoFocus
            placeholder="e.g. SSC, HSC, Diploma, Degree, Masters"
            disabled={isSubmitting}
          />
        </ConfigureFormDialog>
      )}
    </Formik>
  );
};

export default QualificationConfigureForm;
