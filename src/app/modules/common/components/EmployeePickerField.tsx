import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Box, Stack, Typography } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import { KTIcon } from "@metronic/helpers";
import { fetchAllEmployeesSelectedData } from "@services/employee";
import { getAvatar } from "@utils/avatar";
import { EmployeeSelectionDialog, type EmployeeOption } from "./EmployeeSelectionDialog";

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
    dialogTitle?: string;
    dialogSubtitle?: string;
    sx?: SxProps<Theme>;
}

export const EmployeePickerField: React.FC<EmployeePickerFieldProps> = ({
    label, value, onChange, multiple = false, required = false, disabled = false,
    placeholder = "Select…", helperText, dialogTitle, dialogSubtitle, sx,
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

    return (
        <Box sx={sx}>
            <Typography component="span" sx={{ display: "block", fontSize: 12, fontWeight: 600, color: "text.secondary", mb: 0.5 }}>
                {label}{required ? " *" : ""}
            </Typography>
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
            {helperText && <Typography sx={{ fontSize: 11.5, color: "text.secondary", mt: 0.4, ml: 0.25, lineHeight: 1.4 }}>{helperText}</Typography>}

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
        </Box>
    );
};

export default EmployeePickerField;
