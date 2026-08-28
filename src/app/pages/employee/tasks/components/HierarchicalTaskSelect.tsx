import React, { useContext, useMemo, useState } from 'react';
import { Tooltip } from '@mui/material';
import Select, { components, MenuProps, OptionProps, SingleValueProps } from 'react-select';
import { useField } from 'formik';
import HighlightErrors from '@app/modules/errors/components/HighlightErrors';
import {
    PATH_SEPARATOR,
    PresetTaskLike,
    flattenPresetTasks,
} from '@utils/presetTaskHierarchy';
import { AppIcon } from '@app/modules/common/components/ui/AppIcon';
import { FLOATING_MENU_BEHAVIOUR } from "@app/modules/common/inputs/selectMenuProps";

/**
 * HierarchicalTaskSelect
 * ------------------------------------------------------------------
 * ONE searchable picker over the whole preset-task tree, at any depth — the
 * replacement for the old fixed "Main Task" + "Sub Task" pair, which could only ever
 * describe two levels and would have needed a new dropdown for every level below.
 *
 * The menu is a DRILL-DOWN, not an expanded tree: it shows one level at a time, so a
 * deep configuration stays readable instead of dumping every node (and a breadcrumb per
 * row) into one long list. A row with children shows a chevron and navigates into that
 * level; the breadcrumb lives once, in the menu header.
 *
 * Typing switches to a GLOBAL search across every level, because a user who knows the
 * leaf name should never have to walk the tree to reach it. Search rows are the only
 * place a per-row path appears — there it is what disambiguates two nodes of the same
 * name in different branches.
 *
 * The value is the node's ID. The consuming form stores the node's OWN name as the task
 * name; the path is only ever derived for display.
 */

const ACCENT = '#1E3A8A';
const MUTED = '#8893a0';
const BORDER = '#e9ecef';

export interface HierarchicalTaskOption {
    value: string;
    /** The node's own name — what a selected task is called. */
    label: string;
    /** Ancestors, root first. Empty for a root node. */
    parentPath: string[];
    depth: number;
    /** Ancestors + own name, pre-joined for searching. */
    searchText: string;
    /** Parent node id — the level this option belongs to. */
    parentId: string | null;
    /** Whether this node has children AMONG THE OFFERED OPTIONS (excluded ones don't count). */
    hasChildren: boolean;
    isDisabled?: boolean;
}

/**
 * Builds picker options from the flat preset list, in tree order.
 *
 * `hasChildren` is derived from the surviving options rather than the raw rows, so a
 * branch whose children were all excluded (the Configure parent picker excludes a node's
 * own subtree) is correctly offered as a leaf instead of navigating into an empty level.
 */
export const buildTaskOptions = <T extends PresetTaskLike>(
    presetTasks: T[],
    excludeIds?: Set<string>
): HierarchicalTaskOption[] => {
    const nodes = flattenPresetTasks(presetTasks).filter((node) => !excludeIds?.has(node.id));
    const parentsWithChildren = new Set(nodes.map((n) => n.parentId).filter(Boolean) as string[]);

    return nodes.map((node) => ({
        value: node.id,
        label: node.name,
        parentPath: node.path.slice(0, -1),
        depth: node.depth,
        searchText: node.path.join(' ').toLowerCase(),
        parentId: node.parentId,
        hasChildren: parentsWithChildren.has(node.id),
    }));
};

/** What the custom menu/option renderers need from the component, passed via selectProps. */
interface DrillState {
    searching: boolean;
    /** Ancestors + the current node, root first. Empty at the top level. */
    path: string[];
    goUp: () => void;
    selectCurrent: () => void;
}

/**
 * The custom Menu/Option renderers need the drill state, but react-select types its
 * props as a closed set — an extra prop on <Select> only reaches them untyped, via
 * `selectProps`. Context carries it instead: the renderers stay module-level (so
 * react-select never remounts the menu mid-keystroke) and stay fully typed. React
 * portals preserve context, so this works through `menuPortalTarget` too.
 */
const DrillContext = React.createContext<DrillState>({
    searching: false,
    path: [],
    goUp: () => {},
    selectCurrent: () => {},
});

/**
 * Menu header: where you are, how to get back, and how to pick the node you're inside.
 *
 * That last part matters — a node with children is navigated into rather than selected,
 * so without this the parents of the tree could never be chosen at all.
 */
