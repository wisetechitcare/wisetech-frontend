import React, { useState } from "react";
import { Modal, Button } from "react-bootstrap";
import { Formik, Form as FormikForm, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { createNewConfiguration, updateConfigurationById } from "@services/company";
import { successConfirmation, errorConfirmation } from "@utils/modal";
import { KTIcon } from "@metronic/helpers";
import IconPickerModal, { SelectedIcon } from "@app/pages/employee/reimbursement/views/admin/IconPickerModal";

declare module 'react' {
  interface StyleHTMLAttributes<T> extends React.HTMLAttributes<T> {
    jsx?: boolean;
    global?: boolean;
  }
}

export interface CalendarConfigItem {
  id: string | null;
  enabled: boolean;
  color: string;
  icon?: string;
}

function IconPreview({ icon }: { icon: string }) {
  if (!icon) return null;
  const isKtIcon = icon.startsWith("kt:");
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        marginTop: "10px",
        padding: "10px 14px",
        background: "#F8FAFF",
        border: "1.5px solid #D6E9FF",
        borderRadius: "10px",
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: "50%",
          background: "#EEF6FF",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {isKtIcon ? (
          <KTIcon iconName={icon.slice(3)} className="fs-2 text-primary" />
        ) : (
          <img src={icon} alt="icon" style={{ width: 26, height: 26, objectFit: "contain" }} />
        )}
      </div>
      <div>
        <div style={{ fontSize: "11px", color: "#A1A5B7", marginBottom: 1 }}>Icon Preview</div>
        <div style={{ fontSize: "12px", color: "#5E6278", fontWeight: 500 }}>
          {isKtIcon ? `System · ${icon.slice(3)}` : "Online Icon"}
        </div>
      </div>
    </div>
  );
}

interface CalendarConfigFormProps {
  show: boolean;
  onClose: () => void;
  onSuccess?: (updatedData: CalendarConfigItem) => void;
  initialData: CalendarConfigItem | null;
  moduleKey: string;
  title: string;
}

const validationSchema = Yup.object().shape({
  enabled: Yup.boolean().required(),
  color: Yup.string().required('Color is required'),
});

const CalendarConfigForm: React.FC<CalendarConfigFormProps> = ({ show, onClose, onSuccess, initialData, moduleKey, title }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showIconPicker, setShowIconPicker] = useState(false);

  const initialValues = {
    enabled: initialData?.enabled ?? false,
    color: initialData?.color || "#0288D1",
    icon: initialData?.icon || "",
  };

  const handleSubmit = async (values: typeof initialValues) => {
    setError(null);
    setIsSubmitting(true);

    try {
      const payload = {
        enabled: values.enabled,
        color: values.color,
        icon: values.icon
      };

      let updatedId = initialData?.id || null;

      if (updatedId) {
        await updateConfigurationById(updatedId, {
          module: moduleKey,
          configuration: payload
        });
      } else {
        const response = await createNewConfiguration({
          module: moduleKey,
          configuration: payload
        });
        updatedId = response?.data?.configuration?.id || null;
      }

      successConfirmation(`${title} saved successfully`);
      
      if (onSuccess) {
        onSuccess({
          id: updatedId,
          enabled: values.enabled,
          color: values.color,
          icon: values.icon
        });
      }
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || `Failed to save ${title.toLowerCase()}`);
      errorConfirmation('Failed to save setting.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!show) return null;

  return (
    <Modal show={show} onHide={onClose} centered>
      <Modal.Header closeButton style={{ borderBottom: 'none', paddingBottom: '8px' }}>
        <Modal.Title style={{ fontWeight: '600', fontSize: '18px', color: '#1a1a1a' }}>
          {title}
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

              {/* Enable Switch */}
              <div className="d-flex justify-content-between align-items-center mb-5">
                <label className="form-label" style={{ fontWeight: '500', color: '#1a1a1a', fontSize: '14px', marginBottom: '0' }}>
                  Enable Event Display
                </label>
                <div className="form-check form-switch">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    checked={values.enabled}
                    onChange={(e) => setFieldValue("enabled", e.target.checked)}
                  />
                </div>
              </div>

              {/* Color Picker */}
              {values.enabled && (
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
                      value={values.color}
                      onChange={(e) => {
                        setFieldValue("color", e.target.value, true);
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
              )}

              {/* Icon Picker */}
              {values.enabled && (
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
                    Choose Icon
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowIconPicker(true)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      width: "100%",
                      padding: "10px 14px",
                      border: "1px solid #e9ecef",
                      borderRadius: "8px",
                      background: "#f8f9fa",
                      cursor: "pointer",
                      fontSize: "14px",
                      color: values.icon ? "#181C32" : "#6c757d",
                      fontWeight: values.icon ? 500 : 400,
                      transition: "border-color 0.15s",
                    }}
                  >
                    <KTIcon iconName="category" className="fs-4 text-primary" />
                    {values.icon ? "Change Icon" : "Pick an Icon…"}
                    <KTIcon iconName="arrow-right" className="fs-5 text-muted ms-auto" />
                  </button>
                  <IconPreview icon={values.icon} />

                  <IconPickerModal
                    show={showIconPicker}
                    onHide={() => setShowIconPicker(false)}
                    onSelect={(icon: SelectedIcon) => {
                      const storedValue = icon.source === "system" ? `kt:${icon.name}` : icon.url!;
                      setFieldValue("icon", storedValue);
                    }}
                    currentIcon={
                      values.icon
                        ? values.icon.startsWith("kt:")
                          ? {
                              source: "system",
                              name: values.icon.slice(3),
                              label: values.icon.slice(3),
                            }
                          : {
                              source: "iconify",
                              url: values.icon,
                              label: "Online Icon",
                            }
                        : null
                    }
                  />
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
                {isSubmitting ? "Saving..." : "Save"}
              </Button>
            </Modal.Footer>
          </FormikForm>
        )}
      </Formik>
      
      <style jsx>{`
        .form-check-input:checked {
          background-color: #8B4444;
          border-color: #8B4444;
        }
        
        .modal-content {
          border-radius: 12px !important;
          border: none !important;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1) !important;
        }
      `}</style>
    </Modal>
  );
};

export default CalendarConfigForm;
