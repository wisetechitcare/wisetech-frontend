/**
 * Dedicated Meetings workspace (sidebar). Same MaterialHeaderTab / useTabRoute pattern as Calendar.
 * Reuses MeetingDialog + MeetingsList for scheduling; minutes live on the Agenda tab.
 */
import { useMemo } from 'react';
import MaterialHeaderTab, { TabItem } from '@app/modules/common/components/MaterialHeaderTab';
import { PageTitle } from '@metronic/layout/core';
import { useTabRoute } from '@app/hooks/useTabRoute';
import CalendarMeetingsTab from '../calendar/views/Meetings';
import MeetingsOverviewTab from './tabs/MeetingsOverviewTab';
import MeetingsAgendaHubTab from './tabs/MeetingsAgendaHubTab';
import MeetingsConfigureTab from './tabs/MeetingsConfigureTab';

// Who may open this page is decided by the route's SectionGuard (Read on Meetings); which tabs
// show is decided by MaterialHeaderTab from the same section (Access → Meetings → Advanced).
function MeetingsMain() {
  // Stable tab elements — recreating <MeetingsAgendaHubTab /> each render remounts the hub
  // and clears search / selection state while typing.
  const tabItems: TabItem[] = useMemo(
    () => [
      { title: 'Overview', component: <MeetingsOverviewTab />, icon: 'bi-speedometer2' },
      { title: 'All Meetings', component: <CalendarMeetingsTab />, icon: 'bi-people' },
      { title: 'Agenda', component: <MeetingsAgendaHubTab />, icon: 'bi-list-check' },
      { title: 'Configure', component: <MeetingsConfigureTab />, icon: 'bi-gear' },
    ],
    [],
  );

  const { activeTab, setActiveTab } = useTabRoute(
    '/employees/meetings',
    tabItems.map((t) => t.title),
  );

  return (
    <>
      <PageTitle>Meetings</PageTitle>
      <MaterialHeaderTab
        tabItems={tabItems}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        hideScrollButtons
        accessSection="meetings"
      />
    </>
  );
}

export default MeetingsMain;
