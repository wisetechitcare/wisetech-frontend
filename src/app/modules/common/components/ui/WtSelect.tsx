import React, { useMemo } from 'react';
import Select, { components as RS } from 'react-select';
import CreatableSelect from 'react-select/creatable';
import { FixedSizeList as List } from 'react-window';
import { useTheme } from '@mui/material/styles';
import { LEGACY_UIKIT as T } from '@app/theme/tokens';
import {
    FLOATING_MENU_BEHAVIOUR,
    MENU_PORTAL_STYLE,
} from '@app/modules/common/inputs/selectMenuProps';

/**
 * WtSelect — the single select ENGINE for the app.
 *
 * This is deliberately not a tenth dropdown sitting beside the nine that already exist.
 * It is the engine those wrappers delegate to, so behaviour is fixed once:
 *
 *   • menu portalled to <body>            — escapes every `overflow: hidden` ancestor
 *   • `menuPlacement: auto`               — flips up when there is no room below
 *   • bounded, self-scrolling menu        — never runs off the viewport
 *   • z-index above MUI's dialog layer    — never paints behind its own modal
 *   • windowed rendering past a threshold — a 2,000-option list opens instantly
 *   • theme-aware, light and dark         — colours come from tokens, never hardcoded
 *   • keyboard + ARIA                     — inherited from react-select, not re-invented
 *
 * The wrappers above it (`DropdownInput` for Formik forms, `SelectInput` standalone,
 * `ToolbarFilterSelect` for toolbars) stay, because a form field, a toolbar filter and a
 * modal picker genuinely differ in layout and binding. What they must NOT do any more is
 * each re-derive menu behaviour and styling — that is what produced dropdowns that opened
 * downward into nothing, or rendered behind the dialog that owned them.
 */

export interface WtSelectOption {
    value: string;
    label: string;
    /** Optional avatar URL — rendered when `optionVariant="avatar"`. */
    avatar?: string | null;
    /** Optional colour swatch — rendered when `optionVariant="colour"`. */
    color?: string;
    /** Secondary line under the label. */
    description?: string;
    isDisabled?: boolean;
}

/** A grouped list renders a non-selectable header above its options. */
export interface WtSelectGroup {
    label: string;
    options: WtSelectOption[];
}

export interface WtSelectProps {
    options: Array<WtSelectOption | WtSelectGroup>;
    value?: WtSelectOption | WtSelectOption[] | null;
    onChange?: (value: any) => void;
    onBlur?: () => void;

    placeholder?: string;
    /** Screen-reader name. Required when the control has no visible <label>. */
    ariaLabel?: string;
    name?: string;

    isMulti?: boolean;
    isClearable?: boolean;
    isSearchable?: boolean;
    isDisabled?: boolean;
    /** Shows react-select's spinner and blocks interaction while options load. */
    isLoading?: boolean;
    /** Allows typing a value that is not in the list (returns `{ value, label, __isNew__ }`). */
    isCreatable?: boolean;

    /** Red border + `aria-invalid`, for a failed field validation. */
    error?: boolean;
    size?: 'sm' | 'md';
    /** How each row renders. `avatar`/`colour` expect that field on the option. */
    optionVariant?: 'plain' | 'avatar' | 'colour';

    /**
     * Tints the control (border, focus ring, chevron, value text) with the SELECTED
     * option's colour. For colour-coded pickers — status, leave type, deduction state —
     * where the chosen colour is the signal, not decoration.
     */
    accentColor?: string;
    /** Fires as the user types. Needed by call sites that re-rank options per keystroke. */
    onInputChange?: (value: string) => void;
    defaultInputValue?: string;
    /**
     * Per-call-site react-select component overrides, merged OVER the engine's own.
     * A documented extension point, not a styling escape hatch — visual decisions belong
     * in the engine so they apply everywhere.
     */
    components?: Record<string, any>;
    /** react-select's own per-option renderer, for rows the variants above do not cover. */
    formatOptionLabel?: (option: any, meta: any) => React.ReactNode;
    /**
     * Let a long option label WRAP instead of ellipsising.
     *
     * Turning this on also disables windowing, and that is not incidental: the windowed
     * list positions rows at a FIXED height, so a row allowed to grow to two lines would
     * overlap the one beneath it. Wrapping and windowing are mutually exclusive by
     * construction — use this for short, wordy lists, not for long ones.
     */
    allowOptionWrap?: boolean;
    /** Above this many options the menu switches to windowed rendering. */
    virtualizeThreshold?: number;
    filterOption?: any;
    menuPortalTarget?: HTMLElement | null;
    className?: string;
    classNamePrefix?: string;
}

