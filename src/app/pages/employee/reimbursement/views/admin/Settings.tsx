import MaterialTable from "@app/modules/common/components/MaterialTable";
import TextInput from "@app/modules/common/inputs/TextInput";
import { KTIcon, toAbsoluteUrl } from "@metronic/helpers";
import { C, BTN, RADIUS, FONT } from "@app/modules/configuration";
import {
  IReimbursementType,
  IReimbursementTypeCreate,
  IReimbursementTypeFetch,
} from "@models/employee";

import { RootState } from "@redux/store";
import { deleteConfirmation, successConfirmation } from "@utils/modal";
import {
  createReimbursementType,
  deleteReimbursementTypeByItsId,
  fetchAllReimbursementTypesFromDb,
  updateReimbursementTypeById,
} from "@utils/statistics";
import { Form, Formik, FormikValues } from "formik";
import { MRT_ColumnDef } from "material-react-table";
import React, { useEffect, useMemo, useState } from "react";
import { Modal } from "react-bootstrap";
import { useSelector } from "react-redux";
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
 * Renders the icon cell in the table.
 * Supports:
 *   - KT system icon names stored as  "kt:car"
 *   - Full URLs (http/https) stored directly
 *   - Legacy S3 URLs
 *   - Empty / missing → default icon
 */
