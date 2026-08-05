import React from 'react';
import { FormControl, InputLabel, MenuItem, Select, alpha } from '@mui/material';
import { KTIcon } from '@metronic/helpers';

/**
 * ToolbarFilterSelect — the app's standard toolbar filter control.
 *
 * The "SUB ORGANIZATION / BRANCH / STATUS" row on the payroll, employee-list,
 * reimbursement and dashboard screens.
 *
 * WHY IT LIVES HERE: it was defined inside
 * `pages/employee/salary/admin/SalaryTableFilters.tsx`, and three unrelated
 * pages reached across feature boundaries to import it from there. It was
 * reused but never shared — a feature page owning a control four screens
 * depend on. Nothing about it is salary-specific.
 *
 * Rebuilt on MUI + Tailwind per the app standard. The floating uppercase label
 * sitting in a gap in the border is MUI's own notched `InputLabel`, not a
 * hand-positioned absolute element as before — so it tracks the field, works in
 * dark mode, and announces itself to screen readers without extra wiring.
 *
 * `theme` tints the control when a non-default value is selected, which is how
 * these toolbars show "a filter is active" at a glance.
 */

export interface FilterSelectTheme {
    icon: string;
    border: string;
    bg: string;
    text: string;
    ring: string;
}

/** Tints used across the app, so a new consumer matches without inventing colours. */
export const FILTER_TONES = {
    blue: { icon: '#3b82f6', border: '#bfdbfe', bg: '#eff6ff', text: '#1e40af', ring: 'rgba(59, 130, 246, 0.12)' },
    cyan: { icon: '#0891b2', border: '#a5f3fc', bg: '#ecfeff', text: '#155e75', ring: 'rgba(8, 145, 178, 0.12)' },
    green: { icon: '#10b981', border: '#a7f3d0', bg: '#ecfdf5', text: '#065f46', ring: 'rgba(16, 185, 129, 0.12)' },
    amber: { icon: '#d97706', border: '#fde68a', bg: '#fffbeb', text: '#92400e', ring: 'rgba(217, 119, 6, 0.12)' },
    violet: { icon: '#7c3aed', border: '#ddd6fe', bg: '#f5f3ff', text: '#5b21b6', ring: 'rgba(124, 58, 237, 0.12)' },
    red: { icon: '#ef4444', border: '#fecaca', bg: '#fef2f2', text: '#991b1b', ring: 'rgba(239, 68, 68, 0.12)' },
} as const satisfies Record<string, FilterSelectTheme>;

export interface ToolbarFilterSelectProps {
    label: string;
    /**
     * Icon name. A `bi-` prefix renders a Bootstrap icon, for the existing
     * call sites; anything else is treated as a KTIcon (keenicons) name, which
     * is what new code should pass.
     */
    icon: string;
    value: string;
    onChange: (value: string) => void;
    options: { value: string; label: string }[];
    minWidth?: number;
    /** Tint applied when a non-default value is selected. */
    theme?: FilterSelectTheme;
    disabled?: boolean;
}

const FieldIcon = ({ icon, color }: { icon: string; color: string }) =>
    icon.startsWith('bi-')
        ? <i className={`bi ${icon}`} style={{ fontSize: 14, color, lineHeight: 1 }} />
        : <KTIcon iconName={icon} className="fs-6" />;

export const ToolbarFilterSelect: React.FC<ToolbarFilterSelectProps> = ({
    label, icon, value, onChange, options, minWidth = 160, theme, disabled,
}) => {
    const tinted = Boolean(theme);

    return (
        <FormControl size="small" sx={{ minWidth }} disabled={disabled}>
            <InputLabel
                shrink
                sx={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.6px',
                    textTransform: 'uppercase',
                    // MUI scales a shrunk label to 0.75; undo it so the declared
                    // size is the rendered size and the tracking stays readable.
                    transform: 'translate(12px, -9px) scale(1)',
                    color: 'text.secondary',
                    '&.Mui-focused': { color: theme?.icon ?? 'primary.main' },
                }}
            >
                {label}
            </InputLabel>

            <Select
                value={value}
                onChange={(event) => onChange(event.target.value)}
                label={label}
                notched
                displayEmpty
                startAdornment={
                    <span
                        className="mr-2 grid shrink-0 place-items-center"
                        style={{ color: theme?.icon ?? 'inherit' }}
                        aria-hidden="true"
                    >
                        <FieldIcon icon={icon} color={theme?.icon ?? 'currentColor'} />
                    </span>
                }
                sx={{
                    height: 38,
                    borderRadius: '10px',
                    fontSize: 13,
                    fontWeight: 600,
                    // Tinted only while a non-default value is active; otherwise the
                    // control inherits the theme and stays correct in dark mode.
                    ...(tinted && {
                        bgcolor: theme!.bg,
                        color: theme!.text,
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: theme!.border },
                        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: theme!.icon },
                    }),
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: theme?.icon ?? 'primary.main',
                        borderWidth: 1,
                    },
                    '&.Mui-focused': {
                        boxShadow: `0 0 0 3px ${theme?.ring ?? alpha('#1E3A8A', 0.12)}`,
                    },
                    '& .MuiSelect-select': {
                        display: 'flex',
                        alignItems: 'center',
                        py: 0,
                        pl: 1.5,
                    },
                }}
                MenuProps={{ PaperProps: { sx: { borderRadius: '10px', mt: 0.5 } } }}
            >
                {options.map((option) => (
                    <MenuItem key={option.value} value={option.value} sx={{ fontSize: 13 }}>
                        {option.label}
                    </MenuItem>
                ))}
            </Select>
        </FormControl>
    );
};

export default ToolbarFilterSelect;