const TaskMenu = (props: MenuProps<HierarchicalTaskOption, false>) => {
    const drill = useContext(DrillContext);
    const [headerHover, setHeaderHover] = useState(false);
    const showHeader = !drill.searching && drill.path.length > 0;
    const currentName = drill.path[drill.path.length - 1] || '';

    return (
        <components.Menu {...props}>
            {showHeader && (
                // The WHOLE header row picks the node you are inside — the same target
                // size as any option row, rather than a small button to aim at. The back
                // arrow sits inside it and stops the click from bubbling.
                <div
                    role="button"
                    tabIndex={0}
                    aria-label={`Select "${currentName}"`}
                    title={`Select "${currentName}"`}
                    onClick={drill.selectCurrent}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); drill.selectCurrent(); }
                    }}
                    onMouseEnter={() => setHeaderHover(true)}
                    onMouseLeave={() => setHeaderHover(false)}
                    // Keep focus in the control: a mousedown inside the menu would blur the
                    // input and close the menu before the click ever lands.
                    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 10px',
                        borderBottom: `1px solid ${BORDER}`,
                        background: headerHover ? '#f3f5fb' : '#fff',
                        position: 'sticky',
                        top: 0,
                        zIndex: 1,
                        borderTopLeftRadius: 4,
                        borderTopRightRadius: 4,
                        cursor: 'pointer',
                        transition: 'background .15s ease',
                    }}
                >
                    <Tooltip title="Back" arrow>
                    <button
                        type="button"
                        // Stop both, or going back would also select the node being left.
                        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        onClick={(e) => { e.stopPropagation(); drill.goUp(); }}
                        aria-label="Back to the previous level"
                        style={{
                            border: `1px solid ${BORDER}`,
                            background: '#fff',
                            borderRadius: 6,
                            width: 24,
                            height: 24,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: ACCENT,
                            flexShrink: 0,
                            lineHeight: 1,
                            padding: 0,
                        }}
                    >
                        <AppIcon name="bi-arrow-left" className="fs-8" />
                    </button>
                    </Tooltip>

                    <span
                        style={{
                            fontSize: 11.5,
                            color: MUTED,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            flex: 1,
                            minWidth: 0,
                        }}
                        title={drill.path.join(PATH_SEPARATOR)}
                    >
                        {drill.path.join(PATH_SEPARATOR)}
                    </span>

                    {/* Not a control — a hint that the row itself is the target. */}
                    <span
                        style={{
                            fontSize: 11,
                            fontWeight: 500,
                            color: headerHover ? ACCENT : MUTED,
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                            transition: 'color .15s ease',
                        }}
                    >
                        Select this task
                    </span>
                </div>
            )}
            {props.children}
        </components.Menu>
    );
};

