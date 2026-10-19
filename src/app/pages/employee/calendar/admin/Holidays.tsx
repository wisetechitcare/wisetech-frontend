import PublicHolidaysListTwo from '@pages/employee/calendar/views/PublicHolidayListTwo';
import React, { useState } from 'react'
import { PageTitle } from '@metronic/layout/core';

function Holidays() {
  const [notificationToggle, setNotificationToggle] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

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
      <PageTitle breadcrumbs={calendarBreadcrumbs}>Holidays</PageTitle>

      {/* Main Container wrapping the high-fidelity component directly */}
      <div className="card shadow-sm border-0 mb-6 mx-lg-0 mx-2" style={{ borderRadius: '16px', background: '#ffffff', overflow: 'hidden' }}>
          <PublicHolidaysListTwo 
            getNotification={notificationToggle} 
            selectedYear={selectedYear}
            setSelectedYear={setSelectedYear}
          />
      </div>
    </>
  )
}

export default Holidays
