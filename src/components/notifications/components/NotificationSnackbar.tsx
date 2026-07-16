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
 * Deliberately minimal — a slim auto-width pill (bell + unread count + chevron)
 * so it occupies as little screen as possible while staying an obvious,
 * tappable access point. The actual notifications are revealed only on expand.
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
        <span
          className={`wt-snack__logo${criticalCount > 0 ? ' wt-snack__logo--critical' : ''}`}
          aria-hidden="true"
        >
          <KTIcon iconName="notification-on" className="fs-7" />
        </span>

        <span className="wt-snack__count">
          {unreadCount > 99 ? '99+' : unreadCount} unread
        </span>

        <span className="wt-snack__chevron" aria-hidden="true">
          <KTIcon iconName="up" className="fs-8" />
        </span>
      </button>
    );
  },
);

NotificationSnackbar.displayName = 'NotificationSnackbar';
