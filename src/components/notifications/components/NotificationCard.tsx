import { memo, useCallback, type CSSProperties, type KeyboardEvent } from 'react';
import { KTIcon } from '@metronic/helpers';
import { getNotificationIcon } from '@utils/notificationStyles';
import { formatNotificationDate } from '@utils/date';
import type { AppNotification } from '../types';
import { MODULE_META, PRIORITY_META } from '../constants';
import { Button } from '@/ds/ui/button';

export interface NotificationCardProps {
  notification: AppNotification;
  onActivate: (n: AppNotification) => void;
  onDismiss: (id: string) => void;
  onMarkRead: (id: string) => void;
}

/**
 * A single notification row. Memoized so that list re-renders (search typing,
 * a sibling being dismissed) don't re-render every card.
 */
function NotificationCardBase({
  notification: n,
  onActivate,
  onDismiss,
  onMarkRead,
}: NotificationCardProps) {
  const meta = PRIORITY_META[n.priority];
  const module = MODULE_META[n.moduleKey] ?? MODULE_META.general;

  const style = {
    '--wt-card-accent': meta.color,
    '--wt-card-soft': meta.soft,
  } as CSSProperties;

  const activate = useCallback(() => onActivate(n), [n, onActivate]);

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onActivate(n);
      }
    },
    [n, onActivate],
  );

  const stop = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <div data-wt-control="row"
      className={`wt-card ${n.isRead ? 'wt-card--read' : 'wt-card--unread'}`}
      style={style}
      role="button"
      tabIndex={0}
      aria-label={`${meta.label} notification: ${n.title}`}
      onClick={activate}
      onKeyDown={onKeyDown}
    >
      <div className="wt-card__icon" aria-hidden="true">
        {getNotificationIcon(n.status) || module.glyph}
      </div>

      <div className="wt-card__main">
        <div className="wt-card__row">
          <span className="wt-card__title">{n.title}</span>

          <span className="wt-card__actions">
            {!n.isRead && (
              <Button variant="ghost" size="icon-xs"
                type="button"
                title="Mark as read"
                aria-label="Mark as read"
                onClick={(e) => {
                  stop(e);
                  onMarkRead(n.id);
                }}
              >
                <KTIcon iconName="check" className="fs-7" />
              </Button>
            )}
            <Button variant="tinted" size="icon-xs" style={{ '--tint': 'var(--cta-danger)' } as import('react').CSSProperties}
              type="button"
              title="Dismiss"
              aria-label="Dismiss notification"
              onClick={(e) => {
                stop(e);
                onDismiss(n.id);
              }}
            >
              <KTIcon iconName="cross" className="fs-6" />
            </Button>
          </span>
        </div>

        {n.message && <div className="wt-card__message">{n.message}</div>}

        <div className="wt-card__meta">
          <span className="wt-card__cat">{module.label}</span>
          <span className="wt-card__meta-item">
            <KTIcon iconName="time" className="fs-8" />
            {formatNotificationDate(n.createdAt)}
          </span>
        </div>
      </div>
    </div>
  );
}

export const NotificationCard = memo(NotificationCardBase);
