import Holiday from '@pages/company/Holiday';
import PublicHoliday from '@pages/company/PublicHoliday';
import PublicHolidaysListTwo from '@pages/employee/calendar/views/PublicHolidayListTwo';
import React, { useState } from 'react'
import { Modal } from 'react-bootstrap';
import WeekendsAndWorkingDays from '../views/WeekendsAndWorkingDays';
import { useSelector } from 'react-redux';
import { RootState } from '@redux/store';
import { hasPermission } from '@utils/authAbac';
import { permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase } from '@constants/statistics';
import { PageTitle } from '@metronic/layout/core';
import RenameHoliday from '../views/RenameHoliday';

function Holidays() {
  const [showHolidayForm, setShowHolidayForm] = useState(false);
  const isAdmin = useSelector((state: RootState) => state.auth.currentUser.isAdmin);
  const [notificationToggle, setNotificationToggle] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const handleNotification = () => {
    setNotificationToggle(prev => !prev);
  };

  // Generate year options (current year ± 5 years)
  const generateYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 5; i <= currentYear + 5; i++) {
      years.push(i);
    }
    return years;
  };
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
        Holidays
      </PageTitle>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "1rem"
        }}
        className='px-lg-0 px-2'
      >
        <h2>Holidays</h2>
        <div className="d-flex align-items-center gap-3">
          <div className="d-flex align-items-center">
            <label htmlFor="yearSelect" className="me-2 mb-0 fw-bold">Year:</label>
            <select
              id="yearSelect"
              className="form-select form-select-sm"
              style={{ width: "120px" }}
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            >
              {generateYearOptions().map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
          {isAdmin && hasPermission(resourceNameMapWithCamelCase.holiday, permissionConstToUseWithHasPermission.editOthers) && (
            <button
              className="d-flex justify-content-between align-items-center bg-primary btn btn-md btn-primary fs-5 w-auto"
              onClick={() => setShowHolidayForm(true)}
            >
              <div className="d-flex justify-content-center invisible"></div>
              <div>Add Holiday</div>
            </button>
          )}
        </div>
        <Modal show={showHolidayForm} onHide={() => setShowHolidayForm(false)} centered>
          <Modal.Header closeButton>
            <Modal.Title >Add Holiday</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <PublicHoliday onClose={()=>{setShowHolidayForm(false)}} setShowNewHolidayForm={undefined} sendNotification={handleNotification}/>
            {/* <PublicHoliday onClose={() => setShowHolidayForm(false)} setShowNewHolidayForm={setShowHolidayForm} /> */}
          </Modal.Body>
        </Modal>
      </div>
      <PublicHolidaysListTwo getNotification={notificationToggle} selectedYear={selectedYear}/>
      {/* change this to new modal */}
      {/* <div className='px-lg-0 px-2 pt-4'>
        <h2>Rename Holiday Options</h2>
        <RenameHoliday getNotification={notificationToggle}/>
      </div> */}
    </>
  )
}

export default Holidays