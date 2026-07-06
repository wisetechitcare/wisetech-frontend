import React, { useEffect, useState } from 'react'
import { Card, Modal, Button } from 'react-bootstrap'
import RenameHoliday from './RenameHoliday'
import WeekendsAndWorkingDays from './WeekendsAndWorkingDays'
import { 
  SHOW_BIRTHDAYS_INTERNAL, 
  SHOW_BIRTHDAYS_INTERNAL_INACTIVE,
  SHOW_BIRTHDAYS_EXTERNAL, 
  SHOW_ANNIVERSARIES_INTERNAL, 
  SHOW_ANNIVERSARIES_INTERNAL_INACTIVE,
  SHOW_ANNIVERSARIES_EXTERNAL,
  SHOW_SATURDAY_ON_CALENDAR,
  SHOW_SUNDAY_ON_CALENDAR,
  SHOW_MEETINGS_ON_CALENDAR
} from '@constants/configurations-key'
import { fetchConfiguration, createNewConfiguration, updateConfigurationById } from '@services/company'
import { successConfirmation, errorConfirmation } from '@utils/modal'
import { safeJsonParse } from '@utils/safeJson'
import Loader from '@app/modules/common/utils/Loader'
import CalendarConfigForm, { CalendarConfigItem } from './CalendarConfigForm'
import { KTIcon } from '@metronic/helpers'

function SmallIconPreview({ icon }: { icon?: string }) {
  if (!icon) return null;
  const isKtIcon = icon.startsWith("kt:");
  return (
    <span className="ms-2 d-flex align-items-center justify-content-center" style={{ width: '18px', height: '18px' }}>
      {isKtIcon ? (
        <KTIcon iconName={icon.slice(3)} className="fs-5 text-muted" />
      ) : (
        <img src={icon} alt="icon" style={{ width: '14px', height: '14px', objectFit: 'contain' }} />
      )}
    </span>
  );
}

interface CalendarSetting {
  id: string | null;
  enabled: boolean;
  color: string;
  icon?: string;
}