function IconCell({ value }: { value: string }) {
  const isKtIcon = value?.startsWith("kt:");
  const isUrl = value?.startsWith("http");

  if (isKtIcon) {
    const iconName = value.slice(3);
    return (
      <div
        style={{
          width: 46,
          height: 46,
          borderRadius: "50%",
          background: "#EEF6FF",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "4px 0",
        }}
      >
        <KTIcon iconName={iconName} className="fs-2 text-primary" />
      </div>
    );
  }

  const src = isUrl ? value : DEFAULT_ICON_URL;
  return (
    <img
      style={{ width: 46, height: 46, borderRadius: "50%", margin: "4px 0", objectFit: "cover" }}
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

// ─── Component ────────────────────────────────────────────────────────────────

function Settings() {
  const [reimbursementTypeData, setReimbursementTypeData] = useState<
    IReimbursementTypeFetch[]
  >([]);

  const isAdmin = useSelector(
    (state: RootState) => state.auth.currentUser.isAdmin
  );
  const employeeId = useSelector(
    (state: RootState) => state.employee.currentEmployee.id
  );

  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [fetchAgain, setFetchAgain] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);

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

  // ── Columns ─────────────────────────────────────────────────────────────────

  const columns = useMemo<MRT_ColumnDef<IReimbursementType>[]>(
    () => [
      {
        accessorKey: "icon",
        header: "Icon",
        enableSorting: true,
        enableColumnActions: false,
        Cell: ({ renderedCellValue }: any) => (
          <IconCell value={renderedCellValue} />
        ),
      },
      {
        accessorKey: "type",
        header: "Name",
        enableSorting: true,
        enableColumnActions: false,
        Cell: ({ renderedCellValue }: any) => renderedCellValue,
      },
      {
        accessorKey: "amountLimit",
        header: "Amount Limit",
        enableSorting: true,
        enableColumnActions: false,
        Cell: ({ renderedCellValue }: any) =>
          renderedCellValue != null ? `₹${Number(renderedCellValue).toLocaleString("en-IN")}` : "—",
      },
      ...(isAdmin
        ? [
            {
              accessorKey: "actions",
              header: "Actions",
              enableSorting: false,
              enableColumnActions: false,
              Cell: ({ row }: any) => (
                <div className="flex items-center justify-center space-x-4">
                  <button
                    className="btn btn-icon btn-active-color-primary btn-sm w-[20px]"
                    onClick={() => handleEdit(row.original)}
                  >
                    <KTIcon iconName="pencil" className="inline fs-4 text-red-500" />
                  </button>
                  <button
                    className="btn btn-icon btn-active-color-primary btn-sm w-4"
                    onClick={() => handleDelete(row.original)}
                  >
                    <KTIcon iconName="trash" className="inline fs-4 text-red-500" />
                  </button>
                </div>
              ),
            },
          ]
        : []),
    ],
    [isAdmin]
  );

  // ── Data fetch ───────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchAllReimbursementTypesFromDb().then((res) => {
      setReimbursementTypeData([...res].sort((a, b) => a.type.localeCompare(b.type)));
    });
  }, [show, fetchAgain, selectedReimbursement]);

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
        <button
          style={{ ...BTN.primary, fontSize: '13.5px', padding: '9px 18px' }}
          onClick={handleNew}
        >
          <i className="bi bi-plus-lg" style={{ fontSize: '14px' }} />
          Add New Category
        </button>
      </div>

      <MaterialTable
        columns={columns}
        data={reimbursementTypeData}
        hideExportCenter={true}
        employeeId={employeeId}
        muiTableProps={{
          sx: {
            "& .MuiTableBody-root .MuiTableCell-root": {
              borderBottom: "none",
              paddingY: "5px",
            },
            "& .css-1huu0oi-MuiTableCell-root": { width: "auto" },
          },
        }}
        tableName="Reimbursements"
      />

      {/* ── Category Form Modal ──────────────────────────────────────── */}
      <Modal show={show} onHide={handleClose} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            {editMode ? "Edit Reimbursement Category" : "New Reimbursement Category"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
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
                  // placeholder={undefined}
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
                      <div className="d-flex flex-column fv-row mb-7">
                        <label className="d-flex align-items-center fs-6 form-label mb-2">
                          <span>Amount Limit</span>
                        </label>
                        <input
                          // type="number"
                          min={0}
                          name="amountLimit"
                          placeholder=""
                          value={formikProps.values.amountLimit ?? ""}
                          onChange={(e) =>
                            formikProps.setFieldValue(
                              "amountLimit",
                              e.target.value === "" ? null : Number(e.target.value)
                            )
                          }
                          onBlur={formikProps.handleBlur}
                          className={`form-control${formikProps.touched.amountLimit && formikProps.errors.amountLimit ? " is-invalid" : ""}`}
                          style={{ height: 44 }}
                        />
                        {formikProps.touched.amountLimit && formikProps.errors.amountLimit && (
                          <div className="fv-plugins-message-container mt-1">
                            <div className="fv-help-block">{formikProps.errors.amountLimit as string}</div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Icon picker field */}
                    <div className="col-lg-6">
                      <label className="mb-3 fw-bold">
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
                          border: "1.5px solid #E4E6EF",
                          borderRadius: "8px",
                          background: "#FAFAFA",
                          cursor: "pointer",
                          fontSize: "13px",
                          color: formikProps.values.icon ? "#181C32" : "#A1A5B7",
                          fontWeight: formikProps.values.icon ? 600 : 400,
                          transition: "border-color 0.15s",
                        }}
                        onMouseEnter={(e) =>
                          ((e.currentTarget as HTMLElement).style.borderColor = "#3E97FF")
                        }
                        onMouseLeave={(e) =>
                          ((e.currentTarget as HTMLElement).style.borderColor = "#E4E6EF")
                        }
                      >
                        <KTIcon iconName="category" className="fs-4 text-primary" />
                        {formikProps.values.icon
                          ? "Change Icon"
                          : "Pick an Icon…"}
                        <KTIcon
                          iconName="arrow-right"
                          className="fs-5 text-muted ms-auto"
                        />
                      </button>

                      {/* Inline preview */}
                      {/* FIX Image 1: compute as explicit string so prop is never undefined */}
                      {(() => {
                        const iconToPreview: string = previewIconValue || formikProps.values.icon || "";
                        return iconToPreview ? <IconPreview icon={iconToPreview} /> : null;
                      })()}

                      {formikProps.touched.icon && formikProps.errors.icon && (
                        <div className="fv-plugins-message-container mt-1">
                          <div className="fv-help-block">{formikProps.errors.icon}</div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="d-flex justify-content-start mt-2">
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={loading || !formikProps.isValid}
                    >
                      {!loading && "Submit"}
                      {loading && (
                        <span className="indicator-progress" style={{ display: "block" }}>
                          Please wait…{" "}
                          <span className="spinner-border spinner-border-sm align-middle ms-2" />
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
