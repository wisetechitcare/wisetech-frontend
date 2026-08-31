/**
 * The board's bottom bar — a floating pill of PANELS, Trello-style.
 *
 * Each item toggles a pane of the workspace on or off, and they compose: Projects alone, the Task
 * Board alone (the default), or both side by side. That is the difference between this and a nav —
 * nothing here navigates, and nothing here opens a modal. A modal would be the wrong shape for the
 * project list: you would lose sight of the board you are switching away from, and switching twice
 * would mean opening it twice. A pane slides in beside the board and stays as long as it is useful.
 *
 *     ╭──────────────────────────────╮
 *     │  ▣ Projects  │  ▤ Task Board │
 *     ╰──────────────────────────────╯
 *
 * The last active panel cannot be switched off — a workspace showing nothing is not a state anyone
 * asked for, so the control simply holds.
 *
 * It must not scroll away with the board, so it is never in flow. WHERE it pins depends on the
 * layout: from `lg` up the workspace is exactly one screenful, so the pill is absolute INSIDE it
 * and sits on the board it belongs to — fixed to the viewport, it floated below the workspace and
 * landed on the page footer. Below `lg` the panes stack and the page scrolls normally, so there is
 * no one screenful to pin inside and it stays fixed, clearing the app's mobile bottom nav.
 *
 * The workspace reserves the band it occupies (its `pb` at lg), so it never covers a card.
 */
import { Box, Stack, Tooltip, alpha, useTheme } from '@mui/material';
import { KTIcon } from '@metronic/helpers';

export type WorkspacePanel = 'projects' | 'board';

export interface BoardBottomNavProps {
    /** Which panes are currently shown. At least one is always true. */
    active: Record<WorkspacePanel, boolean>;
    onToggle: (panel: WorkspacePanel) => void;
}

const PANELS: Array<{ key: WorkspacePanel; icon: string; label: string; hint: string }> = [
    { key: 'projects', icon: 'office-bag', label: 'Projects', hint: 'Show the project list beside the board' },
    { key: 'board', icon: 'element-11', label: 'Task Board', hint: 'Show the task board' },
];

export const BoardBottomNav = ({ active, onToggle }: BoardBottomNavProps) => {
    const theme = useTheme();
    const dark = theme.palette.mode === 'dark';
    const openCount = PANELS.filter((p) => active[p.key]).length;

    return (
        // `bottom-20` on phones clears the app's own mobile bottom navigation; on desktop that
        // nav renders nothing, so the pill sits close to the board's own bottom edge.
        <Box
            className="pointer-events-none fixed inset-x-0 bottom-20 z-[1200] flex justify-center px-3 lg:absolute lg:bottom-4"
        >
            <Stack
                direction="row"
                alignItems="center"
                spacing={0.5}
                role="group"
                aria-label="Workspace panels"
                className="pointer-events-auto max-w-full overflow-x-auto"
                sx={{
                    p: 0.6,
                    borderRadius: 999,
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: alpha(theme.palette.background.paper, dark ? 0.92 : 0.96),
                    backdropFilter: 'blur(12px)',
                    boxShadow: `0 10px 30px ${alpha(theme.palette.common.black, dark ? 0.55 : 0.18)}`,
                    scrollbarWidth: 'none',
                    '&::-webkit-scrollbar': { display: 'none' },
                }}
            >
                {PANELS.map((panel) => {
                    const on = active[panel.key];
                    // The one remaining panel holds rather than turning off.
                    const locked = on && openCount === 1;
                    return (
                        <Tooltip key={panel.key} title={locked ? 'At least one panel stays open' : panel.hint}>
                            <Box
                                component="button"
                                type="button"
                                aria-pressed={on}
                                onClick={() => { if (!locked) onToggle(panel.key); }}
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 0.75,
                                    border: 0,
                                    cursor: locked ? 'default' : 'pointer',
                                    borderRadius: 999,
                                    px: 1.75,
                                    py: 0.9,
                                    fontSize: 13,
                                    fontWeight: 600,
                                    lineHeight: 1,
                                    whiteSpace: 'nowrap',
                                    bgcolor: on ? alpha(theme.palette.primary.main, dark ? 0.32 : 0.14) : 'transparent',
                                    color: on ? 'primary.main' : 'text.secondary',
                                    transition: 'background-color .15s, color .15s',
                                    '&:hover': {
                                        bgcolor: on
                                            ? alpha(theme.palette.primary.main, dark ? 0.38 : 0.18)
                                            : 'action.hover',
                                        color: on ? 'primary.main' : 'text.primary',
                                    },
                                    '&:focus-visible': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: 2 },
                                }}
                            >
                                <KTIcon iconName={panel.icon} className="fs-5" />
                                {panel.label}
                            </Box>
                        </Tooltip>
                    );
                })}
            </Stack>
        </Box>
    );
};

export default BoardBottomNav;
