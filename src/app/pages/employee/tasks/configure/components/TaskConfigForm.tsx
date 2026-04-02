import React, { useState, useEffect } from "react";
import { Modal, Button, Form } from "react-bootstrap";
import { Formik, Form as FormikForm, Field, ErrorMessage } from "formik";
import * as Yup from "yup";

import {
  createTasksStatus,
  updateTasksStatus,
  createPriority,
  updatePriority,
  createPresetTask,
  updatePresetTask
} from "@services/tasks"
import { successConfirmation } from "@utils/modal";
import { EVENT_KEYS } from "@constants/eventKeys";
import eventBus from "@utils/EventBus";
import { ConfigItem, ProjectCategory } from "@models/clientProject";

interface ConfigFormProps {
  show: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialData?: ConfigItem | null;
  isEditing?: boolean;
  type: "taskStatus" | "taskPriority" | "presetTask";
  title: string;
}

const validationSchema = (type: string) => {
  const baseSchema = {
    name: Yup.string().required('Name is required'),
    color: Yup.string().required('Color is required'),
    isActive: Yup.boolean().required()
  };

  // Subcategory require a category
  if (type === 'subcategory') {
    return Yup.object().shape({
      ...baseSchema,
      categoryId: Yup.string().required('Category is required')
    });
  }

  return Yup.object().shape(baseSchema);
};

