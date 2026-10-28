/**
 * Dedicated Meetings workspace (sidebar). Same MaterialHeaderTab / useTabRoute pattern as Calendar.
 * Reuses MeetingDialog + MeetingsList for scheduling; minutes live on the Agenda tab.
 */
import { useMemo } from 'react';
import MaterialHeaderTab, { TabItem } from '@app/modules/common/components/MaterialHeaderTab';
import { PageTitle } from '@metronic/layout/core';
import { useTabRoute } from '@app/hooks/useTabRoute';
import { hasPermission } from '@utils/authAbac';
import { permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase } from '@constants/statistics';
import CalendarMeetingsTab from '../calendar/views/Meetings';
import MeetingsOverviewTab from './tabs/MeetingsOverviewTab';
import MeetingsAgendaHubTab from './tabs/MeetingsAgendaHubTab';
import MeetingsConfigureTab from './tabs/MeetingsConfigureTab';

function MeetingsMain() {
  const canRead = hasPermission(
    resourceNameMapWithCamelCase.meeting,
    permissionConstToUseWithHasPermission.readOwn,
  );

  // Stable tab elements — recreating <MeetingsAgendaHubTab /> each render remounts the hub
  // and clears search / selection state while typing.
  const tabItems: TabItem[] = useMemo(
    () =>
      canRead
        ? [
            { title: 'Overview', component: <MeetingsOverviewTab />, icon: 'bi-speedometer2' },
            { title: 'All Meetings', component: <CalendarMeetingsTab />, icon: 'bi-people' },
            { title: 'Agenda', component: <MeetingsAgendaHubTab />, icon: 'bi-list-check' },
            { title: 'Configure', component: <MeetingsConfigureTab />, icon: 'bi-gear' },
          ]
        : [],
    [canRead],
  );

  const { activeTab, setActiveTab } = useTabRoute(
    '/employees/meetings',
    tabItems.map((t) => t.title),
  );

  return (
    <>
      <PageTitle>Meetings</PageTitle>
      {!canRead ? (
        <div className="px-4 py-6 text-muted">You do not have permission to view meetings.</div>
      ) : (
        <MaterialHeaderTab
          tabItems={tabItems}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          hideScrollButtons
          accessSection="calendar"
        />
      )}
    </>
  );
}

export default MeetingsMain;
