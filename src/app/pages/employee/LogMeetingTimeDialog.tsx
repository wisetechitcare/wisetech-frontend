import React, { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { Dialog, DialogContent, Stack, TextField, Typography, Box } from '@mui/material';
import { KTIcon } from '@metronic/helpers';
import { PlainDialogHeader, WtButton, WtSwitch } from '@app/modules/common/components/ui';
import { TRIO } from '@app/modules/common/components/ui/patterns';
import { getMyMeetingTime, logMeetingTime } from '@services/employee';
import { errorConfirmation, successConfirmation } from '@utils/modal';
import { apiErrorMessage } from '@app/pages/employee/tasks/taskDomain';

export interface LogMeetingTimeDialogProps {
    open: boolean;
    onClose: () => void;
    onSaved: () => void;
    employeeId: string;
    meeting: {
        id: string; title: string; startDate: string; endDate: string;
        loggedMinutes?: number;
    } | null;
}

/** Whole/part hours as people say them, not as a database stores them. */
const toMinutes = (h: string, m: string) => (Number(h) || 0) * 60 + (Number(m) || 0);

/**
 * "How long were you actually in it?"
 *
 * ─── WHY THIS EXISTS ─────────────────────────────────────────────────────────
 * A meeting's cost is the sum of what its attendees logged. Nothing else produces that
 * number — not the invite list, not the slot in the calendar — so this small form is the only
 * door to it, and it has to be quicker to answer than to ignore.
 *
 * It therefore OPENS ON THE ANSWER: pre-filled with the meeting's own scheduled length, which
 * is right for most meetings most of the time. Somebody who was there for the whole hour
 * presses one button; somebody who ducked out after twenty minutes corrects it. An empty box
 * asks everyone to do arithmetic to record the unremarkable case.
 *
 * Logging again edits rather than adds — a second entry for the same person in the same
 * meeting can only be a correction, and treating it as extra attendance would double the cost.
 */
const LogMeetingTimeDialog: React.FC<LogMeetingTimeDialogProps> = ({
    open, onClose, onSaved, employeeId, meeting,
}) => {
    const scheduled = meeting ? Math.max(0, dayjs(meeting.endDate).diff(dayjs(meeting.startDate), 'minute')) : 0;
    const [hours, setHours] = useState('0');
    const [mins, setMins] = useState('0');
    const [note, setNote] = useState('');
    const [billable, setBillable] = useState(true);
    const [saving, setSaving] = useState(false);
    const [existing, setExisting] = useState(false);

    useEffect(() => {
        if (!open || !meeting) return;
        let cancelled = false;
        // Open on what this person already said, else on the meeting's own length.
        getMyMeetingTime(meeting.id, employeeId)
            .then((res: any) => {
                if (cancelled) return;
                const mine = res?.data;
                const start = mine?.minutes ?? scheduled;
                setExisting(!!mine);
                setHours(String(Math.floor(start / 60)));
                setMins(String(start % 60));
                setNote(mine?.description ?? '');
                setBillable(mine?.billable !== false);
            })
            .catch(() => {
                if (cancelled) return;
                setExisting(false);
                setHours(String(Math.floor(scheduled / 60)));
                setMins(String(scheduled % 60));
            });
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, meeting?.id, employeeId]);

    const minutes = toMinutes(hours, mins);

    const save = async () => {
        if (!meeting || minutes <= 0) return;
        setSaving(true);
        try {
            await logMeetingTime(meeting.id, employeeId, minutes, note.trim() || undefined, billable);
            successConfirmation(existing ? 'Your time was updated' : 'Time logged');
            onSaved();
        } catch (error) {
            errorConfirmation(apiErrorMessage(error, 'Could not log your time.'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="xs" fullWidth
            PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>
            {/* The app's own dialog band, not a hand-rolled navy strip: it carries the brand
                gradient and, unlike a hardcoded colour, it still works in dark mode. */}
            <PlainDialogHeader
                icon={<KTIcon iconName="timer" className="fs-2" />}
                title={existing ? 'Edit your time' : 'Log your time'}
                subtitle={meeting
                    ? `${meeting.title} · ${dayjs(meeting.startDate).format('ddd DD MMM, h:mm A')} · scheduled for ${Math.floor(scheduled / 60)}h ${scheduled % 60}m`
                    : undefined}
                onClose={saving ? undefined : onClose}
                closeIcon={<KTIcon iconName="cross" className="fs-3" />}
            />

            <DialogContent sx={{ p: 2.5 }}>
                <Stack direction="row" spacing={1.5} sx={{ mb: 2 }}>
                    <TextField
                        label="Hours" size="small" type="number" value={hours}
                        onChange={(e) => setHours(e.target.value)}
                        inputProps={{ min: 0, max: 24 }} sx={{ width: 110 }}
                    />
                    <TextField
                        label="Minutes" size="small" type="number" value={mins}
                        onChange={(e) => setMins(e.target.value)}
                        inputProps={{ min: 0, max: 59 }} sx={{ width: 110 }}
                    />
                </Stack>

                <TextField
                    label="Note" size="small" fullWidth multiline minRows={2}
                    placeholder="Optional — what this meeting was for"
                    value={note} onChange={(e) => setNote(e.target.value)}
                    sx={{ mb: 2 }}
                />

                <Stack direction="row" alignItems="center" spacing={1}
                    sx={{ p: 1.25, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'action.hover' }}>
                    <Box sx={{ color: TRIO.blue.c, lineHeight: 0 }}>
                        <KTIcon iconName="dollar" className="fs-6" />
                    </Box>
                    <Typography sx={{ fontSize: 13, fontWeight: 600, flex: 1 }}>Billable to the client</Typography>
                    <WtSwitch
                        size="sm" tone={TRIO.blue.c} checked={billable}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBillable(e.target.checked)}
                        inputProps={{ 'aria-label': 'Billable' }}
                    />
                </Stack>

                {minutes <= 0 && (
                    <Typography variant="caption" sx={{ display: 'block', mt: 1.25, color: 'warning.main' }}>
                        Enter how long you were in the meeting.
                    </Typography>
                )}

                <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 2.5 }}>
                    <WtButton ghost onClick={onClose} disabled={saving}>cancel</WtButton>
                    <WtButton onClick={save} disabled={saving || minutes <= 0}>
                        {saving ? 'saving…' : existing ? 'update' : 'log time'}
                    </WtButton>
                </Stack>
            </DialogContent>
        </Dialog>
    );
};

export default LogMeetingTimeDialog;
