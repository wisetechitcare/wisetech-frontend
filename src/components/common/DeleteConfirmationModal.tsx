import React, { useEffect, useState } from 'react';
import { Box, Stack } from '@mui/material';
import {
    GlassDialog,
    InlineHint,
    InlineNotice,
    PlainDialogHeader,
    TRIO,
    WtButton,
    WtField,
    WtSwitchField,
} from '@app/modules/common/components/ui';
import { DropdownOption } from '../../types/deleteConfirmation';

export interface DeleteConfirmationModalProps {
    visible: boolean;
    onCancel: () => void;
    onConfirm: (targetId?: string) => Promise<void>;
    entityName: string;
    entityDisplayName: string;
    dropdownOptions?: DropdownOption[];
    loading?: boolean;
    showTransferOption?: boolean;
    transferDescription?: string;
}

/**
 * Destructive delete with optional reassign-before-delete.
 * Kit surface: GlassDialog + WtField / WtSwitchField — not Bootstrap Modal.
 * Prefer plain `confirmDialog` when there is no transfer UI.
 */
const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
    visible,
    onCancel,
    onConfirm,
    entityName,
    entityDisplayName,
    dropdownOptions = [],
    loading = false,
    showTransferOption = true,
    transferDescription,
}) => {
    const [showTransfer, setShowTransfer] = useState(false);
    const [selectedTargetId, setSelectedTargetId] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const entityLabel = entityName.toLowerCase();

    useEffect(() => {
        if (!visible) {
            setShowTransfer(false);
            setSelectedTargetId('');
            setIsSubmitting(false);
        }
    }, [visible]);

    const handleTransferChange = (checked: boolean) => {
        setShowTransfer(checked);
        if (!checked) setSelectedTargetId('');
    };

    const handleConfirm = async () => {
        if (showTransfer && !selectedTargetId) return;

        setIsSubmitting(true);
        try {
            await onConfirm(showTransfer ? selectedTargetId : undefined);
            onCancel();
        } catch (error) {
            console.error('Delete failed:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const isConfirmDisabled = loading || isSubmitting || (showTransfer && !selectedTargetId);

    const transferOptions = dropdownOptions.map((o) => ({
        value: o.key,
        label: o.value,
    }));

    return (
        <GlassDialog
            open={visible}
            onClose={() => {
                if (!isSubmitting) onCancel();
            }}
            maxWidth="sm"
            plain
            disableEscapeKeyDown={isSubmitting}
            header={
                <PlainDialogHeader
                    title="Confirm delete"
                    subtitle={`Remove this ${entityLabel}`}
                    onClose={isSubmitting ? undefined : onCancel}
                />
            }
        >
            <Box sx={{ px: { xs: 2, sm: 3 }, py: 2 }}>
                <Stack spacing={2.5}>
                    <InlineNotice trio={TRIO.amber} icon="information-5" role="alert">
                        Are you sure you want to delete &ldquo;{entityDisplayName}&rdquo;? This action cannot be undone.
                    </InlineNotice>

                    {showTransferOption && dropdownOptions.length > 0 && (
                        <Stack spacing={2}>
                            <WtSwitchField
                                title={`Transfer existing data to another ${entityLabel}`}
                                checked={showTransfer}
                                onChange={(e) => handleTransferChange(e.target.checked)}
                                disabled={isSubmitting}
                                size="sm"
                            />

                            {showTransfer && (
                                <Stack spacing={1.25}>
                                    {transferDescription ? (
                                        <InlineHint>{transferDescription}</InlineHint>
                                    ) : null}
                                    <WtField
                                        label={`Target ${entityLabel}`}
                                        required
                                        options={transferOptions}
                                        value={selectedTargetId}
                                        onChange={(v) => {
                                            if (typeof v === 'string') setSelectedTargetId(v);
                                        }}
                                        placeholder={`Choose a ${entityLabel} to transfer data to`}
                                        disabled={isSubmitting}
                                        searchable={transferOptions.length > 8}
                                    />
                                    {!selectedTargetId ? (
                                        <InlineHint>
                                            Select a target before deleting.
                                        </InlineHint>
                                    ) : null}
                                </Stack>
                            )}
                        </Stack>
                    )}

                    {showTransferOption && dropdownOptions.length === 0 && (
                        <InlineNotice trio={TRIO.blue} icon="information-2">
                            No other {entityLabel}s are available to transfer data to. This {entityLabel} will be deleted directly.
                        </InlineNotice>
                    )}

                    {!showTransferOption && (
                        <InlineNotice trio={TRIO.blue} icon="information-2">
                            This {entityLabel} will be deleted directly without transferring data.
                        </InlineNotice>
                    )}

                    <Stack direction="row" justifyContent="flex-end" spacing={1.25}>
                        <WtButton inverted onClick={onCancel} disabled={isSubmitting}>
                            Cancel
                        </WtButton>
                        <WtButton
                            tone="danger"
                            onClick={() => { void handleConfirm(); }}
                            disabled={isConfirmDisabled}
                        >
                            {isSubmitting ? 'Deleting…' : 'Delete'}
                        </WtButton>
                    </Stack>
                </Stack>
            </Box>
        </GlassDialog>
    );
};

export default DeleteConfirmationModal;
