import React, { useState } from "react";
import { Formik } from "formik";
import * as Yup from "yup";
import { Stack } from "@mui/material";
import {
  createLeadStatus, updateLeadStatus, createLeadReferralType, updateLeadReferralType,
  updateLeadDirectSource, createLeadDirectSource, createLeadCancellationReason,
  updateLeadCancellationReason, createLeadPoStatus, updateLeadPoStatus,
} from "@services/lead";
import { successConfirmation } from "@utils/modal";
import { EVENT_KEYS } from "@constants/eventKeys";
import eventBus from "@utils/EventBus";
import Swal from "sweetalert2";
import {
  ConfigureFormDialog,
  KIT_HEX_SWATCHES,
  WtCheckboxField,
  WtColorPicker,
  WtField,
  WtFieldFormik,
} from "@app/modules/common/components/ui";

export interface ConfigItem {
  id?: string;
  name: string;
  color: string;
  isDefault?: boolean;
  isInternal?: boolean;
  isProjectTrigger?: boolean;
  isLostOutcome?: boolean;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface ConfigFormProps {
  show: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialData?: ConfigItem | null;
  isEditing?: boolean;
  type: "status" | "referral" | "direct-source" | "cancellation-reason" | "po-status";
  title: string;
}

const PO_STATUS_MAX = 20;

const SERVICES: Record<ConfigFormProps["type"], {
  create: (payload: any) => Promise<any>;
  update: (id: string, payload: any) => Promise<any>;
  event: keyof typeof EVENT_KEYS;
}> = {
  "status": { create: createLeadStatus, update: updateLeadStatus, event: EVENT_KEYS.leadStatusCreated },
  "referral": { create: createLeadReferralType, update: updateLeadReferralType, event: EVENT_KEYS.leadReferralTypeCreated },
  "direct-source": { create: createLeadDirectSource, update: updateLeadDirectSource, event: EVENT_KEYS.leadDirectSourceCreated },
  "cancellation-reason": { create: createLeadCancellationReason, update: updateLeadCancellationReason, event: EVENT_KEYS.leadCancellationReasonCreated },
  "po-status": { create: createLeadPoStatus, update: updateLeadPoStatus, event: EVENT_KEYS.leadPoStatusCreated },
};

const LeadsConfigForm: React.FC<ConfigFormProps> = ({
  show, onClose, onSuccess, initialData, isEditing = false, type, title,
}) => {
  const [error, setError] = useState<string | null>(null);

  const validationSchema = Yup.object().shape({
    name: Yup.string()
      .required("Category Name is required")
      .max(
        type === "po-status" ? PO_STATUS_MAX : 200,
        type === "po-status" ? `Max ${PO_STATUS_MAX} characters` : undefined,
      ),
    color: Yup.string().required("Color is required"),
    isInternal: Yup.boolean().optional(),
    isDefault: Yup.boolean().optional(),
    isProjectTrigger: Yup.boolean().optional(),
    isLostOutcome: Yup.boolean().optional(),
    isActive: Yup.boolean().required(),
  });

  const initialValues = {
    name: initialData?.name || "",
    color: initialData?.color || "#1E3A8A",
    ...(type === "referral" && { isInternal: initialData?.isInternal ?? false }),
    ...(type === "status" && { isDefault: initialData?.isDefault ?? false }),
    ...(type === "status" && { isProjectTrigger: initialData?.isProjectTrigger ?? false }),
    ...(type === "status" && { isLostOutcome: initialData?.isLostOutcome ?? false }),
    isActive: initialData?.isActive ?? true,
  };

  const handleSubmit = async (values: typeof initialValues) => {
    setError(null);

    if (type === "status" && "isDefault" in values && values.isDefault) {
      const result = await Swal.fire({
        title: "Set as Default Status?",
        text: "There can be only 1 default status. If any previous status is set as default, it will be overwritten and this status will be set as default.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#1E3A8A",
        cancelButtonColor: "#6c757d",
        confirmButtonText: "Yes, Set as Default",
        cancelButtonText: "Cancel",
      });
      if (!result.isConfirmed) return;
    }

    try {
      let submitValues: any;
      if (type === "cancellation-reason") {
        submitValues = {
          reason: values.name,
          color: values.color,
          isActive: values.isActive,
        };
      } else {
        submitValues = {
          name: values.name,
          color: values.color,
          isActive: values.isActive,
        };
        if (type === "referral" && "isInternal" in values) {
          submitValues.isInternal = values.isInternal;
        }
        if (type === "status" && "isDefault" in values) {
          submitValues.isDefault = values.isDefault;
        }
        if (type === "status" && "isProjectTrigger" in values) {
          submitValues.isProjectTrigger = values.isProjectTrigger;
        }
        if (type === "status" && "isLostOutcome" in values) {
          submitValues.isLostOutcome = (values as any).isLostOutcome;
        }
      }

      const { create, update, event } = SERVICES[type];

      if (isEditing && initialData?.id) {
        await update(initialData.id, submitValues);
        successConfirmation(`${title} updated successfully`);
      } else {
        await create(submitValues);
        successConfirmation(`${title} created successfully`);
      }

      eventBus.emit(event, { id: isEditing ? "updated" : "created" });
      onSuccess?.();
      onClose();
    } catch (err: any) {
      const action = isEditing ? "update" : "create";
      setError(err.response?.data?.message || `Failed to ${action} ${title.toLowerCase()}`);
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
          saving={fk.isSubmitting}
          dirty={fk.dirty}
          error={error}
          onSubmit={fk.handleSubmit}
          submitLabel={isEditing ? "Update" : "Save"}
        >
          <Stack spacing={2.5}>
            <WtFieldFormik
              name="name"
              label="Category Name"
              required
              fullWidth
              placeholder="Enter category name"
              hint={type === "po-status" ? `Max ${PO_STATUS_MAX} characters (stored on the lead row).` : undefined}
            />

            {type === "referral" && (
              <WtField
                label="Type"
                fullWidth
                options={[
                  { value: "false", label: "External" },
                  { value: "true", label: "Internal" },
                ]}
                value={String(fk.values.isInternal ?? false)}
                onChange={(v) => fk.setFieldValue("isInternal", v === "true" || v === true)}
              />
            )}

            {type === "status" && (
              <WtCheckboxField
                size="sm"
                checked={Boolean(fk.values.isDefault)}
                onChange={(e) => fk.setFieldValue("isDefault", e.target.checked)}
                label="Set as Default Status"
              />
            )}

            {type === "status" && (
              <WtCheckboxField
                size="sm"
                checked={Boolean((fk.values as any).isLostOutcome)}
                onChange={(e) => fk.setFieldValue("isLostOutcome", e.target.checked)}
                label="Treat leads in this status as Lost"
                description="Marks the lead as a terminal negative outcome. The lead form will require a closure reason and note."
              />
            )}

            <WtColorPicker
              label="Category colour"
              variant="row"
              palette={KIT_HEX_SWATCHES}
              value={fk.values.color}
              onChange={(c) => fk.setFieldValue("color", c)}
            />

            <WtCheckboxField
              size="sm"
              checked={Boolean(fk.values.isActive)}
              onChange={(e) => fk.setFieldValue("isActive", e.target.checked)}
              label="Active"
            />
          </Stack>
        </ConfigureFormDialog>
      )}
    </Formik>
  );
};

export default LeadsConfigForm;
