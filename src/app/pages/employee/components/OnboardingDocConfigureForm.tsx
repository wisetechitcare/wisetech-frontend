import React, { useState } from "react";
import { Modal } from "react-bootstrap";
import { Formik, Form as FormikForm, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { createOnboardingDocs, updateOnboardingDocs } from "@services/options";
import { successConfirmation } from "@utils/modal";
import { C, FONT, SP, RADIUS } from "@app/modules/configuration";

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

const checkboxRowSx: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: SP.sm,
  marginTop: SP.md,
  fontFamily: FONT.body,
  fontSize: "14px",
  color: C.textPrimary,
  cursor: "pointer",
};

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
        successConfirmation("Onboarding document updated successfully");
      } else {
        const owner = companyId || initialData?.companyId;
        if (!owner) {
          setError("Could not determine the company to add this document to.");
          return;
        }
        // The create endpoint takes a LIST — it was built to seed a company's set.
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
        successConfirmation("Onboarding document created successfully");
      }
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          `Failed to ${isEditing ? "update" : "create"} onboarding document`
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
          {isEditing ? "Edit" : "New"} Onboarding Document
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
              Document Name
              <span style={{ color: "#dc3545", marginLeft: "4px" }}>*</span>
            </label>
            <Field
              name="fieldName"
              type="text"
              placeholder="e.g. Aadhar, PAN Card, Passport"
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
            <ErrorMessage name="fieldName">
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

            <label style={checkboxRowSx}>
              <Field type="checkbox" name="isEnabled" disabled={isSubmitting} />
              Ask for this document during onboarding
            </label>

            <label style={checkboxRowSx}>
              <Field type="checkbox" name="hasIdentityNumber" disabled={isSubmitting} />
              Also collect an identity number for it
            </label>
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

export default OnboardingDocConfigureForm;
