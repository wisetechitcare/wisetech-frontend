import React, { useEffect, useState } from 'react'
import { Card } from 'react-bootstrap'
import RenameHoliday from './RenameHoliday'
import WeekendsAndWorkingDays from './WeekendsAndWorkingDays'
import { SHOW_BIRTHDAY_ON_CALENDAR, SHOW_WORK_ANIVERSARY_ON_CALENDAR } from '@constants/configurations-key'
import { useConfiguration } from '@hooks/useConfiguration'
import Loader from '@app/modules/common/utils/Loader'
import {
  ConfigPageLayout,
  ConfigSectionCard,
  ConfigSettingsRow,
  C,
  FONT,
  SP,
  RADIUS,
  KEYFRAMES,
} from '@app/modules/configuration'

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
      <style>{KEYFRAMES}</style>
      <ConfigPageLayout
        title="Calendar Settings"
        subtitle="Configure calendar display options and holiday schedules"
        icon="bi-calendar-event"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: SP.lg }}>

          {/* Calendar Display Options Card */}
          <ConfigSectionCard
            title="Display Options"
            description="Control what events appear on your calendar"
            icon="bi-eye"
            iconColor="blue"
            compact={false}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: SP.lg, marginTop: SP.md }}>
              <ConfigSettingsRow
                label="Show Birthdays"
                description="Display employee birthdays on the calendar"
                icon="bi-cake2"
                iconColor="primary"
                rightContent={
                  <div style={{ display: 'flex', alignItems: 'center', gap: SP.md }}>
                    {savingBirthday && (
                      <span style={{ fontSize: '12px', color: C.textMuted, fontFamily: FONT.body }}>
                        Saving...
                      </span>
                    )}
                    <label style={{ display: 'flex', alignItems: 'center', cursor: savingBirthday ? 'not-allowed' : 'pointer', gap: '8px' }}>
                      <input
                        type="checkbox"
                        checked={showBirthdaysOnCalendar}
                        onChange={handleBirthdayToggle}
                        disabled={savingBirthday}
                        style={{
                          width: '20px',
                          height: '20px',
                          cursor: savingBirthday ? 'not-allowed' : 'pointer',
                          accentColor: C.primary,
                        }}
                      />
                      <span style={{ fontFamily: FONT.body, fontSize: '13px', color: C.textPrimary }}>
                        {showBirthdaysOnCalendar ? 'Enabled' : 'Disabled'}
                      </span>
                    </label>
                  </div>
                }
              />

              <ConfigSettingsRow
                label="Show Work Anniversaries"
                description="Display employee work anniversaries on the calendar"
                icon="bi-award"
                iconColor="primary"
                rightContent={
                  <div style={{ display: 'flex', alignItems: 'center', gap: SP.md }}>
                    {savingAnniversary && (
                      <span style={{ fontSize: '12px', color: C.textMuted, fontFamily: FONT.body }}>
                        Saving...
                      </span>
                    )}
                    <label style={{ display: 'flex', alignItems: 'center', cursor: savingAnniversary ? 'not-allowed' : 'pointer', gap: '8px' }}>
                      <input
                        type="checkbox"
                        checked={showWorkAnniversaryOnCalendar}
                        onChange={handleAnniversaryToggle}
                        disabled={savingAnniversary}
                        style={{
                          width: '20px',
                          height: '20px',
                          cursor: savingAnniversary ? 'not-allowed' : 'pointer',
                          accentColor: C.primary,
                        }}
                      />
                      <span style={{ fontFamily: FONT.body, fontSize: '13px', color: C.textPrimary }}>
                        {showWorkAnniversaryOnCalendar ? 'Enabled' : 'Disabled'}
                      </span>
                    </label>
                  </div>
                }
              />
            </div>
          </ConfigSectionCard>

          {/* Holidays Configuration Card */}
          <div style={{ marginTop: SP.md }}>
            <RenameHoliday />
          </div>

          {/* Weekends and Working Days Card */}
          <div style={{ marginTop: SP.md }}>
            <WeekendsAndWorkingDays />
          </div>
        </div>
      </ConfigPageLayout>
    </>
  )
}

export default CalendarConfigure