const ProjectConfigForm: React.FC<ConfigFormProps> = ({
  show,
  onClose,
  onSuccess,
  initialData,
  isEditing = false,
  type,
  title
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<ProjectCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  // const needsCategory = type === 'subcategory';

  // useEffect(() => {
  //   if (show && needsCategory) {
  //     fetchCategories();
  //   }
  // }, [show, type, needsCategory]);

  // const fetchCategories = async () => {
  //   try {
  //     setLoadingCategories(true);
  //     const response = await getAllProjectCategories();
  //     console.log("Fetched Categories:", response);
  //     if (response && response.projectCategories) {
  //       setCategories(response.projectCategories);
  //     }
  //   } catch (error) {
  //     console.error('Error fetching categories:', error);
  //     setError('Failed to load categories');
  //   } finally {
  //     setLoadingCategories(false);
  //   }
  // };

  const initialValues = {
    name: initialData?.name || "",
    color: initialData?.color || "#8B4444",
    isActive: initialData?.isActive ?? true,
    categoryId: initialData?.categoryId || "",
  };

  type ApiFunction = ((id: string, payload: any) => Promise<any>) | ((payload: any) => Promise<any>);

  const getApiFunction = (type: string, isEditing: boolean): ApiFunction => {
    console.log("type ===========>",type)
    if (isEditing) {
      switch (type) {
        case "taskStatus": return updateTasksStatus;
        case "taskPriority": return updatePriority;
        case "presetTask": return updatePresetTask;
        default: throw new Error(`Unknown type: ${type}`);
      }
    } else {
      switch (type) {
        case "taskStatus": return createTasksStatus;
        case "taskPriority": return createPriority;
        case "presetTask": return createPresetTask;
        default: throw new Error(`Unknown type: ${type}`);
      }
    }
  };

  const getEventKey = (type: string) => {
    switch (type) {
      case "taskStatus": return EVENT_KEYS.taskPriorityCreated;
      case "taskPriority": return EVENT_KEYS.taskStatusCreated;
      case "presetTask": return EVENT_KEYS.presetTaskCreated;
      default: throw new Error(`Unknown type: ${type}`);
    }
  };

  const handleSubmit = async (values: typeof initialValues) => {
    setError("");
    setIsSubmitting(true);

    try {
      const apiFunction = getApiFunction(type, isEditing);
      // console.log("types ===========:", type, "isEditing ===========:", isEditing, "apiFunction ===========:", apiFunction);
      // Prepare the payload based on the type
      let payload: any = {
        name: values.name,
        isActive: values.isActive,
        // ...(type === 'subcategory' && values.categoryId ? { categoryId: values.categoryId } : {})
      };
      // Only include color if not presetTask
      if (type !== 'presetTask') {
        payload.color = values.color;
      }

      if (isEditing && initialData?.id) {
        await (apiFunction as (id: string, payload: any) => Promise<any>)(initialData.id, payload);
        successConfirmation(`${title} updated successfully`);
      } else {
        await (apiFunction as (payload: any) => Promise<any>)(payload);
        successConfirmation(`${title} created successfully`);
      }

      const eventKey = getEventKey(type);
      eventBus.emit(eventKey, { id: isEditing ? "updated" : "created" });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      const action = isEditing ? "update" : "create";
      setError(err.response?.data?.message || `Failed to ${action} ${title.toLowerCase()}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFieldLabel = (type: string) => {
    switch (type) {
      case 'taskStatus': return 'Task Status Name';
      case 'taskPriority': return 'Task Priority Name';
      case 'presetTask': return 'Preset Task Name';
      default: return 'Name';
    }
  };

  const getFieldPlaceholder = (type: string) => {
    switch (type) {
      case 'taskStatus': return 'Enter task status name';
      case 'taskPriority': return 'Enter task priority name';
      case 'presetTask': return 'Enter preset task name';
      default: return 'Enter name';
    }
  };

  if (!show) return null;

  return (
    <>
      <Modal show={show} onHide={onClose} centered style={{ zIndex: 1500 }}>
        <Modal.Header closeButton style={{ borderBottom: 'none', paddingBottom: '8px' }}>
          <Modal.Title style={{ fontWeight: '600', fontSize: '18px', color: '#1a1a1a' }}>
            {isEditing ? "Edit" : "New"} {title}
          </Modal.Title>
        </Modal.Header>
        <Formik
          initialValues={initialValues}
          validationSchema={validationSchema(type)}
          onSubmit={handleSubmit}
          enableReinitialize
        >
          {({ values, setFieldValue }) => (
            <FormikForm placeholder={''}>
              <Modal.Body style={{ paddingTop: '16px' }}>
                {error && <div className="alert alert-danger mb-3">{error}</div>}
                {/* Name Input */}
                <div className="mb-4">
                  <label
                    className="form-label"
                    style={{
                      fontWeight: '500',
                      color: '#1a1a1a',
                      fontSize: '14px',
                      marginBottom: '8px'
                    }}
                  >
                    {getFieldLabel(type)}
                    <span
                      style={{
                        color: '#dc3545',
                        marginLeft: '4px',
                        fontSize: '14px'
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
                      backgroundColor: '#f8f9fa',
                      border: '1px solid #e9ecef',
                      borderRadius: '8px',
                      padding: '12px 16px',
                      fontSize: '14px',
                      color: '#6c757d',
                      fontFamily: 'Inter, sans-serif',
                    }}
                    disabled={isSubmitting}
                  />
                  <ErrorMessage name="name" component="div" className="text-danger mt-1" />
                </div>

                {/* Color Picker */}
                <div className="mb-4">
                  <label
                    className="form-label"
                    style={{
                      fontWeight: '500',
                      color: '#1a1a1a',
                      fontSize: '14px',
                      marginBottom: '8px'
                    }}
                  >
                    Choose Color
                  </label>
                  <div className="position-relative">
                    <div
                      className="d-flex align-items-center justify-content-between"
                      style={{
                        backgroundColor: '#f8f9fa',
                        border: '1px solid #e9ecef',
                        borderRadius: '8px',
                        padding: '12px 16px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        color: '#6c757d'
                      }}
                      onClick={() => document.getElementById("colorInput")?.click()}
                    >
                      <div className="d-flex align-items-center">
                        <div
                          className="rounded-circle me-3"
                          style={{
                            width: '20px',
                            height: '20px',
                            backgroundColor: values.color,
                            border: '2px solid #fff',
                            boxShadow: '0 0 0 1px rgba(0,0,0,0.1)'
                          }}
                        />
                        <span>Choose Color</span>
                      </div>
                      <span
                        className="text-uppercase fw-medium"
                        style={{ fontSize: '12px', color: '#6c757d' }}
                      >
                        {values.color}
                      </span>
                    </div>
                    <input
                      id="colorInput"
                      type="color"
                      name="color"
                      value={values.color || '#8B4444'}
                      onChange={(e) => {
                        setFieldValue("color", e.target.value, true);
                      }}
                      onBlur={() => {
                        if (!values.color) {
                          setFieldValue("color", "#8B4444", true);
                        }
                      }}
                      style={{
                        opacity: 0,
                        position: 'absolute',
                        width: '1px',
                        height: '1px',
                        overflow: 'hidden',
                        padding: 0,
                        border: 'none',
                        pointerEvents: 'none'
                      }}
                    />
                  </div>
                  <ErrorMessage name="color" component="div" className="text-danger mt-1" />
                </div>
              </Modal.Body>

              <Modal.Footer style={{ borderTop: 'none', paddingTop: '0' }}>
                <Button
                  variant="primary"
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    backgroundColor: '#8B4444',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px 24px',
                    fontWeight: '500',
                    fontSize: '14px'
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
          border-color: #8B4444 !important;
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

export default ProjectConfigForm;