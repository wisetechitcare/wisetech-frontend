import React, { useState } from "react";
import { Formik } from "formik";
import * as Yup from "yup";
import {
  createEmployeeConfiguration,
  updateEmployeeConfigurationById,
} from "@services/configurations";
import { apiErrorMessage } from "@utils/apiError";
import { EVENT_KEYS } from "@constants/eventKeys";
import eventBus from "@utils/EventBus";
import {
  ConfigureFormDialog,
  KIT_HEX_SWATCHES,
  WtColorPicker,
  WtFieldFormik,
  toast,
} from "@app/modules/common/components/ui";

interface EmployeeConfigItem {
  id: string;
  type: string;
  name: string;
  color?: string | null;
  createdAt: string;
  updatedAt: string;
}

type EmployeeConfigType =
  | "JOB_PROFILE"
  | "EMPLOYEE_TYPE"
  | "EMPLOYEE_LEVEL"
  | "EMPLOYEE_STATUS";

interface ConfigFormProps {
  show: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialData?: EmployeeConfigItem | null;
  isEditing?: boolean;
  type: EmployeeConfigType;
  title: string;
}

const validationSchema = Yup.object().shape({
  name: Yup.string().required("Name is required"),
  color: Yup.string(),
});

const DEFAULT_COLOR = "#1E3A8A";

function fieldLabel(type: EmployeeConfigType): string {
  switch (type) {
    case "JOB_PROFILE":
      return "Job Profile Name";
    case "EMPLOYEE_TYPE":
      return "Employee Type Name";
    case "EMPLOYEE_LEVEL":
      return "Experience Level Name";
    case "EMPLOYEE_STATUS":
      return "Employee Status Name";
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

function fieldPlaceholder(type: EmployeeConfigType): string {
  switch (type) {
    case "JOB_PROFILE":
      return "Enter job profile name";
    case "EMPLOYEE_TYPE":
      return "Enter employee type name";
    case "EMPLOYEE_LEVEL":
      return "Enter experience level name";
    case "EMPLOYEE_STATUS":
      return "Enter employee status name";
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

const EmployeeConfigureForm: React.FC<ConfigFormProps> = ({
  show,
  onClose,
  onSuccess,
  initialData,
  isEditing = false,
  type,
  title,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialValues = {
    name: initialData?.name || "",
    color: initialData?.color || DEFAULT_COLOR,
  };

  const handleSubmit = async (values: typeof initialValues) => {
    setError(null);
    setIsSubmitting(true);

    try {
      const payload = {
        type,
        name: values.name,
        color: values.color || undefined,
      };

      if (isEditing && initialData?.id) {
        await updateEmployeeConfigurationById(initialData.id, {
          name: values.name,
          color: values.color || undefined,
        });
        toast({ icon: "success", title: `${title} updated` });
        eventBus.emit(EVENT_KEYS.employeeConfigUpdated, {
          id: initialData.id,
        });
      } else {
        await createEmployeeConfiguration(payload);
        toast({ icon: "success", title: `${title} created` });
        eventBus.emit(EVENT_KEYS.employeeConfigCreated, { type });
      }

      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const action = isEditing ? "update" : "create";
      setError(apiErrorMessage(err, `Failed to ${action} ${title.toLowerCase()}`));
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
          title={`${isEditing ? "Edit" : "New"} ${title}`}
          saving={isSubmitting}
          dirty={fk.dirty}
          error={error}
          onSubmit={fk.handleSubmit}
          submitLabel={isEditing ? "Update" : "Save"}
        >
          <WtFieldFormik
            name="name"
            label={fieldLabel(type)}
            required
            autoFocus
            placeholder={fieldPlaceholder(type)}
            disabled={isSubmitting}
          />
          <WtColorPicker
            label="Colour (optional)"
            palette={KIT_HEX_SWATCHES}
            value={fk.values.color || DEFAULT_COLOR}
            onChange={(v) => void fk.setFieldValue("color", v, true)}
            disabled={isSubmitting}
            variant="row"
          />
        </ConfigureFormDialog>
      )}
    </Formik>
  );
};

export default EmployeeConfigureForm;
