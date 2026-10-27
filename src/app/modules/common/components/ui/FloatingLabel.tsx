import { createContext, useContext, useState, type ReactNode } from 'react';
import { Box } from '@mui/material';

/**
 * Floating labels — the label rests inside an empty field like a placeholder and glides up
 * into the border on focus or once the field has a value; the real placeholder only shows
 * after it has moved out of the way.
 *
 * MUI text fields do this natively (WtField just stops forcing `shrink`). FloatingLabelFrame
 * gives the same motion to controls MUI does not own — react-select (`WtSelect`) and the
 * phone input — so a form reads as one family.
 *
 * Off by default: the app-wide look is the always-notched label. A screen opts in by
 * wrapping its form in `<FloatingLabels>`; the kit inputs read it, callers change nothing.
 */
const FloatingLabelsContext = createContext(false);

export function FloatingLabels({ children }: { children: ReactNode }) {
  return <FloatingLabelsContext.Provider value>{children}</FloatingLabelsContext.Provider>;
}

export const useFloatingLabels = () => useContext(FloatingLabelsContext);

// MUI's own label motion (theme.transitions: 200ms, easeOut), so framed and native fields match.
const EASE = '200ms cubic-bezier(0.0, 0, 0.2, 1)';

export interface FloatingLabelFrameProps {
  label: ReactNode;
  required?: boolean;
  /** The control holds a value — keeps the label up after blur. */
  filled: boolean;
  error?: boolean;
  disabled?: boolean;
  /** Height of the bordered control; the resting label centres on it. */
  controlHeight?: number;
  /** Where the resting label starts (px from the frame's left) — past any prefix, e.g. a flag. */
  restingLeft?: number;
  children: ReactNode;
}

export function FloatingLabelFrame({
  label,
  required,
  filled,
  error,
  disabled,
  controlHeight = 42,
  restingLeft = 14,
  children,
}: FloatingLabelFrameProps) {
  const [focused, setFocused] = useState(false);
  const floated = focused || filled;
  return (
    <Box
      data-floated={floated}
      onFocus={() => setFocused(true)}
      // Focus moving between parts of one control (flag button → number) is not a blur.
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false); }}
      sx={{
        position: 'relative',
        minWidth: 0,
        // The resting label stands in for the placeholder; show the real one once it lifts.
        '& input::placeholder, & [class*="__placeholder"]': {
          opacity: floated ? 1 : 0,
          transition: `opacity ${EASE}`,
        },
      }}
    >
      {children}
      <Box
        component="span"
        aria-hidden // the control carries its own accessible name
        sx={{
          position: 'absolute',
          zIndex: 1,
          top: floated ? 0 : controlHeight / 2,
          left: floated ? 10 : restingLeft,
          transform: 'translateY(-50%)',
          px: floated ? 0.5 : 0,
          maxWidth: `calc(100% - ${floated ? 20 : restingLeft + 36}px)`,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          lineHeight: 1.2,
          fontSize: floated ? 12 : 14,
          // Paper behind the floated label cuts the border line, like MUI's notch.
          bgcolor: floated ? 'background.paper' : 'transparent',
          color: error ? 'error.main' : disabled ? 'text.disabled' : focused ? 'primary.main' : 'text.secondary',
          pointerEvents: 'none',
          transition: `top ${EASE}, left ${EASE}, font-size ${EASE}, color ${EASE}, background-color ${EASE}`,
        }}
      >
        {label}
        {required && <Box component="span" sx={{ color: 'error.main', ml: 0.25 }}>*</Box>}
      </Box>
    </Box>
  );
}
