import { useRef, useState } from 'react';
import { Box, CircularProgress, Stack } from '@mui/material';
import { KTIcon } from '@metronic/helpers';
import { GlassDialog, PlainDialogHeader, WtButton } from '@app/modules/common/components/ui';
import MeetingFormBody, { type MeetingFormBodyHandle, type MeetingFormBodyProps } from './MeetingFormBody';

/**
 * The meeting dialog — a PLAIN white sheet.
 *
 * ─── NO GLASS HERE, ON PURPOSE ───────────────────────────────────────────────
 * `GlassDialog` is still the shell, for its scroll region, its phone full-screen and its
 * transition — but its frosted Paper and gradient header are overridden back to a plain white
 * surface. The glass reads well over a dashboard; over a dense scheduling form with a timeline
 * beside it, a translucent panel puts whatever is behind the modal underneath the very grid a
 * person is trying to read a clash off.
 *
 * The day-timeline column that used to sit beside the form is gone. It answered a question
 * ("does this clash?") that the form was not asking often enough to earn a permanent third of
 * the dialog, and it pushed the form itself into a narrow strip. `MeetingAvailability` is left
 * in the tree — it is a self-contained reader of a start/end and a participant list, so it can
 * be dropped back in wherever that question does get asked.
 */
export interface MeetingDialogProps extends Pick<MeetingFormBodyProps, 'selectedDateTimeInfo' | 'defaultProjectId' | 'lockProject' | 'leadName' | 'editing'> {
    open: boolean;
    onClose: () => void;
    onSaved?: () => void;
}

export default function MeetingDialog({ open, onClose, onSaved, ...bodyProps }: MeetingDialogProps) {
    const bodyRef = useRef<MeetingFormBodyHandle>(null);
    const [saving, setSaving] = useState(false);

    const submit = async () => {
        setSaving(true);
        try {
            if (await bodyRef.current?.submit()) { onSaved?.(); onClose(); }
        } finally {
            setSaving(false);
        }
    };

    return (
        <GlassDialog
            open={open}
            onClose={saving ? undefined : onClose}
            maxWidth="lg"
            plain
            header={
                <PlainDialogHeader
                    icon={<KTIcon iconName="calendar-add" className="fs-1" />}
                    // The header says which of the two things this is. A form pre-filled with
                    // somebody's meeting under a heading that says "New meeting" is the kind of
                    // detail that makes people close a dialog to check.
                    title={bodyProps.editing
                        ? 'Edit meeting'
                        : bodyProps.leadName ? 'New lead meeting' : 'New meeting'}
                    onClose={saving ? undefined : onClose}
                />
            }
        >

            <Box
                className="min-h-0 flex-1"
                sx={{ minWidth: 0, overflowY: 'auto', px: 2.5, py: 2, maxHeight: { xs: 'none', sm: '68vh' } }}
            >
                <MeetingFormBody ref={bodyRef} onSaved={onSaved} {...bodyProps} />
            </Box>

            <Stack
                direction={{ xs: 'column-reverse', sm: 'row' }}
                spacing={1}
                justifyContent="flex-end"
                className="shrink-0"
                sx={{ px: 2.5, py: 1.75, borderTop: '1px solid', borderColor: 'divider' }}
            >
                <WtButton ghost onClick={onClose} disabled={saving} sx={{ width: { xs: '100%', sm: 'auto' } }}>
                    cancel
                </WtButton>
                <WtButton
                    onClick={submit}
                    disabled={saving}
                    startIcon={saving ? <CircularProgress size={14} color="inherit" /> : undefined}
                    sx={{ width: { xs: '100%', sm: 'auto' }, minWidth: 150 }}
                >
                    {saving ? 'saving…' : bodyProps.editing ? 'save changes' : 'create meeting'}
                </WtButton>
            </Stack>
        </GlassDialog>
    );
}