/** One level's row: the node's own name, plus a chevron when it leads somewhere. */
const TaskOption = (props: OptionProps<HierarchicalTaskOption, false>) => {
    const { label, parentPath, hasChildren } = props.data;
    const drill = useContext(DrillContext);

    return (
        <components.Option {...props}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                        style={{
                            fontSize: 13,
                            fontWeight: 500,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {label}
                    </div>
                    {/* Only search results carry a path — it is what tells two same-named
                        nodes apart. Browsing a level, the header already says where you are. */}
                    {drill.searching && parentPath.length > 0 && (
                        <div
                            style={{
                                fontSize: 11,
                                color: MUTED,
                                marginTop: 1,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                            }}
                            title={parentPath.join(PATH_SEPARATOR)}
                        >
                            {parentPath.join(PATH_SEPARATOR)}
                        </div>
                    )}
                </div>
                {!drill.searching && hasChildren && (
                    <AppIcon name="bi-chevron-right" className="fs-9" color={MUTED} style={{ flexShrink: 0 }} />
                )}
            </div>
        </components.Option>
    );
};

/** Closed control: the task's own name, with its ancestors smaller and muted beneath. */
const TaskSingleValue = (props: SingleValueProps<HierarchicalTaskOption, false>) => {
    const { label, parentPath } = props.data;
    return (
        <components.SingleValue {...props}>
            <div style={{ minWidth: 0 }}>
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {label}
                </div>
                {parentPath.length > 0 && (
                    <div
                        style={{
                            fontSize: 11,
                            color: MUTED,
                            lineHeight: 1.3,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}
                        title={parentPath.join(PATH_SEPARATOR)}
                    >
                        {parentPath.join(PATH_SEPARATOR)}
                    </div>
                )}
            </div>
        </components.SingleValue>
    );
};

// Hoisted so the component identities stay stable across renders — react-select would
// otherwise remount the menu on every keystroke and lose focus.
const SELECT_COMPONENTS = { Menu: TaskMenu, Option: TaskOption, SingleValue: TaskSingleValue };

interface Props {
    formikField: string;
    inputLabel: React.ReactNode;
    options: HierarchicalTaskOption[];
    isRequired?: boolean;
    placeholder?: string;
    disabled?: boolean;
    /** Fires with the whole option, so the caller can also store the node's name. */
    onChange?: (option: HierarchicalTaskOption | null) => void;
    /** Rendered under the field — used to show the selected node's full hierarchy. */
    helpText?: React.ReactNode;
}

const HierarchicalTaskSelect: React.FC<Props> = ({
    formikField,
    inputLabel,
    options,
    isRequired = false,
    placeholder = 'Search and select a task…',
    disabled = false,
    onChange,
    helpText,
}) => {
    const [field, meta, helpers] = useField(formikField);
    const hasError = !!(meta.touched && meta.error);

    // The node currently being browsed; null = the top level.
    const [level, setLevel] = useState<HierarchicalTaskOption | null>(null);
    const [inputValue, setInputValue] = useState('');
    const [menuOpen, setMenuOpen] = useState(false);

    const searching = inputValue.trim().length > 0;
    const byId = useMemo(() => new Map(options.map((o) => [o.value, o])), [options]);
    const selected = useMemo(() => byId.get(field.value) || null, [byId, field.value]);

    // One level at a time while browsing; the whole tree while searching. A node whose
    // parent is not among the options (promoted orphan) belongs to the top level.
    const visibleOptions = useMemo(() => {
        if (searching) return options;
        const parentId = level?.value ?? null;
        return options.filter((o) => (parentId
            ? o.parentId === parentId
            : !o.parentId || !byId.has(o.parentId)));
    }, [options, level, searching, byId]);

    const goUp = () => setLevel(level?.parentId ? byId.get(level.parentId) || null : null);

    const commit = (option: HierarchicalTaskOption | null) => {
        // Mirrors DropdownInput: set the value (which validates against the patched
        // values), then mark touched WITHOUT re-validating the stale snapshot.
        helpers.setValue(option?.value || '');
        helpers.setTouched(true, false);
        onChange?.(option);
        setInputValue('');
        setMenuOpen(false);
    };

    const handleChange = (option: HierarchicalTaskOption | null) => {
        // Browsing: a row with children navigates rather than selects. Searching: every
        // hit is a real choice, children or not.
        if (option && !searching && option.hasChildren) {
            setLevel(option);
            return;
        }
        commit(option);
    };

    const drill: DrillState = {
        searching,
        path: level ? [...level.parentPath, level.label] : [],
        goUp,
        selectCurrent: () => level && commit(level),
    };

    return (
        <div className="d-flex flex-column fv-row">
            <div className="d-flex flex-row justify-content-between align-items-center gap-2 mb-2">
                <label className={`d-flex align-items-center fs-6 form-label mb-0 ${isRequired ? 'required' : ''}`}>
                    {inputLabel}
                </label>
            </div>

            <DrillContext.Provider value={drill}>
            <Select<HierarchicalTaskOption, false>
                {...FLOATING_MENU_BEHAVIOUR}
                name={formikField}
                options={visibleOptions}
                value={selected}
                onChange={handleChange}
                inputValue={inputValue}
                onInputChange={(next, action) => {
                    // Ignore the clears react-select fires on blur/select, or the level
                    // would reset itself out from under an open menu.
                    if (action.action === 'input-change') setInputValue(next);
                }}
                menuIsOpen={menuOpen}
                onMenuOpen={() => {
                    // Reopen where the current selection lives, so its siblings are in view.
                    setLevel(selected?.parentId ? byId.get(selected.parentId) || null : null);
                    setMenuOpen(true);
                }}
                onMenuClose={() => { setMenuOpen(false); setInputValue(''); }}
                onKeyDown={(e) => {
                    // Left/Backspace on an empty query walks back up a level.
                    if ((e.key === 'ArrowLeft' || e.key === 'Backspace') && !inputValue && level) {
                        e.preventDefault();
                        goUp();
                    }
                }}
                placeholder={placeholder}
                isClearable
                isSearchable
                isDisabled={disabled}
                // Selection is committed manually so navigating a branch can keep the menu up.
                closeMenuOnSelect={false}
                // Backspace is the "go up" key here; clearing is the explicit ✕.
                backspaceRemovesValue={false}
                maxMenuHeight={280}
                noOptionsMessage={() => (searching ? 'No matching tasks' : 'No tasks configured yet')}
                classNamePrefix="react-select"
                className={`react-select-styled ${hasError ? 'is-invalid' : ''}`}
                components={SELECT_COMPONENTS}
                // Search the whole path, so typing "Bedroom" finds it without the user
                // having to walk each level, and typing a parent name reveals its subtree.
                filterOption={(option, input) =>
                    !input.trim() || option.data.searchText.includes(input.trim().toLowerCase())
                }
                menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
                menuPosition="fixed"
                styles={{
                    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                    menu: (base) => ({ ...base, zIndex: 9999 }),
                    control: (base, state) => ({
                        ...base,
                        boxShadow: state.isFocused ? `0 0 0 1px ${ACCENT}` : base.boxShadow,
                    }),
                    option: (base) => ({ ...base, paddingTop: 6, paddingBottom: 6 }),
                    singleValue: (base) => ({ ...base, lineHeight: 1.25 }),
                }}
            />
            </DrillContext.Provider>

            {helpText}
            <HighlightErrors isRequired={isRequired} formikField={formikField} />
        </div>
    );
};

export default HierarchicalTaskSelect;
