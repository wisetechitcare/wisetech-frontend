import React, { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { Dialog, DialogContent, Stack, Typography, Box } from '@mui/material';
import { KTIcon } from '@metronic/helpers';
import { PlainDialogHeader, WtButton } from '@app/modules/common/components/ui';
import { getMyMeetingReminders, setMyMeetingReminders } from '@services/employee';
import { errorConfirmation, successConfirmation } from '@utils/modal';
import { apiErrorMessage } from '@app/pages/employee/tasks/taskDomain';

/**
 * The notice periods on offer.
 *
 * A short list of the answers people actually give, not a number box: "how many minutes
 * before?" is a question with about five real answers, and typing one is slower than picking
 * it. A day ahead is included because that is when you prepare, not when you walk in.
 */
const CHOICES = [
    { minutes: 10, label: '10 minutes' },
    { minutes: 20, label: '20 minutes' },
    { minutes: 30, label: '30 minutes' },
    { minutes: 60, label: '1 hour' },
    { minutes: 120, label: '2 hours' },
    { minutes: 1440, label: '1 day' },
];

export interface MeetingRemindersDialogProps {
    open: boolean;
    onClose: () => void;
    onSaved?: () => void;
    employeeId: string;
    meeting: { id: string; title: string; startDate: string } | null;
}

/**
 * "Remind me before this meeting."
 *
 * ─── YOURS, NOT THE MEETING'S ────────────────────────────────────────────────
 * Every person on a meeting sets their own. The organizer who needs twenty minutes to prepare
 * and the attendee who needs to walk down a corridor are both right, and one shared setting
 * makes one of them wrong — so this dialog only ever reads and writes the CALLER's reminders,
 * and is open to anyone on the meeting rather than to whoever may edit it.
 *
 * A reminder that has already fired is shown as sent and cannot be unpicked: removing it would
 * let it re-arm and buzz somebody a second time about a meeting they have already been told
 * about, which is the one thing a reminder must never do.
 */
const MeetingRemindersDialog: React.FC<MeetingRemindersDialogProps> = ({
    open, onClose, onSaved, employeeId, meeting,
}) => {
    const [picked, setPicked] = useState<number[]>([]);
    const [sent, setSent] = useState<number[]>([]);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!open || !meeting) return;
        let cancelled = false;
        setLoading(true);
        getMyMeetingReminders(meeting.id, employeeId)
            .then((res: any) => {
                if (cancelled) return;
                const rows = (res?.data ?? []) as Array<{ minutesBefore: number; sent: boolean }>;
                setPicked(rows.map((r) => r.minutesBefore));
                setSent(rows.filter((r) => r.sent).map((r) => r.minutesBefore));
            })
            .catch(() => { if (!cancelled) { setPicked([]); setSent([]); } })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
        // Keyed on the meeting's ID, not the object: a re-render that hands us an equal-but-new
        // meeting must not refetch and wipe what the reader has just ticked.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, meeting?.id, employeeId]);

    const toggle = (minutes: number) => {
        if (sent.includes(minutes)) return;
        setPicked((cur) => (cur.includes(minutes) ? cur.filter((m) => m !== minutes) : [...cur, minutes]));
    };

    const save = async () => {
        if (!meeting) return;
        setSaving(true);
        try {
            await setMyMeetingReminders(meeting.id, employeeId, picked);
            successConfirmation(picked.length ? 'Reminders saved' : 'Reminders turned off');
            onSaved?.();
            onClose();
        } catch (error) {
            errorConfirmation(apiErrorMessage(error, 'Could not save your reminders.'));
        } finally {
            setSaving(false);
        }
    };

    const startsIn = meeting ? dayjs(meeting.startDate) : null;
    const past = !!startsIn && startsIn.isBefore(dayjs());

    return (
        <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="xs" fullWidth
            PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>
            <PlainDialogHeader
                icon={<KTIcon iconName="notification-bing" className="fs-2" />}
                title="Remind me"
                subtitle={meeting
                    ? `${meeting.title} · ${dayjs(meeting.startDate).format('ddd DD MMM, h:mm A')}`
                    : undefined}
                onClose={saving ? undefined : onClose}
                closeIcon={<KTIcon iconName="cross" className="fs-3" />}
            />

            <DialogContent sx={{ p: 2.5 }}>
                <Typography variant="caption" sx={{ display: 'block', mb: 1.5, color: 'text.secondary' }}>
                    Only you get these. Everyone on the meeting sets their own.
                </Typography>

                {past && (
                    <Typography variant="caption" sx={{ display: 'block', mb: 1.5, color: 'warning.main' }}>
                        This meeting has already started, so new reminders will not fire.
                    </Typography>
                )}

                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                    {CHOICES.map((c) => {
                        const on = picked.includes(c.minutes);
                        const done = sent.includes(c.minutes);
                        return (
                            <Box
                                key={c.minutes}
                                component="button"
                                type="button"
                                disabled={loading || done}
                                onClick={() => toggle(c.minutes)}
                                title={done ? 'Already sent' : undefined}
                                sx={{
                                    px: 1.5, py: 0.75, borderRadius: 2, cursor: done ? 'default' : 'pointer',
                                    fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
                                    border: '1px solid',
                                    borderColor: on ? 'primary.main' : 'divider',
                                    // Picked reads as filled, unpicked as an outline — the two
                                    // states have to differ in more than a shade, or a row of
                                    // chips becomes a puzzle about which are on.
                                    bgcolor: on ? 'primary.main' : 'background.paper',
                                    color: on ? 'primary.contrastText' : 'text.primary',
                                    opacity: done ? 0.55 : 1,
                                    display: 'inline-flex', alignItems: 'center', gap: 0.75,
                                }}
                            >
                                {c.label}
                                {done && <KTIcon iconName="check" className="fs-8" />}
                            </Box>
                        );
                    })}
                </Stack>

                {sent.length > 0 && (
                    <Typography variant="caption" sx={{ display: 'block', mt: 1.5, color: 'text.secondary' }}>
                        Ticked reminders have already been sent and cannot be removed.
                    </Typography>
                )}

                <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 2.5 }}>
                    <WtButton ghost onClick={onClose} disabled={saving}>cancel</WtButton>
                    <WtButton onClick={save} disabled={saving || loading}>
                        {saving ? 'saving…' : 'save'}
                    </WtButton>
                </Stack>
            </DialogContent>
        </Dialog>
    );
};

export default MeetingRemindersDialog;
