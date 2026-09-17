import React from 'react';
import { WtField } from './WtField';

/**
 * ToolbarFilterSelect — the app's standard toolbar filter control.
 *
 * The "SUB ORGANIZATION / BRANCH / STATUS" row on the payroll, employee-list,
 * reimbursement, dashboard and recruitment screens.
 *
 * WHY IT LIVES HERE: it was defined inside
 * `pages/employee/salary/admin/SalaryTableFilters.tsx`, and three unrelated pages
 * reached across feature boundaries to import it from there. It was reused but
 * never shared — a feature page owning a control four screens depend on. Nothing
 * about it is salary-specific.
 *
 * WHAT IT IS NOW: a thin adapter over `WtField`, which owns the label, the frame,
 * the focus ring and the error treatment for every labelled control in the app.
 *
 * It used to be MUI's outlined Select with a floating `InputLabel`, and it carried
 * a hand-maintained copy of the notch's font metrics — because MUI sizes the gap
 * in the border from the FIELD's typography rather than the label's, so a bold
 * uppercase label rendered wider than its own gap and sat on the border line.
 * That whole class of bug is gone: `WtField` cuts no gap. The label is a small
 * uppercase prefix INSIDE the control (`labelPlacement="inline"`), so the toolbar
 * stays exactly one control tall, which is what the notched pattern was bought
 * for in the first place.
 *
 * The public API is unchanged, deliberately — every existing call site keeps
 * working, and no screen had to be touched to get the fix.
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

export const ToolbarFilterSelect: React.FC<ToolbarFilterSelectProps> = ({
    label, icon, value, onChange, options, minWidth = 160, theme, disabled,
}) => (
    <WtField
        label={label}
        labelPlacement="inline"
        icon={icon}
        value={value}
        onChange={onChange}
        options={options}
        // Only the accent travels. The old theme object also carried a background
        // and a text colour, which is what made these controls the one thing on
        // the page that stayed light in dark mode; WtField takes its surface from
        // the theme and tints only the border, icon and focus ring.
        tone={theme?.icon}
        disabled={disabled}
        size="sm"
        fullWidth={false}
        minWidth={minWidth}
    />
);

export default ToolbarFilterSelect;
