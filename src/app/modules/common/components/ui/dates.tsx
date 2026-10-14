/**
 * WtDateField / WtDateTimeField — the app-wide, theme-aware date & date-time inputs.
 *
 * THE canonical way to take a date in this app. Use these instead of a native
 * `<input type="date">` / `<TextField type="date">` / `type="datetime-local"`, which render the
 * BROWSER's picker: unstyled, OS-dependent, locale-dependent (`dd-mm-yyyy` vs `mm/dd/yyyy`),
 * ignores the design system entirely, and stays light-on-white in dark mode because the native
 * calendar popup is chrome we cannot style.
 *
 *   <WtDateField label="Target start date" value={form.date} onChange={(v) => setForm({...form, date: v})} />
 *   <WtDateTimeField label="Start" value={form.scheduledStart} onChange={...} minDateTime={now} />
 *
 * Design notes
 * - Built on @mui/x-date-pickers (already a dependency) so the popup is a real MUI Popper: it
 *   inherits the theme, therefore it is correct in dark mode for free (see theme/githubDark.ts).
 * - Responsive by default: phones get the touch-optimised Mobile* variant (full-screen dialog with
 *   big tap targets), desktop gets the inline calendar popper. Driven by the theme's own `sm`
 *   breakpoint, not a hardcoded media query.
 * - The value contract is a plain STRING, not a Dayjs — ISO `YYYY-MM-DD` for dates and
 *   `YYYY-MM-DDTHH:mm` for date-times, which is exactly what the native inputs produced and what
 *   the APIs already send/accept. So swapping a native input for these is a drop-in change and no
 *   caller needs to learn dayjs.
 * - What the user SEES is the company standard `YYYY.MM.DD` (utils/dateFormats.ts), which is also
 *   the typing mask — the wire stays ISO. Native inputs could never do this: they render in the
 *   OS locale (`dd-mm-yyyy`, `mm/dd/yyyy`), which is exactly the format drift the standard forbids.
 * - Empty string / null both mean "no value"; clearing emits `""`.
 */
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker, MobileDatePicker, DateTimePicker, MobileDateTimePicker } from '@mui/x-date-pickers';
import { Box, useMediaQuery, useTheme, type SxProps, type Theme } from '@mui/material';
import dayjs, { Dayjs } from 'dayjs';
import { DATE_FORMATS } from '@utils/dateFormats';
import { getTimeTokens } from '@utils/timeFormat';
import { useDropdownBoundary } from './dropdownBoundary';
import { controlHeightSxFor } from './buttons';

export interface WtDateFieldBaseProps {
  label?: string;
  /** Wire-format string (`YYYY-MM-DD`, or `YYYY-MM-DDTHH:mm` for the date-time variant). */
  value?: string | null;
  /** Emits the same wire format, or `''` when cleared. */
  onChange: (value: string) => void;
  disabled?: boolean;
  /** Marks the label with an asterisk and sets the underlying input's required flag. */
  required?: boolean;
  /** Renders the field in its error state (pairs with `helperText`). */
  error?: boolean;
  helperText?: string;
  /** Wire-format bounds — e.g. `minDate={today}` to forbid past dates. */
  minDate?: string;
  maxDate?: string;
  fullWidth?: boolean;
  /**
   * Same contract as `WtField`: `'sm'` (default, 40px) for most forms/toolbars;
   * `'md'` (44px) for spacious dialog forms. Maps to MUI TextField size so the
   * floating label and input stay in lockstep.
   */
  size?: 'sm' | 'md';
  /** Applied to the underlying TextField (sizing/flex from the parent layout). */
  sx?: SxProps<Theme>;
  /** Escape hatch for a form library that needs the blur event. */
  onBlur?: () => void;
  /**
   * Controlled popup state. Use when something OTHER than the field itself opens
   * the calendar — e.g. a label or tile that acts as the trigger while the field
   * is visually hidden but still laid out (the Popper anchors to it). Leave unset
   * for the normal case where the field opens itself.
   */
  open?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
}

/** Parse a wire string into a Dayjs, or null when absent/invalid. */
const parse = (value?: string | null): Dayjs | null => {
  if (!value) return null;
  const d = dayjs(value);
  return d.isValid() ? d : null;
};

type BoundaryPopper = ReturnType<typeof useDropdownBoundary>['slotProps']['popper'];

/**
 * Desktop calendar popper: stay inside the dialog/sheet scroll port (same contract as
 * Autocomplete via `useDropdownBoundary`). Without this, a field near the right or
 * bottom of a modal opens a calendar that runs past the glass edge / sidebar.
 */
const datePopperSlot = (boundaryPopper: BoundaryPopper) => ({
  placement: 'bottom-start' as const,
  // Keep flip/preventOverflow from the boundary helper; turn on altAxis so a wide
  // calendar next to a right-column field shifts left instead of spilling out.
  modifiers: (boundaryPopper.modifiers ?? []).map((m) =>
    m.name === 'preventOverflow'
      ? { ...m, options: { ...m.options, altAxis: true, tether: false } }
      : m,
  ),
  sx: {
    zIndex: 1350,
    ...boundaryPopper.sx,
  },
});

