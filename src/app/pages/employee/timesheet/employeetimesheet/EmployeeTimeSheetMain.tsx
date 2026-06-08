import { PageTitle } from '@metronic/layout/core';
import React from 'react'
import MyEmployeeTimeSheetPage from './component/MyEmployeeTimeSheetPage';

const EmployeeTimeSheetMain = () => {
    const TaskBreadcrumbs = [
    {
      title: 'Home',
      path: '/tasks/employee-timesheet',
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
    <div>
      <PageTitle breadcrumbs={TaskBreadcrumbs}>
              Employee TimeSheet
      </PageTitle>

      <MyEmployeeTimeSheetPage 
      fromAdmin={true}
      />

    </div>
  )
}

export default EmployeeTimeSheetMain