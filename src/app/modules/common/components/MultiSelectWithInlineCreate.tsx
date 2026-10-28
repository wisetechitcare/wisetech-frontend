import React, {
    useState,
    forwardRef,
    useImperativeHandle,
    useMemo,
    useCallback,
} from 'react';
import { MultiValue } from 'react-select';
import { useFormikContext } from 'formik';
import { Box, Stack, Typography } from '@mui/material';
import { sortOptionsAlphabetically } from '@utils/sortUtils';
import { createAddOptionMenuListFromProp } from '@app/modules/common/inputs/SelectMenuAddRow';
import {
    GlassDialog,
    PlainDialogHeader,
    WtButton,
    WtField,
    WtSelect,
    type WtAddOption,
} from '@app/modules/common/components/ui';

export interface Option {
    value: string;
    label: string;
    color?: string;
}

export interface MultiSelectWithInlineCreateProps {
    formikField: string;
    inputLabel: string;
    options: Option[];
    placeholder?: string;
    isRequired?: boolean;
    disabled?: boolean;
    onCreate?: (name: string, parentId?: string) => Promise<Option | void>;
    onRefreshOptions?: () => Promise<void>;
    createModalTitle?: string;
    createButtonText?: string;
    createFieldLabel?: string;
    createFieldPlaceholder?: string;
    isLoading?: boolean;
    className?: string;
    parentOptions?: Option[];
    parentSelectLabel?: string;
    parentPlaceholder?: string;
    defaultParentId?: string;
    requireParent?: boolean;
    parentEmptyHint?: string;
    /**
     * Parent owns the create UI (e.g. Lead Categories → category master modal).
     * "+ Add New" calls `onCreate` immediately — no GlassDialog.
     */
    externalCreate?: boolean;
}

export interface MultiSelectWithInlineCreateRef {
    refreshOptions: () => Promise<void>;
}

const MultiSelectWithInlineCreate = forwardRef<
    MultiSelectWithInlineCreateRef,
    MultiSelectWithInlineCreateProps
