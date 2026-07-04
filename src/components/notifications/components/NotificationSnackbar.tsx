import { forwardRef } from 'react';
import { KTIcon } from '@metronic/helpers';

interface Props {
  unreadCount: number;
  /** Count of critical unread items, shown as a small "relevant" hint. */
  criticalCount?: number;
  onOpen: () => void;
}

/**
 * Collapsed floating snackbar shown above the bottom navigation.
 *
 * Intentionally CONSISTENT: it always shows the same summary (title + unread
 * count, plus a small critical hint) rather than a specific notification, so it
 * reads as a stable access point. The actual notifications are revealed only on
 * expand.
 */
export const NotificationSnackbar = forwardRef<HTMLButtonElement, Props>(
  ({ unreadCount, criticalCount = 0, onOpen }, ref) => {
    const countLabel =
      unreadCount === 1 ? '1 unread notification' : `${unreadCount} unread notifications`;

    return (
      <button
        type="button"
        className="wt-snack"
        ref={ref}
        onClick={onOpen}
        aria-label={`${countLabel}. Open notification center.`}
      >
        <span className="wt-snack__logo" aria-hidden="true">
          <KTIcon iconName="notification-on" className="fs-4" />
          {unreadCount > 0 && (
            <span className="wt-badge wt-badge--pulse">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </span>

        <span className="wt-snack__body">
          <span className="wt-snack__heading">Notifications</span>
          <span className="wt-snack__count">
            {unreadCount} unread
          </span>
        </span>

        <span className="wt-snack__chevron" aria-hidden="true">
          <KTIcon iconName="up" className="fs-5" />
        </span>
      </button>
    );
  },
);

NotificationSnackbar.displayName = 'NotificationSnackbar';
