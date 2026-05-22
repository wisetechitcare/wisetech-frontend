import dayjs from 'dayjs';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import type { SandwichPreviewResult } from './sandwichPreview';

interface SandwichRuleBannerProps {
  preview: SandwichPreviewResult;
  dateFrom: string;
  dateTo: string;
  policyUrl?: string;
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

  const bridgeDays = preview.affectedDates
    .map((iso) => dayjs(iso).format('ddd D MMM'))
    .join(', ');

  return (
    <div className="lrc-sandwich-banner" role="alert" aria-live="polite">
      <AlertTriangle className="lrc-sandwich-banner__icon" size={18} aria-hidden="true" />
      <div className="lrc-sandwich-banner__body">
        <div className="lrc-sandwich-banner__title">Sandwich rule applied</div>
        <p className="lrc-sandwich-banner__text">
          You are taking leave from <strong>{a.format('ddd D MMM')}</strong> to{' '}
          <strong>{b.format('ddd D MMM')}</strong>.
          {bridgeDays && (
            <>
              {' '}
              <strong>{bridgeDays}</strong> will also be counted as paid leave (company sandwich policy).
            </>
          )}
        </p>
        <p className="lrc-sandwich-banner__text">
          Total chargeable: <strong>{preview.totalChargeable}</strong> day
          {preview.totalChargeable !== 1 ? 's' : ''} instead of {preview.baseChargeable}.
        </p>
        <a
          href={policyUrl}
          className="lrc-sandwich-banner__link"
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => {
            if (policyUrl === '#') e.preventDefault();
          }}
        >
          View policy <ExternalLink size={12} aria-hidden="true" />
        </a>
      </div>
    </div>
  );
}
