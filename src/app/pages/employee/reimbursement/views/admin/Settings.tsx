import TextInput from "@app/modules/common/inputs/TextInput";
import { KTIcon } from "@metronic/helpers";
import { C, BTN, RADIUS, FONT, SP, ConfigSectionCard } from "@app/modules/configuration";
import {
  IReimbursementTypeCreate,
  IReimbursementTypeFetch,
} from "@models/employee";

import { useSelector } from "react-redux";
import { RootState } from "@redux/store";
import { deleteConfirmation, successConfirmation } from "@utils/modal";
import {
  createReimbursementType,
  deleteReimbursementTypeByItsId,
  fetchAllReimbursementTypesFromDb,
  updateReimbursementTypeById,
} from "@utils/statistics";
import { Form, Formik, FormikValues } from "formik";
import React, { useEffect, useState } from "react";
import { Modal } from "react-bootstrap";
import { useEventBus } from "@hooks/useEventBus";
import { EVENT_KEYS } from "@constants/eventKeys";
import * as Yup from "yup";
import IconPickerModal, { SelectedIcon } from "./IconPickerModal";

// ─── Validation ───────────────────────────────────────────────────────────────

const reimbursementTypeSchema = Yup.object({
  type: Yup.string().required().label("Name"),
  icon: Yup.string().label("Icon"),
  amountLimit: Yup.number()
    .nullable()
    .transform((v, o) => (o === "" ? null : v))
    .min(0, "Amount Limit must be 0 or greater")
    .label("Amount Limit"),
});

let initialState: { type: string; icon: string; amountLimit: number | null } = {
  type: "",
  icon: "",
  amountLimit: null,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DEFAULT_ICON_URL =
  "https://wise-tech-asset-store.s3.ap-south-1.amazonaws.com/15658e56-ee9c-4ac3-abfa-ce8734f7978a/0aa9fbc3296053c60f12004b96021ab31ba20d3650";

/**
 * Renders a round icon avatar for a category.
 * Supports:
 *   - KT system icon names stored as  "kt:car"
 *   - Full URLs (http/https) stored directly
 *   - Empty / missing → default icon
 */
function IconAvatar({ value, size = 34 }: { value?: string; size?: number }) {
  const isKtIcon = value?.startsWith("kt:");
  const isUrl = value?.startsWith("http");

  if (isKtIcon) {
    const iconName = value!.slice(3);
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: C.primaryLight,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <span style={{ color: C.primary, display: "flex" }}>
          <KTIcon iconName={iconName} className="fs-4" />
        </span>
      </div>
    );
  }

  const src = isUrl ? value : DEFAULT_ICON_URL;
  return (
    <img
      style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
      alt="Icon"
      src={src}
    />
  );
}

/**
 * Small icon preview used inside the category modal.
 */
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
        background: C.primaryLight,
        border: "1.5px solid rgba(157,65,65,0.18)",
        borderRadius: RADIUS.md,
      }}
    >
      <IconAvatar value={icon} size={40} />
      <div>
        <div style={{ fontSize: "11px", color: C.textMuted, fontFamily: FONT.body, marginBottom: 1 }}>
          Icon Preview
        </div>
        <div style={{ fontSize: "12px", color: C.textSecondary, fontFamily: FONT.body, fontWeight: 500 }}>
          {isKtIcon ? `System · ${icon.slice(3)}` : "Online Icon"}
        </div>
      </div>
    </div>
  );
}

// ─── Category chip ────────────────────────────────────────────────────────────