function CalendarConfigure() {
  const [isLoading, setIsLoading] = useState(true);
  const [bdayInternal, setBdayInternal] = useState<CalendarSetting>({ id: null, enabled: false, color: '#E91E63', icon: "" });
  const [bdayInternalInactive, setBdayInternalInactive] = useState<CalendarSetting>({ id: null, enabled: false, color: '#E91E63', icon: "" });
  const [bdayExternal, setBdayExternal] = useState<CalendarSetting>({ id: null, enabled: false, color: '#0288D1', icon: "" });
  const [annyInternal, setAnnyInternal] = useState<CalendarSetting>({ id: null, enabled: false, color: '#9C27B0', icon: "" });
  const [annyInternalInactive, setAnnyInternalInactive] = useState<CalendarSetting>({ id: null, enabled: false, color: '#9C27B0', icon: "" });
  const [annyExternal, setAnnyExternal] = useState<CalendarSetting>({ id: null, enabled: false, color: '#F57C00', icon: "" });
  const [saturday, setSaturday] = useState<CalendarSetting>({ id: null, enabled: false, color: '#FFB300', icon: "" });
  const [sunday, setSunday] = useState<CalendarSetting>({ id: null, enabled: false, color: '#F44336', icon: "" });
  const [meetings, setMeetings] = useState<CalendarSetting>({ id: null, enabled: false, color: '#2196F3', icon: "" });

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [editingModuleKey, setEditingModuleKey] = useState('');
  const [editingSetting, setEditingSetting] = useState<CalendarSetting | null>(null);

  const loadConfigs = async () => {
    setIsLoading(true);
    try {
      // A module with no saved row yet makes the GET endpoint respond 400. With a bare
      // Promise.all, that single rejection discards EVERY result — so one un-configured
      // module would wipe all the already-saved settings back to their disabled defaults
      // on each reload. Catch per request so missing modules fall back to defaults while
      // the saved ones load correctly.
      const safeFetch = (module: string) => fetchConfiguration(module).catch(() => null);

      const [resBdayInt, resBdayIntInact, resBdayExt, resAnnyInt, resAnnyIntInact, resAnnyExt, resSaturday, resSunday, resMeetings] = await Promise.all([
        safeFetch(SHOW_BIRTHDAYS_INTERNAL),
        safeFetch(SHOW_BIRTHDAYS_INTERNAL_INACTIVE),
        safeFetch(SHOW_BIRTHDAYS_EXTERNAL),
        safeFetch(SHOW_ANNIVERSARIES_INTERNAL),
        safeFetch(SHOW_ANNIVERSARIES_INTERNAL_INACTIVE),
        safeFetch(SHOW_ANNIVERSARIES_EXTERNAL),
        safeFetch(SHOW_SATURDAY_ON_CALENDAR),
        safeFetch(SHOW_SUNDAY_ON_CALENDAR),
        safeFetch(SHOW_MEETINGS_ON_CALENDAR)
      ]);

      const parseConfig = (res: any, defaultColor: string) => {
        const config = safeJsonParse(res?.data?.configuration?.configuration || '{}');
        return {
          id: res?.data?.configuration?.id || null,
          enabled: config.enabled ?? false,
          color: config.color || defaultColor,
          icon: config.icon || ""
        };
      };

      setBdayInternal(parseConfig(resBdayInt, '#E91E63'));
      setBdayInternalInactive(parseConfig(resBdayIntInact, '#E91E63'));
      setBdayExternal(parseConfig(resBdayExt, '#0288D1'));
      setAnnyInternal(parseConfig(resAnnyInt, '#9C27B0'));
      setAnnyInternalInactive(parseConfig(resAnnyIntInact, '#9C27B0'));
      setAnnyExternal(parseConfig(resAnnyExt, '#F57C00'));
      setSaturday(parseConfig(resSaturday, '#FFB300'));
      setSunday(parseConfig(resSunday, '#F44336'));
      setMeetings(parseConfig(resMeetings, '#2196F3'));
    } catch (error) {
      console.error("Error loading configurations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConfigs();
  }, []);

  const openEditModal = (moduleKey: string, title: string, setting: CalendarSetting) => {
    setEditingModuleKey(moduleKey);
    setModalTitle(title);
    setEditingSetting(setting);
    setShowModal(true);
  };

  const handleSaveSuccess = (updatedSetting: CalendarConfigItem) => {
    if (editingModuleKey === SHOW_BIRTHDAYS_INTERNAL) setBdayInternal(updatedSetting);
    else if (editingModuleKey === SHOW_BIRTHDAYS_INTERNAL_INACTIVE) setBdayInternalInactive(updatedSetting);
    else if (editingModuleKey === SHOW_BIRTHDAYS_EXTERNAL) setBdayExternal(updatedSetting);
    else if (editingModuleKey === SHOW_ANNIVERSARIES_INTERNAL) setAnnyInternal(updatedSetting);
    else if (editingModuleKey === SHOW_ANNIVERSARIES_INTERNAL_INACTIVE) setAnnyInternalInactive(updatedSetting);
    else if (editingModuleKey === SHOW_ANNIVERSARIES_EXTERNAL) setAnnyExternal(updatedSetting);
    else if (editingModuleKey === SHOW_SATURDAY_ON_CALENDAR) setSaturday(updatedSetting);
    else if (editingModuleKey === SHOW_SUNDAY_ON_CALENDAR) setSunday(updatedSetting);
    else if (editingModuleKey === SHOW_MEETINGS_ON_CALENDAR) setMeetings(updatedSetting);
    setShowModal(false);
  };

  if (isLoading) {
    return <Loader />;
  }

  return (
    <>
      <h2>Calendar Settings</h2>

      <Card className="mb-4 mt-4">
        <Card.Body>
          {/* Birthdays (Internal Team - Active) */}
          <div className="d-flex align-items-center justify-content-between p-4 mb-4 border rounded bg-white">
            <div>
              <h5 className="mb-1 text-gray-800">Show Birthdays (Internal Team - Active)</h5>
              <div className="d-flex align-items-center gap-2 mt-1">
                <span className={`badge badge-sm badge-light-${bdayInternal.enabled ? 'success' : 'danger'}`}>
                  {bdayInternal.enabled ? 'Enabled' : 'Disabled'}
                </span>
                {bdayInternal.enabled && (
                  <span className="d-flex align-items-center gap-1 ms-2">
                    <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: bdayInternal.color }}></span>
                    <span className="fs-7 text-muted">{bdayInternal.color}</span>
                    <SmallIconPreview icon={bdayInternal.icon} />
                  </span>
                )}
              </div>
            </div>
            <button 
              className="btn btn-sm btn-light-primary fw-bold" 
              onClick={() => openEditModal(SHOW_BIRTHDAYS_INTERNAL, 'Configure Birthdays (Internal Team - Active)', bdayInternal)}
            >
              Configure
            </button>
          </div>

          {/* Birthdays (Internal Team - Inactive) */}
          <div className="d-flex align-items-center justify-content-between p-4 mb-4 border rounded bg-white">
            <div>
              <h5 className="mb-1 text-gray-800">Show Birthdays (Internal Team - Inactive)</h5>
              <div className="d-flex align-items-center gap-2 mt-1">
                <span className={`badge badge-sm badge-light-${bdayInternalInactive.enabled ? 'success' : 'danger'}`}>
                  {bdayInternalInactive.enabled ? 'Enabled' : 'Disabled'}
                </span>
                {bdayInternalInactive.enabled && (
                  <span className="d-flex align-items-center gap-1 ms-2">
                    <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: bdayInternalInactive.color }}></span>
                    <span className="fs-7 text-muted">{bdayInternalInactive.color}</span>
                    <SmallIconPreview icon={bdayInternalInactive.icon} />
                  </span>
                )}
              </div>
            </div>
            <button 
              className="btn btn-sm btn-light-primary fw-bold" 
              onClick={() => openEditModal(SHOW_BIRTHDAYS_INTERNAL_INACTIVE, 'Configure Birthdays (Internal Team - Inactive)', bdayInternalInactive)}
            >
              Configure
            </button>
          </div>

          {/* Birthdays (External Team) */}
          <div className="d-flex align-items-center justify-content-between p-4 mb-4 border rounded bg-white">
            <div>
              <h5 className="mb-1 text-gray-800">Show Birthdays (External Team)</h5>
              <div className="d-flex align-items-center gap-2 mt-1">
                <span className={`badge badge-sm badge-light-${bdayExternal.enabled ? 'success' : 'danger'}`}>
                  {bdayExternal.enabled ? 'Enabled' : 'Disabled'}
                </span>
                {bdayExternal.enabled && (
                  <span className="d-flex align-items-center gap-1 ms-2">
                    <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: bdayExternal.color }}></span>
                    <span className="fs-7 text-muted">{bdayExternal.color}</span>
                    <SmallIconPreview icon={bdayExternal.icon} />
                  </span>
                )}
              </div>
            </div>
            <button 
              className="btn btn-sm btn-light-primary fw-bold" 
              onClick={() => openEditModal(SHOW_BIRTHDAYS_EXTERNAL, 'Configure Birthdays (External Team)', bdayExternal)}
            >
              Configure
            </button>
          </div>

          {/* Work Anniversary (Internal Team - Active) */}
          <div className="d-flex align-items-center justify-content-between p-4 mb-4 border rounded bg-white">
            <div>
              <h5 className="mb-1 text-gray-800">Show Work Anniversary (Internal Team - Active)</h5>
              <div className="d-flex align-items-center gap-2 mt-1">
                <span className={`badge badge-sm badge-light-${annyInternal.enabled ? 'success' : 'danger'}`}>
                  {annyInternal.enabled ? 'Enabled' : 'Disabled'}
                </span>
                {annyInternal.enabled && (
                  <span className="d-flex align-items-center gap-1 ms-2">
                    <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: annyInternal.color }}></span>
                    <span className="fs-7 text-muted">{annyInternal.color}</span>
                    <SmallIconPreview icon={annyInternal.icon} />
                  </span>
                )}
              </div>
            </div>
            <button 
              className="btn btn-sm btn-light-primary fw-bold" 
              onClick={() => openEditModal(SHOW_ANNIVERSARIES_INTERNAL, 'Configure Work Anniversary (Internal Team - Active)', annyInternal)}
            >
              Configure
            </button>
          </div>

          {/* Work Anniversary (Internal Team - Inactive) */}
          <div className="d-flex align-items-center justify-content-between p-4 mb-4 border rounded bg-white">
            <div>
              <h5 className="mb-1 text-gray-800">Show Work Anniversary (Internal Team - Inactive)</h5>
              <div className="d-flex align-items-center gap-2 mt-1">
                <span className={`badge badge-sm badge-light-${annyInternalInactive.enabled ? 'success' : 'danger'}`}>
                  {annyInternalInactive.enabled ? 'Enabled' : 'Disabled'}
                </span>
                {annyInternalInactive.enabled && (
                  <span className="d-flex align-items-center gap-1 ms-2">
                    <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: annyInternalInactive.color }}></span>
                    <span className="fs-7 text-muted">{annyInternalInactive.color}</span>
                    <SmallIconPreview icon={annyInternalInactive.icon} />
                  </span>
                )}
              </div>
            </div>
            <button 
              className="btn btn-sm btn-light-primary fw-bold" 
              onClick={() => openEditModal(SHOW_ANNIVERSARIES_INTERNAL_INACTIVE, 'Configure Work Anniversary (Internal Team - Inactive)', annyInternalInactive)}
            >
              Configure
            </button>
          </div>

          {/* Anniversary (External Team) */}
          <div className="d-flex align-items-center justify-content-between p-4 mb-4 border rounded bg-white">
            <div>
              <h5 className="mb-1 text-gray-800">Show Anniversary (External Team)</h5>
              <div className="d-flex align-items-center gap-2 mt-1">
                <span className={`badge badge-sm badge-light-${annyExternal.enabled ? 'success' : 'danger'}`}>
                  {annyExternal.enabled ? 'Enabled' : 'Disabled'}
                </span>
                {annyExternal.enabled && (
                  <span className="d-flex align-items-center gap-1 ms-2">
                    <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: annyExternal.color }}></span>
                    <span className="fs-7 text-muted">{annyExternal.color}</span>
                    <SmallIconPreview icon={annyExternal.icon} />
                  </span>
                )}
              </div>
            </div>
            <button 
              className="btn btn-sm btn-light-primary fw-bold" 
              onClick={() => openEditModal(SHOW_ANNIVERSARIES_EXTERNAL, 'Configure Anniversary (External Team)', annyExternal)}
            >
              Configure
            </button>
          </div>

          {/* Saturday */}
          <div className="d-flex align-items-center justify-content-between p-4 mb-4 border rounded bg-white">
            <div>
              <h5 className="mb-1 text-gray-800">Show Saturday</h5>
              <div className="d-flex align-items-center gap-2 mt-1">
                <span className={`badge badge-sm badge-light-${saturday.enabled ? 'success' : 'danger'}`}>
                  {saturday.enabled ? 'Enabled' : 'Disabled'}
                </span>
                {saturday.enabled && (
                  <span className="d-flex align-items-center gap-1 ms-2">
                    <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: saturday.color }}></span>
                    <span className="fs-7 text-muted">{saturday.color}</span>
                    <SmallIconPreview icon={saturday.icon} />
                  </span>
                )}
              </div>
            </div>
            <button 
              className="btn btn-sm btn-light-primary fw-bold" 
              onClick={() => openEditModal(SHOW_SATURDAY_ON_CALENDAR, 'Configure Saturday', saturday)}
            >
              Configure
            </button>
          </div>

          {/* Sunday */}
          <div className="d-flex align-items-center justify-content-between p-4 mb-4 border rounded bg-white">
            <div>
              <h5 className="mb-1 text-gray-800">Show Sunday</h5>
              <div className="d-flex align-items-center gap-2 mt-1">
                <span className={`badge badge-sm badge-light-${sunday.enabled ? 'success' : 'danger'}`}>
                  {sunday.enabled ? 'Enabled' : 'Disabled'}
                </span>
                {sunday.enabled && (
                  <span className="d-flex align-items-center gap-1 ms-2">
                    <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: sunday.color }}></span>
                    <span className="fs-7 text-muted">{sunday.color}</span>
                    <SmallIconPreview icon={sunday.icon} />
                  </span>
                )}
              </div>
            </div>
            <button 
              className="btn btn-sm btn-light-primary fw-bold" 
              onClick={() => openEditModal(SHOW_SUNDAY_ON_CALENDAR, 'Configure Sunday', sunday)}
            >
              Configure
            </button>
          </div>

          {/* Meetings */}
          <div className="d-flex align-items-center justify-content-between p-4 border rounded bg-white">
            <div>
              <h5 className="mb-1 text-gray-800">Show Meetings</h5>
              <div className="d-flex align-items-center gap-2 mt-1">
                <span className={`badge badge-sm badge-light-${meetings.enabled ? 'success' : 'danger'}`}>
                  {meetings.enabled ? 'Enabled' : 'Disabled'}
                </span>
                {meetings.enabled && (
                  <span className="d-flex align-items-center gap-1 ms-2">
                    <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: meetings.color }}></span>
                    <span className="fs-7 text-muted">{meetings.color}</span>
                    <SmallIconPreview icon={meetings.icon} />
                  </span>
                )}
              </div>
            </div>
            <button 
              className="btn btn-sm btn-light-primary fw-bold" 
              onClick={() => openEditModal(SHOW_MEETINGS_ON_CALENDAR, 'Configure Meetings', meetings)}
            >
              Configure
            </button>
          </div>
        </Card.Body>
      </Card>

      {/* Reusable Form Modal */}
      <CalendarConfigForm
        show={showModal}
        onClose={() => setShowModal(false)}
        initialData={editingSetting}
        moduleKey={editingModuleKey}
        title={modalTitle}
        onSuccess={handleSaveSuccess}
      />

      <RenameHoliday/>
      <WeekendsAndWorkingDays />
    </>
  )
}

export default CalendarConfigure