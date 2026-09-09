import { Box, useTheme } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  /** Trailing count, e.g. `Active (37)`. Rendered dimmer than the label. */
  count?: number;
  /**
   * A choice that exists but cannot be taken right now.
   *
   * Dimmed and unclickable rather than removed, because a segmented control is
   * read as the complete set of options — dropping one silently changes what
   * the reader believes the choice IS. Pair it with `disabledReason` so the
   * segment can say why on hover, and state the reason in the surrounding copy
   * too: a tooltip is a hint, not an explanation.
   */
  disabled?: boolean;
  /** Hover/assistive text for a disabled segment. */
  disabledReason?: string;
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
  /**
   * The palette was three hardcoded light-mode greys, so the track stayed pale
   * and the labels stayed dark on any screen that offers dark mode. Light values
   * are unchanged — every existing consumer looks exactly as it did.
   */
  const dark = useTheme().palette.mode === 'dark';
  const C = dark
    ? { track: '#161b22', pill: '#21262d', idle: '#8b949e', on: '#8AA3EC', caret: '#8AA3EC' }
    : { track: '#F1F5F9', pill: '#ffffff', idle: '#64748B', on: '#1E3A8A', caret: '#1E3A8A' };

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
        bgcolor: C.track,
        width: fullWidth ? '100%' : 'fit-content',
        // The caret sits above the track, so the track must not clip it.
        overflow: 'visible',
      }, ...(Array.isArray(sx) ? sx : [sx])] as SxProps<Theme>}
    >
      {options.map((option) => {
        const active = option.value === value;
        const off = Boolean(option.disabled);
        return (
          <Box
            key={option.value}
            component="button"
            type="button"
            role="tab"
            aria-selected={active}
            disabled={off}
            title={off ? option.disabledReason : undefined}
            onClick={() => { if (!off) onChange(option.value); }}
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
              cursor: off ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              bgcolor: active ? C.pill : 'transparent',
              color: active ? C.on : C.idle,
              // Dimmed rather than greyed to a fourth colour: the segment keeps
              // its own colour so it still reads as one of the set.
              opacity: off ? 0.42 : 1,
              boxShadow: active ? '0 1px 2px rgba(16, 24, 40, 0.06)' : 'none',
              '&:hover': { color: off ? undefined : C.on },
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
                  borderTop: `5px solid ${C.caret}`,
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