>(({
    formikField,
    inputLabel,
    options,
    placeholder = 'Select options...',
    isRequired = false,
    disabled = false,
    onCreate,
    onRefreshOptions,
    createModalTitle = 'Create New Item',
    createButtonText = 'Add New',
    createFieldLabel = 'Name',
    createFieldPlaceholder = 'Enter name...',
    isLoading = false,
    className = '',
    parentOptions,
    parentSelectLabel = 'Parent',
    parentPlaceholder = 'Select parent...',
    defaultParentId,
    requireParent = false,
    parentEmptyHint,
    externalCreate = false,
}, ref) => {
    const { values, setFieldValue, errors, touched } = useFormikContext<any>();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createValue, setCreateValue] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [parentId, setParentId] = useState('');
    const [menuIsOpen, setMenuIsOpen] = useState(false);

    const showParentPicker = Array.isArray(parentOptions);

    /** Grouped option lists need WtSelect; flat lists use Sandwich WtField multiple. */
    const hasGroupedOptions = useMemo(
        () => (options || []).some((o: any) => o && Array.isArray(o.options)),
        [options],
    );

    const sortedOptions = useMemo(
        () => sortOptionsAlphabetically(options || []),
        [options],
    );

    const flatOptions: Option[] = useMemo(() => {
        const flat: Option[] = [];
        (options || []).forEach((o: any) => {
            if (o && Array.isArray(o.options)) flat.push(...o.options);
            else if (o) flat.push(o);
        });
        return flat;
    }, [options]);

    const fieldValue = values[formikField] || [];
    const selectedIds: string[] = Array.isArray(fieldValue) ? fieldValue : [];
    const selectedOptions: Option[] = selectedIds
        .map((val: string) => flatOptions.find((opt) => opt.value === val))
        .filter((opt): opt is Option => opt !== undefined);

    const hasError = !!(touched[formikField] && errors[formikField]);
    const errorMessage = hasError ? String(errors[formikField]) : undefined;

    const handleSelectChange = (newValue: MultiValue<Option> | null) => {
        const next = newValue ? newValue.map((option) => option.value) : [];
        setFieldValue(formikField, next);
    };

    const handleFieldMultiChange = (next: string | string[]) => {
        setFieldValue(formikField, Array.isArray(next) ? next : next ? [next] : []);
    };

    const openInlineCreateDialog = useCallback(() => {
        setCreateValue('');
        const initialParent =
            defaultParentId ||
            (parentOptions && parentOptions.length === 1 ? parentOptions[0].value : '');
        setParentId(initialParent);
        setShowCreateModal(true);
    }, [defaultParentId, parentOptions]);

    const handleAddNew = useCallback(() => {
        setMenuIsOpen(false);
        if (!onCreate) return;

        if (externalCreate) {
            void onCreate('');
            return;
        }

        window.setTimeout(() => openInlineCreateDialog(), 0);
    }, [onCreate, externalCreate, openInlineCreateDialog]);

    const handleCloseCreateModal = useCallback(() => {
        setShowCreateModal(false);
        setCreateValue('');
        setParentId('');
        setIsCreating(false);
    }, []);

    const handleCreate = async () => {
        if (!createValue.trim() || !onCreate) return;
        if (requireParent && !parentId) return;

        setIsCreating(true);
        try {
            const newOption = await onCreate(createValue.trim(), parentId || undefined);

            if (newOption) {
                const currentValues = Array.isArray(fieldValue) ? fieldValue : [];
                setFieldValue(formikField, [...currentValues, newOption.value]);
            }

            if (onRefreshOptions) {
                await onRefreshOptions();
            }

            handleCloseCreateModal();
        } catch (error) {
            console.error('Error creating new item:', error);
        } finally {
            setIsCreating(false);
        }
    };

    useImperativeHandle(ref, () => ({
        refreshOptions: async () => {
            if (onRefreshOptions) {
                await onRefreshOptions();
            }
        },
    }));

    const addOptionProp: WtAddOption | undefined = useMemo(
        () => (onCreate
            ? { onAdd: handleAddNew, label: createButtonText, placement: 'menu' as const }
            : undefined),
        [onCreate, handleAddNew, createButtonText],
    );

    const AddOptionMenuList = useMemo(
        () => (addOptionProp ? createAddOptionMenuListFromProp(addOptionProp) : undefined),
        [addOptionProp],
    );

    const sortedParentOptions = useMemo(
        () => (parentOptions ? sortOptionsAlphabetically(parentOptions) : []),
        [parentOptions],
    );

    const createDisabled =
        !createValue.trim() || isCreating || (requireParent && !parentId);

    /** Flat lists → Sandwich floating WtField; grouped (company services) → WtSelect adapter. */
    const useFloatingMulti = !hasGroupedOptions;

    return (
        <>
            <Box className={className}>
                {useFloatingMulti ? (
                    <WtField
                        label={inputLabel}
                        required={isRequired}
                        error={errorMessage}
                        disabled={disabled || isLoading}
                        placeholder={placeholder}
                        multiple
                        clearable
                        options={flatOptions.map((o) => ({ value: o.value, label: o.label }))}
                        value={selectedIds}
                        onChange={handleFieldMultiChange}
                        addOption={addOptionProp}
                    />
                ) : (
                    <WtField
                        label={inputLabel}
                        required={isRequired}
                        error={errorMessage}
                        disabled={disabled}
                        // Only read by a floating label, to know whether to stay lifted.
                        value={selectedIds}
                    >
                        <WtSelect
                            name={formikField}
                            ariaLabel={inputLabel}
                            isMulti
                            options={sortedOptions}
                            value={selectedOptions}
                            onChange={handleSelectChange}
                            placeholder={placeholder}
                            isDisabled={disabled}
                            isLoading={isLoading}
                            isClearable
                            error={hasError}
                            menuIsOpen={menuIsOpen}
                            onMenuOpen={() => setMenuIsOpen(true)}
                            onMenuClose={() => setMenuIsOpen(false)}
                            components={AddOptionMenuList ? { MenuList: AddOptionMenuList } : undefined}
                        />
                    </WtField>
                )}
            </Box>

            {onCreate && !externalCreate && (
                <GlassDialog
                    open={showCreateModal}
                    onClose={handleCloseCreateModal}
                    maxWidth="sm"
                    plain
                    sx={{ zIndex: 1600 }}
                    header={
                        <PlainDialogHeader
                            title={createModalTitle}
                            onClose={handleCloseCreateModal}
                        />
                    }
                >
                    <Box sx={{ px: { xs: 2, sm: 3 }, py: 2 }}>
                        <Stack
                            spacing={2.5}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !isCreating && !createDisabled) {
                                    e.preventDefault();
                                    void handleCreate();
                                }
                            }}
                        >
                            {showParentPicker && (
                                parentOptions && parentOptions.length > 0 ? (
                                    <WtField
                                        label={parentSelectLabel}
                                        required={requireParent}
                                        searchable
                                        clearable
                                        placeholder={parentPlaceholder}
                                        options={sortedParentOptions.map((o) => ({
                                            value: o.value,
                                            label: o.label,
                                        }))}
                                        value={parentId}
                                        onChange={(v) => setParentId(typeof v === 'string' ? v : '')}
                                        disabled={isCreating}
                                    />
                                ) : (
                                    <Typography
                                        sx={{ fontSize: 13, color: 'text.secondary', fontStyle: 'italic' }}
                                    >
                                        {parentEmptyHint || `Select a ${parentSelectLabel.toLowerCase()} first.`}
                                    </Typography>
                                )
                            )}
                            <WtField
                                label={createFieldLabel}
                                required
                                placeholder={createFieldPlaceholder}
                                value={createValue}
                                onChange={(v) => setCreateValue(typeof v === 'string' ? v : '')}
                                disabled={isCreating}
                                autoFocus
                            />
                            <Stack direction="row" spacing={1.5} justifyContent="flex-end">
                                <WtButton
                                    type="button"
                                    ghost
                                    onClick={handleCloseCreateModal}
                                    disabled={isCreating}
                                >
                                    Cancel
                                </WtButton>
                                <WtButton
                                    type="button"
                                    onClick={() => { void handleCreate(); }}
                                    disabled={createDisabled}
                                >
                                    {isCreating ? 'Creating…' : 'Create'}
                                </WtButton>
                            </Stack>
                        </Stack>
                    </Box>
                </GlassDialog>
            )}
        </>
    );
});

MultiSelectWithInlineCreate.displayName = 'MultiSelectWithInlineCreate';

export default MultiSelectWithInlineCreate;
