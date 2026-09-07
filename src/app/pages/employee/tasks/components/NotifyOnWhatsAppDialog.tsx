/**
 * "Tell them on WhatsApp" — the third assignment channel, and the only manual one.
 *
 * ─── WHY THE SERVER DOES NOT SEND THIS ───────────────────────────────────────
 * Being assigned a task already produces an in-app notification and an email, automatically, the
 * moment the task is saved. This is the channel people actually read, and the requirement was
 * that it come from the ASSIGNER'S OWN NUMBER — a note from a colleague, not another alert from
 * a company account nobody has saved in their contacts. No API can send as somebody's personal
 * WhatsApp, so the honest implementation is a `wa.me` link: it opens the assigner's WhatsApp
 * (app on a phone, Web on a desktop) with the message already typed. Nothing is sent until they
 * press send, which is the point — the message is theirs.
 *
 * ─── ONE TAP PER PERSON, ON PURPOSE ──────────────────────────────────────────
 * A task shared with four people is four separate conversations, and a browser blocks the second
 * and later `window.open` calls of a single gesture anyway. So each row is its own button, and a
 * sent row stays marked so the assigner can see where they got to.
 *
 * The phone number never travels with the task payload — it is fetched per person, from an
 * endpoint that checks the caller may edit this task. A colleague's personal number is not
 * something every viewer of a board should be handed.
 */
import { useState } from 'react';
import { Avatar, Box, Stack, Typography, alpha, useTheme } from '@mui/material';
import { KTIcon } from '@metronic/helpers';
import { GlassDialog, GlassHeader, WtButton, WhatsAppIcon } from '@app/modules/common/components/ui';
import { getTaskWhatsAppNudge } from '@services/tasks';
import { apiErrorMessage, employeeName, initialsOf } from '../taskDomain';

/** One person the task is now on. */
export interface NotifiablePerson {
    employeeId: string;
    name: string;
    avatar?: string | null;
}

/** Turn a task's roster into the rows this dialog shows, owner first, the assigner dropped. */
export const notifiableFromTask = (
    task: {
        assignees?: Array<{
            employeeId: string;
            employee?: { avatar?: string | null; users?: { firstName?: string | null; lastName?: string | null } | null } | null;
        }>;
        assignedToId?: string | null;
        assignedTo?: { id: string; avatar?: string | null; users?: { firstName?: string; lastName?: string } | null } | null;
    },
    // Nobody needs a WhatsApp message about work they just handed out themselves.
    excludeEmployeeId?: string | null,
): NotifiablePerson[] => {
    const rows: NotifiablePerson[] = (task.assignees ?? []).map((a) => ({
        employeeId: a.employeeId,
        name: employeeName(a.employee ?? null),
        avatar: a.employee?.avatar ?? null,
    }));

    // A task saved before the roster existed carries only the owner column.
    if (!rows.length && task.assignedToId) {
        rows.push({
            employeeId: task.assignedToId,
            name: employeeName(task.assignedTo ?? null),
            avatar: task.assignedTo?.avatar ?? null,
        });
    }

    return rows.filter((r) => r.employeeId && r.employeeId !== excludeEmployeeId);
};

type RowState = 'idle' | 'loading' | 'sent' | 'no-number' | 'error';

export const NotifyOnWhatsAppDialog = ({
    open,
    onClose,
    taskId,
    taskName,
    people,
}: {
    open: boolean;
    onClose: () => void;
    taskId: string;
    taskName: string;
    people: NotifiablePerson[];
}) => {
    const theme = useTheme();
    const dark = theme.palette.mode === 'dark';
    const [state, setState] = useState<Record<string, RowState>>({});
    const [errors, setErrors] = useState<Record<string, string>>({});

    const notify = async (person: NotifiablePerson) => {
        setState((prev) => ({ ...prev, [person.employeeId]: 'loading' }));
        try {
            const nudge = await getTaskWhatsAppNudge(taskId, person.employeeId);
            if (!nudge) {
                setState((prev) => ({ ...prev, [person.employeeId]: 'no-number' }));
                return;
            }
            // Opened inside the click's own gesture, so the browser treats it as user-initiated
            // rather than as a popup. `noopener` because we hand no control of this tab away.
            window.open(nudge.url, '_blank', 'noopener,noreferrer');
            setState((prev) => ({ ...prev, [person.employeeId]: 'sent' }));
        } catch (error) {
            setErrors((prev) => ({
                ...prev,
                [person.employeeId]: apiErrorMessage(error, 'Could not prepare that message'),
            }));
            setState((prev) => ({ ...prev, [person.employeeId]: 'error' }));
        }
    };

    return (
        <GlassDialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <GlassHeader
                icon={<KTIcon iconName="message-text-2" className="fs-1" />}
                title="Send a WhatsApp note"
                subtitle={taskName}
                onClose={onClose}
            />

            <Box sx={{ px: 3, pb: 3, pt: 1 }}>
                <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mb: 2 }}>
                    They have already been notified in the app and by email. This opens
                    <strong> your own WhatsApp</strong> with the message written — you decide whether to send it.
                </Typography>

                {people.length === 0 ? (
                    <Typography variant="body2" sx={{ color: 'text.secondary', py: 2 }}>
                        Nobody else is on this task.
                    </Typography>
                ) : (
                    <Stack spacing={1}>
                        {people.map((person) => {
                            const rowState = state[person.employeeId] ?? 'idle';
                            return (
                                <Stack
                                    key={person.employeeId}
                                    direction="row"
                                    spacing={1.25}
                                    alignItems="center"
                                    sx={{
                                        p: 1.25,
                                        borderRadius: 1.5,
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        bgcolor: alpha(theme.palette.text.primary, dark ? 0.05 : 0.028),
                                    }}
                                >
                                    <Avatar
                                        src={person.avatar || undefined}
                                        sx={{ width: 32, height: 32, fontSize: 12, fontWeight: 700 }}
                                    >
                                        {initialsOf(person.name)}
                                    </Avatar>

                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                                            {person.name}
                                        </Typography>
                                        {rowState === 'no-number' && (
                                            <Typography variant="caption" sx={{ color: 'warning.main' }}>
                                                No WhatsApp number on file
                                            </Typography>
                                        )}
                                        {rowState === 'error' && (
                                            <Typography variant="caption" sx={{ color: 'error.main' }}>
                                                {errors[person.employeeId]}
                                            </Typography>
                                        )}
                                        {rowState === 'sent' && (
                                            <Typography variant="caption" sx={{ color: 'success.main' }}>
                                                Opened in WhatsApp
                                            </Typography>
                                        )}
                                    </Box>

                                    <WtButton
                                        size="small"
                                        tone="success"
                                        flat={rowState === 'sent'}
                                        disabled={rowState === 'loading' || rowState === 'no-number'}
                                        onClick={() => void notify(person)}
                                        startIcon={
                                            rowState === 'sent'
                                                ? <KTIcon iconName="check" className="fs-7" />
                                                : <WhatsAppIcon size={14} />
                                        }
                                    >
                                        {rowState === 'sent' ? 'Again' : 'Notify'}
                                    </WtButton>
                                </Stack>
                            );
                        })}
                    </Stack>
                )}

                <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2.5 }}>
                    <WtButton ghost onClick={onClose}>
                        Done
                    </WtButton>
                </Stack>
            </Box>
        </GlassDialog>
    );
};

export default NotifyOnWhatsAppDialog;
