import React, { useEffect, useState } from "react";
import { Modal, Button } from "react-bootstrap";
import { Formik, Form as FormikForm, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import Select from "react-select";
import { createCompanyType, updateCompanyType, createContactRoleType, updateContactRoleType, createRatingFactor, updateRatingFactor, createContactStatus, updateContactStatus, createCompanyService, updateCompanyService, getAllCompanyTypes } from "@services/companies";
import { sortOptionsAlphabetically } from "@utils/sortUtils";
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
  parentTypeId?: string | null;
  companyTypeId?: string | null;
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
  // company-type/company-services callers that already hold this list (e.g. CompanyConfigMain, which
  // loads it for the tree) should pass it here — avoids an internal re-fetch racing the modal's
  // first open, which could momentarily show the parent/type picker as empty before it resolved.
  companyTypes?: any[];
}

const CompanyConfigForm: React.FC<ConfigFormProps> = ({ show, onClose, onSuccess, initialData, isEditing = false, type, title, companyId, companyTypes: companyTypesProp }) => {
  // Dynamic validation schema based on type
  const validationSchema = Yup.object().shape({
    name: Yup.string().required('Name is required'),
    color: Yup.string().required('Color is required'),
    // weight: type === "rating-factor"
    //   ? Yup.number().required('Weight is required')
    //   : Yup.number(),
    isActive: Yup.boolean().required()
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // company-type → list of possible parents; company-services → list of types to file under.
  const [fetchedCompanyTypes, setFetchedCompanyTypes] = useState<any[]>([]);
  const companyTypes = companyTypesProp || fetchedCompanyTypes;

  useEffect(() => {
    if (!companyTypesProp && show && (type === "company-type" || type === "company-services")) {
      getAllCompanyTypes()
        .then((res: any) => setFetchedCompanyTypes(res?.companyTypes || []))
        .catch(() => setFetchedCompanyTypes([]));
    }
  }, [show, type, companyTypesProp]);

  // Parent options: top-level types only (no parent themselves) and never the type being edited,
  // keeping the hierarchy a single level deep.
  const parentTypeOptions = sortOptionsAlphabetically(
    companyTypes
      .filter((t) => !t.parentTypeId && t.id !== initialData?.id)
      .map((t) => ({ value: t.id, label: t.name }))
  );

  // R3 — a type that already has sub-types can't be given a parent (that would create a 3-deep
  // chain and make its children vanish, the old "Consultant (All)" bug). Disable the picker.
  const editingTypeHasChildren =
    type === "company-type" && !!initialData?.id &&
    companyTypes.some((t) => t.parentTypeId === initialData.id);

  // company-services → all types (incl. sub-types) the service can be filed under.
  const serviceTypeOptions = sortOptionsAlphabetically(
    companyTypes.map((t) => ({ value: t.id, label: t.name }))
  );

  const initialValues = {
    name: initialData?.name || "",
    color: initialData?.color || "#8B4444",
    isActive: initialData?.isActive ?? true,
    parentTypeId: initialData?.parentTypeId || "",
    companyTypeId: initialData?.companyTypeId || "",
  };

  const handleSubmit = async (values: typeof initialValues) => {
    setError("");
    setIsSubmitting(true);
    try {
      // Only company-type carries parentTypeId and only company-services carries companyTypeId;
      // strip both for every other config type.
      const { parentTypeId, companyTypeId, ...rest } = values;
      const payload: any = type === "company-type"
        ? { ...rest, parentTypeId: parentTypeId || null }
        : type === "company-services"
          ? { ...rest, companyTypeId: companyTypeId || null }
          : rest;

      if (isEditing && initialData?.id) {
        const updateFn = type === "company-type" ? updateCompanyType :
                         type === "contact-role-type" ? updateContactRoleType :
                         type === "contact-status" ? updateContactStatus :
                         type === "company-services" ? (id: string, p: any) => updateCompanyService(id, p) :
                         updateRatingFactor;
        await updateFn(initialData.id, payload);
      } else {
        const createFn = type === "company-type" ? createCompanyType :
                         type === "contact-role-type" ? createContactRoleType :
                         type === "contact-status" ? createContactStatus :
                         type === "company-services" ? createCompanyService :
                         createRatingFactor;
        const res = await createFn(payload);
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
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
        enableReinitialize
      >
        {({ values, setFieldValue }) => (
          <FormikForm>
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
                  {title}
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
                  placeholder={`Enter ${title}`}
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
                    Choose {title} Color
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

              {/* Parent Type — groups this type under another in the "Companies by Type" chart */}
              {type === "company-type" && (
                <div className="mb-4">
                  <label
                    className="form-label"
                    style={{ fontWeight: '500', color: '#1a1a1a', fontSize: '14px', marginBottom: '8px' }}
                  >
                    Parent Type <span style={{ color: '#6c757d', fontWeight: 400 }}>(optional)</span>
                  </label>
                  <Select
                    isClearable
                    isDisabled={editingTypeHasChildren}
                    placeholder="None — top-level type"
                    classNamePrefix="react-select"
                    options={parentTypeOptions}
                    value={
                      values.parentTypeId
                        ? parentTypeOptions.find((o: any) => o.value === values.parentTypeId) || null
                        : null
                    }
                    onChange={(opt: any) => setFieldValue("parentTypeId", opt?.value || "")}
                    menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
                    menuPosition="fixed"
                    styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
                  />
                  <div className="text-muted mt-1" style={{ fontSize: '12px' }}>
                    {editingTypeHasChildren
                      ? "This type already has sub-types, so it can't be moved under another type (keeps the hierarchy one level deep)."
                      : "Leave empty for a main type. Sub-types (e.g. “Architect Interior”) group under their parent in the chart."}
                  </div>
                </div>
              )}

              {/* Service — files this sub-service under a Service (a company-type sub-type) for the tree + tagging filter */}
              {type === "company-services" && (
                <div className="mb-4">
                  <label
                    className="form-label"
                    style={{ fontWeight: '500', color: '#1a1a1a', fontSize: '14px', marginBottom: '8px' }}
                  >
                    Service <span style={{ color: '#6c757d', fontWeight: 400 }}>(optional)</span>
                  </label>
                  <Select
                    isClearable
                    placeholder="Unassigned — no service"
                    classNamePrefix="react-select"
                    options={serviceTypeOptions}
                    value={
                      values.companyTypeId
                        ? serviceTypeOptions.find((o: any) => o.value === values.companyTypeId) || null
                        : null
                    }
                    onChange={(opt: any) => setFieldValue("companyTypeId", opt?.value || "")}
                    menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
                    menuPosition="fixed"
                    styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
                  />
                  <div className="text-muted mt-1" style={{ fontSize: '12px' }}>
                    Files this sub-service under a Service. Leave empty to keep it under “Unassigned”.
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