interface CategoryChipProps {
  category: IReimbursementTypeFetch;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

const CategoryChip: React.FC<CategoryChipProps> = ({ category, canManage, onEdit, onDelete }) => {
  const [hov, setHov] = useState(false);
  const hasLimit = category.amountLimit != null;

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: hov ? "#ffffff" : "#f7f8fa",
        border: `1px solid ${hov ? "#d1d5e0" : "#eaecf0"}`,
        borderRadius: RADIUS.lg,
        padding: "8px 10px",
        transition: "all 0.15s ease",
        boxShadow: hov ? "0 4px 14px rgba(24,28,50,0.09)" : "0 1px 3px rgba(24,28,50,0.04)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Left accent */}
      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 0,
          width: "3px",
          backgroundColor: C.primary,
          opacity: 0.7,
        }}
      />

      <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: 0, paddingLeft: "4px" }}>
        <IconAvatar value={category.icon} />
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: FONT.body,
              fontWeight: 600,
              fontSize: "13px",
              color: C.textPrimary,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {category.type}
          </div>
          <div
            style={{
              fontFamily: FONT.body,
              fontWeight: 500,
              fontSize: "11px",
              color: hasLimit ? C.primary : C.textMuted,
              marginTop: "1px",
            }}
          >
            {hasLimit ? `Limit ₹${Number(category.amountLimit).toLocaleString("en-IN")}` : "No limit set"}
          </div>
        </div>
      </div>

      {canManage && (
        <div style={{ display: "flex", gap: "4px", flexShrink: 0, opacity: hov ? 1 : 0.35, transition: "opacity 0.15s ease" }}>
          <button
            onClick={onEdit}
            style={{
              background: hov ? "#eff6ff" : "transparent",
              border: "none",
              borderRadius: RADIUS.sm,
              padding: "4px 7px",
              cursor: "pointer",
              color: "#4f82c4",
              display: "flex",
              alignItems: "center",
              transition: "background 0.15s ease",
            }}
          >
            <i className="bi bi-pencil" style={{ fontSize: "11px" }} />
          </button>
          <button
            onClick={onDelete}
            style={{
              background: hov ? "#fff5f8" : "transparent",
              border: "none",
              borderRadius: RADIUS.sm,
              padding: "4px 7px",
              cursor: "pointer",
              color: C.danger,
              display: "flex",
              alignItems: "center",
              transition: "background 0.15s ease",
            }}
          >
            <i className="bi bi-trash" style={{ fontSize: "11px" }} />
          </button>
        </div>
      )}
    </div>
  );
};

const ChipGrid: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: SP.sm }}>
    {children}
  </div>
);

const EmptyState: React.FC = () => (
  <div style={{ textAlign: "center", padding: "28px 16px", color: C.textMuted, fontFamily: FONT.body, fontSize: "13px" }}>
    <i className="bi bi-inbox" style={{ fontSize: "28px", display: "block", marginBottom: "8px", opacity: 0.4 }} />
    No reimbursement categories configured yet
  </div>
);

// ─── Component ────────────────────────────────────────────────────────────────

