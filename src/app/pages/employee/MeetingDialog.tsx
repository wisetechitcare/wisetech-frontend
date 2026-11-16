import { useRef, useState } from 'react';
import { Box } from '@mui/material';
import { KTIcon } from '@metronic/helpers';
import { GlassDialog, GlassDialogActions, PlainDialogHeader } from '@app/modules/common/components/ui';
import { useDiscardConfirm } from '@app/modules/common/components/ui/useDiscardConfirm';
import { Button } from '@/ds/ui/button';
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
export interface MeetingDialogProps extends Pick<MeetingFormBodyProps, 'selectedDateTimeInfo' | 'defaultProjectId' | 'lockProject' | 'leadName' | 'defaultExternalParticipant' | 'editing'> {
    open: boolean;
    onClose: () => void;
    onSaved?: () => void;
}

export default function MeetingDialog({ open, onClose, onSaved, ...bodyProps }: MeetingDialogProps) {
    const bodyRef = useRef<MeetingFormBodyHandle>(null);
    const [saving, setSaving] = useState(false);
    // Cancel, the X, a backdrop click and Escape all route through this: with changes it asks
    // first, without it simply closes. A successful save closes directly (below).
    const discard = useDiscardConfirm(() => !!bodyRef.current?.isDirty(), onClose, {
        title: bodyProps.editing ? 'Discard your changes?' : 'Discard this meeting?',
        message: bodyProps.editing
            ? 'Your edits to this meeting have not been saved.'
            : 'The details you entered will be lost.',
    });
    const requestClose = saving ? undefined : discard.requestClose;

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
            onClose={requestClose}
            maxWidth="lg"
            plain
            preset="form"
            header={
                <PlainDialogHeader
                    icon={<KTIcon iconName="calendar-add" className="fs-1" />}
                    // The header says which of the two things this is. A form pre-filled with
                    // somebody's meeting under a heading that says "New meeting" is the kind of
                    // detail that makes people close a dialog to check.
                    title={bodyProps.editing
                        ? 'Edit Meeting'
                        : bodyProps.leadName ? 'New Lead Meeting' : 'New Meeting'}
                    onClose={requestClose}
                />
            }
        >

            <Box
                className="min-h-0 flex-1"
                sx={{ minWidth: 0, overflowY: 'auto', px: 2.5, py: 2 }}
            >
                <MeetingFormBody ref={bodyRef} onSaved={onSaved} {...bodyProps} />
            </Box>

            <GlassDialogActions
                sx={{
                    flexDirection: { xs: 'column-reverse', sm: 'row' },
                    '& > :not(style) ~ :not(style)': { ml: { xs: 0, sm: 1 } },
                    gap: 1,
                }}
            >
                <Button type="button" variant="outline" onClick={discard.requestClose} disabled={saving} className="w-full sm:w-auto">
                    Cancel
                </Button>
                <Button
                    type="button"
                    onClick={submit}
                    loading={saving}
                    className="w-full sm:w-auto sm:min-w-[150px]"
                >
                    {saving ? 'Saving…' : bodyProps.editing ? 'Save changes' : 'Create meeting'}
                </Button>
            </GlassDialogActions>
            {discard.dialog}
        </GlassDialog>
    );
}
