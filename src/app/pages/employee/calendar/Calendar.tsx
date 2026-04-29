import { RootState } from '@redux/store';
import React, { useState } from 'react'
import { useSelector } from 'react-redux';
import CustomCalendar from '../CustomCalendar';
import { BarChart } from "@mui/icons-material";
import MaterialHeaderTab, { TabItem } from "@app/modules/common/components/MaterialHeaderTab";
import Holidays from './admin/Holidays';
import { PageTitle } from '@metronic/layout/core';
import { calenderIcons } from "@metronic/assets/sidepanelicons";
import RenameHoliday from './views/RenameHoliday';
import { leadsIcons } from "@metronic/assets/sidepanelicons";
import CalendarConfigure from './views/CalendarConfigure';
import { hasPermission } from "@utils/authAbac";
import { permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase, uiControlResourceNameMapWithCamelCase } from "@constants/statistics";

function Calendar() {
  const [activeTab, setActiveTab] = useState(0);

  const isAdmin = useSelector(
    (state: RootState) => state.auth.currentUser.isAdmin
  );

  const tabItems: TabItem[] = [
    {
      title: "Calendar",
      component: <CustomCalendar />,
      icon:
        activeTab === 0
          ? calenderIcons.calenderIcon.active
          : calenderIcons.calenderIcon.default,
    },
    ...(hasPermission(resourceNameMapWithCamelCase.holiday, permissionConstToUseWithHasPermission.editOthers) ? [
    {
      title: "Holidays",
      component: <Holidays />,
      icon:
        activeTab === 1
          ? calenderIcons.holidayesIcon.active
          : calenderIcons.holidayesIcon.default,
    }]:[]),
    ...(hasPermission(resourceNameMapWithCamelCase.holiday, permissionConstToUseWithHasPermission.editOthers) ? [{
      title: "Configure",
      component: <CalendarConfigure/>,
      icon:
        activeTab === 2
          ? leadsIcons.leadsConfigIcon.active
          : leadsIcons.leadsConfigIcon.default,
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
      <MaterialHeaderTab tabItems={tabItems} onTabChange={setActiveTab} />
    </>
  )
}

export default Calendar