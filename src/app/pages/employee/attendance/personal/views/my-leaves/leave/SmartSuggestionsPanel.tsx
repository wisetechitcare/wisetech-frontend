import { useState } from 'react';
import dayjs from 'dayjs';
import { ChevronDown, Sparkles, Info } from 'lucide-react';
import type { Suggestion, EfficiencyTier } from '../utils/suggestionEngine';

interface SmartSuggestionsPanelProps {
  general: Suggestion[];
  personalized: Suggestion[];
  isPersonalizedFallback?: boolean;
  onApply: (start: Date, end: Date) => void;
}

const TIER_LABELS: Record<EfficiencyTier, string> = {
  JACKPOT:   'Best',
  EXCELLENT: 'Great',
  GOOD:      'Good',
  DECENT:    'Fair',
};

const TIER_MODIFIER: Record<EfficiencyTier, string> = {
  JACKPOT:   '--jackpot',
  EXCELLENT: '--excellent',
  GOOD:      '--good',
  DECENT:    '--decent',
};

function SuggestionItem({ s, onApply }: { s: Suggestion; onApply: (start: Date, end: Date) => void }) {
  return (
    <li role="presentation">
      <button
        type="button"
        role="option"
        className="lrc-suggestions__item"
        aria-label={`Apply ${dayjs(s.start).format('DD MMM')} to ${dayjs(s.end).format('DD MMM')}, ${s.efficiency.toFixed(1)} times impact`}
        onClick={() => onApply(s.start, s.end)}
      >
        <span className="lrc-suggestions__item-text">
          <span className="lrc-suggestions__dates">
            {dayjs(s.start).format('DD MMM')} – {dayjs(s.end).format('DD MMM')}
            {s.reason && (
              <span
                className="lrc-suggestion-reason"
                data-tooltip={s.reason}
                aria-label={s.reason}
                onClick={(e) => e.stopPropagation()}
              >
                <Info size={11} aria-hidden="true" />
              </span>
            )}
          </span>
          <span className="lrc-suggestions__desc">{s.description}</span>
        </span>
        <span className={`lrc-suggestions__badge lrc-suggestions__badge${TIER_MODIFIER[s.tier]}`}>
          {s.efficiency.toFixed(1)}× {TIER_LABELS[s.tier]}
        </span>
      </button>
    </li>
  );
}

export function SmartSuggestionsPanel({
  general,
  personalized,
  isPersonalizedFallback = false,
  onApply,
}: SmartSuggestionsPanelProps) {
  const [open, setOpen] = useState(true);

  if (general.length === 0 && personalized.length === 0) return null;

  return (
    <div className="lrc-suggestions">
      <button
        type="button"
        className="lrc-suggestions__toggle"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="lrc-suggestions__toggle-label">
          <Sparkles size={16} aria-hidden="true" />
          Smart suggestions
        </span>
        <ChevronDown
          size={18}
          className={`lrc-suggestions__chevron${open ? ' lrc-suggestions__chevron--open' : ''}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <>
          {personalized.length > 0 && (
            <>
              <div className="lrc-suggestions__section-header">
                {isPersonalizedFallback ? 'Upcoming' : 'For You'}
              </div>
              <div className="lrc-suggestions__section-sub">
                {isPersonalizedFallback ? 'Next available windows' : 'Based on your leave history'}
              </div>
              <ul className="lrc-suggestions__list" role="listbox" aria-label="Personalised leave suggestions">
                {personalized.map((s, idx) => (
                  <SuggestionItem key={idx} s={s} onApply={onApply} />
                ))}
              </ul>
              {general.length > 0 && <hr className="lrc-suggestions__divider" />}
            </>
          )}

          {general.length > 0 && (
            <>
              <div className="lrc-suggestions__section-header">Best Opportunities</div>
              <ul className="lrc-suggestions__list" role="listbox" aria-label="Best leave date ranges">
                {general.map((s, idx) => (
                  <SuggestionItem key={idx} s={s} onApply={onApply} />
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </div>
  );
}
