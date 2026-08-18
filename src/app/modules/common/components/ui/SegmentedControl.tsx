import { Box } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  /** Trailing count, e.g. `Active (37)`. Rendered dimmer than the label. */
  count?: number;
}

export interface SegmentedControlProps<T extends string> {
  options: ReadonlyArray<SegmentedOption<T>>;
  value: T;
  onChange: (value: T) => void;
  /** Accessible name for the group, e.g. "Employee status". */
  ariaLabel: string;
  /** Fill the width and let the segments share it — for narrow toolbars. */
  fullWidth?: boolean;
  sx?: SxProps<Theme>;
}

/**
 * One choice from a short, mutually exclusive set — the app's standard segmented
 * control.
 *
 * This is the same visual language as `TimePeriodSelector` (Monthly · Yearly ·
 * All Time · Custom): a tinted track, a white raised pill on the selection, and a
 * small caret above it. That component is hardwired to time periods — its modes
 * are a fixed union and its labels are internal — so anything that is NOT a period
 * had to hand-roll its own row of pills, which is how the same control ended up
 * with several different looks across the app. This is that control with the
 * choices left open.
 *
 * Use it for status filters, view switches, or any 2–5 way exclusive choice. For
 * more options than that, or non-exclusive ones, use a select or chips instead —
 * a segmented control stops being scannable once it wraps.
 */
export function SegmentedControl<T extends string>({
  options, value, onChange, ariaLabel, fullWidth = false, sx,
}: SegmentedControlProps<T>) {
  return (
    <Box
      role="tablist"
      aria-label={ariaLabel}
      sx={[{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '2px',
        p: '2px',
        borderRadius: '6px',
        bgcolor: '#F1F5F9',
        width: fullWidth ? '100%' : 'fit-content',
        // The caret sits above the track, so the track must not clip it.
        overflow: 'visible',
      }, ...(Array.isArray(sx) ? sx : [sx])] as SxProps<Theme>}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Box
            key={option.value}
            component="button"
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            sx={{
              position: 'relative',
              // Not `hidden`: the caret is positioned outside the button's box.
              overflow: 'visible',
              flex: fullWidth ? 1 : 'none',
              border: 0,
              // Metronic's unlayered Bootstrap button rules outrank a utility
              // class, so the radius has to be stated here to hold.
              borderRadius: '4px',
              px: 1.25,
              py: 0.5,
              fontFamily: 'Inter, sans-serif',
              fontSize: 12,
              fontWeight: active ? 600 : 500,
              whiteSpace: 'nowrap',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              bgcolor: active ? '#ffffff' : 'transparent',
              color: active ? '#1E3A8A' : '#64748B',
              boxShadow: active ? '0 1px 2px rgba(16, 24, 40, 0.06)' : 'none',
              '&:hover': { color: '#1E3A8A' },
            }}
          >
            {option.label}
            {typeof option.count === 'number' && (
              <Box
                component="span"
                sx={{
                  ml: 0.5,
                  fontWeight: 600,
                  fontVariantNumeric: 'tabular-nums',
                  opacity: active ? 0.75 : 0.6,
                }}
              >
                ({option.count})
              </Box>
            )}

            {/* The caret. Purely decorative — `aria-selected` already carries the
                selection for assistive tech. */}
            {active && (
              <Box
                aria-hidden
                sx={{
                  position: 'absolute',
                  top: -5,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 0,
                  height: 0,
                  borderLeft: '5px solid transparent',
                  borderRight: '5px solid transparent',
                  borderTop: '5px solid #1E3A8A',
                  pointerEvents: 'none',
                }}
              />
            )}
          </Box>
        );
      })}
    </Box>
  );
}

export default SegmentedControl;