/** Shared slotProps so both variants present identically. */
const textFieldSlot = (p: WtDateFieldBaseProps, boundaryPopper: BoundaryPopper) => ({
  textField: {
    // Match WtField: default sm (40px); pass size="md" for spacious dialogs.
    size: (p.size === 'md' ? 'medium' : 'small') as 'small' | 'medium',
    fullWidth: p.fullWidth ?? true,
    required: p.required,
    error: p.error,
    helperText: p.helperText,
    onBlur: p.onBlur,
    sx: [
      controlHeightSxFor(p.size === 'md' ? 'md' : 'sm'),
      ...(Array.isArray(p.sx) ? p.sx : [p.sx]),
    ].filter(Boolean),
  },
  // A visible Clear action — the native input had one and losing it is a regression.
  actionBar: { actions: ['clear', 'today', 'accept'] as ('clear' | 'today' | 'accept')[] },
  // Calendar sits ABOVE nested dialogs. MUI's popper/dialog default to zIndex.modal
  // (1300); dialogs that open over another dialog bump to modal+2 (1302), which would
  // otherwise render the calendar behind them. 1350 clears app dialogs, stays under
  // snackbars (1400) / tooltips (1500). popper = desktop, dialog = mobile picker.
  popper: datePopperSlot(boundaryPopper),
  dialog: { sx: { zIndex: 1350 } },
});

/**
 * Date-only field. Value/onChange speak `YYYY-MM-DD`.
 * Drop-in replacement for `<TextField type="date">`.
 *
 * THE reusable single-date picker. Fiscal year ranges use {@link FiscalYearRangeField}
 * (one M3 range dialog). Do not reach for Flatpickr or a native date input.
 */
export function WtDateField(props: WtDateFieldBaseProps) {
  const { label, value, onChange, disabled, minDate, maxDate, open, onOpen, onClose, fullWidth } = props;
  // `noSsr` avoids the light-then-dark double render this would otherwise cause on first paint.
  const isPhone = useMediaQuery(useTheme().breakpoints.down('sm'), { noSsr: true });
  const Picker = isPhone ? MobileDatePicker : DatePicker;
  const { ref: boundaryRef, slotProps: boundarySlots } = useDropdownBoundary();

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      {/* Ref on a full-width shell so the scroll-port walk finds the dialog body. */}
      <Box ref={boundaryRef} sx={{ width: fullWidth === false ? 'auto' : '100%', minWidth: 0 }}>
        <Picker
          label={label}
          value={parse(value)}
          onChange={(next: Dayjs | null) => onChange(next && next.isValid() ? next.format(DATE_FORMATS.WIRE) : '')}
          disabled={disabled}
          minDate={parse(minDate) ?? undefined}
          maxDate={parse(maxDate) ?? undefined}
          format={DATE_FORMATS.DISPLAY}
          // Keep MUI X / M3 month-slide animations (reduceAnimations:true killed them).
          // See https://mui.com/x/react-date-pickers/date-picker/
          {...(open !== undefined ? { open, onOpen, onClose } : {})}
          slotProps={textFieldSlot(props, boundarySlots.popper)}
        />
      </Box>
    </LocalizationProvider>
  );
}

export interface WtDateTimeFieldProps extends WtDateFieldBaseProps {
  /** Wire-format bounds including the time part (`YYYY-MM-DDTHH:mm`). */
  minDateTime?: string;
  maxDateTime?: string;
}

/**
 * Date + time field. Value/onChange speak `YYYY-MM-DDTHH:mm`.
 * Drop-in replacement for `<TextField type="datetime-local">`.
 */
export function WtDateTimeField(props: WtDateTimeFieldProps) {
  const { label, value, onChange, disabled, minDateTime, maxDateTime, fullWidth } = props;
  const isPhone = useMediaQuery(useTheme().breakpoints.down('sm'), { noSsr: true });
  const Picker = isPhone ? MobileDateTimePicker : DateTimePicker;
  const { ref: boundaryRef, slotProps: boundarySlots } = useDropdownBoundary();

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box ref={boundaryRef} sx={{ width: fullWidth === false ? 'auto' : '100%', minWidth: 0 }}>
        <Picker
          label={label}
          value={parse(value)}
          onChange={(next: Dayjs | null) => onChange(next && next.isValid() ? next.format(DATE_FORMATS.WIRE_DATETIME) : '')}
          disabled={disabled}
          minDateTime={parse(minDateTime) ?? undefined}
          maxDateTime={parse(maxDateTime) ?? undefined}
          format={getTimeTokens().DATETIME}
          slotProps={textFieldSlot(props, boundarySlots.popper)}
        />
      </Box>
    </LocalizationProvider>
  );
}
