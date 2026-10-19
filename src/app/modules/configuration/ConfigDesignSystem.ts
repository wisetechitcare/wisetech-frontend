/**
 * Global Configuration Design System
 * Master design tokens for all configuration pages.
 *
 * MIGRATION (Phase 1): this file is now a thin compatibility shim. The real
 * source of truth lives in `@app/theme/tokens` (see repo-root DESIGN_SYSTEM.md).
 * Every export below re-exports a legacy pin so nothing changes visually yet.
 * Do NOT add new tokens here — add to the canonical module. Phase 2 flips these
 * pins to the unified navy + Apple-semantic tokens.
 */
import {
  LEGACY_CONFIG_C,
  LEGACY_CONFIG_FONT,
  LEGACY_CONFIG_TYPE,
  LEGACY_CONFIG_SP,
  LEGACY_CONFIG_RADIUS,
  LEGACY_CONFIG_BTN,
  LEGACY_CONFIG_ICON_COLORS,
  LEGACY_CONFIG_KEYFRAMES,
  LEGACY_CONFIG_MOTION,
  MIN_TOUCH_TARGET_PX,
} from '@app/theme/tokens';

export const C = LEGACY_CONFIG_C;
export const FONT = LEGACY_CONFIG_FONT;
export const T = LEGACY_CONFIG_TYPE;
export const SP = LEGACY_CONFIG_SP;
export const RADIUS = LEGACY_CONFIG_RADIUS;
export const BTN = LEGACY_CONFIG_BTN;
export const ICON_COLORS = LEGACY_CONFIG_ICON_COLORS;
export const KEYFRAMES = LEGACY_CONFIG_KEYFRAMES;
export const MOTION = LEGACY_CONFIG_MOTION;
export { MIN_TOUCH_TARGET_PX };

/**
 * The configure screens' icon action button (Project Points' move / show / edit / delete): a square
 * tinted with its colour, or greyed out when it can't be used. Shared by the Access editor's toggles.
 */
export const coloredActionBtn = (color: string, disabled = false): import('react').CSSProperties => ({
  background: disabled ? '#f1f5f9' : `${color}14`,
  border: `1px solid ${disabled ? '#e2e8f0' : `${color}2a`}`,
  color: disabled ? '#cbd5e1' : color,
  cursor: disabled ? 'not-allowed' : 'pointer',
  padding: '8px',
  borderRadius: '8px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.15s ease',
  opacity: disabled ? 0.5 : 1,
});

export default { C, FONT, T, SP, RADIUS, BTN, ICON_COLORS, KEYFRAMES };
