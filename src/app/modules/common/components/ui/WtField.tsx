import React, { useCallback, useId, useMemo, useRef, useState } from 'react';
import { Autocomplete, Avatar, Box, Chip, MenuItem, TextField, Typography, alpha } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import { KTIcon } from '@metronic/helpers';
import { AppIcon } from './AppIcon';
import { menuOptionSx } from './patterns';
import {
    DEFAULT_ADD_OPTION_LABEL,
    resolveWtAddOption,
    WtAddOptionButton,
    type WtAddOption,
} from './WtAddOption';
import { controlHeightSxFor } from './buttons';
import { menuGeometryInBoundary, menuPropsInside, useDropdownBoundary } from './dropdownBoundary';
import { wtFieldSelectChromePx, wtFieldSelectWidthPx } from './wtFieldSelectWidth';

export type { WtAddOption, WtAddOptionPlacement } from './WtAddOption';

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
 * DELEGATION, NOT REIMPLEMENTATION. Searchable and multi-select use MUI Autocomplete (floating label),
 * including avatar/description options for person pickers. Grouped / creatable / colour lists stay
 * on `WtSelect` via adapters. Dates stay `WtDateField` / `WtDateTimeField`.
 */

export type WtFieldSize = 'sm' | 'md';

export interface WtFieldOption {
    value: string;
    /** What the closed field shows (keep short — long strings crush a flex row). */
    label: string;
    disabled?: boolean;
    /** Hover / title text when the visible label is shortened. */
    title?: string;
    /** Optional longer text inside the open menu (e.g. branch · company). Falls back to `label`. */
    menuLabel?: string;
    /** Avatar URL — person pickers (Hiring Manager / Recruiter) on the searchable Autocomplete path. */
    avatar?: string | null;
    /** Secondary line under the label in the menu (and closed field when avatar is set). */
    description?: string;
}

/**
 * Single-select call sites pass `(v: string) => void` / `setState`; multi passes `string[]`.
 * Typed as `any` (not `string | string[]`) so under `strictFunctionTypes` + `React.FC` remapping
 * we do not reject every `Dispatch<SetStateAction<string>>` or force a cast at each caller.
 * Runtime always emits `string` or `string[]` from this component.
 */
export type WtFieldChangeHandler = (value: any) => void;

export interface WtFieldProps {
    /** Omit only when a visible label sits elsewhere. */
    label?: string;
    /**
     * The accessible name for a field with NO visible `label` — a toolbar filter whose meaning
     * comes from its icon, or a rating cell whose criterion is printed in the row beside it.
     *
     * Without this, dropping `label` leaves the control with no name at all: a screen reader
     * announces "combo box", and a test can only reach it by index. Ignored when `label` is set,
     * because MUI already names the input from the label it renders.
     */
    ariaLabel?: string;
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
     *
     * Multi-select (`multiple`) passes `string[]`.
     */
    value?: string | number | string[];
    onChange?: WtFieldChangeHandler;
    onBlur?: React.FocusEventHandler<HTMLInputElement | HTMLTextAreaElement>;

    /** Present ⇒ this is a select. Absent ⇒ a text/number input. */
    options?: WtFieldOption[];

    /** Quiet guidance under the field. Replaced by `error` when that is set. */
    hint?: React.ReactNode;
    /** A message. Non-empty turns the control red and sets aria-invalid. */
    error?: string;
    required?: boolean;
    disabled?: boolean;
    readOnly?: boolean;
    placeholder?: string;

    /**
     * `'sm'` (default) = mid-density (40px) — toolbars, lists, most forms.
     * `'md'` = spacious (44px) — opt-in for dense-content dialog forms.
     */
    size?: WtFieldSize;
    fullWidth?: boolean;
    /**
     * Plain select only: size the control and its menu to the widest option (full label visible).
     * Defaults to `true` when `fullWidth={false}` — toolbar / compact filters. Set `false` to keep
     * `auto` width with ellipsis. Full-width form selects are unchanged.
     */
    fitContent?: boolean;
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
    /** Starting height, in lines. The box grows with the text up to `maxRows`, then scrolls. */
    minRows?: number;
    maxRows?: number;
    inputMode?: 'text' | 'numeric' | 'decimal' | 'tel' | 'email';
    min?: number;
    max?: number;
    maxLength?: number;
    /** `'any'` allows any decimal — without it a number input treats 1200000.50 as invalid. */
    step?: number | 'any';