const ROW_HEIGHT = 40;
const DEFAULT_VIRTUALIZE_THRESHOLD = 80;

/**
 * Windowed menu. react-select renders every option to the DOM, so a few thousand rows make
 * the menu slow to open and janky to scroll. Only the visible rows are mounted here.
 *
 * `maxHeight` is react-select's own resolved `maxMenuHeight`, so the windowed and plain
 * menus cap at exactly the same place.
 */
function VirtualizedMenuList(props: any) {
    const { options, children, maxHeight, getValue } = props;
    // react-select passes a single element (e.g. "No options") when there is nothing to list.
    if (!Array.isArray(children)) return children;

    const selected = (getValue && getValue()) || [];
    const selectedIndex = selected.length
        ? options.findIndex((o: any) => o.value === selected[0]?.value)
        : -1;
    const isFiltered = children.length !== options.length;
    // Open scrolled to the current selection, but never while the user is filtering —
    // jumping the list mid-keystroke hides the matches they are typing towards.
    const initialOffset = !isFiltered && selectedIndex > 0 ? selectedIndex * ROW_HEIGHT : 0;

    return (
        <List
            height={Math.min(maxHeight, children.length * ROW_HEIGHT)}
            itemCount={children.length}
            itemSize={ROW_HEIGHT}
            initialScrollOffset={initialOffset}
            width="100%"
        >
            {({ index, style }: any) => <div style={style}>{children[index]}</div>}
        </List>
    );
}

/** Row body shared by every variant: optional leading media, label, optional description. */
function OptionBody({ data }: { data: WtSelectOption }) {
    return (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            {data.color && (
                <span
                    aria-hidden
                    style={{
                        width: 12, height: 12, borderRadius: '50%',
                        backgroundColor: data.color, flexShrink: 0,
                    }}
                />
            )}
            {data.avatar && (
                <img
                    src={data.avatar}
                    alt=""
                    style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                />
            )}
            <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {data.label}
                </span>
                {data.description && (
                    <span style={{ display: 'block', fontSize: 11.5, opacity: 0.7, lineHeight: 1.3 }}>
                        {data.description}
                    </span>
                )}
            </span>
        </span>
    );
}

const RichOption = (props: any) => (
    <RS.Option {...props}><OptionBody data={props.data} /></RS.Option>
);
const RichSingleValue = (props: any) => (
    <RS.SingleValue {...props}><OptionBody data={props.data} /></RS.SingleValue>
);

