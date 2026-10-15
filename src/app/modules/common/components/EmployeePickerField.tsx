import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Box, Stack, Typography } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import { KTIcon } from "@metronic/helpers";
import { fetchAllEmployeesSelectedData } from "@services/employee";
import { getAvatar } from "@utils/avatar";
import { EmployeeSelectionDialog, type EmployeeOption } from "./EmployeeSelectionDialog";
import { WtField } from "./ui/WtField";

/**
 * EmployeePickerField — a labelled form control that opens the shared
 * {@link EmployeeSelectionDialog} to pick one (or many) employees, instead of a
 * raw employee-id text field. Loads the company directory itself (React Query,
 * cached), renders the chosen people as avatar chips, and emits employee ids.
 *
 * Single-select emits a 0/1-length array; multi-select emits all picked ids.
 *
 *   <EmployeePickerField label="Hiring manager" value={form.hiringManagerId}
 *     onChange={(ids) => setForm({ ...form, hiringManagerId: ids[0] ?? null })} />
 *
 *   <EmployeePickerField label="Panelists" multiple value={form.panelistIds}
 *     onChange={(ids) => setForm({ ...form, panelistIds: ids })} />
 *
 * Single-select uses floating Sandwich `WtField` (searchable Autocomplete + avatar options)
 * so height / label / required / hint match neighbouring form fields. Multi keeps the dialog.
 */

const DIRECTORY_KEY = ["employees", "directory"] as const;

/** Company employee directory as {@link EmployeeOption}s (cached 5 min). Shared by every picker. */
export function useEmployeeDirectory() {
    return useQuery({
        queryKey: DIRECTORY_KEY,
        queryFn: async (): Promise<EmployeeOption[]> => {
            const res = await fetchAllEmployeesSelectedData();
            const list: Array<Record<string, any>> = res?.data?.employees ?? [];
            return list
                .filter((e) => e?.isActive !== false)
                .map((e) => ({
                    id: String(e.id),
                    name: e.users ? `${e.users.firstName ?? ""} ${e.users.lastName ?? ""}`.trim() || "Unknown" : "Unknown",
                    designation: e.designations?.role || undefined,
                    avatar: getAvatar(e.avatar || "", e.gender ?? 0),
                }));
        },
        staleTime: 5 * 60_000,
    });
}

export interface EmployeePickerFieldProps {
    label: string;
    /** Selected employee id(s): `string | null` for single, `string[]` for multiple. */
    value: string | string[] | null | undefined;
    /** Always emits an array (0/1 for single-select). */
    onChange: (ids: string[]) => void;
    multiple?: boolean;
    required?: boolean;
    disabled?: boolean;
    placeholder?: string;
    helperText?: React.ReactNode;
    /** Validation message — replaces helperText (same one-slot rule as WtField). */
    error?: string;
    dialogTitle?: string;
    dialogSubtitle?: string;
    sx?: SxProps<Theme>;
}

