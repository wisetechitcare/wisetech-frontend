import React, { useState } from "react";
import { Modal } from "react-bootstrap";
import { Formik, Form as FormikForm, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { createDesignation, updateDesignationById } from "@services/options";
import { successConfirmation } from "@utils/modal";
import { C, FONT, SP, RADIUS } from "@app/modules/configuration";

export interface JobProfileItem {
  id: string;
  /** Display name. Mapped from the designation row's `role` column by the caller. */
  name: string;
  /** Carried through so an edit can round-trip them — see handleSubmit. */
  companyId?: string;
  isActive?: boolean;
}

interface JobProfileFormProps {
  show: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialData?: JobProfileItem | null;
  isEditing?: boolean;
  /** Company to file a NEW job profile under; resolved by the parent from the list. */
  companyId?: string;
}

const validationSchema = Yup.object().shape({
  name: Yup.string().trim().required("Job profile name is required"),
});

/**
 * Create / rename a job profile.
 *
 * Backed by the DESIGNATIONS table, which is what the onboarding "Job Profile"
 * dropdown actually reads. This card used to manage employee_configurations
 * (JOB_PROFILE) instead — a separate table nothing consumed, so anything added here
 * never appeared in the form while the 24 real designations could not be edited from
 * this screen at all.
 *
 * The column is `role`, not `name`; the label stays "Job Profile" because that is what
 * the form calls it.
 */
const JobProfileConfigureForm: React.FC<JobProfileFormProps> = ({
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
      const role = values.name.trim();
      if (isEditing && initialData?.id) {
        // Both schemas are `.strict(true)` and require role + isActive + companyId, so
        // a name-only payload is rejected. isActive is round-tripped from the row on
        // purpose: the older Designations screen hardcodes `isActive: false` here and
        // the handler passes the body straight to Prisma, so editing there silently
        // retires the designation. Preserving the current value avoids that.
        await updateDesignationById(initialData.id, {
          role,
          companyId: initialData.companyId,
          isActive: initialData.isActive ?? true,
        });
        successConfirmation("Job profile updated successfully");
      } else {
        if (!companyId) {
          setError("Could not determine the company to add this job profile to.");
          return;
        }
        // The create endpoint takes a LIST — it was built for bulk seeding.
        await createDesignation([{ role, companyId, isActive: true }]);
        successConfirmation("Job profile created successfully");
      }
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          `Failed to ${isEditing ? "update" : "create"} job profile`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!show) return null;

  return (
    <Modal show={show} onHide={onClose} centered backdropClassName="modal-backdrop-blur">
      <Modal.Header
        closeButton
        style={{ borderBottom: `1px solid ${C.border}`, padding: `${SP.md} ${SP.lg}` }}
      >
        <Modal.Title
          style={{ fontWeight: 600, fontSize: "18px", color: C.textPrimary, fontFamily: FONT.body }}
        >
          {isEditing ? "Edit" : "New"} Job Profile
        </Modal.Title>
      </Modal.Header>
      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
        enableReinitialize
      >
        <FormikForm>
          <Modal.Body style={{ padding: SP.lg }}>
            {error && (
              <div
                style={{
                  backgroundColor: "#fee2e2",
                  border: "1px solid #fecaca",
                  borderRadius: RADIUS.md,
                  padding: SP.md,
                  marginBottom: SP.lg,
                  color: "#7f1d1d",
                  fontFamily: FONT.body,
                  fontSize: "14px",
                }}
              >
                {error}
              </div>
            )}

            <label
              style={{
                fontWeight: 500,
                color: C.textPrimary,
                fontSize: "14px",
                marginBottom: SP.sm,
                display: "block",
                fontFamily: FONT.body,
              }}
            >
              Job Profile Name
              <span style={{ color: "#dc3545", marginLeft: "4px" }}>*</span>
            </label>
            <Field
              name="name"
              type="text"
              placeholder="e.g. Junior Engineers, Senior Draughtsman"
              style={{
                width: "100%",
                backgroundColor: C.bgCard,
                border: `1px solid ${C.border}`,
                borderRadius: RADIUS.md,
                padding: SP.md,
                fontSize: "14px",
                color: C.textPrimary,
                fontFamily: FONT.body,
                outline: "none",
              }}
              disabled={isSubmitting}
            />
            <ErrorMessage name="name">
              {(msg: string) => (
                <div
                  style={{
                    color: "#dc3545",
                    marginTop: "4px",
                    fontSize: "12px",
                    fontFamily: FONT.body,
                  }}
                >
                  {msg}
                </div>
              )}
            </ErrorMessage>

            <p
              style={{
                marginTop: SP.md,
                marginBottom: 0,
                fontFamily: FONT.body,
                fontSize: "12px",
                color: C.textMuted,
              }}
            >
              Also listed as “Designations” under Organization Profile → Configure.
            </p>
          </Modal.Body>

          <Modal.Footer style={{ borderTop: `1px solid ${C.border}`, padding: `${SP.md} ${SP.lg}` }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                fontFamily: FONT.body,
                fontSize: "13px",
                fontWeight: 600,
                padding: `${SP.sm} ${SP.lg}`,
                borderRadius: RADIUS.md,
                border: `1px solid ${C.border}`,
                background: C.bgCard,
                color: C.textPrimary,
                cursor: isSubmitting ? "not-allowed" : "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                fontFamily: FONT.body,
                fontSize: "13px",
                fontWeight: 600,
                padding: `${SP.sm} ${SP.lg}`,
                borderRadius: RADIUS.md,
                border: "none",
                background: C.info,
                color: "#fff",
                cursor: isSubmitting ? "not-allowed" : "pointer",
                opacity: isSubmitting ? 0.7 : 1,
              }}
            >
              {isSubmitting ? "Saving..." : isEditing ? "Update" : "Create"}
            </button>
          </Modal.Footer>
        </FormikForm>
      </Formik>
    </Modal>
  );
};

export default JobProfileConfigureForm;
