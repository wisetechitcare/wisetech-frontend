import { useQuery } from '@tanstack/react-query';
import type { WtSelectOption } from '@app/modules/common/components/ui';
import { getCompanyAgendaStatuses } from '@services/meetingAgendaMom';

/**
 * The company's active agenda statuses (Meetings → Configure → Agenda statuses), A–Z, as select
 * options with their colour. One source for every status picker — the MoM table and the project
 * MoM register — so both offer the same list in the same order.
 */
export const useAgendaStatusOptions = (): WtSelectOption[] =>
  useQuery({
    queryKey: ['meetings', 'agendaStatuses'],
    queryFn: async (): Promise<WtSelectOption[]> => {
      const res = await getCompanyAgendaStatuses();
      return (res?.statuses || [])
        .filter((st: any) => st.isActive !== false && st.code)
        .map((st: any) => ({ value: st.code, label: st.name || st.code, color: st.color || '#64748B' }))
        .sort((a: WtSelectOption, b: WtSelectOption) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
    },
    // Default staleTime (0): refetched on every mount, so a status renamed in Configure shows at once.
  }).data ?? [];
