import { Box } from '@mui/material';

/**
 * The grid/list switch — the file-explorer control, in the kit's language.
 *
 * Lifted out of the Document Vault, which is where it was designed and where people have already
 * learned it. Any screen that shows the same records two ways gets the same two icons in the same
 * place, rather than a second control that means the same thing and looks different.
 */
export type ViewMode = 'grid' | 'list';

export interface ViewModeSwitchProps {
    mode: ViewMode;
    onChange: (mode: ViewMode) => void;
    /** Names the pair for screen readers — say what is being laid out ("Time entry layout"). */
    ariaLabel?: string;
}

export const ViewModeSwitch = ({ mode, onChange, ariaLabel = 'Layout' }: ViewModeSwitchProps) => (
    <Box
        role="group"
        aria-label={ariaLabel}
        sx={{
            display: 'inline-flex',
            p: 0.375,
            gap: 0.375,
            borderRadius: '10px',
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'action.hover',
            flexShrink: 0,
        }}
    >
        {([
            { key: 'grid' as const, icon: 'bi-grid-3x3-gap-fill', label: 'Grid view' },
            { key: 'list' as const, icon: 'bi-list-ul', label: 'List view' },
        ]).map(({ key, icon, label }) => {
            const active = mode === key;
            return (
                <Box
                    key={key}
                    component="button"
                    type="button"
                    aria-label={label}
                    aria-pressed={active}
                    title={label}
                    onClick={() => onChange(key)}
                    sx={{
                        display: 'grid',
                        placeItems: 'center',
                        width: 30,
                        height: 26,
                        border: 0,
                        // Metronic's unlayered Bootstrap button rules outrank a utility class
                        // here, so the radius has to be stated in `sx` to hold.
                        borderRadius: '7px',
                        cursor: 'pointer',
                        transition: 'background-color .12s ease, color .12s ease',
                        bgcolor: active ? 'background.paper' : 'transparent',
                        color: active ? 'text.primary' : 'text.secondary',
                        boxShadow: active ? '0 1px 2px rgba(16, 24, 40, 0.10)' : 'none',
                        '&:hover': { color: 'text.primary' },
                    }}
                >
                    <Box component="i" className={icon} aria-hidden sx={{ fontSize: 13 }} />
                </Box>
            );
        })}
    </Box>
);

export default ViewModeSwitch;
