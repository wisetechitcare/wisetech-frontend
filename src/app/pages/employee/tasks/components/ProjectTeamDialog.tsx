/**
 * "Project team" — everyone on the project the board is showing.
 *
 * Opened from the avatar stack in the board header, which is a preview: the rail payload carries
 * at most six faces plus the true headcount, so the stack can say "+7" but cannot say WHO. This
 * dialog answers that, and is the only place that asks the server for the rest.
 *
 * ─── SEEDED, THEN FILLED ─────────────────────────────────────────────────────
 * It opens showing the faces the header already had and swaps in the full list when it arrives.
 * A spinner would be the honest thing only if we had nothing — we have most of a small team, and
 * an empty dialog that fills in half a second reads as slower than one that was already there.
 *
 * Managers sort first (server-side, from `LeadProjectManager`), so the list answers "who runs
 * this" before "who else is on it".
 */
import { useMemo, useState } from 'react';
import {
    Box, Chip, CircularProgress, Stack, TextField, Tooltip, Typography, alpha, useTheme,
} from '@mui/material';
import { KTIcon } from '@metronic/helpers';
import { GlassDialog, GlassHeader, confirmDialog, toast } from '@app/modules/common/components/ui';
import { useProjectTeam, useRemoveProjectTeamMember, usePromoteProjectManager } from '../useTaskQueries';
import { employeeName, apiErrorMessage } from '../taskDomain';
import { AssigneeAvatar, TaskStateBlock, type TeamMemberRef } from './primitives';

/** What the server sends for a team member. A superset of the rail's preview shape. */
export interface ProjectTeamMember extends TeamMemberRef {
    // `personalEmailId`, not `email`: that is the column name on the Users model, and
    // selecting `email` is what made this endpoint's sibling fail at the Prisma layer.
    users?: { firstName?: string | null; lastName?: string | null; personalEmailId?: string | null } | null;
    designations?: { role?: string | null } | null;
    isManager?: boolean;
    isPrimaryManager?: boolean;
    /** Their open work ON THIS PROJECT — what removal would set adrift. */
    assignedTaskCount?: number;
    /** True on the row for the person looking at the dialog. */
    isSelf?: boolean;
}

/**
 * One row action — icon only, with the sentence on hover.
 *
 * Icon-only because two labelled buttons on every row turn a roster into a wall of verbs, and
 * because these are secondary to the thing the dialog is FOR (seeing who is on the project). The
 * tooltip and the `aria-label` carry the same full sentence, so the meaning is one hover or one
 * screen-reader stop away — never guessed from a glyph.
 *
 * Tone-coloured rather than grey: promotion and removal are not the same kind of act, and the
 * colour is the fastest way to say so before either is pressed.
 */
const RowAction = ({
    icon, label, tone, busy, disabled, onClick,
}: {
    icon: string;
    label: string;
    tone: 'primary' | 'error';
    busy?: boolean;
    disabled?: boolean;
    onClick: () => void;
}) => {
    const theme = useTheme();
    const dark = theme.palette.mode === 'dark';
    const color = theme.palette[tone].main;
    return (
        <Tooltip title={label}>
            {/* A span, because a disabled button fires no events and MUI's tooltip would go
                silent exactly when the user most wants to know why nothing happens. */}
            <span>
                <Box
                    component="button"
                    type="button"
                    aria-label={label}
                    disabled={disabled}
                    onClick={onClick}
                    sx={{
                        width: 32, height: 32, borderRadius: 1.25, lineHeight: 0,
                        display: 'grid', placeItems: 'center',
                        cursor: disabled ? 'default' : 'pointer',
                        // Contrast that does not depend on what is behind it. This dialog is
                        // glass over a user-chosen board backdrop, so a 7%-alpha tint on a
                        // 28%-alpha border disappeared against a light one: the fill is now a
                        // solid paper surface and the glyph is the tone at full strength.
                        border: '1.5px solid',
                        borderColor: alpha(color, 0.55),
                        bgcolor: 'background.paper',
                        color,
                        boxShadow: `0 1px 2px ${alpha(theme.palette.common.black, dark ? 0.5 : 0.12)}`,
                        transition: 'background-color .15s, border-color .15s, color .15s',
                        '&:hover': { bgcolor: color, borderColor: color, color: theme.palette.common.white },
                        '&:disabled': { opacity: 0.45 },
                        '&:focus-visible': { outline: `2px solid ${color}`, outlineOffset: 1 },
                    }}
                >
                    {busy
                        ? <CircularProgress size={13} color="inherit" />
                        // Plain duotone — the ONLY icon font this build ships (there is no
                        // `ki-solid` stylesheet, so asking for solid renders nothing at all).
                        // These glyphs were invisible because `icons-config/icons.ts` was missing
                        // their path counts, which is fixed at the source rather than worked
                        // around here.
                        : <KTIcon iconName={icon} className="fs-4" />}
                </Box>
            </span>
        </Tooltip>
    );
};

