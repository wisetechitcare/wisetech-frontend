import React, { useState } from "react";
import { Modal, Button } from "react-bootstrap";
import { Formik, Form as FormikForm, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { createCompanyType, updateCompanyType, createContactRoleType, updateContactRoleType, createRatingFactor, updateRatingFactor, createContactStatus, updateContactStatus, createCompanyService, updateCompanyService } from "@services/companies";
import { successConfirmation } from "@utils/modal";
import { EVENT_KEYS } from "@constants/eventKeys";
import eventBus from "@utils/EventBus";


declare module 'react' {
  interface StyleHTMLAttributes<T> extends React.HTMLAttributes<T> {
    jsx?: boolean;
    global?: boolean;
  }
}

export interface ConfigItem {
  id?: string;
  name: string;
  color: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface ConfigFormProps {
  show: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialData?: ConfigItem | null;
  isEditing?: boolean;
  type: "company-type" | "contact-role-type" | "rating-factor" | "contact-status" | "company-services";
  title: string;
  companyId?: string;
}

const CompanyConfigForm: React.FC<ConfigFormProps> = ({ show, onClose, onSuccess, initialData, isEditing = false, type, title, companyId }) => {
  // Dynamic validation schema based on type
  const validationSchema = Yup.object().shape({
    name: Yup.string().required('Name is required'),
    color: type === "company-services" ? Yup.string() : Yup.string().required('Color is required'),
    // weight: type === "rating-factor"
    //   ? Yup.number().required('Weight is required')
    //   : Yup.number(),
    isActive: Yup.boolean().required()
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);


  const initialValues = {
    name: initialData?.name || "",
    color: type === "company-services" ? "" : (initialData?.color || "#8B4444"),
    isActive: initialData?.isActive ?? true,
  };

  const handleSubmit = async (values: typeof initialValues) => {
    setError("");
    setIsSubmitting(true);
    try {
      if (isEditing && initialData?.id) {
        const updateFn = type === "company-type" ? updateCompanyType :
                         type === "contact-role-type" ? updateContactRoleType :
                         type === "contact-status" ? updateContactStatus :
                         type === "company-services" ? (id: string, payload: any) => updateCompanyService(id, payload) :
                         updateRatingFactor;
        await updateFn(initialData.id, values);
        successConfirmation(`${title} updated successfully`);
      } else {
        const createFn = type === "company-type" ? createCompanyType :
                         type === "contact-role-type" ? createContactRoleType :
                         type === "contact-status" ? createContactStatus :
                         type === "company-services" ? createCompanyService :
                         createRatingFactor;
        const res = await createFn(values);
        successConfirmation(`${title} created successfully`);
      }

      const eventKey = type === "company-type" ? EVENT_KEYS.companyTypeCreated :
                       type === "contact-role-type" ? EVENT_KEYS.contactRoleTypeCreated :
                       type === "contact-status" ? EVENT_KEYS.contactStatusCreated :
                       type === "company-services" ? EVENT_KEYS.companyServiceCreated :
                       EVENT_KEYS.ratingFactorCreated;

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

  if (!show) return null;

  return (
    <Modal show={show} onHide={onClose} centered>
      <Modal.Header closeButton style={{ borderBottom: 'none', paddingBottom: '8px' }}>
        <Modal.Title style={{ fontWeight: '600', fontSize: '18px', color: '#1a1a1a' }}>
          {isEditing ? "Edit" : "New"} {title}
        </Modal.Title>
      </Modal.Header>
      <Formik
        initialValues={initialData || { name: '', color: '#8B4444', isActive: true }}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
        enableReinitialize
      >
        {({ values, setFieldValue }) => (
          <FormikForm placeholder={""}>
            <Modal.Body style={{ paddingTop: '16px' }}>
              {error && <div className="alert alert-danger mb-3">{error}</div>}

              {/* Category Name Input */}
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
                  {type === "company-type" ? "Company Type" :
                   type === "contact-role-type" ? "Contact Designation" :
                   type === "contact-status" ? "Contact Status" :
                   type === "company-services" ? "Company Service" :
                   "Rating Factor"}
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
                  placeholder={type === "company-type" ? "Enter company type" :
                               type === "contact-role-type" ? "Enter Designation" :
                               type === "contact-status" ? "Enter Contact Status" :
                               type === "company-services" ? "Enter Company Service" :
                               "Enter rating factor"}
                  className="form-control mb-5"
                  style={{
                    backgroundColor: '#f8f9fa',
                    border: '1px solid #e9ecef',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    fontSize: '14px',
                    color: '#6c757d',
                    fontFamily: 'Inter, sans-serif',
                  }}
                />
                <ErrorMessage name="name" component="div" className="text-danger mt-1" />
              </div>

              {/* Color Picker - Hidden for company-services */}
              {type !== "company-services" && (
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
                    Choose {type === "company-type" ? "Company" :
                            type === "contact-role-type" ? "Contact Designation" :
                            type === "contact-status" ? "Contact Status" :
                            "Rating Factor"} Color
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
                    {/* { type === "rating-factor" && (
                      <div className="mb-4 mt-4">
                          <label
                              className="form-label"
                              style={{
                                  fontWeight: '500',
                                  color: '#1a1a1a',
                                  fontSize: '14px',
                                  marginBottom: '8px'
                              }}
                          >
                              Weightage
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
                              name="weight"
                              type="number"
                              placeholder="Enter Value"
                              className="form-control mb-5"
                              style={{
                                  backgroundColor: '#f8f9fa',
                                  border: '1px solid #e9ecef',
                                  borderRadius: '8px',
                                  padding: '12px 16px',
                                  fontSize: '14px',
                                  color: '#6c757d',
                                  fontFamily: 'Inter, sans-serif',
                              }}
                          />
                          <ErrorMessage name="weight" component="div" className="text-danger mt-1" />
                      </div>
                    )} */}
                  </div>
                </div>
              )}
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
      
      <style jsx>{`
        .form-control:focus {
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
        
        .btn-primary:disabled {
          background-color: #ccc !important;
        }
      `}</style>
    </Modal>
  );
};

export default CompanyConfigForm;