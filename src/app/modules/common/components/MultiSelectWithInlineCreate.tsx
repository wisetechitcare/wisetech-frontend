import React, {
    useState,
    forwardRef,
    useImperativeHandle,
    useMemo,
    useCallback,
} from 'react';
import { useFormikContext } from 'formik';
import { Box, Stack, Typography } from '@mui/material';
import { Plus } from 'lucide-react';
import { sortOptionsAlphabetically } from '@utils/sortUtils';
import {
    GlassDialog,
    PlainDialogHeader,
    WtButton,
    WtField,
} from '@app/modules/common/components/ui';
import { Button } from '@/ds/ui/button';
import { FieldError } from '@/ds/ui/field';
import {
    Combobox,
    ComboboxChip,
    ComboboxChips,
    ComboboxChipsInput,
    ComboboxCollection,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxGroup,
    ComboboxItem,
    ComboboxLabel,
    ComboboxList,
    ComboboxValue,
    useComboboxAnchor,
} from '@/ds/ui/combobox';

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

    // Grouped lists (react-select `{label, options}`) become Combobox groups `{value, items}`.
    const comboItems = useMemo(
        () => (hasGroupedOptions
            ? (sortedOptions as any[]).map((g) => (Array.isArray(g.options)
                ? { value: String(g.label), items: sortOptionsAlphabetically(g.options) }
                : { value: '', items: [g] }))
            : sortedOptions),
        [hasGroupedOptions, sortedOptions],
    );
    const anchor = useComboboxAnchor();

    const openInlineCreateDialog = useCallback(() => {
        setCreateValue('');
        const initialParent =
            defaultParentId ||
            (parentOptions && parentOptions.length === 1 ? parentOptions[0].value : '');
        setParentId(initialParent);
        setShowCreateModal(true);
    }, [defaultParentId, parentOptions]);

    const handleAddNew = useCallback(() => {
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

    const sortedParentOptions = useMemo(
        () => (parentOptions ? sortOptionsAlphabetically(parentOptions) : []),
        [parentOptions],
    );

    const createDisabled =
        !createValue.trim() || isCreating || (requireParent && !parentId);

    const busy = disabled || isLoading;
    const item = (o: Option) => (
        <ComboboxItem key={o.value} value={o} title={o.label}>
            <span className="truncate">{o.label}</span>
        </ComboboxItem>
    );

    const picker = (
        <Combobox
            multiple
            autoHighlight
            items={comboItems}
            value={selectedOptions}
            onValueChange={(next: Option[]) => setFieldValue(formikField, next.map((o) => o.value))}
            itemToStringLabel={(o: Option) => o?.label ?? ''}
            isItemEqualToValue={(a: Option, b: Option) => a?.value === b?.value}
            disabled={busy}
        >
            <ComboboxChips ref={anchor} aria-invalid={hasError || undefined} className="min-h-10">
                <ComboboxValue>
                    {(chosen: Option[]) => (
                        <>
                            {chosen.map((o) => <ComboboxChip key={o.value}>{o.label}</ComboboxChip>)}
                            <ComboboxChipsInput
                                name={formikField}
                                aria-label={inputLabel}
                                placeholder={chosen.length ? '' : placeholder}
                            />
                        </>
                    )}
                </ComboboxValue>
            </ComboboxChips>
            <ComboboxContent anchor={anchor}>
                <ComboboxEmpty>No matches.</ComboboxEmpty>
                <ComboboxList>
                    {hasGroupedOptions
                        ? (g: { value: string; items: Option[] }) => (
                            <ComboboxGroup key={g.value} items={g.items}>
                                <ComboboxLabel>{g.value}</ComboboxLabel>
                                <ComboboxCollection>{item}</ComboboxCollection>
                            </ComboboxGroup>
                        )
                        : item}
                </ComboboxList>
                {onCreate && (
                    <div className="border-t border-border/60 p-1">
                        <Button type="button" variant="ghost" size="sm" className="w-full justify-start" onClick={handleAddNew}>
                            <Plus data-icon="inline-start" />
                            {createButtonText}
                        </Button>
                    </div>
                )}
            </ComboboxContent>
        </Combobox>
    );

    return (
        <>
            <Box className={className} sx={{ display: 'flex', flexDirection: 'column' }}>
                <Box component="label" sx={{ display: 'flex', gap: 0.5, mb: 1, minHeight: 22, fontSize: 13.5, fontWeight: 500, color: 'text.primary' }}>
                    {inputLabel}
                    {isRequired && <Box component="span" aria-hidden sx={{ color: 'error.main' }}>*</Box>}
                </Box>
                {picker}
                {errorMessage && <FieldError className="mt-1 text-xs">{errorMessage}</FieldError>}
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
