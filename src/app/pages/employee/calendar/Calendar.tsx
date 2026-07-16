import React from 'react'
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
      <MaterialHeaderTab tabItems={tabItems} hideScrollButtons />
    </>
  )
}

export default Calendar