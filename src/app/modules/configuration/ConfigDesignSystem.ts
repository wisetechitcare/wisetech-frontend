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

export default { C, FONT, T, SP, RADIUS, BTN, ICON_COLORS, KEYFRAMES };
