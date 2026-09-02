import { useRef, useState } from 'react';
import { Box, CircularProgress, Stack, alpha, useTheme } from '@mui/material';
import { KTIcon } from '@metronic/helpers';
import { GlassDialog, PlainDialogHeader, WtButton } from '@app/modules/common/components/ui';
import MeetingFormBody, { type MeetingFormBodyHandle, type MeetingFormBodyProps } from './MeetingFormBody';
import MeetingAvailability from './MeetingAvailability';

/**
 * The meeting dialog — a PLAIN white sheet, two columns.
 *
 * ─── NO GLASS HERE, ON PURPOSE ───────────────────────────────────────────────
 * `GlassDialog` is still the shell, for its scroll region, its phone full-screen and its
 * transition — but its frosted Paper and gradient header are overridden back to a plain white
 * surface. The glass reads well over a dashboard; over a dense scheduling form with a timeline
 * beside it, a translucent panel puts whatever is behind the modal underneath the very grid a
 * person is trying to read a clash off.
 *
 * ─── FORM LEFT, DAY RIGHT ────────────────────────────────────────────────────
 * The right column is not a summary of the left one — it is the answer to the question the left
 * one is asking. Times and participants change on the left, and the clash appears on the right
 * as they do.
 */
export interface MeetingDialogProps extends Pick<MeetingFormBodyProps, 'selectedDateTimeInfo' | 'defaultProjectId' | 'lockProject'> {
    open: boolean;
    onClose: () => void;
    onSaved?: () => void;
}

export default function MeetingDialog({ open, onClose, onSaved, ...bodyProps }: MeetingDialogProps) {
    const theme = useTheme();
    const bodyRef = useRef<MeetingFormBodyHandle>(null);
    const [saving, setSaving] = useState(false);
    // Lifted so the day beside the form can be drawn from it — the panel is a reader of the
    // form's state, never a second copy of it.
    const [schedule, setSchedule] = useState<{ startIso: string; endIso: string; participantIds: string[]; nameById: Record<string, { name: string; avatar: string | null }> }>({
        startIso: '', endIso: '', participantIds: [], nameById: {},
    });

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
                    title="New meeting"
                    onClose={saving ? undefined : onClose}
                    closeIcon={<KTIcon iconName="cross" className="fs-3" />}
                />
            }
        >

            <Box
                className="min-h-0 flex-1"
                sx={{
                    display: 'grid',
                    // One column on a phone: a 200px-wide timeline is not a timeline.
                    gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) 320px' },
                    minHeight: 0,
                }}
            >
                <Box sx={{ minWidth: 0, overflowY: 'auto', px: 2.5, py: 2, maxHeight: { xs: 'none', sm: '68vh' } }}>
                    <MeetingFormBody
                        ref={bodyRef}
                        onSaved={onSaved}
                        onScheduleChange={setSchedule}
                        {...bodyProps}
                    />
                </Box>

                <Box
                    sx={{
                        display: { xs: 'none', md: 'flex' },
                        flexDirection: 'column',
                        minWidth: 0,
                        px: 2, py: 2,
                        borderLeft: '1px solid',
                        borderColor: 'divider',
                        bgcolor: alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.04 : 0.015),
                    }}
                >
                    {schedule.startIso && (
                        <MeetingAvailability
                            participantIds={schedule.participantIds}
                            nameById={schedule.nameById}
                            startIso={schedule.startIso}
                            endIso={schedule.endIso}
                        />
                    )}
                </Box>
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
                    {saving ? 'saving…' : 'create meeting'}
                </WtButton>
            </Stack>
        </GlassDialog>
    );
}
