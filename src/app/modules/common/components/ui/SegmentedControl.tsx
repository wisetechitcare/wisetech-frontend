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
 * This is the same visual language as `PeriodTabs` (Monthly · Yearly · All Time):
 * a bordered white track, and on the selection a blue label with a 2px blue line
 * under it. The period component is hardwired to time periods — its modes
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
        alignItems: 'stretch',
        minHeight: 32,
        borderRadius: '8px',
        border: '1px solid #E2E8F0',
        bgcolor: '#ffffff',
        width: fullWidth ? '100%' : 'fit-content',
        overflow: 'hidden',
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
              flex: fullWidth ? 1 : 'none',
              border: 0,
              '&:not(:first-of-type)': { borderLeft: '1px solid #E2E8F0' },
              // Metronic's unlayered Bootstrap button rules outrank a utility
              // class, so the radius has to be stated here to hold.
              borderRadius: 0,
              px: 1.75,
              py: 0.5,
              fontFamily: 'Inter, sans-serif',
              fontSize: 12,
              fontWeight: active ? 700 : 600,
              whiteSpace: 'nowrap',
              cursor: 'pointer',
              transition: 'background-color 150ms ease, color 150ms ease',
              // Lightest grey behind unselected segments so the white selection stands out.
              bgcolor: active ? '#ffffff' : '#F8FAFC',
              color: active ? '#1E3A8A' : '#64748B',
              '&:hover': { bgcolor: active ? '#ffffff' : '#F1F5F9' },
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

            {/* The blue line under the selection. Purely decorative — `aria-selected`
                already carries the selection for assistive tech. */}
            {active && (
              <Box
                aria-hidden
                sx={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: 0,
                  height: '3px',
                  bgcolor: '#1E3A8A',
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
