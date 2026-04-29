import React, { useState } from "react";
import { Modal, Button } from "react-bootstrap";
import { Formik, Form as FormikForm, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { createLeadStatus, updateLeadStatus, createLeadReferralType, updateLeadReferralType, updateLeadDirectSource, createLeadDirectSource, createLeadCancellationReason, updateLeadCancellationReason} from "@services/lead";
import { successConfirmation } from "@utils/modal";
import { EVENT_KEYS } from "@constants/eventKeys";
import eventBus from "@utils/EventBus";
import Swal from "sweetalert2";


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
  isDefault?: boolean; // Added: Field to mark default status
  isInternal?: boolean; // Added: Field to distinguish internal vs external referral types
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
  type: "status" | "referral" | "direct-source" | "cancellation-reason";
  title: string;
}

const validationSchema = Yup.object().shape({
  name: Yup.string().required('Category Name is required'),
  color: Yup.string().required('Color is required'),
  isInternal: Yup.boolean().optional(), // Only for referral types
  isDefault: Yup.boolean().optional(), // Only for status types
  isActive: Yup.boolean().required()
});

const LeadsConfigForm: React.FC<ConfigFormProps> = ({ show, onClose, onSuccess, initialData, isEditing = false, type, title }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);


  const initialValues = {
    name: initialData?.name || "",
    color: initialData?.color || "#8B4444",
    ...(type === "referral" && { isInternal: initialData?.isInternal ?? false }), // Only for referral types
    ...(type === "status" && { isDefault: initialData?.isDefault ?? false }), // Only for status types
    isActive: initialData?.isActive ?? true,
  };

  const handleSubmit = async (values: typeof initialValues) => {
    setError("");
    
    // Check if user is trying to set a status as default
    if (type === "status" && "isDefault" in values && values.isDefault) {
      const result = await Swal.fire({
        title: 'Set as Default Status?',
        text: 'There can be only 1 default status. If any previous status is set as default, it will be overwritten and this status will be set as default.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#8B4444',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Yes, Set as Default',
        cancelButtonText: 'Cancel'
      });

      if (!result.isConfirmed) {
        return; // User cancelled, don't proceed with submission
      }
    }

    setIsSubmitting(true);

    try {
      // Transform values for cancellation-reason type
      let submitValues: any = values;
      if (type === "cancellation-reason") {
        submitValues = {
          reason: values.name,
          color: values.color,
          isActive: values.isActive
        };
      } else {
        // Filter out fields that don't belong to this type
        submitValues = {
          name: values.name,
          color: values.color,
          isActive: values.isActive
        };
        
        // Add color for types that support it
        if (type !== "cancellation-reason" as any) {
          submitValues.color = values.color;
        }
        
        // Add isInternal only for referral types
        if (type === "referral" && "isInternal" in values) {
          submitValues.isInternal = values.isInternal;
        }
        
        // Add isDefault only for status types
        if (type === "status" && "isDefault" in values) {
          submitValues.isDefault = values.isDefault;
        }
      }

      if (isEditing && initialData?.id) {
        const updateFn = type === "status" ? updateLeadStatus : 
                        type === "referral" ? updateLeadReferralType : 
                        type === "direct-source" ? updateLeadDirectSource : 
                        updateLeadCancellationReason;
        await updateFn(initialData.id, submitValues);
        successConfirmation(`${title} updated successfully`);
      } else {
        const createFn = type === "status" ? createLeadStatus : 
                        type === "referral" ? createLeadReferralType : 
                        type === "direct-source" ? createLeadDirectSource : 
                        createLeadCancellationReason;
        console.log(submitValues);
        await createFn(submitValues);
        successConfirmation(`${title} created successfully`);
      }

      const eventKey = type === "status" ? EVENT_KEYS.leadStatusCreated : 
                      type === "referral" ? EVENT_KEYS.leadReferralTypeCreated : 
                      type === "direct-source" ? EVENT_KEYS.leadDirectSourceCreated : 
                      EVENT_KEYS.leadCancellationReasonCreated;

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
        initialValues={initialValues}
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
                  Category Name
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
                  placeholder="Enter category name"
                  className="form-control mb-5 required"
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

              {/* Internal/External Radio Buttons - Show only for referral type */}
              {type === "referral" && (
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
                    Type
                  </label>
                  <div className="d-flex flex-column flex-md-row gap-2">
                    {[
                      { value: false, label: "External" },
                      { value: true, label: "Internal" }
                    ].map((option) => (
                      <div
                        key={option.value.toString()}
                        className="form-check form-check-inline"
                      >
                        <input
                          type="radio"
                          id={`isInternal-${option.value}`}
                          name="isInternal"
                          className="form-check-input"
                          checked={values.isInternal === option.value}
                          onChange={() => setFieldValue("isInternal", option.value)}
                        />
                        <label
                          className="form-check-label"
                          htmlFor={`isInternal-${option.value}`}
                          style={{
                            fontSize: '14px',
                            color: '#6c757d',
                            fontFamily: 'Inter, sans-serif',
                          }}
                        >
                          {option.label}
                        </label>
                      </div>
                    ))}
                  </div>
                  <ErrorMessage name="isInternal" component="div" className="text-danger mt-1" />
                </div>
              )}

              {/* Default Status Checkbox - Show only for status type */}
              {type === "status" && (
                <div className="mb-4">
                  <div className="form-check">
                    <input
                      type="checkbox"
                      id="isDefault"
                      name="isDefault"
                      className="form-check-input"
                      checked={values.isDefault}
                      onChange={(e) => setFieldValue("isDefault", e.target.checked)}
                    />
                    <label
                      className="form-check-label"
                      htmlFor="isDefault"
                      style={{
                        fontWeight: '500',
                        color: '#1a1a1a',
                        fontSize: '14px',
                        fontFamily: 'Inter, sans-serif',
                      }}
                    >
                      Set as Default Status
                    </label>
                  </div>
                  <ErrorMessage name="isDefault" component="div" className="text-danger mt-1" />
                </div>
              )}

              {/* Color Picker - Hide for cancellation-reason type */}
              {/* {type !== "cancellation-reason" && ( */}
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
                  Choose Category Color
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
              </div>
              {/* )}  */}
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
        
        .form-check-input:checked {
          background-color: #8B4444 !important;
          border-color: #8B4444 !important;
        }
        
        .form-check-input:focus {
          border-color: #8B4444 !important;
          box-shadow: 0 0 0 0.2rem rgba(139, 68, 68, 0.25) !important;
        }
      `}</style>
    </Modal>
  );
};

export default LeadsConfigForm;