export function WtSelect({
    options,
    value,
    onChange,
    onBlur,
    placeholder = 'Select…',
    ariaLabel,
    name,
    isMulti = false,
    isClearable = false,
    isSearchable = true,
    isDisabled = false,
    isLoading = false,
    isCreatable = false,
    error = false,
    size = 'md',
    optionVariant = 'plain',
    accentColor,
    onInputChange,
    defaultInputValue,
    formatOptionLabel,
    allowOptionWrap = false,
    components: componentOverrides,
    virtualizeThreshold = DEFAULT_VIRTUALIZE_THRESHOLD,
    filterOption,
    menuPortalTarget,
    className = 'react-select-styled',
    classNamePrefix = 'react-select',
}: WtSelectProps) {
    const dark = useTheme().palette.mode === 'dark';

    // Flatten only to count — grouped options nest their rows one level down.
    const flatCount = useMemo(
        () => options.reduce((n, o: any) => n + (Array.isArray(o?.options) ? o.options.length : 1), 0),
        [options],
    );

    const styles = useMemo(() => {
        const surface = dark ? '#161B22' : T.color.surface;
        const ink = dark ? '#E6EDF3' : T.color.ink;
        // Precedence: an error always outranks the accent tint. A field that is both
        // colour-coded and invalid must read as invalid.
        const line = error ? T.color.danger : accentColor || (dark ? '#30363D' : T.color.line);
        const minHeight = size === 'sm' ? 34 : 42;

        return {
            ...MENU_PORTAL_STYLE,
            control: (base: any, state: any) => ({
                ...base,
                minHeight,
                backgroundColor: state.isDisabled
                    ? (dark ? '#0D1117' : T.color.panelAlt)
                    : accentColor && !error
                        // 15% of the accent over the surface — readable in both themes
                        // without hand-picking a second colour per tone.
                        ? `color-mix(in srgb, ${accentColor} 15%, ${surface})`
                        : surface,
                borderColor: state.isFocused && !error ? (accentColor || T.color.brand) : line,
                borderRadius: 8,
                // A brand ring on focus, a danger ring on error — never both, and never the
                // default browser outline, which is invisible against the navy brand.
                boxShadow: state.isFocused
                    ? `0 0 0 3px ${error
                        ? 'rgba(178,58,48,0.16)'
                        : accentColor
                            ? `color-mix(in srgb, ${accentColor} 24%, transparent)`
                            : T.color.brandRing}`
                    : 'none',
                cursor: state.isDisabled ? 'not-allowed' : 'pointer',
                '&:hover': { borderColor: error ? T.color.danger : accentColor || T.color.brand },
            }),
            menu: (base: any) => ({ ...base, backgroundColor: surface, zIndex: 9999 }),
            option: (base: any, state: any) => ({
                ...base,
                ...(allowOptionWrap
                    ? { whiteSpace: 'normal', lineHeight: 1.4, minHeight: 40, display: 'flex', alignItems: 'center' }
                    : null),
                fontSize: size === 'sm' ? 12.5 : 13.5,
                color: state.isDisabled ? T.color.inkFaint : ink,
                backgroundColor: state.isSelected
                    ? T.color.brandSoft
                    : state.isFocused
                        ? (dark ? '#21262D' : T.color.panel)
                        : 'transparent',
                cursor: state.isDisabled ? 'not-allowed' : 'pointer',
                // Selected rows read as selected without relying on colour alone.
                fontWeight: state.isSelected ? 600 : 400,
            }),
            singleValue: (base: any) => ({ ...base, color: accentColor || ink }),
            dropdownIndicator: (base: any) => ({ ...base, color: accentColor || base.color }),
            input: (base: any) => ({ ...base, color: ink }),
            placeholder: (base: any) => ({ ...base, color: T.color.inkFaint }),
            multiValue: (base: any) => ({ ...base, backgroundColor: T.color.brandSoft, borderRadius: 6 }),
            multiValueLabel: (base: any) => ({ ...base, color: T.color.brand, fontWeight: 600 }),
            groupHeading: (base: any) => ({
                ...base,
                fontSize: 10.5, fontWeight: 700, letterSpacing: '0.6px',
                textTransform: 'uppercase', color: T.color.inkFaint,
            }),
        };
    }, [dark, error, size, accentColor, allowOptionWrap]);

    const Cmp: any = isCreatable ? CreatableSelect : Select;

    return (
        <Cmp
            {...FLOATING_MENU_BEHAVIOUR}
            {...(menuPortalTarget !== undefined ? { menuPortalTarget } : {})}
            name={name}
            aria-label={ariaLabel}
            aria-invalid={error || undefined}
            options={options}
            value={value ?? null}
            onChange={onChange}
            onBlur={onBlur}
            onInputChange={onInputChange}
            defaultInputValue={defaultInputValue}
            placeholder={placeholder}
            isMulti={isMulti}
            isClearable={isClearable}
            isSearchable={isSearchable}
            isDisabled={isDisabled || isLoading}
            isLoading={isLoading}
            filterOption={filterOption}
            formatOptionLabel={formatOptionLabel}
            className={className}
            classNamePrefix={classNamePrefix}
            styles={styles}
            components={{
                // Windowing is skipped when wrapping is on — see allowOptionWrap.
                ...(!allowOptionWrap && flatCount > virtualizeThreshold ? { MenuList: VirtualizedMenuList } : {}),
                ...(optionVariant !== 'plain'
                    ? { Option: RichOption, ...(isMulti ? {} : { SingleValue: RichSingleValue }) }
                    : {}),
                // Last, so a call site can replace a renderer the engine chose.
                ...(componentOverrides ?? {}),
            }}
            // Tell the user WHY the list is empty. A bare "No options" reads as broken when
            // the real cause is a filter that matched nothing.
            noOptionsMessage={({ inputValue }: { inputValue: string }) =>
                inputValue ? `No matches for "${inputValue}"` : 'No options available'}
            loadingMessage={() => 'Loading…'}
        />
    );
}

export default WtSelect;
