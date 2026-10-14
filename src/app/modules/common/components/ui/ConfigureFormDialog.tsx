import React from 'react';
import { Box, Stack } from '@mui/material';
import { GlassDialog, PlainDialogHeader } from './glass';
import { WtButton } from './buttons';
import { InlineNotice } from './InlineNotice';
import { TRIO } from './tw/tokens';

export interface ConfigureFormDialogProps {
    open: boolean;
    onClose: () => void;
    title: string;
    subtitle?: string;
    /** Form submit handler — wire Formik `handleSubmit` or a custom handler. */
    onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
    children: React.ReactNode;
    /** Disables close + Cancel, and shows busy copy on Save. */
    saving?: boolean;
    submitLabel?: string;
    cancelLabel?: string;
    /** Inline server/API error above the fields. */
    error?: string | null;
    maxWidth?: 'xs' | 'sm' | 'md';
}

/**
 * Short master create/edit dialog — the shared shell for `*ConfigureForm` screens.
 *
 * Prefer this over Bootstrap `Modal` + hand-rolled C/FONT/SP chrome.
 * Long multi-section forms stay on `WtFormDialog`. Transfer-capable deletes stay
 * on `DeleteConfirmationModal` / `confirmDialog`.
 *
 * @example
 * ```tsx
 * <Formik ...>
 *   {(fk) => (
 *     <ConfigureFormDialog
 *       open={show} onClose={onClose} title="New Qualification"
 *       saving={isSubmitting} error={error}
 *       onSubmit={fk.handleSubmit}
 *       submitLabel={isEditing ? 'Update' : 'Create'}
 *     >
 *       <WtFieldFormik name="name" label="Qualification Name" required />
 *     </ConfigureFormDialog>
 *   )}
 * </Formik>
 * ```
 */
export function ConfigureFormDialog({
    open,
    onClose,
    title,
    subtitle,
    onSubmit,
    children,
    saving = false,
    submitLabel = 'Save',
    cancelLabel = 'Cancel',
    error,
    maxWidth = 'sm',
}: ConfigureFormDialogProps) {
    const close = () => {
        if (!saving) onClose();
    };

    return (
        <GlassDialog
            open={open}
            onClose={close}
            maxWidth={maxWidth}
            plain
            preset="form"
            disableEscapeKeyDown={saving}
            header={
                <PlainDialogHeader
                    title={title}
                    subtitle={subtitle}
                    onClose={saving ? undefined : onClose}
                />
            }
        >
            <Box
                component="form"
                noValidate
                onSubmit={onSubmit}
                sx={{ px: { xs: 2, sm: 3 }, py: 2 }}
            >
                <Stack spacing={2.5}>
                    {error ? (
                        <InlineNotice trio={TRIO.rose} icon="information-5" role="alert">
                            {error}
                        </InlineNotice>
                    ) : null}

                    {children}

                    <Stack direction="row" justifyContent="flex-end" spacing={1.25}>
                        <WtButton type="button" inverted onClick={close} disabled={saving}>
                            {cancelLabel}
                        </WtButton>
                        <WtButton type="submit" disabled={saving}>
                            {saving ? 'Saving…' : submitLabel}
                        </WtButton>
                    </Stack>
                </Stack>
            </Box>
        </GlassDialog>
    );
}

export default ConfigureFormDialog;
