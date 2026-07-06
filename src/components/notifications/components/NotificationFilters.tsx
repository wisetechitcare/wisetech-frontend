import { memo } from 'react';
import { KTIcon } from '@metronic/helpers';
import type { NotificationFilterState, ReadFilter } from '../types';

interface Props {
  filters: NotificationFilterState;
  onChange: (patch: Partial<NotificationFilterState>) => void;
}

const READ_OPTIONS: { key: ReadFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'read', label: 'Read' },
];

/** Search box + read segment. */
function NotificationFiltersBase({ filters, onChange }: Props) {
  return (
    <div className="wt-panel__filters">
      <div className="wt-search">
        <KTIcon iconName="magnifier" className="fs-6 wt-search__icon" />
        <input
          className="wt-search__input"
          type="text"
          value={filters.search}
          placeholder="Search notifications…"
          aria-label="Search notifications"
          onChange={(e) => onChange({ search: e.target.value })}
        />
        {filters.search && (
          <button
            type="button"
            className="wt-search__clear"
            aria-label="Clear search"
            onClick={() => onChange({ search: '' })}
          >
            <KTIcon iconName="cross" className="fs-6" />
          </button>
        )}
      </div>

      <div className="wt-chiprow">
        <div className="wt-segment" role="group" aria-label="Filter by read state">
          {READ_OPTIONS.map((o) => (
            <button
              key={o.key}
              type="button"
              className={`wt-segment__btn ${
                filters.readFilter === o.key ? 'wt-segment__btn--active' : ''
              }`}
              aria-pressed={filters.readFilter === o.key}
              onClick={() => onChange({ readFilter: o.key })}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export const NotificationFilters = memo(NotificationFiltersBase);
