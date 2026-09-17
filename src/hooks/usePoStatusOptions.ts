import { useEffect, useState } from 'react';
import { getAllLeadPoStatuses } from '@services/lead';
import { useEventBus } from './useEventBus';
import { EVENT_KEYS } from '@constants/eventKeys';
import type { LeadPoStatus } from '@models/leads';

export interface PoStatusOption {
  value: string;
  label: string;
  color?: string;
}

/**
 * The three literals this list replaced, kept as the FALLBACK only.
 *
 * A PO Status dropdown that renders empty because the lookup 500'd or the master was
 * emptied is worse than one showing the values every existing lead already uses — the
 * field is on the contract step, and an empty select silently blocks the save. Never
 * import this to render options directly; use the hook.
 */
const FALLBACK: PoStatusOption[] = [
  { value: 'Pending', label: 'Pending' },
  { value: 'Approved', label: 'Approved' },
  { value: 'Rejected', label: 'Rejected' },
];

/**
 * Options for the lead form's "PO Status" field, from Leads → Configure → PO Status.
 *
 * A hook rather than a prop threaded through the wizard because the same dropdown appears
 * in three unrelated places (the Lead Status step, the PO Details section, and the entity
 * detail page's Commercials tab) — two of which get their data from different parents.
 *
 * `value` is the option's NAME: `Lead.poStatus` stores text, not an id, so what is saved
 * here is byte-identical to what the hardcoded array saved.
 */
export function usePoStatusOptions(): PoStatusOption[] {
  const [options, setOptions] = useState<PoStatusOption[]>(FALLBACK);

  const load = () => {
    getAllLeadPoStatuses()
      .then((res: any) => {
        const rows: LeadPoStatus[] = res?.data?.leadPoStatuses ?? res?.leadPoStatuses ?? [];
        if (!rows.length) return;
        setOptions(rows.map((r) => ({ value: r.name, label: r.name, color: r.color })));
      })
      .catch(() => { /* keep FALLBACK — see above */ });
  };

  useEffect(load, []);
  useEventBus(EVENT_KEYS.leadPoStatusCreated, load);
  useEventBus(EVENT_KEYS.leadPoStatusUpdated, load);
  useEventBus(EVENT_KEYS.leadPoStatusDeleted, load);

  return options;
}
