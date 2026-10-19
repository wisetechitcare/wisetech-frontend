import React, { useMemo } from 'react';
import { Autocomplete, TextField, type AutocompleteProps } from '@mui/material';
import { flattenPresetTasks, type PresetTaskLike } from '@utils/presetTaskHierarchy';
import TaskPath, { TASK_PATH_SEPARATOR } from './TaskPath';

/** A Project Task as one flat, searchable row: "Electrical - Documents - Load Sheet". */
export interface TaskPathOption {
    id: string;
    /** Ancestors + own name, root first. */
    path: string[];
    /** The path joined — what a deliverable stores as its name. */
    name: string;
    search: string;
}

/** Every node of the preset tree as a path row, in tree order. `only` narrows it to those ids. */
export const buildTaskPathOptions = (nodes: PresetTaskLike[], only?: Set<string> | null): TaskPathOption[] =>
    flattenPresetTasks(nodes)
        .filter((n) => !only || only.has(n.id))
        .map((n) => {
            const name = n.path.join(TASK_PATH_SEPARATOR);
            return { id: n.id, path: n.path, name, search: name.toLowerCase() };
        });

/** "elec load" finds "Electrical - Documents - Load Sheet": every typed word, anywhere in the path. */
const filterByWords = (options: TaskPathOption[], { inputValue }: { inputValue: string }) => {
    const words = inputValue.toLowerCase().split(/[\s\-–]+/).filter(Boolean);
    return words.length ? options.filter((o) => words.every((w) => o.search.includes(w))) : options;
};

interface Props {
    /** Selected node id; '' for none. */
    value: string;
    options: TaskPathOption[];
    onChange: (option: TaskPathOption | null) => void;
    label?: string;
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
    loading?: boolean;
    error?: boolean;
    helperText?: React.ReactNode;
    autoFocus?: boolean;
    /** Popper placement rules from the host dialog (e.g. `popperInside`). */
    slotProps?: AutocompleteProps<TaskPathOption, false, false, false>['slotProps'];
}

/**
 * THE Project Task picker: one flat list where every row is its whole path — ancestors quiet,
 * the task itself in full weight — so same-named tasks in different branches are told apart
 * at a glance, and typing any words from the path finds it. Used by the New Task form and the
 * payment-plan deliverable dialog, so the two always look and search alike.
 */
const TaskPathSelect: React.FC<Props> = ({
    value, options, onChange, label = 'Project task', placeholder = 'Search, e.g. electrical load sheet',
    required, disabled, loading, error, helperText, autoFocus, slotProps,
}) => {
    const selected = useMemo(() => options.find((o) => o.id === value) ?? null, [options, value]);
    return (
        <Autocomplete
            sx={{ flex: 1, minWidth: 0 }}
            options={options}
            value={selected}
            loading={loading}
            disabled={disabled}
            filterOptions={filterByWords}
            getOptionLabel={(o) => o.name}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            onChange={(_, next) => onChange(next)}
            renderOption={({ key, ...props }, o) => (
                <li key={key} {...props}><TaskPath path={o.path} fontSize={13} /></li>
            )}
            noOptionsText="No project task matches — add it under Tasks → Project Tasks."
            slotProps={slotProps}
            renderInput={(params) => (
                <TextField
                    {...params}
                    label={label}
                    size="small"
                    autoFocus={autoFocus}
                    required={required}
                    error={error}
                    placeholder={placeholder}
                    helperText={helperText}
                />
            )}
        />
    );
};

export default TaskPathSelect;
