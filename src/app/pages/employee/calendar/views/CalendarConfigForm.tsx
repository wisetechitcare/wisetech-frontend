import React, { useState } from "react";
import { Modal, Button } from "react-bootstrap";
import { Formik, Form as FormikForm } from "formik";
import * as Yup from "yup";
import { createNewConfiguration, updateConfigurationById } from "@services/company";
import { successConfirmation, errorConfirmation } from "@utils/modal";
import { KTIcon } from "@metronic/helpers";
import IconPickerModal, { SelectedIcon } from "@app/pages/employee/reimbursement/views/admin/IconPickerModal";
import { C, FONT, SP, RADIUS } from "@app/modules/configuration";
import { WtSwitch } from "@app/modules/common/components/ui";

export interface CalendarConfigItem {
  id: string | null;
  enabled: boolean;
  color: string;
  icon?: string;
  /**
   * The text this setting paints, where a setting HAS text of its own.
   *
   * Only the half-day pills use it: "AM" and "PM" are an assumption about how an office talks
   * about its day, and offices that say "Morning" or run a night shift were stuck with it.
   * Absent everywhere else, because most calendar settings label themselves from their data.
   */
  label?: string;
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
        marginTop: SP.sm,
        padding: "10px 14px",
        background: C.primaryLight,
        border: `1.5px solid rgba(30, 58, 138,0.15)`,
        borderRadius: RADIUS.lg,
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: "50%",
          background: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          boxShadow: `0 2px 8px ${C.primaryShadow}`,
        }}
      >
        {isKtIcon ? (
          <KTIcon iconName={icon.slice(3)} className="fs-2 text-primary" />
        ) : (
          <img src={icon} alt="icon" style={{ width: 26, height: 26, objectFit: "contain" }} />
        )}
      </div>
      <div>
        <div style={{ fontFamily: FONT.body, fontSize: "11px", color: C.textMuted, marginBottom: 1 }}>Icon Preview</div>
        <div style={{ fontFamily: FONT.body, fontSize: "12px", color: C.textSecondary, fontWeight: 500 }}>
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
  /** Present only for settings whose text is editable; supplies the caption and the default. */
  textLabel?: { caption: string; fallback: string };
}

const validationSchema = Yup.object().shape({
  enabled: Yup.boolean().required(),
  color: Yup.string().required('Color is required'),
});

