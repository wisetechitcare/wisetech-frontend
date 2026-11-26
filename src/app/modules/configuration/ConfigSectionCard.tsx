import React, { type CSSProperties } from 'react';
import { Button } from '@/ds/ui/button';
import { IconSlot, type IconSource } from '@/ds/ui/dynamic-icon';
import { SettingsSection, type SettingsSectionStatus } from '@/ds/patterns/settings-section';
import { legacyTone } from '@app/modules/common/components/ui/legacyTone';

/**
 * ConfigSectionCard — a THIN ADAPTER over the kit's `Components/Cards/Settings Section`.
 *
 * It was 293 lines that drew its own card: MUI's `useTheme()` read into inline `style` objects,
 * a hand-built accent bar, hover shadow, skeleton, status pill and badge, plus a third icon
 * renderer (`bi-*` → keenicon → KTIcon font → Bootstrap `<i>` fallback). Every one of those now
 * belongs to the kit: `Card` owns the tone accent, the hover lift and the dense spacing,
 * `Skeleton` and `Badge dot` the loading and status states, `IconSlot` the icons.
 *
 * It keeps the old prop NAMES so its ~31 call sites do not change, and nothing else. When the
 * last caller imports `SettingsSection` directly, delete this file.
 *
 * Two props went rather than being forwarded, because nothing passed them:
 *   `collapsible` — no call site used it, and a config section that hides its own body is not a
 *                   pattern the kit has or wants.
 *   `variant`     — only ever passed as its own default ('default'); 'highlighted' and 'bordered'
 *                   were never used.
 */

export interface ConfigSectionCardAction {
  label: string;
  icon?: IconSource;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  disabled?: boolean;
}

export interface ConfigSectionCardProps {
  title: string;
  description?: string;
  icon?: IconSource;
  iconColor?: 'primary' | 'blue' | 'green' | 'purple' | 'amber' | 'teal' | 'danger' | 'warning';
  primaryAction?: ConfigSectionCardAction;
  secondaryActions?: ConfigSectionCardAction[];
  loading?: boolean;
  /**
   * A count beside the title. `color` / `bg` are accepted and IGNORED: the kit draws a count as a
   * neutral Badge, because a count is not a status and the kit holds one meaning per colour.
   */
  badge?: { label: string; color?: string; bg?: string };
  status?: SettingsSectionStatus;
  compact?: boolean;
  headerRight?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

// The kit Button owns the look: primary → `default`; danger (a red outline) → `tinted` in the
// danger tone so it still reads as destructive; secondary / outline → `outline`.
const DANGER_TINT = { '--tint': 'var(--cta-danger)' } as CSSProperties;

const ActionBtn: React.FC<{ action: ConfigSectionCardAction }> = ({ action }) => (
  <Button
    variant={action.variant === 'primary' ? 'default' : action.variant === 'danger' ? 'tinted' : 'outline'}
    size="sm"
    style={action.variant === 'danger' ? DANGER_TINT : undefined}
    onClick={action.onClick}
    disabled={action.disabled}
  >
    {action.icon && (
      <span data-icon="inline-start" className="inline-flex">
        <IconSlot icon={action.icon} className="size-[17px]" />
      </span>
    )}
    {action.label}
  </Button>
);

const ConfigSectionCard: React.FC<ConfigSectionCardProps> = ({
  title, description, icon, iconColor = 'primary',
  primaryAction, secondaryActions = [], loading = false,
  badge, status, compact = false, headerRight, children, className,
}) => {
  /*
   * `headerRight` survives loading; the actions do not.
   *
   * That split is the old card's, and it is worth keeping: `headerRight` holds VIEW controls (a
   * period toggle, a tab bar, an org filter) which belong on screen while the body loads, whereas
   * a primary action is a WRITE against data that has not arrived. The kit frame renders whatever
   * `action` it is given in every state, so the policy lives here, at the layer that knows which
   * of the two a slot holds.
   */
  const actions = loading ? [] : [...secondaryActions, ...(primaryAction ? [primaryAction] : [])];
  const action = headerRight || actions.length > 0
    ? (
      <div className="flex items-center gap-2">
        {headerRight}
        {actions.map((a, i) => <ActionBtn key={i} action={a} />)}
      </div>
    )
    : undefined;

  return (
    <SettingsSection
      title={title}
      description={description}
      // 23px: the size the old card's `slotClass` drew these at, so the header keeps its weight.
      icon={icon ? <IconSlot icon={icon} className="size-[23px]" /> : undefined}
      tone={legacyTone(iconColor)}
      count={badge?.label}
      status={status}
      loading={loading}
      size={compact ? 'sm' : 'default'}
      // A config body is a grid or a chip list, not a list of settings rows: the old card drew no
      // hairlines between its children, and `divided` would put one between every grid it holds.
      divided={false}
      className={className}
      action={action}
    >
      {children}
    </SettingsSection>
  );
};

export default ConfigSectionCard;
