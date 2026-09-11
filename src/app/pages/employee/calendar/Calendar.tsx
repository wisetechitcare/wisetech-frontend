import React, { useEffect, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom';
import CustomCalendar from '../CustomCalendar';
import MaterialHeaderTab, { TabItem } from "@app/modules/common/components/MaterialHeaderTab";
import Holidays from './admin/Holidays';
import Meetings from './views/Meetings';
import { PageTitle } from '@metronic/layout/core';
import CalendarConfigure from './views/CalendarConfigure';
import { hasPermission } from "@utils/authAbac";
import { permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase } from "@constants/statistics";

// Sidebar-style tab icons: Bootstrap Icon fonts (`bi-*`) — the same icon system
// the aside menu uses (see useNavigation.ts `fontIcon`). MaterialHeaderTab renders
// a `bi-*` string as a Bootstrap `<i>` (and boxes it when the tab is selected).
function Calendar() {
  const [params] = useSearchParams();
  const tabItems: TabItem[] = [
    {
      title: "Calendar",
      component: <CustomCalendar />,
      icon: 'bi-calendar-event',
    },
    ...(hasPermission(resourceNameMapWithCamelCase.meeting, permissionConstToUseWithHasPermission.readOwn) ? [
    {
      title: "Meetings",
      component: <Meetings />,
      icon: 'bi-people',
    }]:[]),
    ...(hasPermission(resourceNameMapWithCamelCase.holiday, permissionConstToUseWithHasPermission.editOthers) ? [
    {
      title: "Holidays",
      component: <Holidays />,
      icon: 'bi-calendar2-check',
    }]:[]),
    ...(hasPermission(resourceNameMapWithCamelCase.holiday, permissionConstToUseWithHasPermission.editOthers) ? [{
      title: "Configure",
      component: <CalendarConfigure/>,
      icon: 'bi-gear',
    }] : [])
  ];

  /**
   * `?tab=Meetings` opens that tab — how a meeting clicked on the Calendar tab gets to the
   * screen that owns meetings.
   *
   * Matched by TITLE, not index: three of the four tabs are permission-gated, so the index
   * of "Meetings" differs per person and a hardcoded number would land somebody on Holidays.
   * A name nobody here has (no permission for it) falls back to the first tab rather than -1.
   */
  const wanted = params.get('tab');
  const requestedTab = wanted
    ? Math.max(0, tabItems.findIndex((t) => t.title.toLowerCase() === wanted.toLowerCase()))
    : 0;

  /**
   * The tab is STATE seeded from the URL, not the URL read live.
   *
   * Read live, the strip could never move: `activeTab` would stay pinned at the requested
   * index, so clicking back to Calendar would be undone on the next render. Held here and
   * fed back through `onTabChange`, the URL only ever nudges it.
   *
   * Keyed on `location.key`, NOT on the query string. Router gives every navigation a fresh
   * key even when the URL is byte-identical, which is the case this has to survive: come here
   * from a meeting, switch back to the Calendar tab by hand, then click that same meeting
   * again. The query would not have changed, so a query-keyed effect would not re-run and the
   * click would do nothing at all.
   */
  const location = useLocation();
  const [tab, setTab] = useState(requestedTab);
  useEffect(() => { setTab(requestedTab); }, [location.key]);

  const calendarBreadcrumbs = [
    {
      title: 'Employees',
      path: '/employees',
      isSeparator: false,
      isActive: false,
    },
    {
      title: '',
      path: '',
      isSeparator: true,
      isActive: false,
    },
  ];

  return (
    <>
      <PageTitle breadcrumbs={calendarBreadcrumbs}>
        Calendar
      </PageTitle>
      <MaterialHeaderTab tabItems={tabItems} activeTab={tab} onTabChange={setTab} hideScrollButtons />
    </>
  )
}

export default Calendar