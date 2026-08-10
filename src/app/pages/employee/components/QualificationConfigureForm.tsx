import React, { useState } from "react";
import { Modal } from "react-bootstrap";
import { Formik, Form as FormikForm, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import {
  createQualificationMaster,
  updateQualificationMaster,
} from "@services/employee";
import { successConfirmation } from "@utils/modal";
import { C, FONT, SP, RADIUS } from "@app/modules/configuration";

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
        successConfirmation("Qualification updated successfully");
      } else {
        await createQualificationMaster({ name });
        successConfirmation("Qualification created successfully");
      }
      onSuccess?.();
      onClose();
    } catch (err: any) {
      // The name column is UNIQUE and the handler rejects duplicates by message —
      // surface it inline rather than as a generic failure.
      setError(
        err?.response?.data?.message ||
          `Failed to ${isEditing ? "update" : "create"} qualification`
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
          {isEditing ? "Edit" : "New"} Qualification
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
              Qualification Name
              <span style={{ color: "#dc3545", marginLeft: "4px" }}>*</span>
            </label>
            <Field
              name="name"
              type="text"
              placeholder="e.g. SSC, HSC, Diploma, Degree, Masters"
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
                background: "#0d9488",
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

export default QualificationConfigureForm;
