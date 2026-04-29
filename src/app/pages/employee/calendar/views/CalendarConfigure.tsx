import React, { useEffect, useState } from 'react'
import { Card } from 'react-bootstrap'
import RenameHoliday from './RenameHoliday'
import WeekendsAndWorkingDays from './WeekendsAndWorkingDays'
import { SHOW_BIRTHDAY_ON_CALENDAR, SHOW_WORK_ANIVERSARY_ON_CALENDAR } from '@constants/configurations-key'
import { useConfiguration } from '@hooks/useConfiguration'
import Loader from '@app/modules/common/utils/Loader'

function CalendarConfigure() {
  const [isLoading, setIsLoading] = useState(true);

  const {
    value: showBirthdaysOnCalendar,
    saving: savingBirthday,
    handleToggle: handleBirthdayToggle,
    loadConfiguration: loadBirthdayConfig
  } = useConfiguration(SHOW_BIRTHDAY_ON_CALENDAR, 'showBirthdaysOnCalendar');

  const {
    value: showWorkAnniversaryOnCalendar,
    saving: savingAnniversary,
    handleToggle: handleAnniversaryToggle,
    loadConfiguration: loadAnniversaryConfig
  } = useConfiguration(SHOW_WORK_ANIVERSARY_ON_CALENDAR, 'showWorkAnniversaryOnCalendar');

  useEffect(() => {
    const loadConfigs = async () => {
      setIsLoading(true);
      await Promise.all([loadBirthdayConfig(), loadAnniversaryConfig()]);
      setIsLoading(false);
    };
    loadConfigs();
  }, []);

  if (isLoading) {
    return <Loader />;
  }

  return (
    <>
        <h2>Calendar Settings</h2>

      <Card className="mb-4 mt-4">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <label className="form-label mb-0" htmlFor="show-birthdays-on-calendar">
              Show Birthdays On Calendar
            </label>
            <div className="form-check form-switch">
              <input
                type="checkbox"
                className="form-check-input"
                id="show-birthdays-on-calendar"
                checked={showBirthdaysOnCalendar}
                onChange={handleBirthdayToggle}
                disabled={savingBirthday}
              />
            </div>
          </div>

          <div className="d-flex justify-content-between align-items-center">
            <label className="form-label mb-0" htmlFor="show-work-anniversary-on-calendar">
              Show Work Anniversary On Calendar
            </label>
            <div className="form-check form-switch">
              <input
                type="checkbox"
                className="form-check-input"
                id="show-work-anniversary-on-calendar"
                checked={showWorkAnniversaryOnCalendar}
                onChange={handleAnniversaryToggle}
                disabled={savingAnniversary}
              />
            </div>
          </div>
        </Card.Body>
      </Card>

      <RenameHoliday/>
      <WeekendsAndWorkingDays />
    </>
  )
}

export default CalendarConfigure