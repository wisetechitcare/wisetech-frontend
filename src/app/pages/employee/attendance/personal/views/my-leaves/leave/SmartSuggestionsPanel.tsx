import { useState } from 'react';
import dayjs from 'dayjs';
import { ChevronDown, Sparkles } from 'lucide-react';
import type { Suggestion } from '../utils/suggestionEngine';

interface SmartSuggestionsPanelProps {
  suggestions: Suggestion[];
  onApply: (start: Date, end: Date) => void;
}

export function SmartSuggestionsPanel({ suggestions, onApply }: SmartSuggestionsPanelProps) {
  const [open, setOpen] = useState(false);
  const visible = suggestions.slice(0, 3);

  if (visible.length === 0) return null;

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
        <ul className="lrc-suggestions__list" role="listbox" aria-label="Suggested leave date ranges">
          {visible.map((s, idx) => (
            <li key={idx} role="presentation">
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
                  </span>
                  <span className="lrc-suggestions__desc">{s.description}</span>
                </span>
                <span className="lrc-suggestions__badge">{s.efficiency.toFixed(1)}×</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
