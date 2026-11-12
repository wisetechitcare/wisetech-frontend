import React, { useEffect, useState, type CSSProperties } from "react";
import { Form, Formik, FormikValues } from "formik";
import * as Yup from "yup";
import { ChevronRight, Flag, LayoutGrid, Pencil, Plus, Receipt, Trash2 } from "lucide-react";
import { Button } from "@/ds/ui/button";
import { DynamicIcon } from "@/ds/ui/dynamic-icon";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldTitle } from "@/ds/ui/field";
import { Input } from "@/ds/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/ds/ui/input-group";
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@/ds/ui/item";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/ds/ui/tooltip";
import { AutoGrid } from "@/ds/patterns/auto-grid";
import { EmptyState } from "@/ds/patterns/empty-state";
import { FormDialog } from "@/ds/patterns/form-dialog";
import { SettingsSection } from "@/ds/patterns/settings-section";
import {
  IReimbursementTypeCreate,
  IReimbursementTypeFetch,
} from "@models/employee";
import { deleteConfirmation, successConfirmation, errorConfirmation } from "@utils/modal";
import { canDelete, canSection } from "@utils/can";
import {
  createReimbursementType,
  deleteReimbursementTypeByItsId,
  fetchAllReimbursementTypesFromDb,
  updateReimbursementTypeById,
} from "@utils/statistics";
import { useEventBus } from "@hooks/useEventBus";
import { EVENT_KEYS } from "@constants/eventKeys";
import { formatCurrency, getCurrencySymbol } from "@utils/currency";
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

// A factory, not a shared mutable object. This was a module-level `let` reassigned in
// handleNew, so every mount of this form shared one object — two open tabs meant one form's
// edits became the other's defaults.
const makeCategoryInitialState = (): { type: string; icon: string; amountLimit: number | null } => ({
  type: "",
  icon: "",
  amountLimit: null,
});

const FORM_ID = "employee_reimbursement_form";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DEFAULT_ICON_URL =
  "https://wise-tech-asset-store.s3.ap-south-1.amazonaws.com/15658e56-ee9c-4ac3-abfa-ce8734f7978a/0aa9fbc3296053c60f12004b96021ab31ba20d3650";

/**
 * A category's icon in a round brand tile.
 * Supports:
 *   - system icon names stored as  "kt:car"
 *   - Full URLs (http/https) stored directly
 *   - Empty / missing → default icon
 */
function IconAvatar({ value, size = "default" }: { value?: string; size?: "default" | "lg" }) {
  const box = size === "lg" ? "size-10" : "size-9";
  if (value?.startsWith("kt:")) {
    return (
      <span className={`grid ${box} shrink-0 place-items-center rounded-full bg-accent text-primary`}>
        <DynamicIcon name={value.slice(3)} className="size-[18px]" />
      </span>
    );
  }
  const src = value?.startsWith("http") ? value : DEFAULT_ICON_URL;
  return (
    <span className={`grid ${box} shrink-0 place-items-center overflow-hidden rounded-full bg-accent`}>
      {/* Online icons are drawn dark (#181C32); a light disc behind them keeps them visible in dark mode. */}
      <img className="size-full object-cover" alt="" src={src} />
    </span>
  );
}

