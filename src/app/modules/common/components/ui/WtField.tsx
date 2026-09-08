import React, { useId } from 'react';
import { Box, InputBase, MenuItem, Select, Typography, alpha } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import { KTIcon } from '@metronic/helpers';
import { AppIcon } from './AppIcon';
import { WT_CONTROL_HEIGHT } from './buttons';
import { WtSelect } from './WtSelect';

/**
 * WtField — the one labelled control in the app.
 *
 * WHY THIS EXISTS, AND WHY IT DOES NOT USE MUI'S FLOATING LABEL.
 *
 * MUI's outlined field puts the label INSIDE the border, in a gap cut by a
 * `<legend>` in the outline. MUI sizes that legend from the text rendered in the
 * FIELD's typography — not the label's. So the moment a label is bold, uppercase,
 * letter-spaced or resized, it is wider than the gap reserved for it and sits on
 * top of the border line.
 *
 * That is not a bug in one screen; it is what the pattern does. The codebase had
 * been paying for it one file at a time:
 *
 *   - `ToolbarFilterSelect` needed the legend's font metrics restated by hand.
 *   - `ProjectTablePage` nudges its label with `{ fontSize: '11px', top: '-3px' }`
 *     — a magic number arrived at by eye, which is wrong at any other font size.
 *   - Twelve files build their own `InputLabel` + control pairing, each able to
 *     drift the same way.
 *
 * So this control does not cut a gap in anything. **The label sits above the
 * field.** There is no notch, so a label cannot overflow one, at any weight,
 * size, or length, in any language. It is also the pattern every product we are
 * benchmarking against uses, and it is more legible: the label stays readable at
 * full size instead of shrinking to 75% and competing with the value.
 *
 * TWO PLACEMENTS, NEITHER WITH A NOTCH. `above` is the form default. `inline` puts
 * the label inside the control as a small prefix — "ORGANIZATION | Wisetech MEP" —
 * which is how a filter toolbar stays one row tall without going back to a floating
 * label. The compactness that made the notched pattern attractive is available
 * without the fragility that came with it.
 *
 * ONE FRAME, MANY CONTROLS. The label, the control and the message below are laid
 * out here once; the control inside is chosen by props. That is what stops a
 * select and a text box on the same row from disagreeing about height, radius,
 * focus ring or error colour — the drift this component was built to end.
 *
 * DELEGATION, NOT REIMPLEMENTATION. Searchable / multi / creatable selects are
 * `WtSelect` (react-select) — pass `searchable` and it renders inside this frame.
 * Dates stay `WtDateField` / `WtDateTimeField`. This owns the frame, not every
 * engine that can sit in it.
 */

export type WtFieldSize = 'sm' | 'md';

export interface WtFieldOption {
    value: string;
    label: string;
    disabled?: boolean;
}

export interface WtFieldProps {
    /** Omit only when a visible label sits elsewhere. */
    label?: string;
    /**
     * `above` (default) for forms — full-size, legible, its own line.
     * `inline` for toolbars — a small uppercase prefix INSIDE the control, so a
     * filter row stays one control tall. Neither cuts a gap in the border.
     */
    labelPlacement?: 'above' | 'inline';
    value: string | number;
    onChange: (value: string) => void;

    /** Present ⇒ this is a select. Absent ⇒ a text/number input. */
    options?: WtFieldOption[];

    /** Quiet guidance under the field. Replaced by `error` when that is set. */
    hint?: string;
    /** A message. Non-empty turns the control red and sets aria-invalid. */
    error?: string;
    required?: boolean;
    disabled?: boolean;
    placeholder?: string;

    /** 'sm' (38px) for toolbars; 'md' (46px) matches WtButton in a control row. */
    size?: WtFieldSize;
    fullWidth?: boolean;
    minWidth?: number;

    /** Leading glyph. A `bi-` prefix renders a Bootstrap icon; anything else a KTIcon. */
    icon?: string;
    /**
     * Accent applied ONLY while a value is set — how a toolbar shows "this filter
     * is active" without a second control.
     */
    tone?: string;

    /** Input-only. */
    type?: 'text' | 'number' | 'email' | 'tel' | 'password';
    multiline?: boolean;
    minRows?: number;
    inputMode?: 'text' | 'numeric' | 'decimal' | 'tel' | 'email';
    min?: number;
    max?: number;
    step?: number;

    /** Renders react-select inside this frame, for search / multi / creatable. */
    searchable?: boolean;

    id?: string;
    name?: string;
    autoFocus?: boolean;
    sx?: SxProps<Theme>;
    /** Escape hatch for a control this frame does not model. Replaces the input. */
    children?: React.ReactNode;
}

const HEIGHTS: Record<WtFieldSize, number> = { sm: 38, md: WT_CONTROL_HEIGHT };

