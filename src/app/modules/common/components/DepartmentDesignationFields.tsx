import { Stack, type SxProps, type Theme } from '@mui/material';
import { WtField } from '@app/modules/common/components/ui';
import { useDepartmentDesignations } from '@/hooks/useDepartmentDesignations';

/**
 * Department and Designation, dependent on each other — the pair every MUI form uses.
 *
 * - The designation list is narrowed to the chosen department's designations (once that department
 *   has been given some in Configure; until then it shows all, and says so).
 * - Changing the department clears a designation the new department does not offer, rather than
 *   leaving a pairing the server will refuse.
 * - Choosing a designation first fills in its department when it belongs to exactly one.
 * - An older record whose saved pairing no longer fits keeps its value visible and is flagged,
 *   instead of the designation silently appearing blank.
 *
 * The employee form uses the same hook with its own Formik controls; the rules are shared, not the
 * markup.
 */
export interface DepartmentDesignationValue {
    departmentId: string | null;
    designationId: string | null;
}

interface Props extends DepartmentDesignationValue {
    onChange: (next: DepartmentDesignationValue) => void;
    required?: boolean;
    disabled?: boolean;
    sx?: SxProps<Theme>;
}

/** Past this many options a plain menu becomes a scroll hunt. */
const SEARCHABLE_FROM = 8;

export function DepartmentDesignationFields({ departmentId, designationId, onChange, required, disabled, sx }: Props) {
    const dd = useDepartmentDesignations();

    const departmentOptions = dd.departments.map((d) => ({ value: d.id, label: d.name }));
    const designationOptions = dd.designationsFor(departmentId, designationId).map((d) => ({ value: d.id, label: d.role }));
    const { hint, error } = dd.designationHint(departmentId, designationId);
    const loadError = dd.isError ? 'Could not load departments and designations. Refresh to try again.' : undefined;

    const changeDepartment = (next: string) => {
        const nextDepartment = next || null;
        // Keep the designation only if the new department offers it.
        const keep = designationId && dd.isPairAllowed(nextDepartment, designationId) ? designationId : null;
        onChange({ departmentId: nextDepartment, designationId: keep });
    };

    const changeDesignation = (next: string) => {
        const nextDesignation = next || null;
        onChange({
            departmentId: departmentId ?? (nextDesignation ? dd.onlyDepartmentOf(nextDesignation) : null),
            designationId: nextDesignation,
        });
    };

    return (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={sx}>
            <WtField
                label="Department" required={required} clearable sx={{ flex: 1 }}
                value={departmentId ?? ''}
                onChange={changeDepartment}
                options={departmentOptions}
                searchable={departmentOptions.length >= SEARCHABLE_FROM}
                placeholder={dd.isLoading ? 'Loading…' : 'Choose a department'}
                disabled={disabled || dd.isLoading}
                error={loadError}
            />
            <WtField
                label="Designation" required={required} clearable sx={{ flex: 1 }}
                value={designationId ?? ''}
                onChange={changeDesignation}
                options={designationOptions}
                searchable={designationOptions.length >= SEARCHABLE_FROM}
                placeholder={dd.isLoading ? 'Loading…' : 'Choose a designation'}
                disabled={disabled || dd.isLoading}
                error={disabled ? undefined : error}
                hint={hint}
            />
        </Stack>
    );
}

export default DepartmentDesignationFields;
