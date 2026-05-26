import dayjs from 'dayjs';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import type { SandwichPreviewResult, AffectedDay } from './sandwichPreview';

interface SandwichRuleBannerProps {
  preview: SandwichPreviewResult;
  dateFrom: string;
  dateTo: string;
  policyUrl?: string;
}

function DayChip({ day }: { day: AffectedDay }) {
  const label = dayjs(day.iso).format('ddd D MMM');
  const isHoliday = day.type === 'holiday';
  return (
    <span
      className={`lrc-sandwich-chip${isHoliday ? ' lrc-sandwich-chip--holiday' : ' lrc-sandwich-chip--weekend'}`}
      title={isHoliday && day.name ? day.name : undefined}
    >
      <span className="lrc-sandwich-chip__date">{label}</span>
      {isHoliday && day.name && (
        <span className="lrc-sandwich-chip__label">{day.name}</span>
      )}
      {!isHoliday && (
        <span className="lrc-sandwich-chip__label">Weekend</span>
      )}
    </span>
  );
}

export function SandwichRuleBanner({
  preview,
  dateFrom,
  dateTo,
  policyUrl = '#',
}: SandwichRuleBannerProps) {
  const start = dayjs(dateFrom);
  const end = dayjs(dateTo);
  const a = start.isBefore(end) ? start : end;
  const b = start.isBefore(end) ? end : start;

  return (
    <div className="lrc-sandwich-banner" role="alert" aria-live="polite">
      <AlertTriangle className="lrc-sandwich-banner__icon" size={18} aria-hidden="true" />
      <div className="lrc-sandwich-banner__body">
        <div className="lrc-sandwich-banner__title">Sandwich rule applied</div>
        <p className="lrc-sandwich-banner__text">
          Leave from <strong>{a.format('ddd D MMM')}</strong> to{' '}
          <strong>{b.format('ddd D MMM')}</strong> — the following non-working days
          between your leave are also charged:
        </p>

        {preview.affectedDays.length > 0 && (
          <div className="lrc-sandwich-chip-row" aria-label="Sandwiched days">
            {preview.affectedDays.map((d) => (
              <DayChip key={d.iso} day={d} />
            ))}
          </div>
        )}

        <p className="lrc-sandwich-banner__summary">
          Total chargeable:{' '}
          <strong>
            {preview.totalChargeable} day{preview.totalChargeable !== 1 ? 's' : ''}
          </strong>{' '}
          <span className="lrc-sandwich-banner__summary-base">
            (instead of {preview.baseChargeable})
          </span>
        </p>

        {policyUrl && policyUrl !== '#' && (
          <a
            href={policyUrl}
            className="lrc-sandwich-banner__link"
            target="_blank"
            rel="noopener noreferrer"
          >
            View policy <ExternalLink size={12} aria-hidden="true" />
          </a>
        )}
      </div>
    </div>
  );
}
