const LEGEND_ITEMS = [
  { cls: 'selected', label: 'Selected range' },
  { cls: 'holiday', label: 'Holiday (H)' },
  { cls: 'weekend', label: 'Weekend (W)' },
  { cls: 'existing', label: 'Your leave' },
] as const;

export function LeaveLegend({ showSandwichHint = false }: { showSandwichHint?: boolean }) {
  return (
    <div className="lrc-legend" role="list" aria-label="Calendar legend">
      {LEGEND_ITEMS.map(({ cls, label }) => (
        <span key={cls} className="lrc-legend__item" role="listitem">
          <span className={`lrc-legend__swatch lrc-legend__swatch--${cls}`} aria-hidden="true" />
          {label}
        </span>
      ))}
      {showSandwichHint && (
        <span className="lrc-legend__item" role="listitem">
          <span className="lrc-legend__badge-hint lrc-legend__badge-hint--sandwich" aria-hidden="true">
            S
          </span>
          Sandwich risk
        </span>
      )}
    </div>
  );
}
