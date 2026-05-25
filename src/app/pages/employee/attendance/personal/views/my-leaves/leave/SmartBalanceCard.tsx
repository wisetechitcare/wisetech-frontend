import type { CumulativeSummary } from './leaveTypes';
import type { TypeBalanceStats } from './balanceStats';

interface SmartBalanceCardProps {
  stats: TypeBalanceStats | null;
  cumulativeSummary?: CumulativeSummary | null;
  fiscalResetLabel?: string | null;
  showCumulative?: boolean;
}

export function SmartBalanceCard({
  stats,
  cumulativeSummary,
  fiscalResetLabel,
  showCumulative = true,
}: SmartBalanceCardProps) {
  if (!stats) {
    return (
      <div className="lrc-smart-balance lrc-smart-balance--empty" aria-label="Select a leave type to view balance">
        <span className="lrc-smart-balance__placeholder">Select leave type</span>
      </div>
    );
  }

  const shortLabel = stats.leaveTypeLabel.replace(/\s*\([^)]*\)\s*$/, '').trim();

  return (
    <div
      className="lrc-smart-balance"
      role="region"
      aria-label={`${shortLabel} balance: ${stats.available} available of ${stats.total}`}
    >
      <div className="lrc-smart-balance__title">{shortLabel}</div>
      <div className="lrc-smart-balance__stats" role="list">
        {(
          [
            { key: 'Tot', val: stats.total, label: 'Total' },
            { key: 'Used', val: stats.used, label: 'Used' },
            { key: 'Pend', val: stats.pending, label: 'Pending' },
            { key: 'Avl', val: stats.available, label: 'Available' },
          ] as const
        ).map(({ key, val, label }) => (
          <div key={key} className="lrc-smart-balance__stat" role="listitem">
            <span className={`lrc-smart-balance__stat-val${key === 'Avl' ? ' lrc-smart-balance__stat-val--primary' : ''}`}>
              {val}
            </span>
            <span className="lrc-smart-balance__stat-lbl">{label}</span>
          </div>
        ))}
      </div>
      {fiscalResetLabel && (
        <div className="lrc-smart-balance__meta">Resets: {fiscalResetLabel}</div>
      )}
      {showCumulative && cumulativeSummary && (
        <div className="lrc-smart-balance__cumulative" title="Combined paid leave cap for this fiscal year">
          Combined paid cap: <strong>{cumulativeSummary.remaining}</strong> of{' '}
          {cumulativeSummary.allowedTillNow} left this FY
        </div>
      )}
    </div>
  );
}
