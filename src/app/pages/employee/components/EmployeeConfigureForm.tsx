import React, { useState } from "react";
import { Modal, Button } from "react-bootstrap";
import { Formik, Form as FormikForm, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import {
  createEmployeeConfiguration,
  updateEmployeeConfigurationById,
} from "@services/configurations";
import { successConfirmation } from "@utils/modal";
import { EVENT_KEYS } from "@constants/eventKeys";
import eventBus from "@utils/EventBus";
import { C, FONT, SP, RADIUS } from "@app/modules/configuration";

interface EmployeeConfigItem {
  id: string;
  type: string;
  name: string;
  color?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ConfigFormProps {
  show: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialData?: EmployeeConfigItem | null;
  isEditing?: boolean;
  type: "JOB_PROFILE" | "EMPLOYEE_TYPE" | "EMPLOYEE_LEVEL" | "EMPLOYEE_STATUS";
  title: string;
}

const validationSchema = Yup.object().shape({
  name: Yup.string().required("Name is required"),
  color: Yup.string(),
});

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
    color: initialData?.color || "#8B4444",
  };

  const handleSubmit = async (values: typeof initialValues) => {
    setError("");
    setIsSubmitting(true);

    try {
      const payload = {
        type: type,
        name: values.name,
        color: values.color || undefined,
      };

      if (isEditing && initialData?.id) {
        await updateEmployeeConfigurationById(initialData.id, {
          name: values.name,
          color: values.color || undefined,
        });
        successConfirmation(`${title} updated successfully`);
        eventBus.emit(EVENT_KEYS.employeeConfigUpdated, {
          id: initialData.id,
        });
      } else {
        await createEmployeeConfiguration(payload);
        successConfirmation(`${title} created successfully`);
        eventBus.emit(EVENT_KEYS.employeeConfigCreated, { type });
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      const action = isEditing ? "update" : "create";
      setError(
        err.response?.data?.message ||
          `Failed to ${action} ${title.toLowerCase()}`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFieldLabel = (type: string) => {
    switch (type) {
      case "JOB_PROFILE":
        return "Job Profile Name";
      case "EMPLOYEE_TYPE":
        return "Employee Type Name";
      case "EMPLOYEE_LEVEL":
        return "Employee Level Name";
      case "EMPLOYEE_STATUS":
        return "Employee Status Name";
      default:
        return "Name";
    }
  };

  const getFieldPlaceholder = (type: string) => {
    switch (type) {
      case "JOB_PROFILE":
        return "Enter job profile name";
      case "EMPLOYEE_TYPE":
        return "Enter employee type name";
      case "EMPLOYEE_LEVEL":
        return "Enter employee level name";
      case "EMPLOYEE_STATUS":
        return "Enter employee status name";
      default:
        return "Enter name";
    }
  };

  if (!show) return null;

  return (
    <>
      <Modal show={show} onHide={onClose} centered backdropClassName="modal-backdrop-blur">
        <Modal.Header
          closeButton
          style={{ borderBottom: `1px solid ${C.border}`, padding: `${SP.md} ${SP.lg}` }}
        >
          <Modal.Title
            style={{ fontWeight: 600, fontSize: "18px", color: C.textPrimary, fontFamily: FONT.body }}
          >
            {isEditing ? "Edit" : "New"} {title}
          </Modal.Title>
        </Modal.Header>
        <Formik
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
          enableReinitialize
        >
          {({ values, setFieldValue }) => (
            <FormikForm>
              <Modal.Body style={{ padding: SP.lg }}>
                {error && (
                  <div
                    style={{
                      backgroundColor: '#fee2e2',
                      border: `1px solid #fecaca`,
                      borderRadius: RADIUS.md,
                      padding: SP.md,
                      marginBottom: SP.lg,
                      color: '#7f1d1d',
                      fontFamily: FONT.body,
                      fontSize: '14px',
                    }}
                  >
                    {error}
                  </div>
                )}

                {/* Name Input */}
                <div style={{ marginBottom: SP.lg }}>
                  <label
                    style={{
                      fontWeight: 500,
                      color: C.textPrimary,
                      fontSize: "14px",
                      marginBottom: SP.sm,
                      display: 'block',
                      fontFamily: FONT.body,
                    }}
                  >
                    {getFieldLabel(type)}
                    <span
                      style={{
                        color: "#dc3545",
                        marginLeft: "4px",
                        fontSize: "14px",
                      }}
                    >
                      *
                    </span>
                  </label>
                  <Field
                    name="name"
                    type="text"
                    placeholder={getFieldPlaceholder(type)}
                    className="form-control"
                    style={{
                      backgroundColor: C.bgCard,
                      border: `1px solid ${C.border}`,
                      borderRadius: RADIUS.md,
                      padding: SP.md,
                      fontSize: "14px",
                      color: C.textPrimary,
                      fontFamily: FONT.body,
                    }}
                    disabled={isSubmitting}
                  />
                  <ErrorMessage
                    name="name"
                    component="div"
                    style={{ color: '#dc3545', marginTop: '4px', fontSize: '12px', fontFamily: FONT.body }}
                  />
                </div>

                {/* Color Picker */}
                <div style={{ marginBottom: SP.lg }}>
                  <label
                    style={{
                      fontWeight: 500,
                      color: C.textPrimary,
                      fontSize: "14px",
                      marginBottom: SP.sm,
                      display: 'block',
                      fontFamily: FONT.body,
                    }}
                  >
                    Choose Color (Optional)
                  </label>
                  <div style={{ position: 'relative' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: C.bgCard,
                        border: `1px solid ${C.border}`,
                        borderRadius: RADIUS.md,
                        padding: SP.md,
                        cursor: "pointer",
                        fontSize: "14px",
                        color: C.textSecondary,
                        transition: 'all 0.2s ease',
                      }}
                      onClick={() => document.getElementById("colorInput")?.click()}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = C.primary;
                        e.currentTarget.style.backgroundColor = '#fafafa';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = C.border;
                        e.currentTarget.style.backgroundColor = C.bgCard;
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: SP.md }}>
                        <div
                          style={{
                            width: "20px",
                            height: "20px",
                            borderRadius: '50%',
                            backgroundColor: values.color || "#8B4444",
                            border: `2px solid #fff`,
                            boxShadow: "0 0 0 1px rgba(0,0,0,0.1)",
                          }}
                        />
                        <span style={{ fontFamily: FONT.body }}>Choose Color</span>
                      </div>
                      <span
                        style={{ fontSize: "12px", color: C.textMuted, fontFamily: FONT.body, fontWeight: 600 }}
                      >
                        {values.color || "#8B4444"}
                      </span>
                    </div>
                    <input
                      id="colorInput"
                      type="color"
                      name="color"
                      value={values.color || "#8B4444"}
                      onChange={(e) => setFieldValue("color", e.target.value, true)}
                      style={{
                        opacity: 0,
                        position: "absolute",
                        width: "1px",
                        height: "1px",
                        overflow: "hidden",
                        padding: 0,
                        border: "none",
                        pointerEvents: "none",
                      }}
                    />
                  </div>
                  <ErrorMessage
                    name="color"
                    component="div"
                    style={{ color: '#dc3545', marginTop: '4px', fontSize: '12px', fontFamily: FONT.body }}
                  />
                </div>
              </Modal.Body>

              <Modal.Footer style={{ borderTop: `1px solid ${C.border}`, padding: `${SP.lg}`, gap: SP.md }}>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  style={{
                    backgroundColor: C.bgCard,
                    color: C.textSecondary,
                    border: `1px solid ${C.border}`,
                    borderRadius: RADIUS.md,
                    padding: `8px 16px`,
                    fontFamily: FONT.body,
                    fontWeight: 500,
                    fontSize: "13px",
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    opacity: isSubmitting ? 0.6 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!isSubmitting) {
                      e.currentTarget.style.backgroundColor = C.bgSection;
                      e.currentTarget.style.borderColor = C.borderDark;
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = C.bgCard;
                    e.currentTarget.style.borderColor = C.border;
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    backgroundColor: isSubmitting ? `${C.primary}80` : C.primary,
                    color: "#fff",
                    border: "none",
                    borderRadius: RADIUS.md,
                    padding: "8px 16px",
                    fontFamily: FONT.body,
                    fontWeight: 600,
                    fontSize: "13px",
                    cursor: isSubmitting ? "not-allowed" : "pointer",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSubmitting) {
                      e.currentTarget.style.backgroundColor = C.primaryMid;
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = `0 6px 18px ${C.primaryShadowMd}`;
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = C.primary;
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {isSubmitting ? "Saving..." : isEditing ? "Update" : "Save"}
                </button>
              </Modal.Footer>
            </FormikForm>
          )}
        </Formik>
      </Modal>

      <style jsx>{`
        .form-control:focus,
        .form-select:focus {
          background-color: #fff !important;
          border-color: ${C.primary} !important;
          box-shadow: 0 0 0 0.2rem rgba(157, 65, 65, 0.1) !important;
          color: ${C.textPrimary} !important;
        }

        .form-control::placeholder {
          color: ${C.textMuted} !important;
        }

        .modal-content {
          border-radius: ${RADIUS.lg} !important;
          border: none !important;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15) !important;
          background-color: #fff !important;
        }

        .btn-close {
          font-size: 12px !important;
          opacity: 0.6 !important;
        }

        .modal-backdrop-blur {
          background-color: rgba(0, 0, 0, 0.2);
          backdrop-filter: blur(2px);
        }
      `}</style>
    </>
  );
};

export default EmployeeConfigureForm;
