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
import { Box, Chip, LinearProgress, Stack, Tooltip, Typography, Avatar, AvatarGroup, alpha, useTheme } from '@mui/material';
import { KTIcon } from '@metronic/helpers';
import { TimeWheelField } from '@app/modules/common/components/TimeWheelField';
import { EASE_200, IconBox, SHADOW_HOVER, SHADOW_REST, TRIO, toneSurface, type Trio } from '@app/modules/common/components/ui/patterns';
import {
    TaskScope, TaskStatusRef, employeeName, initialsOf, clampProgress, dueLabel, isTaskOverdue, isTaskFinal,
} from '../taskDomain';

/**
 * A labelled TimeWheelField. The wheel is a bare control by design — every other field in this
 * column carries a floating label, so one is put above it here rather than teaching the kit
 * component about labels it does not need anywhere else.
 *
 * Each of the three times gets its OWN tone, carried by the label and by the wheel's selection.
 * Three identical controls in a row, all reading `12:00`, are three chances to set the wrong
 * one; the colour is what tells them apart before the label is read. `tone` is a prop the kit
 * component already had — every caller was just taking its blue default.
 *
 * The clock ahead of the label is the same shape the meeting form and the leave policy modal
 * already put in front of theirs — this was the one time field in the app whose label was bare
 * text, so a row of them read as three unmarked boxes rather than three clocks.
 */
export const LabelledTimeField = ({ label, value, onChange, disabled, trio }: {
    label: string; value: string; onChange: (v: string) => void; disabled?: boolean; trio: Trio;
}) => (
    <>
        <Stack direction="row" spacing={0.6} alignItems="center" sx={{ mb: 0.5 }}>
            <Box sx={{ color: trio.c, lineHeight: 0 }}>
                <KTIcon iconName="time" className="fs-7" />
            </Box>
            <Typography variant="caption" sx={{ color: trio.c, fontWeight: 700 }}>
                {label}
            </Typography>
        </Stack>
        <TimeWheelField value={value} onChange={onChange} disabled={disabled} tone={trio} />
    </>
);

// ─────────────────────────────────────────────────────────────────────────────
// Form section heading
// ─────────────────────────────────────────────────────────────────────────────

/** Reuses the kit's shared accent palette rather than restating hex — the same trios the
 *  leave cards, the shift tiles and the addon modal are coloured from. */
export type SectionTone = keyof typeof TRIO;

/**
 * A form section's heading: a tinted icon plate, a real title, and an optional line under it.
 *
 * Replaces a bare 10px uppercase caption. On a long dialog those captions gave the eye nothing
 * to catch — every section carried the same visual weight as the field labels beneath it, so
 * the form read as one undifferentiated column of inputs.
 *
 * A HEADING, not a card. The section keeps its plain background: boxing each one turned a form
 * into a stack of panels, which reads as three separate things to fill in rather than one form
 * with three parts. The card treatment belongs to the choice tiles, which ARE separate things.
 */
export const FormSectionHead = ({
    icon, title, hint, tone = 'blue',
}: { icon: string; title: string; hint?: string; tone?: SectionTone }) => {
    const trio = TRIO[tone];
    return (
        <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 1.25 }}>
            <IconBox icon={icon} trio={trio} size={34} fs="fs-4" />
            <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontWeight: 700, fontSize: 15, lineHeight: 1.2, color: 'text.primary' }}>
                    {title}
                </Typography>
                {hint && (
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.125 }}>
                        {hint}
                    </Typography>
                )}
            </Box>
        </Stack>
    );
};

/**
 * The card physics the configuration screens use, for a tile that is a CHOICE.
 *
 * A coloured top edge at rest with the rest of the border a tint of it, and the whole border
 * taking that colour as the pointer enters — the leave card's own behaviour (AddonLeavesModal,
 * DailyShiftTime), so a choice in a dialog and a card on a config screen feel like the same
 * control. `selected` keeps the accent border regardless of the pointer.
 */
export const choiceCardSx = (tone: SectionTone, dark: boolean, selected: boolean, disabled = false) => {
    const trio = TRIO[tone];
    const t = toneSurface(trio, dark);
    return {
        border: `1px solid ${selected ? trio.c : t.bd}`,
        borderTop: `3.5px solid ${trio.c}`,
        borderRadius: 2.5,
        bgcolor: selected ? t.bg : 'background.paper',
        boxShadow: selected ? SHADOW_HOVER : SHADOW_REST,
        transition: EASE_200,
        ...(disabled ? {} : { '&:hover': { borderColor: trio.c, boxShadow: SHADOW_HOVER } }),
    };
};

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
    // Nullable name parts, matching `employeeName()` and what the API actually sends — a
    // narrower type here forced every caller holding a real payload to cast.
    employee?: { avatar?: string | null; users?: { firstName?: string | null; lastName?: string | null } | null } | null;
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

export interface TeamMemberRef {
    id: string;
    avatar?: string | null;
    users?: { firstName?: string | null; lastName?: string | null } | null;
}

/**
 * A team, as a stack of faces — the people who can actually be assigned on a project.
 *
 * Lives here rather than beside the surface that happens to draw it: it started in the project
 * rail's rows, where it repeated the same three faces down the whole list and said nothing about
 * the project you were actually looking at. It now sits once in the board header, on the SELECTED
 * project, which is the only place the answer is worth screen space. A primitive, so moving it
 * again is moving one JSX line.
 *
 * `total` is the real headcount, which may exceed `members.length` — the API sends a preview of
 * the team plus a count, so the "+N" is honest about people it never sent.
 */
