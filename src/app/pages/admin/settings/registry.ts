import type { ComponentType } from 'react';
import type { Trio } from '@app/modules/common/components/ui/patterns';
import { TRIO } from '@app/modules/common/components/ui/patterns';
import { AppearancePanel } from './AppearancePanel';

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
  /** Short live value for the hub tile — answers the obvious question unopened. */
  useMeta?: () => string;
  /** Declared but not built yet: the tile shows, dimmed and inert. */
  comingSoon?: boolean;
}

export const SETTINGS_AREAS: readonly SettingsArea[] = [
  {
    id: 'appearance',
    title: 'appearance',
    description: 'Theme, brand colours and interface style. Yours, in this browser.',
    icon: 'color-swatch',
    tone: TRIO.purple,
    Panel: AppearancePanel,
  },
];

export const findArea = (id: string | null): SettingsArea | undefined =>
  SETTINGS_AREAS.find((a) => a.id === id);
