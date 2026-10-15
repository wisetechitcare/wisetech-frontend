import type { ComponentType } from 'react';
import type { Trio } from '@app/modules/common/components/ui/patterns';
import { TRIO } from '@app/modules/common/components/ui/patterns';
import { AppearanceHeaderActions, AppearancePanel } from './AppearancePanel';
import { DateTimePanel } from './DateTimePanel';
import { TenantModulesPanel } from './TenantModulesPanel';
import { DeveloperMfaHeaderActions, DeveloperMfaPanel } from './DeveloperMfaPanel';

/**
 * The Settings areas, declared once.
 *
 * Settings is a hub, and hubs grow — so the page renders THIS list rather than
 * a hand-written column of cards. Adding an area is one entry here: it gets a
 * tile, a route into it and a back button for free, and it cannot end up with
 * different padding or a different hit target from the ones beside it.
 *
 * `id` is the URL fragment, so a settings area is linkable. Keep it stable once
 * it ships — it is the address someone will paste into a message.
 */
export interface SettingsArea {
  id: string;
  title: string;
  /** One line: what this area is for, not what it contains. */
  description: string;
  /** KTIcon (keenicons duotone) name. */
  icon: string;
  tone: Trio;
  /** Rendered when the area is opened. */
  Panel: ComponentType;
  /**
   * Optional controls beside “All Settings” in the entity header
   * (e.g. Appearance’s Reset to Defaults).
   */
  HeaderActions?: ComponentType;
  /** Short live value for the hub tile — answers the obvious question unopened. */
  useMeta?: () => string;
  /** Declared but not built yet: the tile shows, dimmed and inert. */
  comingSoon?: boolean;
  /** Hidden from the hub unless the signed-in user is Admin / Super Admin. */
  adminTierOnly?: boolean;
  /** Hidden unless Super Admin — commercial / platform ops (subscription packs). */
  superAdminOnly?: boolean;
  /**
   * Section access key (e.g. settings.developerMfa). When set, the hub tile and
   * detail view require Read on that section (Super Admin always passes).
   */
  sectionKey?: string;
}

export const SETTINGS_AREAS: readonly SettingsArea[] = [
  {
    id: 'appearance',
    title: 'appearance',
    description: 'Theme, brand colours and interface style. Yours, in this browser.',
    icon: 'color-swatch',
    tone: TRIO.purple,
    Panel: AppearancePanel,
    HeaderActions: AppearanceHeaderActions,
  },
  {
    id: 'date-time',
    title: 'date & time',
    description: 'Whether times read as 2:30 PM or 14:30, for you and for your organisation.',
    icon: 'time',
    tone: TRIO.blue,
    Panel: DateTimePanel,
  },
  {
    id: 'developer-mfa',
    title: 'System PIN MFA',
    description: 'Authenticator app for System PIN support access. Enroll here; use a code on any System PIN unlock screen.',
    icon: 'shield-tick',
    tone: TRIO.rose,
    Panel: DeveloperMfaPanel,
    HeaderActions: DeveloperMfaHeaderActions,
    sectionKey: 'settings.developerMfa',
  },
  {
    id: 'tenant-modules',
    title: 'tenant modules',
    description: 'Platform ops: which packs this org family purchased (not customer self-serve).',
    icon: 'element-11',
    tone: TRIO.cyan,
    Panel: TenantModulesPanel,
    superAdminOnly: true,
  },
];

export const findArea = (id: string | null): SettingsArea | undefined =>
  SETTINGS_AREAS.find((a) => a.id === id);
