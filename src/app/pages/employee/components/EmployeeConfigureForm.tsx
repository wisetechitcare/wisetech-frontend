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
      <Modal show={show} onHide={onClose} centered style={{ zIndex: 1500 }}>
        <Modal.Header
          closeButton
          style={{ borderBottom: "none", paddingBottom: "8px" }}
        >
          <Modal.Title
            style={{ fontWeight: "600", fontSize: "18px", color: "#1a1a1a" }}
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
            <FormikForm placeholder={""}>
              <Modal.Body style={{ paddingTop: "16px" }}>
                {error && <div className="alert alert-danger mb-3">{error}</div>}

                {/* Name Input */}
                <div className="mb-4">
                  <label
                    className="form-label"
                    style={{
                      fontWeight: "500",
                      color: "#1a1a1a",
                      fontSize: "14px",
                      marginBottom: "8px",
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
                      backgroundColor: "#f8f9fa",
                      border: "1px solid #e9ecef",
                      borderRadius: "8px",
                      padding: "12px 16px",
                      fontSize: "14px",
                      color: "#6c757d",
                      fontFamily: "Inter, sans-serif",
                    }}
                    disabled={isSubmitting}
                  />
                  <ErrorMessage
                    name="name"
                    component="div"
                    className="text-danger mt-1"
                  />
                </div>

                {/* Color Picker */}
                <div className="mb-4">
                  <label
                    className="form-label"
                    style={{
                      fontWeight: "500",
                      color: "#1a1a1a",
                      fontSize: "14px",
                      marginBottom: "8px",
                    }}
                  >
                    Choose Color (Optional)
                  </label>
                  <div className="position-relative">
                    <div
                      className="d-flex align-items-center justify-content-between"
                      style={{
                        backgroundColor: "#f8f9fa",
                        border: "1px solid #e9ecef",
                        borderRadius: "8px",
                        padding: "12px 16px",
                        cursor: "pointer",
                        fontSize: "14px",
                        color: "#6c757d",
                      }}
                      onClick={() => document.getElementById("colorInput")?.click()}
                    >
                      <div className="d-flex align-items-center">
                        <div
                          className="rounded-circle me-3"
                          style={{
                            width: "20px",
                            height: "20px",
                            backgroundColor: values.color || "#8B4444",
                            border: "2px solid #fff",
                            boxShadow: "0 0 0 1px rgba(0,0,0,0.1)",
                          }}
                        />
                        <span>Choose Color</span>
                      </div>
                      <span
                        className="text-uppercase fw-medium"
                        style={{ fontSize: "12px", color: "#6c757d" }}
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
                    className="text-danger mt-1"
                  />
                </div>
              </Modal.Body>

              <Modal.Footer style={{ borderTop: "none", paddingTop: "0" }}>
                <Button
                  variant="primary"
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    backgroundColor: "#8B4444",
                    border: "none",
                    borderRadius: "8px",
                    padding: "10px 24px",
                    fontWeight: "500",
                    fontSize: "14px",
                  }}
                >
                  {isSubmitting ? "Saving..." : isEditing ? "Update" : "Save"}
                </Button>
              </Modal.Footer>
            </FormikForm>
          )}
        </Formik>
      </Modal>

      <style jsx>{`
        .form-control:focus,
        .form-select:focus {
          background-color: #fff !important;
          border-color: #8b4444 !important;
          box-shadow: 0 0 0 0.2rem rgba(139, 68, 68, 0.1) !important;
          color: #495057 !important;
        }

        .form-control::placeholder {
          color: #adb5bd !important;
        }

        .modal-content {
          border-radius: 12px !important;
          border: none !important;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1) !important;
        }

        .btn-close {
          font-size: 12px !important;
          opacity: 0.6 !important;
        }

        .btn-primary:hover {
          background-color: #7a3a3a !important;
        }

        .btn-secondary:hover {
          background-color: #5a6268 !important;
        }

        .btn-primary:disabled,
        .btn-secondary:disabled {
          background-color: #ccc !important;
          opacity: 0.6 !important;
        }
      `}</style>
    </>
  );
};

export default EmployeeConfigureForm;
