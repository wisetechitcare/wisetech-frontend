import React, { useEffect, useState } from 'react'
import RenameHoliday from './RenameHoliday'
import WeekendsAndWorkingDays from './WeekendsAndWorkingDays'
import {
  SHOW_BIRTHDAYS_INTERNAL,
  SHOW_BIRTHDAYS_INTERNAL_INACTIVE,
  SHOW_BIRTHDAYS_EXTERNAL,
  SHOW_ANNIVERSARIES_INTERNAL,
  SHOW_ANNIVERSARIES_INTERNAL_INACTIVE,
  SHOW_ANNIVERSARIES_EXTERNAL,
  SHOW_MARRIAGE_ANNIVERSARY_INTERNAL,
  SHOW_MARRIAGE_ANNIVERSARY_INTERNAL_INACTIVE,
  SHOW_MARRIAGE_ANNIVERSARY_EXTERNAL,
  SHOW_SATURDAY_ON_CALENDAR,
  SHOW_SUNDAY_ON_CALENDAR,
  SHOW_MEETINGS_ON_CALENDAR
} from '@constants/configurations-key'
import { fetchConfiguration } from '@services/company'
import { safeJsonParse } from '@utils/safeJson'
import Loader from '@app/modules/common/utils/Loader'
import CalendarConfigForm, { CalendarConfigItem } from './CalendarConfigForm'
import { KTIcon } from '@metronic/helpers'
import {
  ConfigPageLayout,
  ConfigSettingsRow,
  C,
  FONT,
  SP,
  RADIUS,
  KEYFRAMES,
} from '@app/modules/configuration'
import type { ConfigTab } from '@app/modules/configuration'
import { T as UI_T } from '@app/modules/common/components/ui/tokens'

interface CalendarSetting {
  id: string | null;
  enabled: boolean;
  color: string;
  icon?: string;
}

const TABS: ConfigTab[] = [
  { id: 'display', label: 'Event Display', icon: 'bi-palette' },
  { id: 'holidays', label: 'Public Holidays', icon: 'bi-calendar-heart' },
  { id: 'weekends', label: 'Weekends & Working Days', icon: 'bi-calendar-week' },
]

// ─── Sub-components ─────────────────────────────────────────────────────────

function IconDot({ icon }: { icon?: string }) {
  if (!icon) return null;
  const isKtIcon = icon.startsWith('kt:');
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '18px', height: '18px' }}>
      {isKtIcon ? (
        <KTIcon iconName={icon.slice(3)} className="fs-6 text-muted" />
      ) : (
        <img src={icon} alt="icon" style={{ width: '14px', height: '14px', objectFit: 'contain' }} />
      )}
    </span>
  );
}

const PREMIUM_CSS = `
  .prem-card {
    background: #ffffff;
    border: 1px solid #E6E9EE;
    border-radius: 16px;
    padding: 24px;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
    height: 100%;
    display: flex;
    flex-direction: column;
    box-shadow: 0 2px 4px rgba(27, 34, 48, 0.02);
  }
  .prem-card:hover {
    border-color: #1E3A8A;
    box-shadow: 0 12px 32px rgba(30, 58, 138, 0.08);
    transform: translateY(-3px);
  }
  .prem-icon-box {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #F4F6FB;
    color: #1E3A8A;
    font-size: 22px;
    transition: all 0.25s ease;
    flex-shrink: 0;
  }
  .prem-card:hover .prem-icon-box {
    background: #1E3A8A;
    color: #ffffff;
    transform: scale(1.05);
  }
  .prem-btn {
    background: #F4F6FB;
    color: #1E3A8A;
    border: none;
    border-radius: 8px;
    padding: 8px 16px;
    font-size: 13px;
    font-weight: 600;
    transition: all 0.2s ease;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .prem-card:hover .prem-btn {
    background: #1E3A8A;
    color: #ffffff;
  }
  .prem-btn:hover {
    opacity: 0.9;
  }
  .prem-header {
    margin-bottom: 24px;
    padding-bottom: 12px;
    border-bottom: 1px solid #E6E9EE;
  }
  
  /* Overrides for ConfigPageLayout to force blue theme only on this page */
  .cfg-layout > div:first-of-type > div:first-child {
    background: #1E3A8A !important;
  }
  .cfg-layout .cfg-header-icon {
    background: linear-gradient(135deg, #1E3A8A 0%, #152960 100%) !important;
    box-shadow: 0 4px 12px rgba(30, 58, 138, 0.25) !important;
  }
  .cfg-layout .cfg-tab-btn[data-active="true"] {
    background: #F4F6FB !important;
    color: #1E3A8A !important;
  }
  .cfg-layout .cfg-tab-btn[data-active="true"] .cfg-tab-active-line {
    background-color: #1E3A8A !important;
  }
`;

