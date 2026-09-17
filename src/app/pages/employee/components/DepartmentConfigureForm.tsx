import React, { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Box, Stack, Typography, DialogContent, DialogActions } from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import {
  GlassDialog, GlassHeader, WtButton, WtField, WtSelect, ToneChip, toast,
} from "@app/modules/common/components/ui";
import { createNewDepartment, updateDepartmentById, setDepartmentDesignations } from "@services/company";
// `detail` carries the server's reason; `.message` is only the HTTP status name.
import { apiErrorMessage } from "@utils/apiError";
import { queryKeys } from "@/lib/queryKeys";
import { useDepartmentDesignations } from "@/hooks/useDepartmentDesignations";

export interface DepartmentItem {
  id: string;
  name: string;
  code?: string;
  description?: string;
  /** Carried through so an edit can round-trip them — see handleSubmit. */
  companyId?: string;
  isActive?: boolean;
}

interface DepartmentFormProps {
  show: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialData?: DepartmentItem | null;
  isEditing?: boolean;
  /** Company to file a NEW department under; resolved by the parent from the list. */
  companyId?: string;
}

const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));

/**
 * Create or edit a department — its name, code and description, and the DESIGNATIONS it offers.
 *
 * The designations are what narrow every Department → Designation picker in the app (employee form,
 * requisitions, offers). A department with none linked allows every designation, and this form says
 * so. Suggestions come from the designations this department's current employees hold: a starting
 * point HR confirms, never saved on their own, because employee records are where filing mistakes
 * live.
 */
