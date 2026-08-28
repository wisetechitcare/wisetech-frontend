import React, { useState } from "react";
import { Modal } from "react-bootstrap";
import { Formik, Form as FormikForm, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { createSingleSourceOfHire, updateSourceOfHire } from "@services/options";
import { successConfirmation } from "@utils/modal";
// `detail` carries the server's reason; `.message` is only the HTTP status name.
import { apiErrorMessage } from "@utils/apiError";
import { C, FONT, SP, RADIUS } from "@app/modules/configuration";

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
        successConfirmation("Source of hire updated successfully");
      } else {
        const owner = companyId || initialData?.companyId;
        if (!owner) {
          setError("Could not determine the company to add this source to.");
          return;
        }
        await createSingleSourceOfHire({ source, companyId: owner });
        successConfirmation("Source of hire created successfully");
      }
      onSuccess?.();
      onClose();
    } catch (err: any) {
      // `source` is UNIQUE table-wide and the handler rejects duplicates by
      // message — surface it inline rather than as a generic failure.
      setError(apiErrorMessage(err, `Failed to ${isEditing ? "update" : "create"} source of hire`));
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
          {isEditing ? "Edit" : "New"} Source Of Hire
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
              Source Of Hire
              <span style={{ color: "#dc3545", marginLeft: "4px" }}>*</span>
            </label>
            <Field
              name="name"
              type="text"
              placeholder="e.g. LinkedIn, Referral, Job Portal, Walk-in"
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

export default SourceOfHireConfigureForm;
