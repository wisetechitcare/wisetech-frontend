import React, { useState } from "react";
import { Formik } from "formik";
import * as Yup from "yup";
import {
  createOrganizationConfiguration,
  updateOrganizationConfigurationById,
} from "@services/configurations";
import { apiErrorMessage } from "@utils/apiError";
import { EVENT_KEYS } from "@constants/eventKeys";
import eventBus from "@utils/EventBus";
import {
  ConfigureFormDialog,
  WtFieldFormik,
  toast,
} from "@app/modules/common/components/ui";

interface OrganizationConfigItem {
  id: string;
  type: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

type OrgConfigType = "SHIFT" | "WORKING_TYPE";

interface ConfigFormProps {
  show: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialData?: OrganizationConfigItem | null;
  isEditing?: boolean;
  type: OrgConfigType;
  title: string;
}

const validationSchema = Yup.object().shape({
  name: Yup.string().required("Name is required"),
});

function fieldLabel(type: OrgConfigType): string {
  switch (type) {
    case "SHIFT":
      return "Shift Name";
    case "WORKING_TYPE":
      return "Working Location Type Name";
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

function fieldPlaceholder(type: OrgConfigType): string {
  switch (type) {
    case "SHIFT":
      return "Enter shift name";
    case "WORKING_TYPE":
      return "Enter working location type name";
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

const OrganizationConfigureForm: React.FC<ConfigFormProps> = ({
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
  };

  const handleSubmit = async (values: typeof initialValues) => {
    setError(null);
    setIsSubmitting(true);

    try {
      const payload = {
        type,
        name: values.name,
      };

      if (isEditing && initialData?.id) {
        await updateOrganizationConfigurationById(initialData.id, {
          name: values.name,
        });
        toast({ icon: "success", title: `${title} updated` });
        eventBus.emit(EVENT_KEYS.organizationConfigUpdated, {
          id: initialData.id,
        });
      } else {
        await createOrganizationConfiguration(payload);
        toast({ icon: "success", title: `${title} created` });
        eventBus.emit(EVENT_KEYS.organizationConfigCreated, { type });
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
        </ConfigureFormDialog>
      )}
    </Formik>
  );
};

export default OrganizationConfigureForm;