const DepartmentConfigureForm: React.FC<DepartmentFormProps> = ({
  show,
  onClose,
  onSuccess,
  initialData,
  isEditing = false,
  companyId,
}) => {
  const qc = useQueryClient();
  const dd = useDepartmentDesignations();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [designationIds, setDesignationIds] = useState<string[]>([]);
  const [touched, setTouched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const departmentId = isEditing ? initialData?.id ?? null : null;
  const linkedIds = useMemo(
    () => (departmentId ? [...(dd.index.byDepartment.get(departmentId) ?? [])] : []),
    [departmentId, dd.index],
  );

  // Reset each time the dialog opens, and once the links arrive for the department being edited.
  useEffect(() => {
    if (!show) return;
    setName(initialData?.name ?? "");
    setCode(initialData?.code ?? "");
    setDescription(initialData?.description ?? "");
    setTouched(false);
  }, [show, initialData]);
  useEffect(() => {
    if (show) setDesignationIds(linkedIds);
  }, [show, linkedIds]);

  const roleById = useMemo(() => new Map(dd.designations.map((d) => [d.id, d.role])), [dd.designations]);
  const options = useMemo(
    () => dd.designations.map((d) => ({ value: d.id, label: d.role })).sort((a, b) => a.label.localeCompare(b.label)),
    [dd.designations],
  );
  const suggestions = useMemo(
    () => (departmentId ? dd.suggestions.filter((s) => s.departmentId === departmentId && !designationIds.includes(s.designationId)) : []),
    [departmentId, dd.suggestions, designationIds],
  );

  const nameError = touched && !name.trim() ? "Department name is required" : undefined;

  const handleSubmit = async () => {
    setTouched(true);
    if (!name.trim()) return;
    setIsSubmitting(true);
    try {
      const base = { name: name.trim(), code: code.trim(), description: description.trim() };
      let savedId = departmentId;

      if (isEditing && initialData?.id) {
        // The update schema requires name + isActive + companyId; isActive round-trips from the row
        // rather than being hardcoded, so editing a department cannot silently retire it.
        await updateDepartmentById(initialData.id, {
          ...base,
          companyId: initialData.companyId,
          isActive: initialData.isActive ?? true,
        });
      } else {
        if (!companyId) {
          toast({ icon: "error", title: "Could not determine the company to add this department to." });
          return;
        }
        // The create endpoint takes a LIST (it was built for bulk seeding) and returns the rows.
        const created = await createNewDepartment([{ ...base, companyId, isActive: true }]);
        savedId = created?.data?.departments?.[0]?.id ?? null;
      }

      // Designations are saved only when they changed — and for a new department, only if any were chosen.
      if (savedId && !sameSet(designationIds, linkedIds)) {
        await setDepartmentDesignations(savedId, designationIds);
      }

      // Every Department → Designation picker reads these.
      await qc.invalidateQueries({ queryKey: queryKeys.masters.all });
      toast({ icon: "success", title: isEditing ? "Department updated" : "Department created" });
      onSuccess?.();
      onClose();
    } catch (err) {
      toast({ icon: "error", title: apiErrorMessage(err, `Could not ${isEditing ? "update" : "create"} the department`) });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <GlassDialog
      open={show}
      onClose={isSubmitting ? undefined : onClose}
      maxWidth="sm"
      header={
        <GlassHeader
          title={isEditing ? "Edit department" : "New department"}
          subtitle={isEditing ? initialData?.name : "Add a department and the designations it offers"}
          icon={<KTIcon iconName="abstract-26" className="fs-2" />}
          onClose={isSubmitting ? undefined : onClose}
        />
      }
    >
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <WtField
            label="Department name" required fullWidth autoFocus
            value={name} onChange={setName}
            placeholder="e.g. Design Department"
            error={nameError}
            disabled={isSubmitting}
          />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <WtField label="Code" sx={{ flex: 1 }} value={code} onChange={setCode} placeholder="e.g. ENG" disabled={isSubmitting} />
            <WtField label="Description" sx={{ flex: 2 }} value={description} onChange={setDescription} placeholder="Optional" disabled={isSubmitting} />
          </Stack>

          <WtField
            label="Designations in this department"
            hint={
              designationIds.length
                ? `Only these ${designationIds.length} can be chosen with this department.`
                : "None linked — this department allows every designation until you add some."
            }
          >
            <WtSelect
              isMulti
              isSearchable
              isDisabled={isSubmitting || dd.isLoading}
              isLoading={dd.isLoading}
              options={options}
              value={designationIds.map((id) => ({ value: id, label: roleById.get(id) ?? id }))}
              onChange={(values: { value: string }[] | null) => setDesignationIds((values ?? []).map((v) => v.value))}
              placeholder="Search designations…"
              ariaLabel="Designations in this department"
            />
          </WtField>

          {suggestions.length > 0 && (
            <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: "action.hover" }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <Typography sx={{ flex: 1, fontSize: 12.5, fontWeight: 600, color: "text.secondary" }}>
                  Suggested from this department's employees
                </Typography>
                <WtButton
                  size="small" ghost disabled={isSubmitting}
                  onClick={() => setDesignationIds((ids) => [...ids, ...suggestions.map((s) => s.designationId)])}
                >
                  Add all
                </WtButton>
              </Stack>
              <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                {suggestions.map((s) => (
                  <ToneChip
                    key={s.designationId}
                    tone="brand"
                    dense
                    clickable
                    disabled={isSubmitting}
                    icon={<KTIcon iconName="plus" className="fs-7" />}
                    label={`${roleById.get(s.designationId) ?? "Designation"} · ${s.employees} ${s.employees === 1 ? "person" : "people"}`}
                    onClick={() => setDesignationIds((ids) => [...ids, s.designationId])}
                  />
                ))}
              </Stack>
              <Typography sx={{ mt: 1, fontSize: 11.5, color: "text.secondary" }}>
                Check each one: an employee filed under the wrong department shows up here too.
              </Typography>
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <WtButton ghost onClick={onClose} disabled={isSubmitting}>Cancel</WtButton>
        <WtButton tone="primary" onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : isEditing ? "Save changes" : "Create"}
        </WtButton>
      </DialogActions>
    </GlassDialog>
  );
};

export default DepartmentConfigureForm;
