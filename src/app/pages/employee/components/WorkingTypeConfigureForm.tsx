import React, { useState } from "react";
import { Modal } from "react-bootstrap";
import { Formik, Form as FormikForm, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { createWorkingMethod, updateWorkingMethodById } from "@services/options";
import { successConfirmation } from "@utils/modal";
// `detail` carries the server's reason; `.message` is only the HTTP status name.
import { apiErrorMessage } from "@utils/apiError";
import { C, FONT, SP, RADIUS } from "@app/modules/configuration";

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
        successConfirmation("Working location type updated successfully");
      } else {
        const owner = companyId || initialData?.companyId;
        if (!owner) {
          setError("Could not determine the company to add this type to.");
          return;
        }
        await createWorkingMethod({ type, companyId: owner });
        successConfirmation("Working location type created successfully");
      }
      onSuccess?.();
      onClose();
    } catch (err: any) {
      // `type` is UNIQUE table-wide and the handler rejects duplicates by message —
      // surface it inline rather than as a generic failure.
      setError(apiErrorMessage(err, `Failed to ${isEditing ? "update" : "create"} working location type`));
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
          {isEditing ? "Edit" : "New"} Working Location Type
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
              Working Location Type
              <span style={{ color: "#dc3545", marginLeft: "4px" }}>*</span>
            </label>
            <Field
              name="name"
              type="text"
              placeholder="e.g. Office, Hybrid, On-site, Remote"
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
              Attendance records store the type an employee checked in and out under, so
              one that is already in use can be renamed but not deleted.
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
                background: C.primary,
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

export default WorkingTypeConfigureForm;