const FieldIcon = ({ name, color }: { name: string; color: string }) =>
    name.startsWith('bi-')
        ? <AppIcon name={name} className="fs-6" style={{ color, lineHeight: 1 }} />
        : <KTIcon iconName={name} className="fs-6" />;

/**
 * The control's own frame. Painted here rather than by MUI's outlined variant,
 * because that variant's border and its label are coupled through the legend —
 * which is the coupling this component exists to remove.
 */
const frameSx = (
    size: WtFieldSize,
    { invalid, disabled, tone, multiline }: { invalid: boolean; disabled?: boolean; tone?: string; multiline?: boolean },
): SxProps<Theme> => ({
    width: '100%',
    minHeight: HEIGHTS[size],
    // A textarea grows; a single-line control must not, or it drifts out of a row.
    height: multiline ? 'auto' : HEIGHTS[size],
    px: 1.5,
    py: multiline ? 1 : 0,
    gap: 1,
    borderRadius: '10px',
    fontSize: size === 'sm' ? 13 : 14,
    fontWeight: 500,
    // Every colour comes from the theme, so the control is correct in dark mode
    // without a second definition of itself.
    color: 'text.primary',
    bgcolor: 'background.paper',
    border: '1px solid',
    borderColor: invalid ? 'error.main' : tone ? alpha(tone, 0.45) : 'divider',
    transition: 'border-color 150ms ease, box-shadow 150ms ease, background-color 150ms ease',

    '&:hover': !disabled
        ? { borderColor: invalid ? 'error.main' : tone || 'primary.main' }
        : undefined,

    // focus-within, not :focus — it has to fire for the select's button too.
    '&:focus-within': {
        borderColor: invalid ? 'error.main' : tone || 'primary.main',
        boxShadow: (theme: Theme) =>
            `0 0 0 3px ${alpha(invalid ? theme.palette.error.main : tone || theme.palette.primary.main, 0.14)}`,
    },

    ...(disabled && {
        opacity: 0.55,
        cursor: 'not-allowed',
        bgcolor: 'action.disabledBackground',
    }),

    '& input, & textarea': {
        p: 0,
        height: multiline ? 'auto' : '100%',
        '&::placeholder': { color: 'text.disabled', opacity: 1 },
    },
    // Chrome/Safari draw their own spinners at a size nothing else in the app uses.
    '& input[type=number]': { MozAppearance: 'textfield' },
    '& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button': {
        WebkitAppearance: 'none',
        margin: 0,
    },
});

