
import { Button } from '@/ds/ui/button';/** Empty / loading placeholder states for the notification list. */

export function NotificationLoading() {
  return (
    <div className="wt-list-scroll" aria-busy="true" aria-label="Loading notifications">
      {[0, 1, 2, 3, 4].map((i) => (
        <div className="wt-skel" key={i} />
      ))}
    </div>
  );
}

interface EmptyProps {
  filtered: boolean;
  onReset?: () => void;
}

export function NotificationEmpty({ filtered, onReset }: EmptyProps) {
  return (
    <div className="wt-empty">
      <div className="wt-empty__glyph" aria-hidden="true">
        {filtered ? '🔍' : '🎉'}
      </div>
      <div className="wt-empty__title">
        {filtered ? 'No matching notifications' : "You're all caught up!"}
      </div>
      <div className="wt-empty__hint">
        {filtered
          ? 'Try adjusting your search or filters.'
          : 'New alerts will appear here in real time.'}
      </div>
      {filtered && onReset && (
        <Button variant="link" size="sm" style={{ marginTop: 4 }} type="button" onClick={onReset}>
          Clear filters
        </Button>
      )}
    </div>
  );
}

export function NotificationError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="wt-empty">
      <div className="wt-empty__glyph" aria-hidden="true">⚠️</div>
      <div className="wt-empty__title">Couldn’t load notifications</div>
      <div className="wt-empty__hint">Something went wrong while fetching updates.</div>
      <Button variant="link" size="sm" style={{ marginTop: 4 }} type="button" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}
