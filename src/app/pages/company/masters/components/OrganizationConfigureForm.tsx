import React, { useState } from "react";
import { Modal, Button } from "react-bootstrap";
import { Formik, Form as FormikForm, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import {
  createOrganizationConfiguration,
  updateOrganizationConfigurationById,
} from "@services/configurations";
import { successConfirmation } from "@utils/modal";
import { EVENT_KEYS } from "@constants/eventKeys";
import eventBus from "@utils/EventBus";

interface OrganizationConfigItem {
  id: string;
  type: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

interface ConfigFormProps {
  show: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialData?: OrganizationConfigItem | null;
  isEditing?: boolean;
  type: "SHIFT" | "WORKING_TYPE" | "ROOM_BLOCK";
  title: string;
}

const validationSchema = Yup.object().shape({
  name: Yup.string().required("Name is required"),
});

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
    setError("");
    setIsSubmitting(true);

    try {
      const payload = {
        type: type,
        name: values.name,
      };

      if (isEditing && initialData?.id) {
        await updateOrganizationConfigurationById(initialData.id, {
          name: values.name,
        });
        successConfirmation(`${title} updated successfully`);
        eventBus.emit(EVENT_KEYS.organizationConfigUpdated, {
          id: initialData.id,
        });
      } else {
        await createOrganizationConfiguration(payload);
        successConfirmation(`${title} created successfully`);
        eventBus.emit(EVENT_KEYS.organizationConfigCreated, { type });
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
      case "SHIFT":
        return "Shift Name";
      case "WORKING_TYPE":
        return "Working Location Type Name";
      case "ROOM_BLOCK":
        return "Room/Block Name";
      default:
        return "Name";
    }
  };

  const getFieldPlaceholder = (type: string) => {
    switch (type) {
      case "SHIFT":
        return "Enter shift name";
      case "WORKING_TYPE":
        return "Enter working location type name";
      case "ROOM_BLOCK":
        return "Enter room/block name";
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
          {() => (
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

export default OrganizationConfigureForm;