export const EmployeePickerField: React.FC<EmployeePickerFieldProps> = ({
    label, value, onChange, multiple = false, required = false, disabled = false,
    placeholder = "Select…", helperText, error, dialogTitle, dialogSubtitle, sx,
}) => {
    const ids = useMemo(() => (Array.isArray(value) ? value : value ? [value] : []), [value]);
    const { data: employees = [], isLoading } = useEmployeeDirectory();
    const byId = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);
    const selected = useMemo(() => ids.map((id) => byId.get(id)).filter((e): e is EmployeeOption => !!e), [ids, byId]);

    const [open, setOpen] = useState(false);
    const [draft, setDraft] = useState<string[]>(ids);

    const openDialog = () => { setDraft(ids); setOpen(true); };
    const toggle = (id: string) =>
        setDraft((prev) => (multiple ? (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]) : prev[0] === id ? [] : [id]));
    const save = () => { onChange(draft); setOpen(false); };

    /**
     * ONE value is a Sandwich `WtField` searchable select (avatar + description), not a dialog
     * and not `labelPlacement="above"` + bare WtSelect — so Hiring Manager / Recruiter match
     * Branch / Department height, required `*`, hint, and dialog menu boundary.
     */
    if (!multiple) {
        const options = employees.map((e) => ({
            value: e.id,
            label: e.name,
            avatar: e.avatar,
            description: e.designation,
            title: e.designation ? `${e.name} · ${e.designation}` : e.name,
        }));

        return (
            <WtField
                label={label}
                required={required}
                hint={helperText ?? (isLoading ? "Loading directory…" : undefined)}
                error={error}
                disabled={disabled || isLoading}
                sx={sx}
                value={ids[0] ?? ""}
                onChange={(v) => onChange(typeof v === "string" && v ? [v] : [])}
                options={options}
                searchable
                clearable
                placeholder={placeholder}
            />
        );
    }

    return (
        // MULTI-select keeps the dialog, where a checkbox and a count are honest: picking
        // several panelists from a long directory is genuinely easier in a full-screen list
        // than in a dropdown. The label sits ABOVE because this control is a BUTTON, not an
        // input, so there is no notch it could carry.
        <WtField label={label} labelPlacement="above" required={required} hint={helperText} error={error} disabled={disabled} sx={sx}>
            <Box
                role="button"
                tabIndex={disabled ? -1 : 0}
                onClick={disabled ? undefined : openDialog}
                onKeyDown={(e) => { if (!disabled && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); openDialog(); } }}
                sx={{
                    display: "flex", alignItems: "center", gap: 1, minHeight: 40, px: 1.25, py: 0.6,
                    borderRadius: "10px", border: "1px solid", borderColor: "divider",
                    bgcolor: disabled ? "action.disabledBackground" : "background.paper",
                    cursor: disabled ? "default" : "pointer", transition: "border-color .15s",
                    "&:hover": disabled ? undefined : { borderColor: "text.disabled" },
                    "&:focus-visible": { outline: "2px solid", outlineColor: "primary.main", outlineOffset: 1 },
                }}
            >
                {selected.length === 0 ? (
                    <Typography sx={{ fontSize: 13.5, color: "text.disabled", flex: 1, minWidth: 0 }}>{placeholder}</Typography>
                ) : (
                    <Stack direction="row" spacing={0.5} useFlexGap sx={{ flex: 1, flexWrap: "wrap", minWidth: 0 }}>
                        {selected.slice(0, 4).map((e) => (
                            <Stack key={e.id} direction="row" alignItems="center" spacing={0.5} sx={{ bgcolor: "action.hover", borderRadius: 999, pl: 0.25, pr: 1, py: 0.25, maxWidth: "100%" }}>
                                <Box component="img" src={e.avatar} alt="" sx={{ width: 20, height: 20, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                                <Typography noWrap sx={{ fontSize: 12, fontWeight: 600, minWidth: 0 }}>{e.name}</Typography>
                            </Stack>
                        ))}
                        {selected.length > 4 && <Typography sx={{ fontSize: 12, color: "text.secondary", alignSelf: "center" }}>+{selected.length - 4}</Typography>}
                    </Stack>
                )}
                <KTIcon iconName="profile-circle" className="fs-5 text-muted" />
            </Box>

            <EmployeeSelectionDialog
                open={open}
                onClose={() => setOpen(false)}
                title={dialogTitle ?? label}
                subtitle={dialogSubtitle ?? (multiple ? "Pick one or more employees" : "Pick an employee")}
                icon="profile-circle"
                employees={employees}
                selectedIds={draft}
                onToggle={toggle}
                onSave={save}
                saveLabel={multiple ? "Select" : "Choose"}
                footerNote={isLoading ? "Loading directory…" : `${employees.length} employees`}
            />
        </WtField>
    );
};

export default EmployeePickerField;