const SettingPreview: React.FC<{ setting: CalendarSetting }> = ({ setting }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
    <div style={{
      display: 'flex', alignItems: 'center', gap: '6px',
      backgroundColor: setting.enabled ? '#EBF4EF' : '#F4F6FB',
      color: setting.enabled ? '#2F7D5F' : '#5A6573',
      borderRadius: '20px', fontSize: '11px', fontWeight: 700,
      padding: '4px 10px', letterSpacing: '0.02em',
    }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: setting.enabled ? '#2F7D5F' : '#97A1AF' }} />
      {setting.enabled ? 'ENABLED' : 'DISABLED'}
    </div>
    {setting.enabled && (
      <span
        title={setting.color}
        style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: setting.color, border: '2px solid #fff', boxShadow: '0 2px 4px rgba(0,0,0,0.06)', flexShrink: 0 }}
      />
    )}
    {setting.enabled && <IconDot icon={setting.icon} />}
  </div>
);

const SectionHeading: React.FC<{ title: string; description: string }> = ({ title, description }) => (
  <div className="prem-header">
    <h2 style={{ fontWeight: 700, fontSize: '18px', color: '#1B2230', margin: 0, letterSpacing: '-0.3px' }}>
      {title}
    </h2>
    <p style={{ fontSize: '13.5px', color: '#5A6573', margin: '4px 0 0 0', fontWeight: 400 }}>
      {description}
    </p>
  </div>
);

interface PremiumSettingCardProps {
  label: string;
  description: string;
  icon: string;
  setting: CalendarSetting;
  onAction: () => void;
}

const PremiumSettingCard: React.FC<PremiumSettingCardProps> = ({ label, description, icon, setting, onAction }) => (
  <div className="prem-card">
    <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
      <div className="prem-icon-box">
        <i className={`bi ${icon}`} />
      </div>
      <div>
        <h3 style={{ fontSize: '15.5px', fontWeight: 700, color: '#1B2230', margin: '0 0 4px 0', letterSpacing: '-0.2px' }}>{label}</h3>
        <p style={{ fontSize: '13px', color: '#5A6573', margin: 0, lineHeight: 1.4 }}>{description}</p>
      </div>
    </div>
    <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <SettingPreview setting={setting} />
      <button className="prem-btn" onClick={onAction}>
        <i className="bi bi-gear-fill" style={{ fontSize: '12px' }} /> Configure
      </button>
    </div>
  </div>
);

// ─── Main component ─────────────────────────────────────────────────────────

