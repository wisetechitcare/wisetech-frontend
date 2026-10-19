/**
 * MUI X Date / Time picker theme overrides — light + dark.
 *
 * Imported into {@link makeWisetechTheme} so every `DatePicker` / `DateCalendar`
 * / desktop popper inherits the same sheet, day, and today treatment as the
 * custom M3 fiscal / time dialogs.
 */
import { alpha, type Components, type Theme } from '@mui/material/styles';
import { sheetSx } from './surfaces';

/** Requires `import type {} from '@mui/x-date-pickers/themeAugmentation'` at the theme entry. */
export function muiXPickerComponents(theme: Theme): Components<Theme> {
  const dark = theme.palette.mode === 'dark';
  const sheet = sheetSx(theme);

  return {
    MuiPickersPopper: {
      styleOverrides: {
        paper: {
          ...sheet,
          borderRadius: 16,
          // Desktop date popovers sit above nested dialogs (same band as WtDateField).
          // z-index stays on the popper slot in the field; paper owns surface only.
        },
      },
    },
    MuiDateCalendar: {
      styleOverrides: {
        root: {
          color: theme.palette.text.primary,
          '& .MuiPickersCalendarHeader-label': {
            fontWeight: 700,
            color: theme.palette.text.primary,
          },
          '& .MuiPickersArrowSwitcher-button': {
            color: theme.palette.text.secondary,
            borderRadius: '50%',
            '&:hover': {
              backgroundColor: alpha(theme.palette.primary.main, dark ? 0.18 : 0.1),
              color: theme.palette.primary.main,
            },
          },
          '& .MuiDayCalendar-weekDayLabel': {
            fontWeight: 700,
            fontSize: 11,
            color: theme.palette.text.secondary,
          },
        },
      },
    },
    MuiPickersDay: {
      styleOverrides: {
        root: {
          fontWeight: 500,
          color: theme.palette.text.primary,
          '&.MuiPickersDay-dayOutsideMonth': {
            color: theme.palette.text.disabled,
            opacity: 0.55,
          },
          '&.MuiPickersDay-today:not(.Mui-selected)': {
            borderColor: alpha(theme.palette.primary.main, 0.65),
            backgroundColor: alpha(theme.palette.primary.main, dark ? 0.12 : 0.08),
          },
          '&.Mui-selected': {
            backgroundColor: `${theme.palette.primary.main} !important`,
            color: `${theme.palette.primary.contrastText} !important`,
            fontWeight: 700,
            '&:hover': {
              backgroundColor: `${theme.palette.primary.main} !important`,
            },
          },
        },
      },
    },
    MuiDayCalendar: {
      styleOverrides: {
        weekDayLabel: {
          color: theme.palette.text.secondary,
          fontWeight: 700,
        },
      },
    },
  };
}
