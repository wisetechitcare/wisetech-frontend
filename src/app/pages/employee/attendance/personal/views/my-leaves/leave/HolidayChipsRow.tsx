import dayjs from 'dayjs';
import { CalendarDays } from 'lucide-react';
import type { Holiday } from './leaveTypes';

interface HolidayChipsRowProps {
  holidays: Holiday[];
  onNavigate: (monthStart: Date) => void;
}

export function HolidayChipsRow({ holidays, onNavigate }: HolidayChipsRowProps) {
  if (holidays.length === 0) return null;

  return (
    <div className="lrc-holiday-bar" role="list" aria-label="Upcoming public holidays this month">
      <div className="lrc-holiday-bar__scroll">
        {holidays.map((h) => (
          <button
            key={h.date}
            type="button"
            role="listitem"
            className="lrc-holiday-chip"
            aria-label={`${h.name} on ${dayjs(h.date).format('dddd, D MMMM')} — navigate to month`}
            onClick={() => onNavigate(dayjs(h.date).startOf('month').toDate())}
          >
            <span className="lrc-holiday-chip__icon" aria-hidden="true">
              <CalendarDays size={16} />
            </span>
            <span className="lrc-holiday-chip__body">
              <span className="lrc-holiday-chip__name">{h.name}</span>
              <span className="lrc-holiday-chip__date">
                {dayjs(h.date).format('ddd, DD MMM')} · 1 day
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