function CalendarConfigure() {
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('display');

  const [bdayInternal, setBdayInternal] = useState<CalendarSetting>({ id: null, enabled: false, color: '#E91E63', icon: "" });
  const [bdayInternalInactive, setBdayInternalInactive] = useState<CalendarSetting>({ id: null, enabled: false, color: '#E91E63', icon: "" });
  const [bdayExternal, setBdayExternal] = useState<CalendarSetting>({ id: null, enabled: false, color: '#0288D1', icon: "" });
  const [annyInternal, setAnnyInternal] = useState<CalendarSetting>({ id: null, enabled: false, color: '#9C27B0', icon: "" });
  const [annyInternalInactive, setAnnyInternalInactive] = useState<CalendarSetting>({ id: null, enabled: false, color: '#9C27B0', icon: "" });
  const [annyExternal, setAnnyExternal] = useState<CalendarSetting>({ id: null, enabled: false, color: '#F57C00', icon: "" });
  const [marriageAnnyInternal, setMarriageAnnyInternal] = useState<CalendarSetting>({ id: null, enabled: false, color: '#E64980', icon: "" });
  const [marriageAnnyInternalInactive, setMarriageAnnyInternalInactive] = useState<CalendarSetting>({ id: null, enabled: false, color: '#E64980', icon: "" });
  const [marriageAnnyExternal, setMarriageAnnyExternal] = useState<CalendarSetting>({ id: null, enabled: false, color: '#AE3EC9', icon: "" });
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

      const [resBdayInt, resBdayIntInact, resBdayExt, resAnnyInt, resAnnyIntInact, resAnnyExt, resMarriageAnnyInt, resMarriageAnnyIntInact, resMarriageAnnyExt, resSaturday, resSunday, resMeetings] = await Promise.all([
        safeFetch(SHOW_BIRTHDAYS_INTERNAL),
        safeFetch(SHOW_BIRTHDAYS_INTERNAL_INACTIVE),
        safeFetch(SHOW_BIRTHDAYS_EXTERNAL),
        safeFetch(SHOW_ANNIVERSARIES_INTERNAL),
        safeFetch(SHOW_ANNIVERSARIES_INTERNAL_INACTIVE),
        safeFetch(SHOW_ANNIVERSARIES_EXTERNAL),
        safeFetch(SHOW_MARRIAGE_ANNIVERSARY_INTERNAL),
        safeFetch(SHOW_MARRIAGE_ANNIVERSARY_INTERNAL_INACTIVE),
        safeFetch(SHOW_MARRIAGE_ANNIVERSARY_EXTERNAL),
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
      setMarriageAnnyInternal(parseConfig(resMarriageAnnyInt, '#E64980'));
      setMarriageAnnyInternalInactive(parseConfig(resMarriageAnnyIntInact, '#E64980'));
      setMarriageAnnyExternal(parseConfig(resMarriageAnnyExt, '#AE3EC9'));
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
    else if (editingModuleKey === SHOW_MARRIAGE_ANNIVERSARY_INTERNAL) setMarriageAnnyInternal(updatedSetting);
    else if (editingModuleKey === SHOW_MARRIAGE_ANNIVERSARY_INTERNAL_INACTIVE) setMarriageAnnyInternalInactive(updatedSetting);
    else if (editingModuleKey === SHOW_MARRIAGE_ANNIVERSARY_EXTERNAL) setMarriageAnnyExternal(updatedSetting);
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
      <style>{KEYFRAMES}</style>
      <style>{PREMIUM_CSS}</style>

      <div
        className="container-fluid py-6 px-0 cfg-fade-in"
        style={{ maxWidth: '100%', backgroundColor: C.bgPage }}
      >
        <ConfigPageLayout
          title="Calendar Configuration"
          subtitle="Manage event visibility, public holidays and weekend schedules"
          icon="bi-calendar3"
          tabs={TABS}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        >
          {/* ══════════════════════════════════════════════════════ */}
          {/* TAB: Event Display */}
          {/* ══════════════════════════════════════════════════════ */}
          {activeTab === 'display' && (
            <div key="display" className="cfg-fade-in">
              <SectionHeading title="Birthdays" description="Choose which employee birthday events appear on the calendar" />
              <div className="row g-4" style={{ marginBottom: SP.xl }}>
                <div className="col-12 col-md-6 col-lg-4">
                  <PremiumSettingCard
                    label="Internal Team — Active"
                    description="Active employees on the internal calendar"
                    icon="bi-person-check-fill"
                    setting={bdayInternal}
                    onAction={() => openEditModal(SHOW_BIRTHDAYS_INTERNAL, 'Configure Birthdays (Internal Team - Active)', bdayInternal)}
                  />
                </div>
                <div className="col-12 col-md-6 col-lg-4">
                  <PremiumSettingCard
                    label="Internal Team — Inactive"
                    description="Former/inactive employees on the internal calendar"
                    icon="bi-person-dash-fill"
                    setting={bdayInternalInactive}
                    onAction={() => openEditModal(SHOW_BIRTHDAYS_INTERNAL_INACTIVE, 'Configure Birthdays (Internal Team - Inactive)', bdayInternalInactive)}
                  />
                </div>
                <div className="col-12 col-md-6 col-lg-4">
                  <PremiumSettingCard
                    label="External Team"
                    description="Birthdays for external/contract team members"
                    icon="bi-globe"
                    setting={bdayExternal}
                    onAction={() => openEditModal(SHOW_BIRTHDAYS_EXTERNAL, 'Configure Birthdays (External Team)', bdayExternal)}
                  />
                </div>
              </div>

              <SectionHeading title="Work Anniversaries" description="Choose which work-anniversary events appear on the calendar" />
              <div className="row g-4" style={{ marginBottom: SP.xl }}>
                <div className="col-12 col-md-6 col-lg-4">
                  <PremiumSettingCard
                    label="Internal Team — Active"
                    description="Active employees on the internal calendar"
                    icon="bi-person-check-fill"
                    setting={annyInternal}
                    onAction={() => openEditModal(SHOW_ANNIVERSARIES_INTERNAL, 'Configure Work Anniversary (Internal Team - Active)', annyInternal)}
                  />
                </div>
                <div className="col-12 col-md-6 col-lg-4">
                  <PremiumSettingCard
                    label="Internal Team — Inactive"
                    description="Former/inactive employees on the internal calendar"
                    icon="bi-person-dash-fill"
                    setting={annyInternalInactive}
                    onAction={() => openEditModal(SHOW_ANNIVERSARIES_INTERNAL_INACTIVE, 'Configure Work Anniversary (Internal Team - Inactive)', annyInternalInactive)}
                  />
                </div>
                <div className="col-12 col-md-6 col-lg-4">
                  <PremiumSettingCard
                    label="External Team"
                    description="Anniversaries for external/contract team members"
                    icon="bi-globe"
                    setting={annyExternal}
                    onAction={() => openEditModal(SHOW_ANNIVERSARIES_EXTERNAL, 'Configure Anniversary (External Team)', annyExternal)}
                  />
                </div>
              </div>

              <SectionHeading title="Marriage Anniversaries" description="Choose which marriage-anniversary events appear on the calendar" />
              <div className="row g-4" style={{ marginBottom: SP.xl }}>
                <div className="col-12 col-md-6 col-lg-4">
                  <PremiumSettingCard
                    label="Internal Team — Active"
                    description="Active employees on the internal calendar"
                    icon="bi-person-check-fill"
                    setting={marriageAnnyInternal}
                    onAction={() => openEditModal(SHOW_MARRIAGE_ANNIVERSARY_INTERNAL, 'Configure Marriage Anniversary (Internal Team - Active)', marriageAnnyInternal)}
                  />
                </div>
                <div className="col-12 col-md-6 col-lg-4">
                  <PremiumSettingCard
                    label="Internal Team — Inactive"
                    description="Former/inactive employees on the internal calendar"
                    icon="bi-person-dash-fill"
                    setting={marriageAnnyInternalInactive}
                    onAction={() => openEditModal(SHOW_MARRIAGE_ANNIVERSARY_INTERNAL_INACTIVE, 'Configure Marriage Anniversary (Internal Team - Inactive)', marriageAnnyInternalInactive)}
                  />
                </div>
                <div className="col-12 col-md-6 col-lg-4">
                  <PremiumSettingCard
                    label="External Team"
                    description="Marriage anniversaries for external/contract team members"
                    icon="bi-globe"
                    setting={marriageAnnyExternal}
                    onAction={() => openEditModal(SHOW_MARRIAGE_ANNIVERSARY_EXTERNAL, 'Configure Marriage Anniversary (External Team)', marriageAnnyExternal)}
                  />
                </div>
              </div>

              <SectionHeading title="Weekend Display" description="Control whether Saturdays and Sundays are highlighted on the calendar" />
              <div className="row g-4" style={{ marginBottom: SP.xl }}>
                <div className="col-12 col-md-6">
                  <PremiumSettingCard
                    label="Saturday"
                    description="Highlight Saturdays on the calendar"
                    icon="bi-calendar2-week"
                    setting={saturday}
                    onAction={() => openEditModal(SHOW_SATURDAY_ON_CALENDAR, 'Configure Saturday', saturday)}
                  />
                </div>
                <div className="col-12 col-md-6">
                  <PremiumSettingCard
                    label="Sunday"
                    description="Highlight Sundays on the calendar"
                    icon="bi-calendar2-week"
                    setting={sunday}
                    onAction={() => openEditModal(SHOW_SUNDAY_ON_CALENDAR, 'Configure Sunday', sunday)}
                  />
                </div>
              </div>

              <SectionHeading title="Meetings" description="Control whether scheduled meetings appear on the calendar" />
              <div className="row g-4">
                <div className="col-12 col-md-6">
                  <PremiumSettingCard
                    label="Team Meetings"
                    description="Show scheduled meetings as calendar events"
                    icon="bi-camera-video"
                    setting={meetings}
                    onAction={() => openEditModal(SHOW_MEETINGS_ON_CALENDAR, 'Configure Meetings', meetings)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════ */}
          {/* TAB: Public Holidays */}
          {/* ══════════════════════════════════════════════════════ */}
          {activeTab === 'holidays' && (
            <div key="holidays" className="cfg-fade-in">
              <RenameHoliday />
            </div>
          )}

          {/* ══════════════════════════════════════════════════════ */}
          {/* TAB: Weekends & Working Days */}
          {/* ══════════════════════════════════════════════════════ */}
          {activeTab === 'weekends' && (
            <div key="weekends" className="cfg-fade-in">
              <WeekendsAndWorkingDays />
            </div>
          )}
        </ConfigPageLayout>
      </div>

      {/* Reusable Form Modal */}
      <CalendarConfigForm
        show={showModal}
        onClose={() => setShowModal(false)}
        initialData={editingSetting}
        moduleKey={editingModuleKey}
        title={modalTitle}
        onSuccess={handleSaveSuccess}
      />
    </>
  )
}

export default CalendarConfigure