function Settings() {
  const [reimbursementTypeData, setReimbursementTypeData] = useState<
    IReimbursementTypeFetch[]
  >([]);

  const isAdmin = useSelector(
    (state: RootState) => state.auth.currentUser.isAdmin
  );

  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [fetchAgain, setFetchAgain] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);

  useEventBus(EVENT_KEYS.reimbursementChanged, () => { setFetchAgain((prev) => !prev); });

  // We track the Formik setFieldValue separately so the icon picker can write to Formik
  const formikSetFieldRef = React.useRef<((field: string, value: any) => void) | null>(null);
  const [previewIconValue, setPreviewIconValue] = useState<string>("");

  const [selectedReimbursement, setSelectedReimbursement] =
    useState<IReimbursementTypeFetch | null>(null);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleDelete = async (rowDetails: IReimbursementTypeFetch) => {
    if (!rowDetails || !rowDetails.id) return;
    const val = await deleteConfirmation("Reimbursement Type Deleted Successfully!");
    if (val) {
      await deleteReimbursementTypeByItsId(rowDetails?.id);
      setFetchAgain((prev) => !prev);
    }
  };

  const handleClose = () => {
    setShow(false);
    setEditMode(false);
    setPreviewIconValue("");
  };

  const handleNew = () => {
    initialState = { type: "", icon: "", amountLimit: null };
    setPreviewIconValue("");
    setSelectedReimbursement(null);
    setShow(true);
    setEditMode(false);
  };

  const handleEdit = (rowDetails: IReimbursementTypeFetch) => {
    if (rowDetails) {
      setSelectedReimbursement(rowDetails);
      setPreviewIconValue(rowDetails.icon ?? "");
      setEditMode(true);
      setShow(true);
    }
  };

  const handleSubmit = async (values: any, actions: FormikValues) => {
    setLoading(true);
    try {
      const payload: IReimbursementTypeCreate = {
        ...values,
        type: values.type,
        icon: values.icon,
        amountLimit: values.amountLimit ?? null,
      };

      if (editMode && selectedReimbursement) {
        await updateReimbursementTypeById(payload, selectedReimbursement.id);
        successConfirmation("Reimbursement Type updated successfully");
      } else {
        await createReimbursementType(payload);
        successConfirmation("Reimbursement type created successfully");
      }

      setLoading(false);
      setShow(false);
      setEditMode(false);
      setFetchAgain((prev) => !prev);
      setSelectedReimbursement(null);
      setPreviewIconValue("");
    } catch (err) {
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Called by IconPickerModal when the user confirms a selection.
   * Converts the SelectedIcon into a storable string and writes it to Formik.
   *
   * Storage format:
   *   System icons  →  "kt:<iconName>"          e.g.  "kt:car"
   *   API icons     →  "<full URL>"              e.g.  "https://api.iconify.design/…"
   */
  const handleIconSelected = (icon: SelectedIcon) => {
    const storedValue =
      icon.source === "system" ? `kt:${icon.name}` : icon.url!;

    if (formikSetFieldRef.current) {
      formikSetFieldRef.current("icon", storedValue);
    }
    setPreviewIconValue(storedValue);
  };

  // ── Data fetch ───────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchAllReimbursementTypesFromDb().then((res) => {
      setReimbursementTypeData([...res].sort((a, b) => a.type.localeCompare(b.type)));
    });
  }, [show, fetchAgain, selectedReimbursement]);

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        .rc-form-control:focus {
          border-color: ${C.primary} !important;
          box-shadow: 0 0 0 3px ${C.primaryLight} !important;
        }
        .rc-modal .modal-content {
          border-radius: ${RADIUS.xl} !important;
          border: none !important;
          box-shadow: 0 10px 40px rgba(0,0,0,0.12) !important;
        }
      `}</style>

      <ConfigSectionCard
        title="Reimbursement Categories"
        description="Define the expense categories employees can submit reimbursement requests for."
        icon="bi-tag"
        iconColor="primary"
        primaryAction={{ label: "Add New Category", icon: "bi-plus-lg", onClick: handleNew, variant: "primary" }}
      >
        {reimbursementTypeData.length === 0 ? (
          <EmptyState />
        ) : (
          <ChipGrid>
            {reimbursementTypeData.map((category) => (
              <CategoryChip
                key={category.id}
                category={category}
                canManage={isAdmin}
                onEdit={() => handleEdit(category)}
                onDelete={() => handleDelete(category)}
              />
            ))}
          </ChipGrid>
        )}
      </ConfigSectionCard>

      {/* ── Category Form Modal ──────────────────────────────────────── */}
      <Modal show={show} onHide={handleClose} centered className="rc-modal">
        <Modal.Header closeButton style={{ borderBottom: "none", paddingBottom: "8px" }}>
          <Modal.Title style={{ fontFamily: FONT.heading, fontWeight: 700, fontSize: "18px", color: C.textPrimary }}>
            {editMode ? "Edit Reimbursement Category" : "New Reimbursement Category"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ paddingTop: "8px" }}>
          <Formik
            initialValues={
              editMode && selectedReimbursement ? selectedReimbursement : initialState
            }
            onSubmit={handleSubmit}
            validationSchema={reimbursementTypeSchema}
            enableReinitialize={true}
          >
            {(formikProps) => {
              // Expose setFieldValue to the icon picker handler
              formikSetFieldRef.current = formikProps.setFieldValue;

              return (
                <Form
                  className="d-flex flex-column"
                  noValidate
                  id="employee_reimbursement_form"
                >
                  <div className="row">
                    {/* Name field */}
                    <div className="col-lg-6">
                      <TextInput
                        isRequired={true}
                        label="Enter Name"
                        margin="mb-3"
                        formikField="type"
                      />
                      {/* Amount Limit field */}
                      <div className="d-flex flex-column fv-row mb-3">
                        <label
                          className="d-flex align-items-center mb-2"
                          style={{ fontFamily: FONT.body, fontWeight: 600, fontSize: "13.5px", color: C.textPrimary }}
                        >
                          <span>Amount Limit</span>
                        </label>
                        <input
                          min={0}
                          name="amountLimit"
                          placeholder="e.g. 5000"
                          value={formikProps.values.amountLimit ?? ""}
                          onChange={(e) =>
                            formikProps.setFieldValue(
                              "amountLimit",
                              e.target.value === "" ? null : Number(e.target.value)
                            )
                          }
                          onBlur={formikProps.handleBlur}
                          className="rc-form-control"
                          style={{
                            height: 44,
                            border: `1px solid ${formikProps.touched.amountLimit && formikProps.errors.amountLimit ? C.danger : C.border}`,
                            borderRadius: RADIUS.md,
                            padding: "0 14px",
                            fontSize: "13.5px",
                            fontFamily: FONT.body,
                            color: C.textPrimary,
                            backgroundColor: C.bgSection,
                            outline: "none",
                            transition: "border-color 0.15s ease",
                          }}
                        />
                        {formikProps.touched.amountLimit && formikProps.errors.amountLimit && (
                          <div style={{ fontFamily: FONT.body, fontSize: "12px", color: C.danger, marginTop: "6px" }}>
                            {formikProps.errors.amountLimit as string}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Icon picker field */}
                    <div className="col-lg-6">
                      <label
                        style={{
                          fontFamily: FONT.body,
                          fontWeight: 600,
                          fontSize: "13.5px",
                          color: C.textPrimary,
                          display: "block",
                          marginBottom: SP.sm,
                        }}
                      >
                        Choose Icon
                      </label>

                      {/* Trigger button */}
                      <button
                        type="button"
                        onClick={() => setShowIconPicker(true)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          width: "100%",
                          padding: "10px 14px",
                          border: `1.5px solid ${C.border}`,
                          borderRadius: RADIUS.md,
                          background: C.bgSection,
                          cursor: "pointer",
                          fontSize: "13px",
                          fontFamily: FONT.body,
                          color: formikProps.values.icon ? C.textPrimary : C.textMuted,
                          fontWeight: formikProps.values.icon ? 600 : 400,
                          transition: "border-color 0.15s",
                        }}
                        onMouseEnter={(e) =>
                          ((e.currentTarget as HTMLElement).style.borderColor = C.primary)
                        }
                        onMouseLeave={(e) =>
                          ((e.currentTarget as HTMLElement).style.borderColor = C.border)
                        }
                      >
                        <span style={{ color: C.primary, display: "flex" }}>
                          <KTIcon iconName="category" className="fs-4" />
                        </span>
                        {formikProps.values.icon
                          ? "Change Icon"
                          : "Pick an Icon…"}
                        <span style={{ color: C.textMuted, display: "flex", marginLeft: "auto" }}>
                          <KTIcon iconName="arrow-right" className="fs-5" />
                        </span>
                      </button>

                      {/* Inline preview */}
                      {(() => {
                        const iconToPreview: string = previewIconValue || formikProps.values.icon || "";
                        return iconToPreview ? <IconPreview icon={iconToPreview} /> : null;
                      })()}

                      {formikProps.touched.icon && formikProps.errors.icon && (
                        <div style={{ fontFamily: FONT.body, fontSize: "12px", color: C.danger, marginTop: "6px" }}>
                          {formikProps.errors.icon}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="d-flex justify-content-start mt-2">
                    <button
                      type="submit"
                      disabled={loading || !formikProps.isValid}
                      style={{
                        ...BTN.primary,
                        opacity: loading || !formikProps.isValid ? 0.6 : 1,
                        cursor: loading || !formikProps.isValid ? "not-allowed" : "pointer",
                      }}
                    >
                      {!loading && "Submit"}
                      {loading && (
                        <span className="indicator-progress" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          Please wait…
                          <span className="spinner-border spinner-border-sm align-middle" />
                        </span>
                      )}
                    </button>
                  </div>
                </Form>
              );
            }}
          </Formik>
        </Modal.Body>
      </Modal>

      {/* ── Hybrid Icon Picker Modal ─────────────────────────────────── */}
      <IconPickerModal
        show={showIconPicker}
        onHide={() => setShowIconPicker(false)}
        onSelect={handleIconSelected}
        currentIcon={
          previewIconValue
            ? previewIconValue.startsWith("kt:")
              ? {
                  source: "system",
                  name: previewIconValue.slice(3),
                  label: previewIconValue.slice(3),
                }
              : {
                  source: "iconify",
                  url: previewIconValue,
                  label: "Online Icon",
                }
            : null
        }
      />
    </>
  );
}

export default Settings;
