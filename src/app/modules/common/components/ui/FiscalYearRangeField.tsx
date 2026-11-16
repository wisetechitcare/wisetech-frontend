/**
 * FiscalYearRangeField — the one control for editing an org / prefix fiscal year.
 *
 * One M3 dialog (same family as {@link TimePickerField}): pick start, then end, on a
 * single calendar. Value is the stored range string `"YYYY-MM-DD to YYYY-MM-DD"`
 * (see `@utils/fiscalYearRange`). Legacy `DD/MM/YYYY` values are accepted on read
 * and rewritten as ISO on OK.
 *
 * Use this instead of two date fields or Flatpickr `mode: 'range'`. Period
 * navigation (lists/dashboards) stays on PeriodFilter — this field is for
 * *editing* the range, not browsing by it.
 */
import { useEffect, useState, type ChangeEvent } from 'react';
import {
  Box,
  ButtonBase,
  Collapse,
  Dialog,
  Grow,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { pickersSlideTransitionClasses } from '@mui/x-date-pickers/DateCalendar';
import { PickersDay, type PickersDayProps } from '@mui/x-date-pickers/PickersDay';
import dayjs, { type Dayjs } from 'dayjs';
import { KTIcon } from '@metronic/helpers';
import { DATE_FORMATS, formatDateRange } from '@utils/dateFormats';
import {
  composeFiscalYearRange,
  getDefaultFiscalYear,
  splitFiscalYearRange,
  type FiscalYearRangeValue,
} from '@utils/fiscalYearRange';
import {
  M3_MOTION,
  accentWash,
  nativeFieldColors,
  neutralWash,
  onAccent as contrastOnAccent,
  scrimSx,
  sheetSx,
} from '@app/theme/surfaces';
import { TRIO, type Trio } from './patterns';
import {
  applyFiscalRangeDayPick,
  type FiscalRangeBound,
} from './fiscalYearRangePick';

const { easeIn: EASE_IN, easeOut: EASE_OUT, easeSlide: EASE_SLIDE, durIn: DUR_IN, durOut: DUR_OUT, durSlide: DUR_SLIDE } = M3_MOTION;

/** Dialog / closed-field readable day — month names beat dotted digits for scan (Miller). */
const CAP_FMT = 'D MMM YYYY';

type Mode = 'calendar' | 'keyboard';

export interface FiscalYearRangeFieldProps {
  /** Stored range (`YYYY-MM-DD to YYYY-MM-DD` or legacy `DD/MM/YYYY to …`). */
  value: FiscalYearRangeValue;
  onChange: (value: FiscalYearRangeValue) => void;
  /** Closed-field label. Default "Fiscal Year". */
  label?: string;
  /** Chip label for the start bound inside the dialog. */
  startLabel?: string;
  /** Chip label for the end bound inside the dialog. */
  endLabel?: string;
  required?: boolean;
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
  /** Called when the dialog closes or the trigger blurs (Formik touched). */
  onBlur?: () => void;
  /** `compact` = denser trigger for toolbars (prefix settings). */
  density?: 'comfortable' | 'compact';
  /** Accent tone (kit `Trio`). Default blue. */
  tone?: Trio;
}

const parseWire = (iso: string): Dayjs | null => {
  if (!iso) return null;
  const d = dayjs(iso);
  return d.isValid() ? d.startOf('day') : null;
};

const capOf = (d: Dayjs | null): string => (d ? d.format(CAP_FMT) : '—');

/** Parse company-display `YYYY.MM.DD`, long `D MMM YYYY`, or ISO into a Dayjs. */
const parseTyped = (raw: string): Dayjs | null => {
  const t = raw.trim();
  if (!t) return null;
  const dotted = t.match(/^(\d{4})\.(\d{2})\.(\d{2})$/);
  if (dotted) {
    const d = dayjs(`${dotted[1]}-${dotted[2]}-${dotted[3]}`);
    return d.isValid() ? d.startOf('day') : null;
  }
  const d = dayjs(t);
  return d.isValid() ? d.startOf('day') : null;
};

/**
 * Day cell with true range “caps”: solid discs on endpoints, a continuous rail between
 * them (Gestalt continuity). Start opens left; End closes right — so the span reads as
 * one interval, not two unrelated selected days.
 */
function RangeDay(
  props: PickersDayProps<Dayjs> & {
    from: Dayjs | null;
    to: Dayjs | null;
    hover: Dayjs | null;
    accent: string;
    accentFill: string;
    /** Ink on solid accent fills — from `palette.getContrastText` (light + dark safe). */
    onAccent: string;
  },
) {
  const {
    from, to, hover, accent, accentFill, onAccent,
    day, outsideCurrentMonth, sx, selected: _sel, today, ...rest
  } = props;
  if (outsideCurrentMonth) {
    return (
      <PickersDay
        {...rest}
        day={day}
        outsideCurrentMonth
        selected={false}
        today={today}
        sx={[
          {
            color: 'text.disabled',
            opacity: 0.55,
          },
          ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
        ]}
      />
    );
  }

  const previewEnd = to ?? (from && hover && !hover.isSame(from, 'day') ? hover : null);
  const rangeStart = from && previewEnd
    ? (from.isBefore(previewEnd) ? from : previewEnd)
    : from;
  const rangeEnd = from && previewEnd
    ? (from.isBefore(previewEnd) ? previewEnd : from)
    : null;

  const isStart = Boolean(rangeStart && day.isSame(rangeStart, 'day'));
  const isEnd = Boolean(rangeEnd && day.isSame(rangeEnd, 'day'));
  const inMiddle = Boolean(
    rangeStart && rangeEnd
    && day.isAfter(rangeStart, 'day')
    && day.isBefore(rangeEnd, 'day'),
  );
  const sameDay = isStart && isEnd;
  const isEndpoint = isStart || isEnd;

  // Rail behind the day: half-width on caps so the disc sits on the open end of the span.
  let rail: 'none' | 'full' | 'start' | 'end' = 'none';
  if (rangeStart && rangeEnd && !rangeStart.isSame(rangeEnd, 'day')) {
    if (inMiddle) rail = 'full';
    else if (isStart && !isEnd) rail = 'start';
    else if (isEnd && !isStart) rail = 'end';
  }

  return (
    <Box
      sx={{
        position: 'relative',
        width: { xs: 40, sm: 36 },
        height: { xs: 40, sm: 36 },
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        '&::before': rail === 'none' ? undefined : {
          content: '""',
          position: 'absolute',
          top: '50%',
          transform: 'translateY(-50%)',
          height: { xs: 34, sm: 30 },
          bgcolor: accentFill,
          zIndex: 0,
          ...(rail === 'full' && { left: 0, right: 0 }),
          ...(rail === 'start' && { left: '50%', right: 0, borderRadius: '0' }),
          ...(rail === 'end' && { left: 0, right: '50%', borderRadius: '0' }),
        },
      }}
    >
      <PickersDay
        {...rest}
        day={day}
        outsideCurrentMonth={outsideCurrentMonth}
        selected={false}
        disableMargin
        onMouseEnter={(e) => {
          rest.onMouseEnter?.(e, day);
        }}
        sx={[
          {
            position: 'relative',
            zIndex: 1,
            width: { xs: 38, sm: 34 },
            height: { xs: 38, sm: 34 },
            margin: 0,
            fontWeight: isEndpoint ? 700 : 500,
            color: 'text.primary',
            // Today ring — theme-aware; skipped when this day is already a range cap.
            ...(today && !isEndpoint && {
              border: `1px solid ${alpha(accent, 0.65)}`,
              bgcolor: alpha(accent, 0.08),
            }),
            ...(inMiddle && {
              bgcolor: 'transparent',
              color: 'text.primary',
              borderRadius: 0,
              border: 'none',
              '&:hover': { bgcolor: alpha(accent, 0.16) },
            }),
            transition: `transform .16s ${EASE_IN}, background-color .2s ${EASE_IN}, color .2s ${EASE_IN}`,
            '@media (hover: hover) and (pointer: fine)': {
              '&:hover': { transform: 'scale(1.06)' },
            },
            '&:active': { transform: 'scale(0.94)' },
            '@media (prefers-reduced-motion: reduce)': {
              transition: 'none',
              '&:hover': { transform: 'none' },
              '&:active': { transform: 'none' },
            },
            ...(isEndpoint && {
              bgcolor: `${accent} !important`,
              color: `${onAccent} !important`,
              border: 'none',
              // Caps: full disc; same-day range stays a circle.
              borderRadius: sameDay
                ? '50%'
                : isStart && !isEnd
                  ? '50% 4px 4px 50%'
                  : isEnd && !isStart
                    ? '4px 50% 50% 4px'
                    : '50%',
              boxShadow: `0 0 0 2px ${accentFill}`,
              '&:hover': { bgcolor: `${accent} !important` },
            }),
          },
          ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
        ]}
      />
    </Box>
  );
}

/** Cap date text pops when the bound updates — pairs with the calendar pick. */
const capValueSx = {
  fontSize: { xs: 14, sm: 15 },
  fontWeight: 700,
  lineHeight: 1.2,
  '@keyframes wtFyCapIn': {
    from: { opacity: 0, transform: 'translateY(4px)' },
    to: { opacity: 1, transform: 'translateY(0)' },
  },
  animation: `wtFyCapIn ${DUR_OUT}ms ${EASE_IN} both`,
  '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
} as const;

export function FiscalYearRangeField({
  value,
  onChange,
  label = 'Fiscal Year',
  startLabel = 'Fiscal Year Start',
  endLabel = 'Fiscal Year End',
  required,
  disabled,
  error,
  helperText,
  onBlur,
  density = 'comfortable',
  tone = TRIO.blue,
}: FiscalYearRangeFieldProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isPhone = useMediaQuery(theme.breakpoints.down('sm'), { noSsr: true });
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)', { noSsr: true });
  const accent = tone.c;
  const onAccent = contrastOnAccent(theme, accent);
  const accentFill = accentWash(theme, accent, 'mid');
  const neutralFill = neutralWash(theme);
  const fieldColors = nativeFieldColors(theme, accent);
  const compact = density === 'compact';
  const slideMs = prefersReducedMotion ? 0 : DUR_SLIDE;
  const slideTransition = `transform ${slideMs}ms ${EASE_SLIDE}, opacity ${slideMs}ms ${EASE_IN}`;

  const split = splitFiscalYearRange(value);
  const committedFrom = parseWire(split.from);
  const committedTo = parseWire(split.to);
  const isEmpty = !committedFrom || !committedTo;

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('calendar');
  const [bound, setBound] = useState<FiscalRangeBound>('start');
  const [draftFrom, setDraftFrom] = useState<Dayjs | null>(null);
  const [draftTo, setDraftTo] = useState<Dayjs | null>(null);
  const [hover, setHover] = useState<Dayjs | null>(null);
  const [text, setText] = useState({ from: '', to: '' });
  const [calendarMonth, setCalendarMonth] = useState<Dayjs>(() => dayjs());

  useEffect(() => {
    if (!open) return;
    const from = parseWire(splitFiscalYearRange(value).from);
    const to = parseWire(splitFiscalYearRange(value).to);
    setDraftFrom(from);
    setDraftTo(to);
    setBound(from && !to ? 'end' : 'start');
    setMode('calendar');
    setHover(null);
    setCalendarMonth(from ?? to ?? dayjs());
    setText({
      from: from ? from.format(DATE_FORMATS.DISPLAY) : '',
      to: to ? to.format(DATE_FORMATS.DISPLAY) : '',
    });
    // Seed only when the dialog opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const borderColor = error ? '#e11d48' : open ? accent : theme.palette.divider;
  const canAccept = Boolean(draftFrom && draftTo && !draftTo.isBefore(draftFrom, 'day'));

  const close = () => {
    setOpen(false);
    onBlur?.();
  };

  const accept = () => {
    if (!draftFrom || !draftTo) return;
    const a = draftFrom.isBefore(draftTo) ? draftFrom : draftTo;
    const b = draftFrom.isBefore(draftTo) ? draftTo : draftFrom;
    onChange(composeFiscalYearRange(a.format(DATE_FORMATS.WIRE), b.format(DATE_FORMATS.WIRE)));
    close();
  };

  const pickDay = (day: Dayjs | null) => {
    if (!day) return;
    const next = applyFiscalRangeDayPick({ from: draftFrom, to: draftTo, bound }, day);
    setDraftFrom(next.from);
    setDraftTo(next.to);
    setBound(next.bound);
    setText({
      from: next.from ? next.from.format(DATE_FORMATS.DISPLAY) : '',
      to: next.to ? next.to.format(DATE_FORMATS.DISPLAY) : '',
    });
    setCalendarMonth(next.to ?? next.from ?? calendarMonth);
  };

  const toggleMode = () => {
    if (mode === 'calendar') {
      setText({
        from: draftFrom ? draftFrom.format(DATE_FORMATS.DISPLAY) : '',
        to: draftTo ? draftTo.format(DATE_FORMATS.DISPLAY) : '',
      });
      setMode('keyboard');
    } else {
      setMode('calendar');
    }
  };

  const applyTyped = (which: FiscalRangeBound, raw: string) => {
    setText((t) => (which === 'start' ? { ...t, from: raw } : { ...t, to: raw }));
    const parsed = parseTyped(raw);
    if (!parsed) return;
    if (which === 'start') {
      setDraftFrom(parsed);
      setCalendarMonth(parsed);
    } else {
      setDraftTo(parsed);
      setCalendarMonth(parsed);
    }
  };

  const applyDefaultAprMar = () => {
    const { from, to } = splitFiscalYearRange(getDefaultFiscalYear());
    const a = parseWire(from);
    const b = parseWire(to);
    setDraftFrom(a);
    setDraftTo(b);
    setBound('start');
    setCalendarMonth(a ?? dayjs());
    setText({
      from: a ? a.format(DATE_FORMATS.DISPLAY) : '',
      to: b ? b.format(DATE_FORMATS.DISPLAY) : '',
    });
  };

  const triggerH = compact ? 32 : 40;
  const startActive = bound === 'start';
  const endActive = bound === 'end';
  const stepHint = !draftFrom
    ? 'Choose the start of the fiscal year'
    : !draftTo
      ? 'Now choose the end date'
      : 'Tap Start or End to adjust either bound';

  const closedLabel = !isEmpty && committedFrom && committedTo
    ? formatDateRange(committedFrom, committedTo, true)
    : 'Select fiscal year range';

  return (
    <Box>
      {(label || required) && (
        <Typography
          component="label"
          sx={{
            display: 'block',
            mb: 0.75,
            fontSize: compact ? 11.5 : 12.5,
            fontWeight: 600,
            color: error ? 'error.main' : 'text.secondary',
          }}
        >
          {label}
          {required ? ' *' : ''}
        </Typography>
      )}

      <ButtonBase
        disabled={disabled}
        onClick={() => setOpen(true)}
        onBlur={() => {
          if (!open) onBlur?.();
        }}
        aria-label={label || 'Fiscal Year'}
        sx={{
          width: '100%',
          height: triggerH,
          minHeight: triggerH,
          maxHeight: triggerH,
          boxSizing: 'border-box',
          px: compact ? 1.25 : 1.5,
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          border: `1px solid ${borderColor}`,
          bgcolor: disabled ? theme.palette.action.disabledBackground : theme.palette.background.paper,
          boxShadow: open
            ? `0 0 0 3px ${accent}26`
            : error
              ? '0 0 0 3px rgba(225,29,72,0.12)'
              : 'none',
          transition: 'border-color .15s, box-shadow .15s',
          '&:hover': { borderColor: disabled ? theme.palette.divider : accent },
        }}
      >
        <Typography
          component="span"
          sx={{
            fontSize: compact ? 12.5 : 14,
            fontWeight: isEmpty ? 500 : 600,
            color: isEmpty ? 'text.secondary' : 'text.primary',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {closedLabel}
        </Typography>
        <Box component="span" sx={{ display: 'flex', color: disabled ? 'text.disabled' : accent, flexShrink: 0 }}>
          <KTIcon iconName="calendar-8" className={compact ? 'fs-6' : 'fs-5'} />
        </Box>
      </ButtonBase>

      {helperText && (
        <Typography
          sx={{
            mt: 0.5,
            fontSize: 12,
            color: error ? 'error.main' : 'text.secondary',
          }}
        >
          {helperText}
        </Typography>
      )}

      <Dialog
        open={open}
        onClose={close}
        // Above glass org modals (modal ≈ 1300); under snackbars (1400).
        sx={{ zIndex: 1350 }}
        TransitionComponent={Grow}
        transitionDuration={{ enter: DUR_IN, exit: DUR_OUT }}
        TransitionProps={{ easing: { enter: EASE_IN, exit: EASE_OUT } }}
        slotProps={{
          backdrop: {
            sx: {
              ...scrimSx(theme),
              transition: `opacity ${DUR_IN}ms ${EASE_IN} !important`,
            },
          },
        }}
        PaperProps={{
          sx: {
            ...sheetSx(theme),
            borderRadius: { xs: '24px', sm: '28px' },
            p: { xs: 2, sm: 3 },
            m: { xs: 1.5, sm: 2 },
            width: { xs: 'calc(100% - 24px)', sm: 'auto' },
            maxWidth: { xs: '100%', sm: 'none' },
            overflow: 'hidden',
          },
        }}
      >
        <Box sx={{ width: { xs: '100%', sm: 336 }, maxWidth: 360, mx: 'auto', color: 'text.primary' }}>
          <Typography sx={{ fontSize: 12, letterSpacing: 0.5, fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>
            {mode === 'calendar' ? 'Select fiscal year' : 'Enter fiscal year'}
          </Typography>
          <Typography
            key={mode === 'calendar' ? stepHint : 'kb'}
            sx={{
              fontSize: 12,
              color: 'text.secondary',
              mb: 1.75,
              minHeight: 18,
              '@keyframes wtFyHintIn': {
                from: { opacity: 0 },
                to: { opacity: 1 },
              },
              animation: prefersReducedMotion ? 'none' : `wtFyHintIn ${DUR_OUT}ms ${EASE_IN} both`,
            }}
          >
            {mode === 'calendar' ? stepHint : `Type dates as ${DATE_FORMATS.DISPLAY} or 1 Apr 2026`}
          </Typography>

          {/* One segmented “cap” — Start and End share a surface so the mind reads a span (Gestalt). */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'stretch',
              mb: 2,
              borderRadius: '16px',
              border: `1px solid ${theme.palette.divider}`,
              bgcolor: neutralFill,
              overflow: 'hidden',
            }}
          >
            <ButtonBase
              onClick={() => setBound('start')}
              aria-pressed={startActive}
              sx={{
                flex: 1,
                minWidth: 0,
                px: { xs: 1.25, sm: 1.5 },
                py: { xs: 1.1, sm: 1.25 },
                minHeight: { xs: 56, sm: 'auto' },
                textAlign: 'left',
                flexDirection: 'column',
                alignItems: 'flex-start',
                bgcolor: startActive ? accent : 'transparent',
                color: startActive ? onAccent : 'text.primary',
                transition: `background-color .2s ${EASE_IN}, color .2s ${EASE_IN}`,
                '&:hover': { bgcolor: startActive ? accent : alpha(accent, isDark ? 0.14 : 0.08) },
              }}
            >
              <Typography
                sx={{
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: 0.8,
                  textTransform: 'uppercase',
                  color: startActive ? alpha(onAccent, 0.85) : 'text.secondary',
                  mb: 0.35,
                }}
              >
                {startLabel}
              </Typography>
              <Typography key={capOf(draftFrom)} sx={capValueSx}>
                {capOf(draftFrom)}
              </Typography>
            </ButtonBase>

            <Box
              aria-hidden
              sx={{
                width: { xs: 24, sm: 28 },
                flexShrink: 0,
                display: 'grid',
                placeItems: 'center',
                bgcolor: neutralWash(theme, 'soft'),
                color: draftFrom && draftTo ? accent : 'text.disabled',
                fontSize: 14,
                fontWeight: 700,
                transition: `color .25s ${EASE_IN}`,
              }}
            >
              →
            </Box>

            <ButtonBase
              onClick={() => draftFrom && setBound('end')}
              disabled={!draftFrom}
              aria-pressed={endActive}
              sx={{
                flex: 1,
                minWidth: 0,
                px: { xs: 1.25, sm: 1.5 },
                py: { xs: 1.1, sm: 1.25 },
                minHeight: { xs: 56, sm: 'auto' },
                textAlign: 'left',
                flexDirection: 'column',
                alignItems: 'flex-start',
                bgcolor: endActive ? accent : 'transparent',
                color: endActive ? onAccent : 'text.primary',
                opacity: draftFrom ? 1 : 0.5,
                transition: `background-color .2s ${EASE_IN}, color .2s ${EASE_IN}, opacity .2s ${EASE_IN}`,
                '&:hover': { bgcolor: endActive ? accent : draftFrom ? alpha(accent, isDark ? 0.14 : 0.08) : 'transparent' },
              }}
            >
              <Typography
                sx={{
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: 0.8,
                  textTransform: 'uppercase',
                  color: endActive ? alpha(onAccent, 0.85) : 'text.secondary',
                  mb: 0.35,
                }}
              >
                {endLabel}
              </Typography>
              <Typography key={capOf(draftTo)} sx={capValueSx}>
                {capOf(draftTo)}
              </Typography>
            </ButtonBase>
          </Box>

          <Collapse
            in={mode === 'calendar'}
            timeout={{ enter: DUR_IN, exit: DUR_OUT }}
            easing={{ enter: EASE_IN, exit: EASE_OUT }}
            unmountOnExit
          >
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DateCalendar
                value={bound === 'end' ? draftTo : draftFrom}
                referenceDate={calendarMonth}
                onChange={pickDay}
                onMonthChange={(m) => setCalendarMonth(m)}
                // Was hard-disabled — that killed month slide. Only mute for a11y preference.
                reduceAnimations={prefersReducedMotion}
                showDaysOutsideCurrentMonth
                slots={{
                  day: (dayProps) => (
                    <Box
                      onMouseEnter={() => {
                        if (draftFrom && !draftTo) setHover(dayProps.day);
                      }}
                      onMouseLeave={() => setHover(null)}
                      sx={{ display: 'contents' }}
                    >
                      <RangeDay
                        {...dayProps}
                        from={draftFrom}
                        to={draftTo}
                        hover={hover}
                        accent={accent}
                        accentFill={accentFill}
                        onAccent={onAccent}
                      />
                    </Box>
                  ),
                }}
                sx={{
                  width: '100%',
                  maxHeight: 'none',
                  color: 'text.primary',
                  '& .MuiPickersCalendarHeader-root': {
                    pl: 0.5,
                    pr: 0.25,
                    mt: 0.5,
                    mb: 0.5,
                  },
                  '& .MuiPickersCalendarHeader-label': {
                    fontWeight: 700,
                    fontSize: isPhone ? 15 : 14,
                    color: 'text.primary',
                  },
                  '& .MuiPickersArrowSwitcher-button': {
                    width: isPhone ? 40 : 36,
                    height: isPhone ? 40 : 36,
                    borderRadius: '50%',
                    color: 'text.secondary',
                    transition: `background-color .2s ${EASE_IN}, transform .16s ${EASE_IN}, color .2s ${EASE_IN}`,
                    '&:hover': { bgcolor: alpha(accent, isDark ? 0.18 : 0.1), color: accent },
                    '&:active': { transform: prefersReducedMotion ? 'none' : 'scale(0.92)' },
                  },
                  '& .MuiDayCalendar-header': {
                    justifyContent: 'space-between',
                    px: 0.25,
                  },
                  '& .MuiDayCalendar-weekDayLabel': {
                    width: isPhone ? 40 : 36,
                    height: 28,
                    margin: 0,
                    fontWeight: 700,
                    fontSize: 11,
                    color: 'text.secondary',
                  },
                  '& .MuiDayCalendar-weekContainer': {
                    margin: 0,
                    justifyContent: 'space-between',
                  },
                  // Month slide — MUI's transition is on; we retune ease/duration + fade.
                  [`& .${pickersSlideTransitionClasses.root}`]: {
                    minHeight: isPhone ? 260 : 248,
                  },
                  [`& .${pickersSlideTransitionClasses['slideEnter-left']}`]: {
                    opacity: 0,
                  },
                  [`& .${pickersSlideTransitionClasses['slideEnter-right']}`]: {
                    opacity: 0,
                  },
                  [`& .${pickersSlideTransitionClasses.slideEnterActive}`]: {
                    opacity: 1,
                    transition: slideTransition,
                  },
                  [`& .${pickersSlideTransitionClasses['slideExitActiveLeft-left']}`]: {
                    opacity: 0,
                    transition: slideTransition,
                  },
                  [`& .${pickersSlideTransitionClasses['slideExitActiveLeft-right']}`]: {
                    opacity: 0,
                    transition: slideTransition,
                  },
                  '& .MuiPickersDay-root': {
                    fontWeight: 500,
                    color: 'text.primary',
                  },
                }}
              />
            </LocalizationProvider>
          </Collapse>

          <Collapse
            in={mode === 'keyboard'}
            timeout={{ enter: DUR_IN, exit: DUR_OUT }}
            easing={{ enter: EASE_IN, exit: EASE_OUT }}
            unmountOnExit
          >
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                gap: 1.5,
                py: 1,
              }}
            >
              {([
                { key: 'start' as const, label: startLabel, val: text.from },
                { key: 'end' as const, label: endLabel, val: text.to },
              ]).map((f) => (
                <Box key={f.key}>
                  <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>
                    {f.label}
                  </Typography>
                  <Box
                    component="input"
                    inputMode="numeric"
                    aria-label={f.label}
                    placeholder={DATE_FORMATS.DISPLAY}
                    value={f.val}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => applyTyped(f.key, e.target.value)}
                    onFocus={() => setBound(f.key)}
                    sx={{
                      width: '100%',
                      height: 44,
                      px: 1.25,
                      borderRadius: '12px',
                      border: fieldColors.border,
                      bgcolor: fieldColors.bgcolor,
                      outline: 'none',
                      fontSize: 14,
                      fontWeight: 600,
                      fontVariantNumeric: 'tabular-nums',
                      color: fieldColors.color,
                      caretColor: fieldColors.caretColor,
                      '&::placeholder': {
                        color: fieldColors.placeholder,
                        opacity: 1,
                      },
                      '&:focus': {
                        borderColor: accent,
                        boxShadow: `0 0 0 3px ${fieldColors.focusRing}`,
                      },
                    }}
                  />
                </Box>
              ))}
              <Typography sx={{ gridColumn: '1 / -1', fontSize: 11, color: 'text.secondary' }}>
                Accepts {DATE_FORMATS.DISPLAY} or e.g. 1 Apr 2026. Saved as ISO on OK.
              </Typography>
            </Box>
          </Collapse>

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1.5 }}>
            <Box sx={{ display: 'flex', gap: 0.25 }}>
              <Tooltip title={mode === 'calendar' ? 'Switch to text input' : 'Switch to calendar'}>
                <ButtonBase
                  onClick={toggleMode}
                  aria-label={mode === 'calendar' ? 'Switch to text input' : 'Switch to calendar'}
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    color: 'text.secondary',
                    transition: `background-color .2s ${EASE_IN}, color .2s ${EASE_IN}`,
                    '&:hover': { bgcolor: alpha(accent, 0.1), color: accent },
                  }}
                >
                  <KTIcon iconName={mode === 'calendar' ? 'keyboard' : 'calendar-8'} className="fs-4" />
                </ButtonBase>
              </Tooltip>
              <Tooltip title="Set to current Apr–Mar fiscal year">
                <ButtonBase
                  onClick={applyDefaultAprMar}
                  aria-label="Use default April to March fiscal year"
                  sx={{
                    px: 1.25,
                    height: 40,
                    borderRadius: '20px',
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'text.secondary',
                    transition: `background-color .2s ${EASE_IN}, color .2s ${EASE_IN}`,
                    '&:hover': { bgcolor: alpha(accent, 0.1), color: accent },
                  }}
                >
                  Apr–Mar
                </ButtonBase>
              </Tooltip>
            </Box>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <ButtonBase
                onClick={close}
                sx={{
                  px: 1.5,
                  height: 40,
                  borderRadius: '20px',
                  fontSize: 14,
                  fontWeight: 600,
                  color: accent,
                  transition: `background-color .2s ${EASE_IN}`,
                  '&:hover': { bgcolor: alpha(accent, 0.1) },
                }}
              >
                Cancel
              </ButtonBase>
              <ButtonBase
                onClick={accept}
                disabled={!canAccept}
                sx={{
                  px: 1.5,
                  height: 40,
                  borderRadius: '20px',
                  fontSize: 14,
                  fontWeight: 600,
                  color: canAccept ? accent : 'text.disabled',
                  transition: `background-color .2s ${EASE_IN}`,
                  '&:hover': { bgcolor: canAccept ? alpha(accent, 0.1) : 'transparent' },
                }}
              >
                OK
              </ButtonBase>
            </Box>
          </Box>
        </Box>
      </Dialog>
    </Box>
  );
}
