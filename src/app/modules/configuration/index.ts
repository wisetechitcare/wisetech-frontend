/**
 * Global Configuration Design System – barrel export
 *
 * Usage:
 *   import { ConfigPageLayout, ConfigSectionCard, ConfigSettingsRow, ConfigStatsCards, C, BTN } from '@app/modules/configuration';
 */

export { default as ConfigPageLayout } from './ConfigPageLayout';
export type { ConfigPageLayoutProps, ConfigTab, ConfigBreadcrumb } from './ConfigPageLayout';

export { default as ConfigSectionRail } from './ConfigSectionRail';
export type { ConfigSectionRailProps, ConfigRailGroup, ConfigRailItem } from './ConfigSectionRail';

export { default as ConfigSectionCard } from './ConfigSectionCard';
export type { ConfigSectionCardProps, ConfigSectionCardAction } from './ConfigSectionCard';

export { default as ConfigSettingsRow } from './ConfigSettingsRow';
export type { ConfigSettingsRowProps } from './ConfigSettingsRow';

export { ChipGrid, EmptyState } from './ConfigChipGrid';

export { default as ConfigStatsCards } from './ConfigStatsCards';
export type { ConfigStatsCardsProps, ConfigStatCard } from './ConfigStatsCards';

// Design tokens
export { C, FONT, T, SP, RADIUS, BTN, ICON_COLORS, KEYFRAMES, MOTION, MIN_TOUCH_TARGET_PX } from './ConfigDesignSystem';