export const WtField: React.FC<WtFieldProps> = ({
    label, labelPlacement = 'above', value, onChange, options, hint, error, required, disabled, placeholder,
    size = 'md', fullWidth = true, minWidth, icon, tone,
    type = 'text', multiline, minRows = 3, inputMode, min, max, step,
    searchable, id, name, autoFocus, sx, children,
}) => {
    const reactId = useId();
    const fieldId = id ?? `wtf-${reactId}`;
    const messageId = `${fieldId}-msg`;
    const invalid = Boolean(error);
    const message = error || hint;

    // The tint is a signal that a filter is set. Applying it to an empty control
    // would say "active" about nothing.
    const activeTone = tone && String(value ?? '').length ? tone : undefined;

    const inlineLabel = labelPlacement === 'inline' && label;

    const startIcon = (icon || inlineLabel) ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexShrink: 0, mr: 0.25 }}>
            {icon && (
                <Box component="span" aria-hidden="true" sx={{ display: 'grid', placeItems: 'center', color: activeTone ?? 'text.secondary' }}>
                    <FieldIcon name={icon} color={activeTone ?? 'currentColor'} />
                </Box>
            )}
            {inlineLabel && (
                <Typography
                    component="label"
                    htmlFor={fieldId}
                    sx={{
                        // Small caps so the label reads as a field name rather than a
                        // value, without needing a colour the theme has to define twice.
                        fontSize: 10.5,
                        fontWeight: 700,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        color: invalid ? 'error.main' : 'text.disabled',
                        whiteSpace: 'nowrap',
                        userSelect: 'none',
                        cursor: disabled ? 'default' : 'pointer',
                    }}
                >
                    {label}
                </Typography>
            )}
        </Box>
    ) : null;

    const frame = frameSx(size, { invalid, disabled, tone: activeTone, multiline });

    let control: React.ReactNode;

    if (children) {
        control = children;
    } else if (searchable) {
        // Deliberately not reimplemented here — see the header note on delegation.
        control = (
            <SearchableField
                options={options ?? []}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                disabled={disabled}
                invalid={invalid}
                size={size}
                ariaLabel={label}
                describedBy={message ? messageId : undefined}
            />
        );
    } else if (options) {
        control = (
            <Select
                id={fieldId}
                name={name}
                value={String(value ?? '')}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                displayEmpty
                autoFocus={autoFocus}
                // Two deliberate omissions. No `label`/`notched`, so there is no legend to
                // size — the whole point of this component. And no `sx`: MUI CLONES this
                // element and spreads the Select's own props onto the clone, so an sx passed
                // here is silently discarded and the field would render with no frame at all.
                // Every style lives in the single sx below.
                input={<InputBase startAdornment={startIcon} />}
                inputProps={{
                    'aria-invalid': invalid || undefined,
                    'aria-describedby': message ? messageId : undefined,
                }}
                renderValue={(selected) => {
                    const match = options.find((o) => o.value === selected);
                    if (!match) {
                        return <Box component="span" sx={{ color: 'text.disabled' }}>{placeholder ?? ''}</Box>;
                    }
                    // The full value stays reachable on hover once it ellipsizes.
                    return <Box component="span" title={match.label}>{match.label}</Box>;
                }}
                sx={{
                    ...(frame as object),
                    '& .MuiSelect-select': {
                        display: 'flex',
                        alignItems: 'center',
                        p: '0 !important',
                        // Room for the chevron, which is positioned over this area.
                        // Zeroing the padding outright lets a long value run under it.
                        pr: '26px !important',
                        // Without minWidth:0 a long option widens the control past its
                        // container instead of ellipsizing; the other rules do nothing.
                        minWidth: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    },
                    '& .MuiSelect-icon': { color: activeTone ?? 'text.secondary', right: 4 },
                    ...(sx as object),
                }}
                MenuProps={{
                    PaperProps: {
                        sx: {
                            borderRadius: '10px',
                            mt: 0.5,
                            // A long list must scroll inside the menu, not run off screen.
                            maxHeight: 320,
                            boxShadow: '0 8px 28px rgba(0,0,0,0.14)',
                        },
                    },
                }}
            >
                {placeholder && <MenuItem value="" sx={{ fontSize: 13, color: 'text.secondary' }}>{placeholder}</MenuItem>}
                {options.map((o) => (
                    <MenuItem key={o.value} value={o.value} disabled={o.disabled} sx={{ fontSize: 13 }}>
                        {o.label}
                    </MenuItem>
                ))}
            </Select>
        );
    } else {
        control = (
            <InputBase
                id={fieldId}
                name={name}
                value={value ?? ''}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                disabled={disabled}
                autoFocus={autoFocus}
                type={type}
                multiline={multiline}
                minRows={multiline ? minRows : undefined}
                startAdornment={startIcon}
                inputProps={{
                    inputMode, min, max, step,
                    'aria-invalid': invalid || undefined,
                    'aria-describedby': message ? messageId : undefined,
                }}
                sx={{ ...(frame as object), ...(sx as object) }}
            />
        );
    }

    return (
        <Box sx={{ width: fullWidth ? '100%' : 'auto', minWidth, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {label && labelPlacement === 'above' && (
                <Typography
                    component="label"
                    htmlFor={fieldId}
                    sx={{
                        fontSize: 12,
                        fontWeight: 600,
                        letterSpacing: '0.01em',
                        lineHeight: 1.3,
                        color: invalid ? 'error.main' : 'text.secondary',
                        // The label is a click target for its own field.
                        cursor: disabled ? 'default' : 'pointer',
                        userSelect: 'none',
                    }}
                >
                    {label}
                    {required && (
                        <Box component="span" aria-hidden="true" sx={{ color: 'error.main', ml: 0.25 }}>*</Box>
                    )}
                </Typography>
            )}

            {control}

            {message && (
                <Typography
                    id={messageId}
                    // Announced when it becomes an error, silent for ordinary hints.
                    role={invalid ? 'alert' : undefined}
                    sx={{ fontSize: 11.5, lineHeight: 1.4, color: invalid ? 'error.main' : 'text.secondary' }}
                >
                    {message}
                </Typography>
            )}
        </Box>
    );
};

/**
 * react-select inside this frame, so a searchable field still gets the same label,
 * hint, error and spacing as every other field on the form.
 */
const SearchableField: React.FC<{
    options: WtFieldOption[];
    value: string | number;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    invalid: boolean;
    size: WtFieldSize;
    ariaLabel?: string;
    describedBy?: string;
}> = ({ options, value, onChange, placeholder, disabled, invalid, size, ariaLabel }) => {
    const selected = options.find((o) => o.value === String(value ?? '')) ?? null;
    return (
        <WtSelect
            options={options.map((o) => ({ value: o.value, label: o.label, isDisabled: o.disabled }))}
            value={selected ? { value: selected.value, label: selected.label } : null}
            onChange={(opt: { value: string } | null) => onChange(opt?.value ?? '')}
            placeholder={placeholder}
            isDisabled={disabled}
            error={invalid}
            size={size}
            ariaLabel={ariaLabel}
            isSearchable
        />
    );
};

export default WtField;
