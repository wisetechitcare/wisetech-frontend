import React, { useState } from "react";
import { Modal } from "react-bootstrap";
import { Formik, Form as FormikForm, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { createNewDepartment, updateDepartmentById } from "@services/company";
import { successConfirmation } from "@utils/modal";
// `detail` carries the server's reason; `.message` is only the HTTP status name.
import { apiErrorMessage } from "@utils/apiError";
import { C, FONT, SP, RADIUS } from "@app/modules/configuration";

export interface DepartmentItem {
  id: string;
  name: string;
  code?: string;
  description?: string;
  /** Carried through so an edit can round-trip them — see handleSubmit. */
  companyId?: string;
  isActive?: boolean;
}

interface DepartmentFormProps {
  show: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialData?: DepartmentItem | null;
  isEditing?: boolean;
  /** Company to file a NEW department under; resolved by the parent from the list. */
  companyId?: string;
}

const validationSchema = Yup.object().shape({
  name: Yup.string().trim().required("Department name is required"),
  code: Yup.string().trim(),
  description: Yup.string().trim(),
});

const fieldSx: React.CSSProperties = {
  width: "100%",
  backgroundColor: C.bgCard,
  border: `1px solid ${C.border}`,
  borderRadius: RADIUS.md,
  padding: SP.md,
  fontSize: "14px",
  color: C.textPrimary,
  fontFamily: FONT.body,
  outline: "none",
};

const labelSx: React.CSSProperties = {
  fontWeight: 500,
  color: C.textPrimary,
  fontSize: "14px",
  marginBottom: SP.sm,
  display: "block",
  fontFamily: FONT.body,
};

/**
 * Create / edit a department.
 *
 * Sibling of JobProfileConfigureForm — same shape, but departments carry a code and a
 * description as well as a name, which is why the Configure tab could not simply reuse
 * that form.
 */
const DepartmentConfigureForm: React.FC<DepartmentFormProps> = ({
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
    name: initialData?.name || "",
    code: initialData?.code || "",
    description: initialData?.description || "",
  };

  const handleSubmit = async (values: typeof initialValues) => {
    setError(null);
    setIsSubmitting(true);
    try {
      const base = {
        name: values.name.trim(),
        code: values.code.trim(),
        description: values.description.trim(),
      };

      if (isEditing && initialData?.id) {
        // Both schemas are `.strict(true)` and require name + isActive + companyId, so
        // a partial payload is rejected. isActive round-trips from the row rather than
        // being hardcoded, so editing a department cannot silently retire it.
        await updateDepartmentById(initialData.id, {
          ...base,
          companyId: initialData.companyId,
          isActive: initialData.isActive ?? true,
        });
        successConfirmation("Department updated successfully");
      } else {
        if (!companyId) {
          setError("Could not determine the company to add this department to.");
          return;
        }
        // The create endpoint takes a LIST — it was built for bulk seeding.
        await createNewDepartment([{ ...base, companyId, isActive: true }]);
        successConfirmation("Department created successfully");
      }
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(apiErrorMessage(err, `Failed to ${isEditing ? "update" : "create"} department`));
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
          {isEditing ? "Edit" : "New"} Department
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

            <div style={{ marginBottom: SP.lg }}>
              <label style={labelSx}>
                Department Name
                <span style={{ color: "#dc3545", marginLeft: "4px" }}>*</span>
              </label>
              <Field
                name="name"
                type="text"
                placeholder="e.g. Design Department"
                style={fieldSx}
                disabled={isSubmitting}
              />
              <ErrorMessage name="name">
                {(msg: string) => (
                  <div style={{ color: "#dc3545", marginTop: "4px", fontSize: "12px", fontFamily: FONT.body }}>
                    {msg}
                  </div>
                )}
              </ErrorMessage>
            </div>

            <div style={{ marginBottom: SP.lg }}>
              <label style={labelSx}>Department Code</label>
              <Field
                name="code"
                type="text"
                placeholder="e.g. ENG"
                style={fieldSx}
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label style={labelSx}>Description</label>
              <Field
                name="description"
                type="text"
                placeholder="Optional"
                style={fieldSx}
                disabled={isSubmitting}
              />
            </div>
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

export default DepartmentConfigureForm;
