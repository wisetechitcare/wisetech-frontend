import type { KeyboardEvent } from 'react';

/**
 * a11y — tiny helpers for making non-native-button elements keyboard-operable.
 *
 * Prefer a real `<button>` whenever the styling allows it. Use these only for
 * elements that must stay a `div`/`Card`/`span` for layout reasons (e.g. an MUI
 * `Card` acting as a clickable tile) so they still satisfy WCAG 2.1.1 (keyboard)
 * and 4.1.2 (name/role/value): the element announces as a button and fires on
 * Enter / Space just like one.
 */

/** Keydown handler that activates on Enter or Space (and prevents Space scroll). */
export function activateOnKey(onActivate: () => void) {
  return (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      onActivate();
    }
  };
}

export interface PressableProps {
  role: 'button';
  tabIndex: number;
  onKeyDown: (e: KeyboardEvent<HTMLElement>) => void;
  'aria-disabled'?: boolean;
}

/**
 * Spread onto a clickable non-button to give it button semantics + keyboard
 * activation. Pair with `onClick={onActivate}` and an `aria-label` on the element.
 */
export function pressableProps(onActivate: () => void, disabled = false): PressableProps {
  return {
    role: 'button',
    tabIndex: disabled ? -1 : 0,
    'aria-disabled': disabled || undefined,
    onKeyDown: (e) => {
      if (disabled) return;
      activateOnKey(onActivate)(e);
    },
  };
}
