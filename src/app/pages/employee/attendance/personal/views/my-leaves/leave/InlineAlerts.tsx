import { Info, AlertTriangle } from 'lucide-react';
import type { LeaveAlert } from './leaveTypes';

interface InlineAlertsProps {
  alerts: LeaveAlert[];
  globalWarning?: string;
}

export function InlineAlerts({ alerts, globalWarning }: InlineAlertsProps) {
  if (!globalWarning && alerts.length === 0) return null;

  return (
    <div className="lrc-alerts" aria-live="polite">
      {globalWarning && (
        <div className="lrc-alert lrc-alert--warning" role="alert">
          <AlertTriangle size={16} aria-hidden="true" />
          <span>{globalWarning}</span>
        </div>
      )}
      {alerts.map((a) => (
        <div
          key={a.id}
          className={`lrc-alert lrc-alert--${a.severity}`}
          role="alert"
        >
          {a.severity === 'info' ? (
            <Info size={16} aria-hidden="true" />
          ) : (
            <AlertTriangle size={16} aria-hidden="true" />
          )}
          <span>{a.message}</span>
        </div>
      ))}
    </div>
  );
}