    /**
     * Type-to-search for a long single-select (needs `options`). Same floating label, height and outline
     * as a plain select, so a searchable field and a plain one can share a row.
     */
    searchable?: boolean;

    /**
     * Multi-select with chips — MUI Autocomplete, same floating Sandwich label as single-select.
     * Prefer this over wrapping `WtSelect` in `children` (which forces a label-above look).
     * Grouped / creatable / avatar lists still use `WtSelect` via an adapter.
     */
    multiple?: boolean;
    /**
     * Multi-select only: max chips shown before a “+N” overflow chip.
     * Keeps dense forms (dialogs, policy panels) from growing into a chip wall.
     */
    limitTags?: number;

    /**
     * Canonical “+ Add …” action — one prop for every labelled select.
     * Prefer this over inventing a button beside the field.
     * @see WtAddOption
     */
    addOption?: WtAddOption;
    /** @deprecated Use `addOption={{ onAdd, label }}` */
    onAddOption?: () => void;
    /** @deprecated Use `addOption={{ onAdd, label }}` */
    addOptionLabel?: string;

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
    /**
     * LAYOUT for the field as a whole — `flex`, `minWidth`, margins — applied to its outer frame.
     * It used to reach only the input INSIDE a full-width frame, so `sx={{ flex: 1 }}` did nothing
     * in a row: two fields claimed 100% each and a neighbouring date field was squeezed to a sliver.
     * Descendant selectors (`'& .MuiOutlinedInput-root'`) still style the control from here.
     */
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
const controlSx = (
    tone: string | undefined,
    invalid: boolean,
    density: WtFieldSize,
    /** Content-sized toolbar selects show the full label — do not force outer ellipsis. */
    contentSized = false,
    /** Multiline textareas size to `minRows`. A fixed control height clips them to one line. */
    lockHeight = true,
): SxProps<Theme> => {
    const height = lockHeight ? controlHeightSxFor(density) : null;
    return {
        ...(height ?? {}),
        '& .MuiOutlinedInput-root': {
            ...(height
                ? height['& .MuiOutlinedInput-root']
                : { height: 'auto', alignItems: 'flex-start' }),
            borderRadius: '10px',
            // A long option must ellipsize rather than widen the control past its container —
            // unless the kit sized the control to the content (`fitContent` / `fullWidth={false}`).
            '& .MuiSelect-select': {
                ...(height ? height['& .MuiSelect-select'] : {}),
                ...(contentSized
                    ? { minWidth: 0, overflow: 'visible', textOverflow: 'clip', whiteSpace: 'nowrap' }
                    : {
                        minWidth: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }),
            },
            '& .MuiOutlinedInput-input': height
                ? { ...height['& .MuiOutlinedInput-input'] }
                : { height: 'auto', lineHeight: 1.5, boxSizing: 'border-box' },
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
    };
};

const ADD_OPTION_VALUE = '__wt_add__';

export const WtField: React.FC<WtFieldProps> = ({
    label, ariaLabel, labelPlacement = 'floating', value = '', onChange = () => {}, options, hint, error, required, disabled, readOnly, placeholder,
    size = 'sm', fullWidth = true, fitContent, minWidth, icon, prefix, tone,
    type = 'text', multiline, minRows = 3, maxRows, inputMode, min, max, maxLength, step, onBlur,
    searchable, multiple, limitTags, addOption, onAddOption, addOptionLabel, clearable, id, name, autoFocus, sx, children,
}) => {
    const reactId = useId();
    const fieldId = id ?? `wtf-${reactId}`;
    const messageId = `${fieldId}-msg`;
    const invalid = Boolean(error);
    const message = error || hint;
    const hasValue = Array.isArray(value)
        ? value.length > 0
        : String(value ?? '').length > 0;
    const isSelect = Boolean(options);
    const plainSelect = isSelect && !searchable && !multiple && !children;
    const contentSized = plainSelect && (fitContent ?? !fullWidth);
    const optionLabels = useMemo(
        () => (options ?? []).map((o) => o.menuLabel ?? o.label),
        [options],
    );
    const contentWidthPx = useMemo(() => {
        if (!contentSized) return undefined;
        return wtFieldSelectWidthPx(optionLabels, {
            chromePx: wtFieldSelectChromePx({
                hasIcon: !!icon,
                prefix,
                clearable: !!clearable && hasValue,
                size,
            }),
            size,
        });
    }, [contentSized, optionLabels, icon, prefix, clearable, hasValue, size]);

    // Full-width selects in dialogs: menu width = field width on open (see MenuProps below).
    const selectFrameRef = useRef<HTMLDivElement | null>(null);
    const [selectMenuWidth, setSelectMenuWidth] = useState<number | undefined>(undefined);
    const [selectMenuGeom, setSelectMenuGeom] = useState<{ maxHeight: number; vertical: 'top' | 'bottom' }>({
        maxHeight: 320,
        vertical: 'bottom',
    });
    const { ref: boundaryRef, boundary, slotProps: autocompleteBoundary } = useDropdownBoundary();
    const setSelectFrameRef = useCallback(
        (node: HTMLDivElement | null) => {
            selectFrameRef.current = node;
            boundaryRef(node);
        },
        [boundaryRef],
    );
    // MUI size drives BOTH input and floating-label metrics (and the notch). Never restyle
    // `.MuiInputLabel-root` by hand — that is how labels land on the border line.
    const muiSize = size === 'sm' ? 'small' : 'medium';
    const aboveLabelFs = size === 'sm' ? 12 : 13.5;
    const messageFs = size === 'sm' ? 11.5 : 12.5;
    const resolvedAdd = resolveWtAddOption(addOption, onAddOption, addOptionLabel);
    const addInMenu = resolvedAdd?.placement !== 'label' ? resolvedAdd : undefined;
    const addOnLabel = resolvedAdd?.placement === 'label' ? resolvedAdd : undefined;

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
     * The outer frame carries the caller's layout `sx`. `minWidth: 0` lets a field shrink in a row
     * instead of forcing its neighbours out; the caller's own `minWidth` still wins.
     */
    const frameSx = [
        {
            width: fullWidth ? '100%' : contentWidthPx ?? 'auto',
            minWidth: minWidth ?? (contentWidthPx ? undefined : 0),
            ...(contentWidthPx ? { maxWidth: contentWidthPx, flexShrink: 0 } : {}),
        },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
    ] as SxProps<Theme>;

    const selected = (options ?? []).find((o) => o.value === String(value ?? ''));
    const selectedMulti = (options ?? []).filter((o) =>
        Array.isArray(value) && value.includes(o.value),
    );

    /**
     * Autocomplete (single searchable or multi) keeps the SAME floating label in the border as
     * every other WtField — react-select cannot cut that gap and looks “legacy” beside Sandwich.
     */
    // `addOption` with menu placement needs Autocomplete so the “+ Add” row can live in the list.
    if ((searchable || multiple || Boolean(addInMenu)) && options && !children) {
        const addLabel = addInMenu?.label ?? DEFAULT_ADD_OPTION_LABEL;
        const listOptions: WtFieldOption[] = addInMenu
            ? [{ value: ADD_OPTION_VALUE, label: `+ ${addLabel}` }, ...options]
            : options;

        return (
            <Box ref={boundaryRef} sx={frameSx}>
                {addOnLabel && (
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 0.5 }}>
                        <WtAddOptionButton
                            label={addOnLabel.label}
                            onAdd={addOnLabel.onAdd}
                            disabled={disabled}
                        />
                    </Box>
                )}
                <Autocomplete
                    id={fieldId}
                    multiple={multiple}
                    limitTags={multiple ? (limitTags ?? -1) : undefined}
                    options={listOptions}
                    value={multiple ? selectedMulti : (selected ?? null)}
                    onChange={(_e, opt) => {
                        if (multiple) {
                            const list = (opt as WtFieldOption[]) || [];
                            if (list.some((o) => o.value === ADD_OPTION_VALUE)) {
                                addInMenu?.onAdd();
                                onChange(list.filter((o) => o.value !== ADD_OPTION_VALUE).map((o) => o.value));
                                return;
                            }
                            onChange(list.map((o) => o.value));
                            return;
                        }
                        const one = opt as WtFieldOption | null;
                        if (one?.value === ADD_OPTION_VALUE) {
                            addInMenu?.onAdd();
                            return;
                        }
                        onChange(one?.value ?? '');
                    }}
                    getOptionLabel={(o) => o.label}
                    getOptionDisabled={(o) => Boolean(o.disabled)}
                    isOptionEqualToValue={(o, v) => o.value === v.value}
                    disabled={disabled}
                    disableClearable={!clearable}
                    autoHighlight
                    size={muiSize}
                    fullWidth
                    renderTags={multiple ? (tagValue, getTagProps) => {
                        // Custom renderTags skips MUI's limitTags — apply it ourselves so
                        // dense forms stay one line instead of growing into a chip wall.
                        const cap = typeof limitTags === 'number' && limitTags >= 0 ? limitTags : tagValue.length;
                        const visible = tagValue.slice(0, cap);
                        const hidden = tagValue.length - visible.length;
                        const chipSx = {
                            fontWeight: 600,
                            borderRadius: '6px',
                            maxWidth: 140,
                            bgcolor: (t: Theme) => alpha(t.palette.primary.main, t.palette.mode === 'dark' ? 0.28 : 0.12),
                            color: (t: Theme) => (t.palette.mode === 'dark' ? t.palette.primary.light : t.palette.primary.dark),
                            '& .MuiChip-deleteIcon': { color: 'inherit', opacity: 0.72 },
                            '& .MuiChip-avatar': { width: 18, height: 18, ml: '4px' },
                            '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' },
                        };
                        return [
                            ...visible.map((option, index) => {
                                const { key, ...tagProps } = getTagProps({ index });
                                return (
                                    <Chip
                                        key={key}
                                        {...tagProps}
                                        size="small"
                                        label={option.label}
                                        avatar={option.avatar ? <Avatar src={option.avatar} alt="" /> : undefined}
                                        sx={chipSx}
                                    />
                                );
                            }),
                            ...(hidden > 0
                                ? [<Chip key="__more" size="small" label={`+${hidden}`} sx={chipSx} />]
                                : []),
                        ];
                    } : undefined}
                    renderOption={(props, option) => {
                        const { key, ...rest } = props as React.HTMLAttributes<HTMLLIElement> & { key?: string };
                        const isAdd = option.value === ADD_OPTION_VALUE;
                        const rich = !isAdd && (option.avatar || option.description);
                        return (
                            <Box
                                component="li"
                                key={key ?? option.value}
                                {...rest}
                                sx={{
                                    fontSize: 13.5,
                                    fontWeight: isAdd ? 600 : 400,
                                    color: isAdd ? 'primary.main' : 'inherit',
                                    borderBottom: isAdd ? '1px solid' : undefined,
                                    borderColor: isAdd ? 'divider' : undefined,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                    minWidth: 0,
                                }}
                            >
                                {option.avatar ? (
                                    <Box
                                        component="img"
                                        src={option.avatar}
                                        alt=""
                                        sx={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                                    />
                                ) : null}
                                {rich ? (
                                    <Box sx={{ minWidth: 0, flex: 1 }}>
                                        <Box sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {option.menuLabel ?? option.label}
                                        </Box>
                                        {option.description ? (
                                            <Box sx={{ fontSize: 11.5, color: 'text.secondary', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {option.description}
                                            </Box>
                                        ) : null}
                                    </Box>
                                ) : (
                                    option.label
                                )}
                            </Box>
                        );
                    }}
                    // Stay inside the dialog scroll port (useDropdownBoundary) and above nested
                    // modals. Offset keeps an upward list clear of the floating label.
                    slotProps={{
                        popper: {
                            ...autocompleteBoundary.popper,
                            sx: { zIndex: 1350, ...((autocompleteBoundary.popper as { sx?: object }).sx ?? {}) },
                            modifiers: [
                                ...(((autocompleteBoundary.popper as { modifiers?: object[] }).modifiers) ?? []),
                                { name: 'offset', options: { offset: [0, 10] } },
                            ],
                        },
                        paper: { sx: [{ width: '100%', maxWidth: '100%', maxHeight: 320 }, menuOptionSx] },
                    }}
                    renderInput={(params) => {
                        const avatarStart = !multiple && selected?.avatar ? (
                            <Box
                                component="img"
                                src={selected.avatar}
                                alt=""
                                sx={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover', mr: 0.75, flexShrink: 0 }}
                            />
                        ) : null;
                        return (
                            <TextField
                                {...params}
                                name={name}
                                label={label}
                                required={required}
                                placeholder={placeholder}
                                autoFocus={autoFocus}
                                error={invalid}
                                helperText={message}
                                FormHelperTextProps={invalid ? { role: 'alert' } : undefined}
                                InputLabelProps={{ ...params.InputLabelProps, shrink: true }}
                                InputProps={{
                                    ...params.InputProps,
                                    notched: true,
                                    startAdornment: <>{startAdornment}{avatarStart}{params.InputProps.startAdornment}</>,
                                }}
                                sx={controlSx(activeTone, invalid, size)}
                            />
                        );
                    }}
                />
            </Box>
        );
    }

    /** Anything handed in as `children` cannot cut a gap in a border, so it takes a label on its own line. */
    const custom = children ?? null;

    if (custom || labelPlacement === 'above') {
        return (
            <Box sx={[{ display: 'flex', flexDirection: 'column', gap: 0.5 }, ...(frameSx as object[])] as SxProps<Theme>}>
                {(label || addOnLabel) && (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                        {label ? (
                            <Typography
                                component="label"
                                htmlFor={fieldId}
                                // Styling IS allowed here: on this path there is no legend to disagree with.
                                sx={{
                                    fontSize: aboveLabelFs,
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
                        ) : <span />}
                        {addOnLabel && (
                            <WtAddOptionButton
                                label={addOnLabel.label}
                                onAdd={addOnLabel.onAdd}
                                disabled={disabled}
                            />
                        )}
                    </Box>
                )}

                {custom ?? (
                    <TextField
                        id={fieldId}
                        name={name}
                        value={value ?? ''}
                        onChange={(e) => onChange(e.target.value)}
                        onBlur={onBlur}
                        placeholder={placeholder}
                        disabled={disabled}
                        autoFocus={autoFocus}
                        type={type}
                        multiline={multiline}
                        minRows={multiline ? minRows : undefined}
                        maxRows={multiline ? maxRows : undefined}
                        size={muiSize}
                        fullWidth
                        error={invalid}
                        InputProps={{ readOnly, startAdornment, endAdornment: clearButton }}
                        inputProps={{ inputMode, min, max, maxLength, step, 'aria-label': label ? undefined : ariaLabel, 'aria-describedby': message ? messageId : undefined }}
                        sx={controlSx(activeTone, invalid, size, false, !multiline)}
                    />
                )}

                {message && (
                    <Typography
                        id={messageId}
                        role={invalid ? 'alert' : undefined}
                        sx={{ fontSize: messageFs, lineHeight: 1.4, color: invalid ? 'error.main' : 'text.secondary' }}
                    >
                        {message}
                    </Typography>
                )}
            </Box>
        );
    }

    return (
        <Box
            ref={setSelectFrameRef}
            sx={[{ display: 'flex', flexDirection: 'column', gap: 0.5 }, ...(frameSx as object[])] as SxProps<Theme>}
        >
            {addOnLabel && (
                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <WtAddOptionButton
                        label={addOnLabel.label}
                        onAdd={addOnLabel.onAdd}
                        disabled={disabled}
                    />
                </Box>
            )}
            <TextField
                id={fieldId}
                name={name}
                label={label}
                required={required}
                select={isSelect}
                value={isSelect ? String(value ?? '') : (value ?? '')}
                onChange={(e) => onChange(e.target.value)}
                onBlur={onBlur}
                placeholder={placeholder}
                disabled={disabled}
                InputProps={{ readOnly, startAdornment, endAdornment: isSelect ? undefined : clearButton, notched: true }}
                autoFocus={autoFocus}
                type={isSelect ? undefined : type}
                multiline={!isSelect && multiline}
                minRows={!isSelect && multiline ? minRows : undefined}
                maxRows={!isSelect && multiline ? maxRows : undefined}
                size={muiSize}
                fullWidth
                error={invalid}
                helperText={message}
                // Sandwich Leave look: label always notched into the border (even when empty).
                // Selects need it for `displayEmpty`; text fields need it so Allergies /
                // Name do not look like bare placeholders sitting inside the box.
                InputLabelProps={{ shrink: true }}
                inputProps={isSelect ? { 'aria-label': label ? undefined : ariaLabel } : { inputMode, min, max, maxLength, step, 'aria-label': label ? undefined : ariaLabel }}
                // No `id` here, and no hand-written `aria-describedby` above. TextField
                // already mints `${id}-helper-text`, puts it on the helper text and points
                // the input at it — renaming one half silently unlinks the pair.
                FormHelperTextProps={invalid ? { role: 'alert' } : undefined}
                SelectProps={isSelect ? {
                    displayEmpty: true,
                    onOpen: () => {
                        const frame = selectFrameRef.current;
                        if (!frame) return;
                        const rect = frame.getBoundingClientRect();
                        if (!contentSized) {
                            setSelectMenuWidth(Math.round(rect.width));
                        }
                        const geo = menuGeometryInBoundary(
                            rect,
                            boundary?.getBoundingClientRect() ?? null,
                            320,
                        );
                        setSelectMenuGeom({
                            maxHeight: geo.maxMenuHeight,
                            vertical: geo.menuPlacement,
                        });
                    },
                    renderValue: (current: unknown) => {
                        const match = options?.find((o) => o.value === String(current ?? ''));
                        if (!match) {
                            // Same left + vertically-centered look as Autocomplete placeholders
                            // (EmployeePicker / Recruiter). Vertical centering comes from
                            // controlHeightSxFor on `.MuiSelect-select`.
                            return <Box component="span" sx={{ color: 'text.disabled' }}>{placeholder ?? ''}</Box>;
                        }
                        if (contentSized) {
                            return <Box component="span">{match.label}</Box>;
                        }
                        return (
                            <Box
                                component="span"
                                title={match.title ?? match.label}
                                sx={{
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    display: 'block',
                                    minWidth: 0,
                                    flex: 1,
                                }}
                            >
                                {match.label}
                            </Box>
                        );
                    },
                    MenuProps: {
                        ...menuPropsInside(boundary, {
                            maxHeight: selectMenuGeom.maxHeight,
                            anchorOriginVertical: selectMenuGeom.vertical,
                        }),
                        PaperProps: {
                            // Same accent selected/hover pills as searchable Autocomplete
                            // (`menuOptionSx`) — without this, MUI's default action.selected
                            // wash looks gray next to the navy focus ring (Sandwich Category).
                            sx: [
                                {
                                    borderRadius: '10px',
                                    mt: 0.5,
                                    maxHeight: selectMenuGeom.maxHeight,
                                    boxShadow: '0 8px 28px rgba(0,0,0,0.14)',
                                    ...(contentWidthPx
                                        ? { width: contentWidthPx, maxWidth: contentWidthPx }
                                        : selectMenuWidth
                                            ? { width: selectMenuWidth, maxWidth: selectMenuWidth }
                                            : { maxWidth: 'min(100vw - 32px, 360px)' }),
                                },
                                menuOptionSx,
                            ],
                        },
                    },
                } : undefined}
                sx={controlSx(activeTone, invalid, size, contentSized, !multiline)}
            >
                {isSelect && options?.map((o) => (
                    <MenuItem
                        key={o.value}
                        value={o.value}
                        disabled={o.disabled}
                        title={o.title ?? o.menuLabel ?? o.label}
                        sx={contentSized ? undefined : { overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}
                    >
                        {o.menuLabel ?? o.label}
                    </MenuItem>
                ))}
            </TextField>
        </Box>
    );
};

export default WtField;