export interface ProjectTeamDialogProps {
    open: boolean;
    onClose: () => void;
    projectId?: string;
    projectTitle?: string | null;
    /** The header's faces, shown until the full list lands. */
    seed?: TeamMemberRef[];
    /** True headcount from the rail, so the subtitle is right before the fetch returns. */
    totalCount?: number;
}

export const ProjectTeamDialog = ({
    open, onClose, projectId, projectTitle, seed = [], totalCount,
}: ProjectTeamDialogProps) => {
    const theme = useTheme();
    const [search, setSearch] = useState('');
    // Only while open: a dialog nobody has asked for should not be issuing requests.
    const teamQuery = useProjectTeam(projectId, open);
    const removeMember = useRemoveProjectTeamMember();
    const promoteMember = usePromoteProjectManager();
    /** Which row is mid-action, and which action, so only that row shows a spinner. */
    const [busy, setBusy] = useState<{ id: string; action: 'remove' | 'promote' } | null>(null);

    /**
     * Whether THIS caller may change the roster, answered by the server with the same rule its
     * write path enforces. Never inferred from a permission in the browser: a project manager
     * holds this over their own projects and no client-side check knows which those are.
     */
    const canManage: boolean = teamQuery.data?.canManage === true;

    const askRemove = async (member: ProjectTeamMember) => {
        if (!projectId) return;
        const name = employeeName(member);
        const count = member.assignedTaskCount ?? 0;
        const ok = await confirmDialog({
            icon: 'warning',
            title: `Remove ${name}?`,
            // The consequence, stated in numbers, before the button is pressed.
            text: count
                ? `They will come off this project's team, and their ${count} task${count === 1 ? '' : 's'} here will be left unassigned. Nothing is deleted.`
                : `They will come off this project's team. They have no tasks on this project.`,
            confirmText: 'Remove from team',
            danger: true,
        });
        if (!ok) return;

        setBusy({ id: member.id, action: 'remove' });
        try {
            const result = await removeMember.mutateAsync({ projectId, employeeId: member.id });
            const freed = result?.unassignedTaskCount ?? 0;
            void toast({
                icon: 'success',
                title: `${name} removed from the team`,
                text: freed
                    ? `${freed} task${freed === 1 ? '' : 's'} on this project ${freed === 1 ? 'is' : 'are'} now unassigned.`
                    : undefined,
                timer: 3200,
            });
        } catch (error) {
            void toast({
                icon: 'error',
                title: 'Could not remove them',
                // The server's own reason names the case — a project manager, or no authority.
                text: apiErrorMessage(error, 'Nothing was changed.'),
                timer: 4200,
            });
        } finally {
            setBusy(null);
        }
    };

    const askPromote = async (member: ProjectTeamMember) => {
        if (!projectId) return;
        const name = employeeName(member);
        const ok = await confirmDialog({
            icon: 'question',
            title: `Make ${name} a project manager?`,
            // What the promotion actually hands over, in the terms the app enforces elsewhere.
            text: `They will be able to create and assign tasks on ${projectTitle || 'this project'}, and to change its team. This is the same change as adding them as a manager in the project itself.`,
            confirmText: 'Promote to manager',
        });
        if (!ok) return;

        setBusy({ id: member.id, action: 'promote' });
        try {
            await promoteMember.mutateAsync({ projectId, employeeId: member.id });
            void toast({
                icon: 'success',
                title: `${name} is now a project manager`,
                text: 'The change also shows in the project itself.',
                timer: 3200,
            });
        } catch (error) {
            void toast({
                icon: 'error',
                title: 'Could not promote them',
                text: apiErrorMessage(error, 'Nothing was changed.'),
                timer: 4200,
            });
        } finally {
            setBusy(null);
        }
    };

    const fetched: ProjectTeamMember[] = teamQuery.data?.members ?? [];
    // The seed is a strict subset of the real answer, so it is a placeholder, never a merge —
    // merging the two would show a member twice under two different sort positions.
    const members: ProjectTeamMember[] = fetched.length ? fetched : seed;
    const settling = teamQuery.isLoading && !fetched.length;

    const q = search.trim().toLowerCase();
    const shown = useMemo(
        () => (!q ? members : members.filter((m) => {
            const email = m.users?.personalEmailId?.toLowerCase() ?? '';
            return employeeName(m).toLowerCase().includes(q)
                || email.includes(q)
                || (m.designations?.role ?? '').toLowerCase().includes(q);
        })),
        [members, q],
    );

    // The rail's count is authoritative until the fetch lands, because the seed is capped.
    const headcount = fetched.length || totalCount || members.length;
    // Searching a list of six is noise; searching a list of thirty is the only way to use it.
    const searchable = members.length > 8;

    return (
        <GlassDialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            header={
                <GlassHeader
                    title="Project team"
                    subtitle={
                        `${headcount} ${headcount === 1 ? 'person' : 'people'}`
                        + (projectTitle ? ` on ${projectTitle}` : '')
                    }
                    icon={<KTIcon iconName="people" className="fs-1" />}
                    onClose={onClose}
                />
            }
        >
            <Box className="min-h-0 flex-1 overflow-y-auto" sx={{ maxHeight: { xs: 'none', sm: '65vh' }, p: 2 }}>
                {searchable && (
                    <TextField
                        fullWidth size="small" value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search this team…"
                        sx={{ mb: 1.5, '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                    />
                )}

                {settling && (
                    <Stack alignItems="center" sx={{ py: 4 }}><CircularProgress size={22} /></Stack>
                )}

                {!settling && !members.length && (
                    <TaskStateBlock
                        icon="people" title="No team on this project yet"
                        description="People appear here once they are added to the project's internal team or made a project manager."
                    />
                )}

                {!settling && !!members.length && !shown.length && (
                    <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', textAlign: 'center', py: 3 }}>
                        Nobody matches “{search}”
                    </Typography>
                )}

                <Stack spacing={0.25}>
                    {shown.map((m) => (
                        <Stack
                            key={m.id} direction="row" spacing={1.25} alignItems="center"
                            sx={{
                                px: 1, py: 0.9, borderRadius: 1.5,
                                '&:hover': { bgcolor: 'action.hover' },
                            }}
                        >
                            <AssigneeAvatar employee={m} size={34} />

                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
                                    <Typography variant="body2" noWrap sx={{ fontWeight: 600, color: 'text.primary' }}>
                                        {employeeName(m)}
                                    </Typography>
                                    {m.isManager && (
                                        <Chip
                                            size="small"
                                            label={m.isPrimaryManager ? 'PRIMARY PM' : 'PROJECT MANAGER'}
                                            sx={{
                                                height: 16, fontSize: 8.5, fontWeight: 700, letterSpacing: '.05em',
                                                borderRadius: 0.5, flexShrink: 0,
                                                bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.22 : 0.12),
                                                color: theme.palette.primary.main,
                                                '& .MuiChip-label': { px: 0.6 },
                                            }}
                                        />
                                    )}
                                </Stack>
                                {/* Designation, then email — the second only when the first is
                                    missing, so a row never becomes two lines of grey text. */}
                                <Typography variant="caption" noWrap sx={{ color: 'text.secondary', display: 'block' }}>
                                    {m.designations?.role || m.users?.personalEmailId || '—'}
                                    {!!m.assignedTaskCount && ` · ${m.assignedTaskCount} task${m.assignedTaskCount === 1 ? '' : 's'} here`}
                                </Typography>
                            </Box>

                            {/* Remove, where the team is actually looked at.
                                Editing the roster otherwise means opening the project itself,
                                which is far enough away that stale members simply stay.

                                Managers are exempt: a manager row carries authority over the
                                project — possibly the remover's own — so taking one away is a
                                project-settings decision, and the API refuses it here too. */}
                            {/* Not for managers (their row already carries project authority, and
                                removing one can strip the caller's own), and not for yourself.
                                The API refuses both cases too — this only avoids offering them. */}
                            {canManage && !m.isManager && !m.isSelf && (
                                <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
                                    <RowAction
                                        tone="primary"
                                        icon="crown-2"
                                        label={`Make ${employeeName(m)} a project manager`}
                                        busy={busy?.id === m.id && busy.action === 'promote'}
                                        disabled={!!busy}
                                        onClick={() => void askPromote(m)}
                                    />
                                    <RowAction
                                        tone="error"
                                        icon="trash"
                                        label={`Remove ${employeeName(m)} from this project's team`}
                                        busy={busy?.id === m.id && busy.action === 'remove'}
                                        disabled={!!busy}
                                        onClick={() => void askRemove(m)}
                                    />
                                </Stack>
                            )}
                        </Stack>
                    ))}
                </Stack>

                {/* An error must not look like an empty team: one means "nobody is on this
                    project", the other means "we could not find out". */}
                {teamQuery.isError && (
                    <Typography variant="caption" sx={{ color: 'error.main', display: 'block', textAlign: 'center', pt: 2 }}>
                        The full team could not be loaded. Showing the people the board already knew about.
                    </Typography>
                )}
            </Box>
        </GlassDialog>
    );
};

export default ProjectTeamDialog;
