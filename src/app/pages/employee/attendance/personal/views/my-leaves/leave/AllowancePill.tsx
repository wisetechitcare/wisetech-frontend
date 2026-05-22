import type { CumulativeSummary } from './leaveTypes';

interface AllowancePillProps {
  summary: CumulativeSummary;
}

export function AllowancePill({ summary }: AllowancePillProps) {
  return (
    <div
      className="lrc-allowance-pill"
      role="status"
      aria-label={`${summary.remaining} leaves remaining of ${summary.allowedTillNow} allowed till now`}
      title="Cumulative paid leave allowance (all types combined)"
    >
      <span className="lrc-allowance-pill__remaining">{summary.remaining}</span>
      <span className="lrc-allowance-pill__sep">/</span>
      <span className="lrc-allowance-pill__total">{summary.allowedTillNow}</span>
      <span className="lrc-allowance-pill__label">left</span>
    </div>
  );
}