/** A row icon action with its tooltip (Button story "Tinted"). */
function RowAction({ label, danger, onClick, children }: { label: string; danger?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="tinted"
            size="icon-sm"
            aria-label={label}
            onClick={onClick}
            style={danger ? ({ "--tint": "var(--cta-danger)" } as CSSProperties) : undefined}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

// ─── Category tile ────────────────────────────────────────────────────────────

interface CategoryTileProps {
  category: IReimbursementTypeFetch;
  canManage: boolean;
  onEdit: () => void;
  /** Omitted without Delete access — the trash button is hidden. */
  onDelete?: () => void;
}

/** One category: its icon, name and limit, with Edit / Delete (kit Item, outline). */
function CategoryTile({ category, canManage, onEdit, onDelete }: CategoryTileProps) {
  const hasLimit = category.amountLimit != null;
  return (
    <Item size="sm" variant="outline" className="h-full bg-card hover:bg-muted/40">
      <ItemMedia>
        <IconAvatar value={category.icon} />
      </ItemMedia>
      <ItemContent className="min-w-0">
        <ItemTitle className="truncate">{category.type}</ItemTitle>
        <ItemDescription className={hasLimit ? "tabular font-medium text-primary" : undefined}>
          {hasLimit ? `Limit ${formatCurrency(Number(category.amountLimit))}` : "No Limit Set"}
        </ItemDescription>
      </ItemContent>
      {canManage && (
        <ItemActions>
          <RowAction label={`Edit ${category.type}`} onClick={onEdit}>
            <Pencil aria-hidden />
          </RowAction>
          {onDelete && (
            <RowAction label={`Delete ${category.type}`} danger onClick={onDelete}>
              <Trash2 aria-hidden />
            </RowAction>
          )}
        </ItemActions>
      )}
    </Item>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

function Settings() {
  const [reimbursementTypeData, setReimbursementTypeData] = useState<
    IReimbursementTypeFetch[]
  >([]);

  const canWrite = canSection("finance.reimbursements", "write");

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
    // announce:false — the success alert used to fire on CONFIRM, before the delete ran, so a
    // failed delete still told the user it had worked. Report what actually happened.
    const val = await deleteConfirmation("Reimbursement Type Deleted.", "Delete", "Deleted", false);
    if (!val) return;
    try {
      await deleteReimbursementTypeByItsId(rowDetails?.id);
      setFetchAgain((prev) => !prev);
      await successConfirmation("Reimbursement Type Deleted.");
    } catch {
      await errorConfirmation("Could not delete this category. It may still be in use.");
    }
  };

  const handleClose = () => {
    setShow(false);
    setEditMode(false);
    setPreviewIconValue("");
  };

  const handleNew = () => {
    // (nothing to reset — makeCategoryInitialState() returns fresh values each render)
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

  const handleSubmit = async (values: any, _actions: FormikValues) => {
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
        successConfirmation("Reimbursement Type updated.");
      } else {
        await createReimbursementType(payload);
        successConfirmation("Reimbursement type created.");
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
      <SettingsSection
        title="Reimbursement Categories"
        description="Define the expense categories employees can submit reimbursement requests for."
        icon={<Flag />}
        count={reimbursementTypeData.length}
        divided={false}
        action={canWrite ? (
          <Button onClick={handleNew}>
            <Plus data-icon="inline-start" aria-hidden /> Add New Category
          </Button>
        ) : undefined}
      >
        {reimbursementTypeData.length === 0 ? (
          <EmptyState
            size="sm"
            icon={<Receipt />}
            title="No Reimbursement Categories Yet"
            description="Add the first category employees can claim against."
          />
        ) : (
          <AutoGrid min={240} max={420} stretch>
              {reimbursementTypeData.map((category) => (
                <CategoryTile
                  key={category.id}
                  category={category}
                  canManage={canWrite}
                  onEdit={() => handleEdit(category)}
                  onDelete={canDelete("finance.reimbursements") ? () => handleDelete(category) : undefined}
                />
              ))}
          </AutoGrid>
        )}
      </SettingsSection>

      {/* ── Category Form ──────────────────────────────────────────────
          Formik outside the dialog, so the dialog knows when the form is dirty and asks before
          discarding (what UnsavedChangesModal did). */}
      <Formik
        initialValues={
          editMode && selectedReimbursement ? selectedReimbursement : makeCategoryInitialState()
        }
        onSubmit={handleSubmit}
        validationSchema={reimbursementTypeSchema}
        enableReinitialize={true}
      >
        {(formikProps) => {
          // Expose setFieldValue to the icon picker handler
          formikSetFieldRef.current = formikProps.setFieldValue;
          const { values, touched, errors } = formikProps;
          const nameError = touched.type && errors.type ? String(errors.type) : undefined;
          const limitError = touched.amountLimit && errors.amountLimit ? String(errors.amountLimit) : undefined;
          const iconToPreview: string = previewIconValue || values.icon || "";

          return (
            <FormDialog
              open={show}
              onOpenChange={(open) => { if (!open) handleClose(); }}
              title={editMode ? "Edit Reimbursement Category" : "New Reimbursement Category"}
              icon={<Flag />}
              formId={FORM_ID}
              submitLabel={editMode ? "Save Changes" : "Create Category"}
              submitting={loading}
              submitDisabled={!formikProps.isValid}
              dirty={formikProps.dirty}
            >
              <Form id={FORM_ID} noValidate>
                <FieldGroup className="gap-6 pt-2">
                  <Field data-invalid={nameError ? true : undefined}>
                    <FieldLabel htmlFor="category-name">Name</FieldLabel>
                    <Input
                      id="category-name"
                      name="type"
                      required
                      value={values.type ?? ""}
                      onChange={formikProps.handleChange}
                      onBlur={formikProps.handleBlur}
                      aria-invalid={nameError ? true : undefined}
                    />
                    {nameError && <FieldError>{nameError}</FieldError>}
                  </Field>

                  <Field data-invalid={limitError ? true : undefined}>
                    <FieldLabel htmlFor="category-limit">Amount Limit</FieldLabel>
                    <InputGroup>
                      <InputGroupAddon>
                        <InputGroupText>{getCurrencySymbol()}</InputGroupText>
                      </InputGroupAddon>
                      <InputGroupInput
                        id="category-limit"
                        name="amountLimit"
                        type="number"
                        inputMode="decimal"
                        min={0}
                        placeholder="e.g. 5000"
                        value={values.amountLimit ?? ""}
                        onChange={(e) =>
                          formikProps.setFieldValue(
                            "amountLimit",
                            e.target.value === "" ? null : Number(e.target.value)
                          )
                        }
                        onBlur={formikProps.handleBlur}
                        aria-invalid={limitError ? true : undefined}
                      />
                    </InputGroup>
                    {limitError ? (
                      <FieldError>{limitError}</FieldError>
                    ) : (
                      <FieldDescription>Per request. Leave empty for no limit.</FieldDescription>
                    )}
                  </Field>

                  <Field>
                    <FieldTitle>Icon</FieldTitle>
                    {/* The picker opens over this dialog; what it returns shows right here. */}
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => setShowIconPicker(true)}
                    >
                      {iconToPreview ? <IconAvatar value={iconToPreview} /> : <LayoutGrid data-icon="inline-start" aria-hidden />}
                      <span className="min-w-0 flex-1 truncate text-left">
                        {iconToPreview
                          ? iconToPreview.startsWith("kt:") ? `System · ${iconToPreview.slice(3)}` : "Online Icon"
                          : "Pick an Icon…"}
                      </span>
                      <span className="text-xs text-muted-foreground">{values.icon ? "Change" : ""}</span>
                      <ChevronRight data-icon="inline-end" aria-hidden />
                    </Button>
                    {touched.icon && errors.icon && <FieldError>{String(errors.icon)}</FieldError>}
                  </Field>
                </FieldGroup>
              </Form>
            </FormDialog>
          );
        }}
      </Formik>

      {/* ── Hybrid Icon Picker ─────────────────────────────────────────── */}
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