export const TeamAvatars = ({
    members,
    total,
    size = 24,
    max = 3,
    onClick,
    label = 'View the project team',
}: {
    members: TeamMemberRef[];
    /** Full headcount. Defaults to what was passed when the API sent no separate count. */
    total?: number;
    size?: number;
    max?: number;
    /** Makes the stack a button — the faces are a preview, and the click is how you see the rest. */
    onClick?: () => void;
    /** Tooltip and accessible name for the clickable form. */
    label?: string;
}) => {
    const theme = useTheme();
    if (!members.length) return null;

    const group = (
        <AvatarGroup
            max={max}
            total={total ?? members.length}
            sx={{
                '& .MuiAvatar-root': {
                    width: size, height: size, fontSize: size * 0.42, fontWeight: 700,
                    borderColor: theme.palette.background.paper,
                    bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.3 : 0.16),
                    color: theme.palette.primary.main,
                },
            }}
        >
            {members.map((m) => {
                const name = employeeName(m);
                return (
                    // The per-face tooltip is dropped in the clickable form: a tooltip on each
                    // avatar and another on the button underneath fight each other, and the one
                    // that matters is the one naming what the click does.
                    onClick ? (
                        <Avatar key={m.id} src={m.avatar || undefined} alt={name}>{initialsOf(name)}</Avatar>
                    ) : (
                        <Tooltip key={m.id} title={name}>
                            <Avatar src={m.avatar || undefined} alt={name}>{initialsOf(name)}</Avatar>
                        </Tooltip>
                    )
                );
            })}
        </AvatarGroup>
    );

    if (!onClick) return group;

    return (
        <Tooltip title={label}>
            <Box
                component="button" type="button" onClick={onClick} aria-label={label}
                sx={{
                    border: 0, p: 0.25, bgcolor: 'transparent', cursor: 'pointer',
                    borderRadius: 999, display: 'inline-flex', alignItems: 'center',
                    transition: 'background-color .15s, transform .15s',
                    '&:hover': {
                        bgcolor: alpha(theme.palette.primary.main, 0.08),
                        // A stack that lifts slightly is the affordance — an avatar row is not
                        // otherwise something anyone expects to be able to press.
                        transform: 'translateY(-1px)',
                    },
                    '&:focus-visible': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: 2 },
                }}
            >
                {group}
            </Box>
        </Tooltip>
    );
};

/** A task's roster row, as every task payload carries it. */
export interface TaskAssigneeRef {
    employeeId: string;
    isOwner: boolean;
    employee?: {
        id: string;
        avatar?: string | null;
        users?: { firstName?: string | null; lastName?: string | null } | null;
    } | null;
}

/**
 * The people on a task — owner first, then everyone it is shared with.
 *
 * One component so a card, a table row and the detail header cannot disagree about who is on a
 * task or which of them owns it. Falls back to the single `assignedTo` for rows saved before
 * tasks could be shared, so an old task still shows its assignee instead of nothing.
 */
export const TaskAssignees = ({
    assignees,
    fallback,
    size = 24,
    max = 3,
    showName = false,
}: {
    assignees?: TaskAssigneeRef[];
    /** The legacy single assignee, used when the roster is absent. */
    fallback?: TeamMemberRef | null;
    size?: number;
    max?: number;
    /** Name the owner in full — for surfaces with room, like the detail page. */
    showName?: boolean;
}) => {
    const people = (assignees ?? [])
        .slice()
        .sort((a, b) => Number(b.isOwner) - Number(a.isOwner));

    if (!people.length) return <AssigneeAvatar employee={fallback} size={size} showName={showName} />;

    const owner = people[0];
    const shared = people.slice(1);

    // One person is just an assignee — no stack, no "+0", nothing to explain.
    if (!shared.length) {
        return <AssigneeAvatar employee={owner.employee} size={size} showName={showName} />;
    }

    return (
        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
            {/* The owner is drawn at full size and first; the others follow as a stack, so
                "who answers for this" survives being one of five faces. */}
            <AssigneeAvatar employee={owner.employee} size={size} />
            <TeamAvatars
                members={shared.map((a) => ({
                    id: a.employeeId,
                    avatar: a.employee?.avatar,
                    users: a.employee?.users,
                }))}
                size={size - 2}
                max={max}
            />
            {showName && (
                <Typography variant="caption" noWrap sx={{ color: 'text.secondary', minWidth: 0 }}>
                    {employeeName(owner.employee)} +{shared.length}
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
    /**
     * Draw it as a tinted pill instead of bare text. For dense surfaces (a Kanban card) where a
     * red sentence floating among grey ones reads as an error message rather than a date.
     */
    pill = false,
}: {
    task: { dueDate?: string | null; status?: TaskStatusRef | null };
    now: Date;
    pill?: boolean;
}) => {
    const theme = useTheme();
    const label = dueLabel(task.dueDate, now);
    if (!label) return null;
    const overdue = isTaskOverdue(task, now);
    const color = overdue ? theme.palette.error.main : theme.palette.text.secondary;
    return (
        <Stack
            direction="row"
            spacing={0.4}
            alignItems="center"
            sx={{
                minWidth: 0,
                color,
                ...(pill && {
                    px: 0.75,
                    py: 0.3,
                    borderRadius: 1,
                    bgcolor: overdue
                        ? alpha(theme.palette.error.main, theme.palette.mode === 'dark' ? 0.2 : 0.1)
                        : alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.1 : 0.05),
                }),
            }}
        >
            <KTIcon
                iconName={overdue ? 'information-5' : 'calendar'}
                className="fs-8"
                // KTIcon has no colour prop; the wrapper carries it.
            />
            <Typography
                variant="caption"
                noWrap
                sx={{ fontWeight: overdue ? 700 : 500, color: 'inherit', fontSize: 11 }}
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
