import React, { useId } from 'react';
import { Box, MenuItem, TextField, Typography, alpha } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import { KTIcon } from '@metronic/helpers';
import { AppIcon } from './AppIcon';
import { WtSelect } from './WtSelect';

/**
 * WtField — the one labelled control in the app.
 *
 * IT RENDERS MUI'S OUTLINED FIELD WITH ITS FLOATING LABEL, because that is already the
 * app's labelled input. The sandwich-rule "Add Rule" dialog
 * (`pages/company/settings/SandwhichLeave.tsx`) is the reference: plain
 * `<TextField label size="small">`, the label resting in a gap in the border, and it is
 * correct there. Hundreds of screens look like that. A second look would have been a
 * second standard.
 *
 * WHY A LABEL EVER SAT ON THE BORDER LINE — worth knowing, because it is the one way to
 * break this again. MUI cuts the gap with a `<legend><span>{label}</span></legend>` inside
 * the outline, and that legend renders in the field's DEFAULT label metrics. It does not
 * see CSS aimed at `.MuiInputLabel-root`. So the moment a label is made bold, uppercase,
 * letter-spaced or resized, the visible label grows and the gap reserved for it does not —
 * and it lands on the line. The codebase had been paying for that one file at a time:
 * `ToolbarFilterSelect` restated the legend's font metrics by hand, and `ProjectTablePage`
 * nudges its label with `{ fontSize: '11px', top: '-3px' }`, a number arrived at by eye and
 * wrong at any other font size.
 *
 * **So the rule in here is: never style the label.** No `fontSize`, no `fontWeight`, no
 * `textTransform`, no `letterSpacing`, no `top`. Uppercase LABEL TEXT is fine — MUI measures
 * the characters it is given. Uppercasing in CSS is not, because the legend keeps the
 * original width. Everything else on this control may be themed; the label may not.
 *
 * ONE FRAME, MANY CONTROLS. Label, control and the message below are laid out here once;
 * what sits inside is chosen by props. That is what stops a select and a text box on the
 * same row from disagreeing about height, radius, focus ring or error colour.
 *
 * ONE MESSAGE SLOT. `error` is a MESSAGE, not a boolean, and it replaces `hint` when set —
 * so a field can never show a red border with cheerful guidance underneath it.
 *
 * DELEGATION, NOT REIMPLEMENTATION. Searchable selects are `WtSelect` (react-select). Dates
 * stay `WtDateField` / `WtDateTimeField`. This owns the frame, not every engine in it.
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
     * `floating` (default) is the app standard — MUI's label resting in the border.
     *
     * `above` puts it on its own line, for the controls that CANNOT carry a notch: a
     * react-select, or anything passed via `children`. Those switch to it on their own, so
     * passing this by hand is rarely the right answer.
     */
    labelPlacement?: 'floating' | 'above';
    /**
     * Required for every control this frame renders itself. Optional ONLY because
     * `children` replaces the input entirely, and a picker that opens a dialog has no
     * string value to hand back. On any other control, omitting them silently makes the
     * field read-only, so treat them as required unless you are passing `children`.
     */
    value?: string | number;
    onChange?: (value: string) => void;

    /** Present ⇒ this is a select. Absent ⇒ a text/number input. */
    options?: WtFieldOption[];

    /** Quiet guidance under the field. Replaced by `error` when that is set. */
    hint?: React.ReactNode;
    /** A message. Non-empty turns the control red and sets aria-invalid. */
    error?: string;
    required?: boolean;
    disabled?: boolean;
    placeholder?: string;

    /** 'sm' (default, MUI small) is the app's density. 'md' for a spacious form. */
    size?: WtFieldSize;
    fullWidth?: boolean;
    minWidth?: number;

    /** Leading glyph. A `bi-` prefix renders a Bootstrap icon; anything else a KTIcon. */
    icon?: string;
    /**
     * Short leading TEXT inside the frame — the unit the value is in: `₹`, `AED`, `kg`.
     *
     * Text, not a node, for the same reason `clearable` is a flag and not an adornment slot:
     * every caller would otherwise build its own and they would disagree about size, colour
     * and spacing. Money fields should use `WtMoneyField`, which fills this from the currency.
     */
    prefix?: string;
    /**
     * Accent applied ONLY while a value is set — how a toolbar shows "this filter is
     * active" without a second control.
     */
    tone?: string;

    /** Input-only. */
    type?: 'text' | 'number' | 'email' | 'tel' | 'password';
    multiline?: boolean;
    minRows?: number;
    inputMode?: 'text' | 'numeric' | 'decimal' | 'tel' | 'email';
    min?: number;
    max?: number;
    /** `'any'` allows any decimal — without it a number input treats 1200000.50 as invalid. */
    step?: number | 'any';

    /** Renders react-select inside this frame, for search / multi / creatable. */
    searchable?: boolean;

    /**
     * Shows a clear button once there is something to clear, and empties the field.
     *
     * Encoded here rather than exposed as a raw adornment slot, because every caller that
     * needed one would otherwise rebuild the same button — and they would disagree about
     * its size, its icon and whether it announces itself.
     */
    clearable?: boolean;

    id?: string;
    name?: string;
    autoFocus?: boolean;
    sx?: SxProps<Theme>;
    /** Escape hatch for a control this frame does not model. Replaces the input. */
    children?: React.ReactNode;
}

