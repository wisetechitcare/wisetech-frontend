/**
 * Task UI primitives (Phase 4 §20).
 *
 * Small, theme-aware pieces every task surface composes from — badges, progress, avatars,
 * states. They exist so a stage chip on a Kanban card, a table row and a detail header are
 * literally the same component: the old module drew each of those three times with different
 * hex codes, which is why the board and the table never quite matched.
 *
 * **No hardcoded colours.** Everything resolves through the MUI theme or a stage's own
 * configured colour, so light and dark both work without a second stylesheet.
 */
import { Box, Chip, LinearProgress, Stack, Tooltip, Typography, Avatar, alpha, useTheme } from '@mui/material';
import { KTIcon } from '@metronic/helpers';
import {
    TaskScope, TaskStatusRef, employeeName, initialsOf, clampProgress, dueLabel, isTaskOverdue, isTaskFinal,
} from '../taskDomain';

// ─────────────────────────────────────────────────────────────────────────────
// Scope
// ─────────────────────────────────────────────────────────────────────────────

/**
 * PROJECT vs GENERAL, always stated explicitly.
 *
 * §6: the user must never have to infer scope from a missing project. A GENERAL task says so on
 * its face, because "internal work" and "a project task whose project failed to load" look
 * identical otherwise.
 */
export const TaskScopeBadge = ({ scope, size = 'small' }: { scope: TaskScope; size?: 'small' | 'medium' }) => {
    const theme = useTheme();
    const isProject = scope === 'PROJECT';
    const color = isProject ? theme.palette.primary.main : theme.palette.secondary.main;
    return (
        <Chip
            size={size}
            label={isProject ? 'PROJECT' : 'GENERAL'}
            sx={{
                height: size === 'small' ? 18 : 24,
                fontSize: size === 'small' ? 9.5 : 11,
                fontWeight: 700,
                letterSpacing: '.06em',
                borderRadius: 0.75,
                color,
                bgcolor: alpha(color, theme.palette.mode === 'dark' ? 0.18 : 0.1),
                border: `1px solid ${alpha(color, 0.28)}`,
                '& .MuiChip-label': { px: 0.75 },
            }}
        />
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// Stage + priority
// ─────────────────────────────────────────────────────────────────────────────

/** A configured stage, in its configured colour. Falls back to the theme when none is set. */
export const TaskStatusBadge = ({ status }: { status?: TaskStatusRef | null }) => {
    const theme = useTheme();
    if (!status) {
        return (
            <Typography variant="caption" sx={{ color: 'text.disabled', fontStyle: 'italic' }}>
                No stage
            </Typography>
        );
    }
    const color = status.color || theme.palette.info.main;
    return (
        <Chip
            size="small"
            icon={status.isFinal ? <KTIcon iconName="check-circle" className="fs-8" /> : undefined}
            label={status.name}
            sx={{
                height: 22,
                fontSize: 11,
                fontWeight: 600,
                borderRadius: 0.75,
                color,
                bgcolor: alpha(color, theme.palette.mode === 'dark' ? 0.2 : 0.12),
                border: `1px solid ${alpha(color, 0.3)}`,
                '& .MuiChip-icon': { color, ml: 0.5, mr: -0.25 },
            }}
        />
    );
};

export const TaskPriorityBadge = ({
    priority,
}: {
    priority?: { name: string; color?: string | null } | null;
}) => {
    const theme = useTheme();
    if (!priority) return null;
    const color = priority.color || theme.palette.text.secondary;
    return (
        <Stack direction="row" spacing={0.5} alignItems="center">
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: color, flexShrink: 0 }} />
            <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                {priority.name}
            </Typography>
        </Stack>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// Progress
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Progress bar. Colour tracks completion, so a glance across a board reads as a heat map rather
 * than a wall of identical blue.
 */
export const TaskProgress = ({
    value,
    showLabel = true,
    height = 5,
}: {
    value: number | null | undefined;
    showLabel?: boolean;
    height?: number;
}) => {
    const theme = useTheme();
    const pct = clampProgress(value);
    const color =
        pct >= 100 ? theme.palette.success.main
        : pct >= 50 ? theme.palette.primary.main
        : pct > 0 ? theme.palette.warning.main
        : theme.palette.text.disabled;

    return (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
            <LinearProgress
                variant="determinate"
                value={pct}
                sx={{
                    flex: 1,
                    minWidth: 0,
                    height,
                    borderRadius: height,
                    // `!important` is required, not sloppiness: src/main.css hardcodes
                    //   .MuiLinearProgress-root { background-color: #FECACA !important }
                    //   .MuiLinearProgress-bar  { background-color: #1E3A8A !important }
                    // globally, which is why every task progress bar rendered on a pink track and
                    // ignored its completion colour. That global rule also breaks dark mode
                    // app-wide — worth removing, but it reaches screens beyond this module, so it
                    // is overridden here rather than deleted from under them.
                    backgroundColor: `${alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.14 : 0.09)} !important`,
                    '& .MuiLinearProgress-bar': {
                        backgroundColor: `${color} !important`,
                        borderRadius: height,
                    },
                }}
            />
            {showLabel && (
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', minWidth: 30, textAlign: 'right' }}>
                    {pct}%
                </Typography>
            )}
        </Stack>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// People
// ─────────────────────────────────────────────────────────────────────────────

export const AssigneeAvatar = ({
    employee,
    size = 22,
    showName = false,
}: {
    employee?: { avatar?: string | null; users?: { firstName?: string; lastName?: string } | null } | null;
    size?: number;
    showName?: boolean;
}) => {
    const theme = useTheme();
    const name = employeeName(employee);
    const unassigned = name === 'Unassigned';
    return (
        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
            <Tooltip title={name}>
                <Avatar
                    src={employee?.avatar || undefined}
                    sx={{
                        width: size,
                        height: size,
                        fontSize: size * 0.42,
                        fontWeight: 700,
                        // Same brand-blue circle as the employee ID card, so people read as
                        // one visual system across the app.
                        bgcolor: unassigned
                            ? alpha(theme.palette.text.primary, 0.1)
                            : alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.3 : 0.16),
                        color: unassigned ? 'text.disabled' : theme.palette.primary.main,
                        border: unassigned ? 'none' : `1.5px solid ${alpha(theme.palette.primary.main, 0.35)}`,
                    }}
                >
                    {initialsOf(name)}
                </Avatar>
            </Tooltip>
            {showName && (
                <Typography variant="caption" noWrap sx={{ color: 'text.secondary', minWidth: 0 }}>
                    {name}
                </Typography>
            )}
        </Stack>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// Due date
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Due date with overdue emphasis.
 *
 * Overdue is computed from `isFinal`, never from a status name — a cancelled or completed task
 * is not late, it has stopped.
 */
export const TaskDueDate = ({
    task,
    now,
}: {
    task: { dueDate?: string | null; status?: TaskStatusRef | null };
    now: Date;
}) => {
    const theme = useTheme();
    const label = dueLabel(task.dueDate, now);
    if (!label) return null;
    const overdue = isTaskOverdue(task, now);
    return (
        <Stack direction="row" spacing={0.4} alignItems="center" sx={{ minWidth: 0 }}>
            <KTIcon
                iconName={overdue ? 'information-5' : 'calendar'}
                className="fs-8"
                // KTIcon has no colour prop; the wrapper carries it.
            />
            <Typography
                variant="caption"
                noWrap
                sx={{ fontWeight: overdue ? 700 : 500, color: overdue ? theme.palette.error.main : 'text.secondary' }}
            >
                {label}
            </Typography>
        </Stack>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// States — §23
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The one empty/error/unauthorized state used everywhere in the module.
 *
 * §23 requires every view to handle loading, empty, error and unauthorized. One component means
 * they cannot drift into four differently-worded blank screens.
 */
export const TaskStateBlock = ({
    icon = 'information-5',
    title,
    description,
    action,
    tone = 'neutral',
    compact = false,
}: {
    icon?: string;
    title: string;
    description?: string;
    action?: React.ReactNode;
    tone?: 'neutral' | 'error';
    compact?: boolean;
}) => {
    const theme = useTheme();
    const color = tone === 'error' ? theme.palette.error.main : theme.palette.primary.main;
    return (
        <Stack
            alignItems="center"
            justifyContent="center"
            spacing={1}
            sx={{ py: compact ? 3 : 6, px: 2, textAlign: 'center' }}
        >
            <Box
                sx={{
                    width: 44, height: 44, borderRadius: 2,
                    display: 'grid', placeItems: 'center',
                    bgcolor: alpha(color, theme.palette.mode === 'dark' ? 0.16 : 0.08),
                    color,
                }}
            >
                <KTIcon iconName={icon} className="fs-2" />
            </Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                {title}
            </Typography>
            {description && (
                <Typography variant="caption" sx={{ color: 'text.secondary', maxWidth: 380 }}>
                    {description}
                </Typography>
            )}
            {action}
        </Stack>
    );
};

/** Terminal-stage tick. Derived from `isFinal`, so renaming a stage cannot break it. */
export const FinalStageMark = ({ task }: { task: { status?: TaskStatusRef | null } }) => {
    const theme = useTheme();
    if (!isTaskFinal(task)) return null;
    return (
        <Tooltip title="Terminal stage">
            <Box sx={{ color: theme.palette.success.main, display: 'inline-flex' }}>
                <KTIcon iconName="check-circle" className="fs-7" />
            </Box>
        </Tooltip>
    );
};
