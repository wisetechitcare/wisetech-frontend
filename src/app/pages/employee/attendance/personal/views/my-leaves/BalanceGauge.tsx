import React from 'react';

interface BalanceGaugeProps {
  leaveTypeLabel?: string;
  /** Total available balance for the selected leave type (already accounts for prior usage). */
  available: number;
  /** Chargeable days for this request. */
  requesting: number;
}

const BalanceGauge: React.FC<BalanceGaugeProps> = ({ leaveTypeLabel, available, requesting }) => {
  if (!leaveTypeLabel || (available === 0 && requesting === 0)) return null;

  const isInsufficient = requesting > available;
  const remaining      = Math.max(0, available - requesting);
  const denominator    = Math.max(available, requesting, 1);
  const reqPct         = Math.min(100, (requesting  / denominator) * 100);
  const remPct         = Math.min(100, (remaining   / denominator) * 100);

  return (
    <div
      className={`lrc-balance-gauge${isInsufficient ? ' lrc-balance-gauge--over' : ''}`}
      aria-label={`${leaveTypeLabel}: ${requesting} of ${available} days requested`}
    >
      <div className="lrc-balance-gauge__header">
        <span className="lrc-balance-gauge__type">{leaveTypeLabel}</span>
        <span className={`lrc-balance-gauge__tally${isInsufficient ? ' lrc-balance-gauge__tally--error' : ''}`}>
          {requesting > 0
            ? `${requesting} of ${available} days`
            : `${available} days available`}
        </span>
      </div>

      <div className="lrc-balance-gauge__track" role="presentation" aria-hidden="true">
        {isInsufficient ? (
          <div className="lrc-balance-gauge__fill lrc-balance-gauge__fill--over" style={{ width: '100%' }} />
        ) : (
          <>
            <div className="lrc-balance-gauge__fill lrc-balance-gauge__fill--request" style={{ width: `${reqPct}%` }} />
            <div className="lrc-balance-gauge__fill lrc-balance-gauge__fill--remaining" style={{ width: `${remPct}%` }} />
          </>
        )}
      </div>

      <div className="lrc-balance-gauge__footer">
        {requesting > 0 && !isInsufficient && (
          <span className="lrc-balance-gauge__legend-item">
            <span className="lrc-balance-gauge__dot lrc-balance-gauge__dot--request" aria-hidden="true" />
            {requesting} this request
          </span>
        )}
        {isInsufficient ? (
          <span className="lrc-balance-gauge__legend-item lrc-balance-gauge__legend-item--error" role="alert">
            {requesting - available} day{requesting - available !== 1 ? 's' : ''} over balance
          </span>
        ) : (
          <span className="lrc-balance-gauge__legend-item">
            <span className="lrc-balance-gauge__dot lrc-balance-gauge__dot--remaining" aria-hidden="true" />
            {remaining} remaining after request
          </span>
        )}
      </div>
    </div>
  );
};

export default BalanceGauge;