const CalendarConfigForm: React.FC<CalendarConfigFormProps> = ({ show, onClose, onSuccess, initialData, moduleKey, title, textLabel }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showIconPicker, setShowIconPicker] = useState(false);

  const initialValues = {
    enabled: initialData?.enabled ?? false,
    color: initialData?.color || "#0288D1",
    icon: initialData?.icon || "",
    label: initialData?.label ?? "",
  };

  const handleSubmit = async (values: typeof initialValues) => {
    setError(null);
    setIsSubmitting(true);

    try {
      const payload = {
        enabled: values.enabled,
        color: values.color,
        icon: values.icon,
        // Blank is stored as blank, and read back as the default. Saving the fallback instead
        // would freeze today's wording into the row, so a later change to the default would
        // not reach anyone who had opened this form once.
        ...(textLabel ? { label: values.label.trim() } : {}),
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
          icon: values.icon,
          ...(textLabel ? { label: values.label.trim() } : {}),
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
    <Modal show={show} onHide={onClose} centered dialogClassName="calendar-config-modal">
      <Modal.Header closeButton style={{ borderBottom: `1px solid ${C.border}`, padding: `${SP.md} ${SP.lg}` }}>
        <Modal.Title style={{ fontFamily: FONT.body, fontWeight: 600, fontSize: '16px', color: C.textPrimary }}>
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
            <Modal.Body style={{ padding: SP.lg }}>
              {error && <div className="alert alert-danger mb-3">{error}</div>}

              {/* Enable Switch */}
              <div className="d-flex justify-content-between align-items-center" style={{ marginBottom: SP.lg }}>
                <label className="form-label" style={{ fontFamily: FONT.body, fontWeight: 600, color: C.textPrimary, fontSize: '14px', marginBottom: 0 }}>
                  Enable Event Display
                </label>
                <WtSwitch checked={values.enabled} onChange={(e) => setFieldValue("enabled", e.target.checked)} />
              </div>

              {/* The pill's own text. Above the colour because it is what the pill SAYS,
                  and reading comes before decoration. Shown whether or not the colour is
                  overridden: a half is still called something when it is wearing the
                  built-in colour. */}
              {textLabel && (
                <div style={{ marginBottom: SP.lg }}>
                  <label
                    className="form-label"
                    htmlFor="cfg-label"
                    style={{ fontFamily: FONT.body, fontWeight: 600, color: C.textPrimary, fontSize: '14px', marginBottom: SP.sm }}
                  >
                    {textLabel.caption}
                  </label>
                  <input
                    id="cfg-label"
                    type="text"
                    className="form-control"
                    maxLength={12}
                    value={values.label}
                    placeholder={textLabel.fallback}
                    onChange={(e) => setFieldValue("label", e.target.value)}
                    style={{ fontFamily: FONT.body, fontSize: '14px' }}
                  />
                  <div style={{ fontFamily: FONT.body, fontSize: '12px', color: C.textMuted, marginTop: SP.xs }}>
                    Leave it empty to keep &ldquo;{textLabel.fallback}&rdquo;. It sits in a small pill, so short wins.
                  </div>
                </div>
              )}

              {/* Color Picker */}
              {values.enabled && (
                <div style={{ marginBottom: SP.lg }}>
                  <label
                    className="form-label"
                    style={{
                      fontFamily: FONT.body,
                      fontWeight: 600,
                      color: C.textPrimary,
                      fontSize: '14px',
                      marginBottom: SP.sm,
                    }}
                  >
                    Choose Category Color
                  </label>
                  <div className="position-relative">
                    <div
                      className="d-flex align-items-center justify-content-between"
                      style={{
                        backgroundColor: C.bgSection,
                        border: `1px solid ${C.border}`,
                        borderRadius: RADIUS.md,
                        padding: '12px 16px',
                        cursor: 'pointer',
                        fontFamily: FONT.body,
                        fontSize: '14px',
                        color: C.textSecondary,
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
                        style={{ fontSize: '12px', color: C.textSecondary }}
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
                <div style={{ marginBottom: SP.lg }}>
                  <label
                    className="form-label"
                    style={{
                      fontFamily: FONT.body,
                      fontWeight: 600,
                      color: C.textPrimary,
                      fontSize: '14px',
                      marginBottom: SP.sm,
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
                      border: `1px solid ${C.border}`,
                      borderRadius: RADIUS.md,
                      background: C.bgSection,
                      cursor: "pointer",
                      fontFamily: FONT.body,
                      fontSize: "14px",
                      color: values.icon ? C.textPrimary : C.textSecondary,
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

            <Modal.Footer style={{ borderTop: `1px solid ${C.border}`, padding: `${SP.md} ${SP.lg}` }}>
              <Button
                variant="light"
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                style={{
                  backgroundColor: C.bgCard,
                  color: C.textSecondary,
                  border: `1px solid ${C.border}`,
                  borderRadius: RADIUS.md,
                  padding: '10px 20px',
                  fontFamily: FONT.body,
                  fontWeight: 500,
                  fontSize: '14px',
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                disabled={isSubmitting}
                style={{
                  backgroundColor: C.primary,
                  border: 'none',
                  borderRadius: RADIUS.md,
                  padding: '10px 24px',
                  fontFamily: FONT.body,
                  fontWeight: 600,
                  fontSize: '14px',
                  boxShadow: `0 4px 12px ${C.primaryShadow}`,
                }}
              >
                {isSubmitting ? "Saving..." : "Save"}
              </Button>
            </Modal.Footer>
          </FormikForm>
        )}
      </Formik>

      <style>{`
        .calendar-config-modal .form-check-input:checked {
          background-color: ${C.primary};
          border-color: ${C.primary};
        }

        .calendar-config-modal .modal-content {
          border-radius: ${RADIUS.lg} !important;
          border: none !important;
          box-shadow: ${C.shadowModal} !important;
        }
      `}</style>
    </Modal>
  );
};

export default CalendarConfigForm;
