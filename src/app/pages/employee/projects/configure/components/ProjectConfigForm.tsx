import React, { useState, useEffect } from "react";
import { Modal, Button, Form } from "react-bootstrap";
import { Formik, Form as FormikForm, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import {
  createProjectCategory,
  updateProjectCategory,
  createProjectSubcategory,
  updateProjectSubcategory,
  getAllProjectCategories,
  createProjectService,
  updateProjectService,
  createProjectStatus,
  updateProjectStatus,
  createStakeholder,
  updateStakeholderService,
} from "@services/projects";
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
  type: "category" | "subcategory" | "service" | "status" | "stakeholder";
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

  const needsCategory = type === 'subcategory';
  useEffect(() => {
    if (show && needsCategory) {
      fetchCategories();
    }
  }, [show, type, needsCategory]);

  const fetchCategories = async () => {
    try {
      setLoadingCategories(true);
      const response = await getAllProjectCategories();
      if (response && response.projectCategories) {
        setCategories(response.projectCategories);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      setError('Failed to load categories');
    } finally {
      setLoadingCategories(false);
    }
  };

  const initialValues = {
    name: initialData?.name || "",
    color: initialData?.color || "#8B4444",
    isActive: initialData?.isActive ?? true,
    categoryId: initialData?.categoryId || "",
  };

  type ApiFunction = ((id: string, payload: any) => Promise<any>) | ((payload: any) => Promise<any>);

  const getApiFunction = (type: string, isEditing: boolean): ApiFunction => {
    if (isEditing) {
      switch (type) {
        case "category": return updateProjectCategory;
        case "subcategory": return updateProjectSubcategory;
        case "service": return updateProjectService;
        case "status": return updateProjectStatus;
        case "stakeholder": return updateStakeholderService;
        default: throw new Error(`Unknown type: ${type}`);
      }
    } else {
      switch (type) {
        case "category": return createProjectCategory;
        case "subcategory": return createProjectSubcategory;
        case "service": return createProjectService;
        case "status": return createProjectStatus;
        case "stakeholder": return createStakeholder;
        default: throw new Error(`Unknown type: ${type}`);
      }
    }
  };

  const getEventKey = (type: string) => {
    switch (type) {
      case "category": return EVENT_KEYS.projectCategoryCreated;
      case "subcategory": return EVENT_KEYS.projectSubcategoryCreated;
      case "service": return EVENT_KEYS.projectServiceCreated;
      case "status": return EVENT_KEYS.projectStatusCreated;
      case "stakeholder": return EVENT_KEYS.stakeholderCreated;
      default: throw new Error(`Unknown type: ${type}`);
    }
  };

  const handleSubmit = async (values: typeof initialValues) => {
    setError("");
    setIsSubmitting(true);

    try {
      const apiFunction = getApiFunction(type, isEditing);

      // Prepare the payload based on the type
      const payload = {
        name: values.name,
        color: values.color,
        isActive: values.isActive,
        ...(type === 'subcategory' && values.categoryId ? { categoryId: values.categoryId } : {})
      };

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
      case 'category': return 'Category Name';
      case 'subcategory': return 'Subcategory Name';
      case 'service': return 'Service Name';
      case 'status': return 'Status Name';
      case 'stakeholder': return 'Stakeholder Service Name';
      default: return 'Name';
    }
  };

  const getFieldPlaceholder = (type: string) => {
    switch (type) {
      case 'category': return 'Enter category name';
      case 'subcategory': return 'Enter subcategory name';
      case 'service': return 'Enter service name';
      case 'status': return 'Enter status name';
      case 'stakeholder': return 'Enter stakeholder Service name';
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

                {/* Category Dropdown for Subcategory, Service, and Status */}
                {needsCategory && (
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
                      Select Category
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
                    {loadingCategories ? (
                      <div>Loading categories...</div>
                    ) : (
                      <Field
                        as="select"
                        name="categoryId"
                        className="form-select"
                        style={{
                          backgroundColor: '#f8f9fa',
                          border: '1px solid #e9ecef',
                          borderRadius: '8px',
                          padding: '12px 16px',
                          fontSize: '14px',
                          color: '#6c757d',
                          fontFamily: 'Inter, sans-serif',
                          cursor: 'pointer',
                        }}
                        disabled={isSubmitting}
                      >
                        <option value="">Select a category</option>
                        
                        {categories
                          .filter(cat => cat.isActive)
                          .map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                      </Field>
                    )}
                    <ErrorMessage name="categoryId" component="div" className="text-danger mt-1" />
                  </div>
                )}

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
                {
                  // title === "Subcategory" ? null : (
                    <div className="mb-4">
                      <label
                        className="form-label"
                        style={{ fontWeight: '500', color: '#1a1a1a', fontSize: '14px', marginBottom: '8px' }}
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
                          onChange={(e) => setFieldValue("color", e.target.value, true)}
                          onBlur={() => {
                            if (!values.color) setFieldValue("color", "#8B4444", true);
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
                  // )
                }


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