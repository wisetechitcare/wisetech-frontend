import React from 'react';
import { Tooltip } from '@mui/material';
import { usePermission } from '@hooks/usePermission';
import { WtButton, WtButtonProps } from '@app/modules/common/components/ui/buttons';

export interface ActionButtonProps extends WtButtonProps {
  /**
   * Capability required to use this action, e.g. "employees.manage",
   * "leave.approve". Read-only behaviour emerges automatically: a user who holds
   * the page's `view` capability but not this one gets a disabled (or hidden)
   * action — no per-page logic, no role checks.
   */
  permission: string;
  /**
   * What to do when the permission is NOT held:
   *   'disable' → render the button greyed-out (default — the read-only affordance)
   *   'hide'    → render nothing
   */
  mode?: 'hide' | 'disable';
  /** Tooltip shown on the disabled button when access is denied. */
  deniedTooltip?: string;
}

/**
 * `<ActionButton>` — a permission-aware wrapper around the app's existing
 * `WtButton`. The single reusable mechanism for authorizing actions
 * (Create/Edit/Delete/Approve/Reject/Transfer/Assign/Archive/Restore/Export/…).
 *
 * It consumes ONLY `usePermission()` (reactive), forwards every `WtButton` prop
 * (tone/ghost/inverted/startIcon/onClick/sx/…) unchanged, and never contains
 * business logic. Frontend gating is UX only — the backend still enforces the
 * action on the API.
 *
 *   <ActionButton permission="employees.manage" startIcon={…} onClick={edit}>Edit</ActionButton>
 *   <ActionButton permission="employees.delete" tone="danger" mode="hide">Delete</ActionButton>
 */
export const ActionButton: React.FC<ActionButtonProps> = ({
  permission,
  mode = 'disable',
  deniedTooltip = 'You do not have permission for this action.',
  disabled,
  ...buttonProps
}) => {
  const allowed = usePermission(permission);

  // Not allowed + hide → render nothing.
  if (!allowed && mode === 'hide') return null;

  const button = <WtButton disabled={disabled || !allowed} {...buttonProps} />;

  // Not allowed + disable → greyed button with an explanatory tooltip. The <span>
  // wrapper is required for MUI tooltips on a disabled element (it swallows events).
  if (!allowed) {
    return (
      <Tooltip title={deniedTooltip}>
        <span style={{ display: 'inline-flex' }}>{button}</span>
      </Tooltip>
    );
  }

  return button;
};

export default ActionButton;