const FieldIcon = ({ name, color }: { name: string; color: string }) =>
    name.startsWith('bi-')
        ? <AppIcon name={name} className="fs-6" style={{ color, lineHeight: 1 }} />
        : <KTIcon iconName={name} className="fs-6" />;

/**
 * Everything the theme is allowed to touch: the outline, the radius, the focus ring.
 * Deliberately nothing that targets `.MuiInputLabel-root` — see the header note.
 */
const controlSx = (tone: string | undefined, invalid: boolean): SxProps<Theme> => ({
    '& .MuiOutlinedInput-root': {
        borderRadius: '10px',
        // A long option must ellipsize rather than widen the control past its container.
        '& .MuiSelect-select': {
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
        },
        ...(tone && !invalid && {
            '& .MuiOutlinedInput-notchedOutline': { borderColor: alpha(tone, 0.5) },
            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: tone },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: tone, borderWidth: 2 },
        }),
    },
    // Chrome/Safari draw their own number spinners at a size nothing else in the app uses.
    '& input[type=number]': { MozAppearance: 'textfield' },
    '& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button': {
        WebkitAppearance: 'none',
        margin: 0,
    },
});

export const WtField: React.FC<WtFieldProps> = ({
    label, labelPlacement = 'floating', value = '', onChange = () => {}, options, hint, error, required, disabled, placeholder,
    size = 'sm', fullWidth = true, minWidth, icon, prefix, tone,
    type = 'text', multiline, minRows = 3, inputMode, min, max, step,
    searchable, clearable, id, name, autoFocus, sx, children,
}) => {
    const reactId = useId();
    const fieldId = id ?? `wtf-${reactId}`;
    const messageId = `${fieldId}-msg`;
    const invalid = Boolean(error);
    const message = error || hint;
    const isSelect = Boolean(options);
    const hasValue = String(value ?? '').length > 0;

    // The tint says "this filter is set". Applying it to an empty control would say
    // "active" about nothing.
    const activeTone = tone && hasValue ? tone : undefined;

    /**
     * Shown only once there is something to clear — a permanently visible × on an empty box
     * is a control that does nothing, and the eye learns to ignore it.
     *
     * `type="button"` matters: inside a form, a button with no type submits it, so clearing
     * a search would save the record.
     */
    const clearButton = clearable && !disabled && hasValue ? (
        <Box
            component="button"
            type="button"
            aria-label="Clear"
            onClick={() => onChange('')}
            sx={{
                display: 'grid', placeItems: 'center', flexShrink: 0,
                width: 22, height: 22, p: 0,
                border: 0, borderRadius: '6px', cursor: 'pointer',
                bgcolor: 'transparent', color: 'text.secondary',
                '&:hover': { bgcolor: 'action.hover', color: 'text.primary' },
            }}
        >
            <KTIcon iconName="cross" className="fs-7" />
        </Box>
    ) : null;

    const iconAdornment = icon ? (
        <Box
            component="span"
            aria-hidden="true"
            sx={{ display: 'grid', placeItems: 'center', mr: 1, color: activeTone ?? 'text.secondary' }}
        >
            <FieldIcon name={icon} color={activeTone ?? 'currentColor'} />
        </Box>
    ) : null;

    // Not aria-hidden: unlike a decorative icon, the unit is part of what the value means.
    const prefixAdornment = prefix ? (
        <Box
            component="span"
            sx={{ mr: 0.75, fontSize: 13, fontWeight: 600, lineHeight: 1, whiteSpace: 'nowrap', color: 'text.secondary', userSelect: 'none' }}
        >
            {prefix}
        </Box>
    ) : null;

    const startAdornment = iconAdornment || prefixAdornment ? <>{iconAdornment}{prefixAdornment}</> : undefined;

    /**
     * react-select, and anything handed in as `children`, cannot cut a gap in a border. So
     * those two — and only those two — fall back to a label on its own line.
     */
    const selected = (options ?? []).find((o) => o.value === String(value ?? ''));
    const custom = children ?? (searchable ? (
        <WtSelect
            options={(options ?? []).map((o) => ({ value: o.value, label: o.label, isDisabled: o.disabled }))}
            value={selected ? { value: selected.value, label: selected.label } : null}
            onChange={(opt: { value: string } | null) => onChange(opt?.value ?? '')}
            placeholder={placeholder}
            isDisabled={disabled}
            error={invalid}
            size={size}
            ariaLabel={label}
            isSearchable
        />
    ) : null);

    if (custom || labelPlacement === 'above') {
        return (
            <Box sx={{ width: fullWidth ? '100%' : 'auto', minWidth, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                {label && (
                    <Typography
                        component="label"
                        htmlFor={fieldId}
                        // Styling IS allowed here: on this path there is no legend to disagree with.
                        sx={{
                            fontSize: 12,
                            fontWeight: 600,
                            lineHeight: 1.3,
                            color: invalid ? 'error.main' : 'text.secondary',
                            cursor: disabled ? 'default' : 'pointer',
                            userSelect: 'none',
                        }}
                    >
                        {label}
                        {required && <Box component="span" aria-hidden="true" sx={{ color: 'error.main', ml: 0.25 }}>*</Box>}
                    </Typography>
                )}

                {custom ?? (
                    <TextField
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
                        size={size === 'md' ? 'medium' : 'small'}
                        fullWidth
                        error={invalid}
                        InputProps={{ startAdornment, endAdornment: clearButton }}
                        inputProps={{ inputMode, min, max, step, 'aria-describedby': message ? messageId : undefined }}
                        sx={{ ...(controlSx(activeTone, invalid) as object), ...(sx as object) }}
                    />
                )}

                {message && (
                    <Typography
                        id={messageId}
                        role={invalid ? 'alert' : undefined}
                        sx={{ fontSize: 11.5, lineHeight: 1.4, color: invalid ? 'error.main' : 'text.secondary' }}
                    >
                        {message}
                    </Typography>
                )}
            </Box>
        );
    }

    return (
        <Box sx={{ width: fullWidth ? '100%' : 'auto', minWidth, display: 'flex' }}>
            <TextField
                id={fieldId}
                name={name}
                label={label}
                required={required}
                select={isSelect}
                value={isSelect ? String(value ?? '') : (value ?? '')}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                disabled={disabled}
                autoFocus={autoFocus}
                type={isSelect ? undefined : type}
                multiline={!isSelect && multiline}
                minRows={!isSelect && multiline ? minRows : undefined}
                size={size === 'md' ? 'medium' : 'small'}
                fullWidth
                error={invalid}
                helperText={message}
                // A select renders `displayEmpty`, so MUI cannot tell an empty value from an
                // unset one and would leave the label lying across the visible option text.
                // Pinning BOTH is required: `shrink` lifts the label, `notched` opens the gap
                // it lifts into, and they are separate props on separate elements.
                InputLabelProps={isSelect ? { shrink: true } : undefined}
                InputProps={{
                    startAdornment,
                    endAdornment: isSelect ? undefined : clearButton,
                    ...(isSelect ? { notched: true } : {}),
                }}
                inputProps={isSelect ? undefined : { inputMode, min, max, step }}
                // No `id` here, and no hand-written `aria-describedby` above. TextField
                // already mints `${id}-helper-text`, puts it on the helper text and points
                // the input at it — renaming one half silently unlinks the pair.
                FormHelperTextProps={invalid ? { role: 'alert' } : undefined}
                SelectProps={isSelect ? {
                    displayEmpty: true,
                    renderValue: (current: unknown) => {
                        const match = options?.find((o) => o.value === String(current ?? ''));
                        if (!match) {
                            return <Box component="span" sx={{ color: 'text.disabled' }}>{placeholder ?? ''}</Box>;
                        }
                        // The full value stays reachable on hover once it ellipsizes.
                        return <Box component="span" title={match.label}>{match.label}</Box>;
                    },
                    MenuProps: {
                        PaperProps: {
                            sx: {
                                borderRadius: '10px',
                                mt: 0.5,
                                // A long list must scroll inside the menu, not run off screen.
                                maxHeight: 320,
                                boxShadow: '0 8px 28px rgba(0,0,0,0.14)',
                            },
                        },
                    },
                } : undefined}
                sx={{ ...(controlSx(activeTone, invalid) as object), ...(sx as object) }}
            >
                {isSelect && options?.map((o) => (
                    <MenuItem key={o.value} value={o.value} disabled={o.disabled} sx={{ fontSize: 13 }}>
                        {o.label}
                    </MenuItem>
                ))}
            </TextField>
        </Box>
    );
};

export default WtField;
