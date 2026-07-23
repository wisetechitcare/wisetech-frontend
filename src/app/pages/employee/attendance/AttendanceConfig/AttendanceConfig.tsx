import { safeJsonParse } from '@utils/safeJson';
import React, { useState, useEffect, useCallback } from 'react';
import { LeaveTypesBalanceModal } from './component/LeaveTypesBalance';
import SandwichLeave from '@pages/company/settings/SandwhichLeave';
import { LeavePolicyModal } from '@pages/company/settings/LeavePolicy';
import AddonLeavesModal from './component/AddonLeavesModal';
import DailyShiftTimeModal from './component/DailyShiftTimeModal';
import OtherSettingsModal from './component/OtherSettingsModal';
import AppearanceModal from './component/AppearanceModal';
import {
  fetchConfiguration,
  fetchCompanyOverview,
  fetchAllBranches,
} from '@services/company';
import { fetchCompanySettings } from '@services/options';
import { fetchDayWiseShifts } from '@services/dayWiseShift';
import { resolveActiveOrg, resolveActiveOrgId } from '@utils/activeOrg';
import { usePermission } from '@hooks/usePermission';
import {
  DISABLE_LAUNCH_DEDUCTION_TIME_KEY,
  RESTRICT_ATTENDANCE_TO_7_DAYS_KEY,
  DATE_SETTINGS_KEY,
  LEAVE_MANAGEMENT,
  ENFORCE_ONSITE_DEADLINE_KEY,
} from '@constants/configurations-key';
import { onSiteAndHolidayWeekendSettingsOnOffName } from '@constants/statistics';
import Loader from '@app/modules/common/utils/Loader';
import Rules from '../personal/views/information/Rules';
import {
  ConfigPageLayout,
  ConfigSectionCard,
  ConfigSettingsRow,
  C,
  SP,
  RADIUS,
  FONT,
  KEYFRAMES,
} from '@app/modules/configuration';
import type { ConfigTab } from '@app/modules/configuration';

// ─── Types ────────────────────────────────────────────────────────────────────

interface OtherSettingsData {
  enableLunchDeduction: boolean;
  onSiteHolidayWeekendSettings: boolean;
  allowedDistance: number;
  restrictAttendanceRequestDays: number;
  showDataUpToToday: boolean;
  monthlyAnnualLeaveLimit: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS: ConfigTab[] = [
  { id: 'attendance', label: 'Attendance',    icon: 'bi-clock'      },
  { id: 'leaves',     label: 'Leaves',        icon: 'bi-calendar2-x' },
  { id: 'appearance', label: 'Appearance',    icon: 'bi-palette'     },
];


// ─── Helper ───────────────────────────────────────────────────────────────────

const parseToMinutes = (time: string): number => {
  const is12Hour = time.toUpperCase().includes('AM') || time.toUpperCase().includes('PM');
  const [hoursStr, rest] = time.split(':');
  let minutesStr = rest;
  let ampm = '';
  if (is12Hour) {
    const parts = rest.trim().split(' ');
    minutesStr = parts[0];
    ampm = parts[1]?.toUpperCase();
  }
  let hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10) || 0;
  if (is12Hour) {
    if (ampm === 'PM' && hours !== 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
  }
  return hours * 60 + minutes;
};

const calcShiftDuration = (checkIn: string, checkOut: string): string => {
  if (!checkIn || !checkOut) return '–';
  let diff = parseToMinutes(checkOut) - parseToMinutes(checkIn);
  if (diff < 0) diff += 24 * 60;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

// ─── Sub-component: ShiftRow ──────────────────────────────────────────────────

const ShiftRow: React.FC<{
  day: string;
  checkIn: string;
  checkOut: string;
  total: string;
  isHoliday: boolean;
}> = ({ day, checkIn, checkOut, total, isHoliday }) => (
  <div style={{
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '9px 0',
    borderBottom: `1px solid #f1f3f7`,
  }}>
    <span style={{
      fontFamily: FONT.body,
      fontSize: '13px',
      fontWeight: isHoliday ? 400 : 500,
      color: isHoliday ? C.textMuted : C.textPrimary,
      width: '90px',
      letterSpacing: '0.01em',
    }}>
      {day}
    </span>
    {isHoliday ? (
      <span style={{
        fontFamily: FONT.body,
        fontSize: '10.5px',
        fontWeight: 500,
        color: '#9ca3af',
        backgroundColor: '#f3f4f6',
        border: '1px solid #e5e7eb',
        borderRadius: RADIUS.full,
        padding: '2px 10px',
        letterSpacing: '0.02em',
      }}>
        Off
      </span>
    ) : (
      <div style={{ display: 'flex', gap: '24px', flex: 1, justifyContent: 'flex-end', alignItems: 'center' }}>
        <span style={{
          fontFamily: FONT.body, fontSize: '13px', fontWeight: 500,
          color: C.textSecondary, minWidth: '72px', textAlign: 'center',
        }}>
          {checkIn}
        </span>
        <span style={{
          fontFamily: FONT.body, fontSize: '13px', fontWeight: 500,
          color: C.textSecondary, minWidth: '72px', textAlign: 'center',
        }}>
          {checkOut}
        </span>
        <span style={{
          fontFamily: FONT.body, fontSize: '11.5px', fontWeight: 700,
          color: '#0369a1',
          backgroundColor: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: RADIUS.full,
          padding: '3px 11px',
          minWidth: '58px',
          textAlign: 'center',
          letterSpacing: '0.02em',
        }}>
          {total}
        </span>
      </div>
    )}
  </div>
);

// ─── Sub-component: SettingToggleRow ─────────────────────────────────────────

const SettingToggleRow: React.FC<{
  label: string;
  value: string | number;
  enabled?: boolean;
}> = ({ label, value, enabled }) => (
  <div style={{
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '11px 0',
    borderBottom: '1px solid #f1f3f7',
  }}>
    <span style={{
      fontFamily: FONT.body,
      fontSize: '13px',
      fontWeight: 500,
      color: '#374151',
      flex: 1,
      paddingRight: SP.md,
      lineHeight: 1.4,
    }}>
      {label}
    </span>
    {enabled !== undefined ? (
      <span style={{
        fontFamily: FONT.body,
        fontSize: '11px',
        fontWeight: 700,
        color: enabled ? '#15803d' : '#9ca3af',
        backgroundColor: enabled ? '#f0fdf4' : '#f9fafb',
        border: `1px solid ${enabled ? '#bbf7d0' : '#e5e7eb'}`,
        borderRadius: RADIUS.full,
        padding: '3px 11px',
        letterSpacing: '0.02em',
      }}>
        {enabled ? 'Enabled' : 'Disabled'}
      </span>
    ) : (
      <span style={{
        fontFamily: FONT.body,
        fontSize: '12.5px',
        fontWeight: 700,
        color: C.primary,
        backgroundColor: C.primaryLight,
        border: `1px solid rgba(30, 58, 138,0.15)`,
        borderRadius: RADIUS.md,
        padding: '3px 11px',
        letterSpacing: '0.01em',
      }}>
        {value}
      </span>
    )}
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const AttendanceConfig: React.FC = () => {
  const [activeTab, setActiveTab] = useState('attendance');

  // Modal visibility
  const [showDailyShiftModal,   setShowDailyShiftModal]   = useState(false);
  const [showOtherSettingsModal, setShowOtherSettingsModal] = useState(false);
  const [showSandwichModal,      setShowSandwichModal]      = useState(false);
  const [showAppearanceModal,    setShowAppearanceModal]    = useState(false);
  const [showAddonLeavesModal,   setShowAddonLeavesModal]   = useState(false);
  const [showLeaveTypesModal,    setShowLeaveTypesModal]    = useState(false);
  const [showLeavePolicyModal,   setShowLeavePolicyModal]   = useState(false);

  // Remount keys for modals
  const [shiftKey,        setShiftKey]        = useState(0);
  const [otherSettingsKey, setOtherSettingsKey] = useState(0);

  // Shift-config scope: Organization default (root org) vs a specific branch override.
  // Only the organization admin (settings.manage.all) may edit; the backend enforces it too.
  const canEditConfig = usePermission('settings.manage.all');
  const [rootOrgId, setRootOrgId] = useState<string>('');
  const [rootOrgName, setRootOrgName] = useState<string>('Organization');
  const [branchOptions, setBranchOptions] = useState<Array<{ id: string; name: string; orgName?: string }>>([]);
  // Sub-orgs (descendants of the root org) — each gets its own scope tab so an org-level
  // default can be set per sub-org, matching the Org → Sub-Org → Branch resolve chain.
  const [subOrgOptions, setSubOrgOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [configScope, setConfigScope] = useState<{ companyId?: string; branchId?: string }>({});

  useEffect(() => {
    (async () => {
      try {
        const { data: { companyOverview } } = await fetchCompanyOverview();
        const rootOrg = resolveActiveOrg(companyOverview);
        const rootId = rootOrg?.id ?? resolveActiveOrgId(companyOverview) ?? '';
        setRootOrgId(rootId);
        // Label the org-level tab with the real parent org name (e.g. "Wisetech Group"),
        // not a generic "Organization".
        setRootOrgName(rootOrg?.name ?? rootOrg?.organizationName ?? rootOrg?.companyName ?? 'Organization');
        setConfigScope({ companyId: rootId }); // default to the organization config

        // Collect every sub-org under the root (any depth) so each can get its own scope tab.
        const allOrgs = Array.isArray(companyOverview) ? companyOverview : [];
        const subOrgs: Array<{ id: string; name: string }> = [];
        const seen = new Set<string>([rootId]);
        const stack = [rootId];
        while (stack.length) {
          const cur = stack.pop() as string;
          for (const child of allOrgs.filter((o: any) => o && o.parentOrganizationId === cur)) {
            if (seen.has(child.id)) continue;
            seen.add(child.id);
            subOrgs.push({ id: child.id, name: child.name ?? child.organizationName ?? child.companyName ?? 'Sub-org' });
            stack.push(child.id);
          }
        }
        setSubOrgOptions(subOrgs);

        const res = await fetchAllBranches();
        const branches = res?.data?.branches ?? res?.data ?? [];
        setBranchOptions(branches.map((b: any) => ({ id: b.id, name: b.name, orgName: b.company?.name })));
      } catch { /* non-fatal — selector falls back to org default */ }
    })();
  }, []);

  // Data
  const [isLoading, setIsLoading] = useState(true);
  const [otherSettingsData, setOtherSettingsData] = useState<OtherSettingsData>({
    enableLunchDeduction: false,
    onSiteHolidayWeekendSettings: false,
    allowedDistance: 12,
    restrictAttendanceRequestDays: 7,
    showDataUpToToday: false,
    monthlyAnnualLeaveLimit: 2,
  });
  const [dailyShiftData,        setDailyShiftData]        = useState<any[]>([]);
  const [lunchTime,             setLunchTime]             = useState('12:30 PM - 1:30 PM');
  const [deductionTime,         setDeductionTime]         = useState('1:00 Hrs');
  const [graceTimeOffice,       setGraceTimeOffice]       = useState('00:30');
  const [graceTimeOnSite,       setGraceTimeOnSite]       = useState('00:30');
  const [enforceOnsiteDeadline, setEnforceOnsiteDeadline] = useState(true);

  // ── Loaders ────────────────────────────────────────────────────────────────

  const loadDailyShiftData = useCallback(async () => {
    try {
      const [dayWiseShiftsRes, leaveManagementRes] = await Promise.all([
        fetchDayWiseShifts(configScope),
        fetchConfiguration(LEAVE_MANAGEMENT, undefined, undefined, configScope),
      ]);

      const shifts = dayWiseShiftsRes?.data || [];
      const daysOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

      const sorted = daysOrder.map((day) => {
        const shift = shifts.find((s: any) => s.day.toLowerCase() === day.toLowerCase());
        // The API returns snake_case (is_active/check_in/check_out); accept camelCase too.
        const isActive = shift?.is_active ?? shift?.isActive;
        const ci = shift?.check_in ?? shift?.checkIn;
        const co = shift?.check_out ?? shift?.checkOut;
        if (isActive) {
          return { day, checkIn: ci, checkOut: co, total: calcShiftDuration(ci, co), isHoliday: false };
        }
        return { day, checkIn: '', checkOut: '', total: '', isHoliday: true };
      });
      setDailyShiftData(sorted);

      const leaveConfig = safeJsonParse(leaveManagementRes?.data?.configuration?.configuration || '{}');
      setLunchTime(leaveConfig?.['Lunch Time'] || '12:30 PM - 1:30 PM');
      setDeductionTime(leaveConfig?.['Deduction Time'] || '1:00 Hrs');
      setGraceTimeOffice(leaveConfig?.['Grace Time'] || '00:30');

      const onsiteGrace = leaveConfig?.['Grace Time - On Site'];
      setGraceTimeOnSite(onsiteGrace !== undefined && String(onsiteGrace).trim() !== '' ? String(onsiteGrace) : '11:00');

      const enforceRaw = leaveConfig?.[ENFORCE_ONSITE_DEADLINE_KEY];
      let enforce = true;
      if (typeof enforceRaw === 'boolean') enforce = enforceRaw;
      else if (enforceRaw !== undefined && enforceRaw !== null) {
        const l = String(enforceRaw).trim().toLowerCase();
        enforce = !(l === 'false' || l === '0' || l === 'no');
      }
      setEnforceOnsiteDeadline(enforce);
    } catch (e) {
      console.error('Error loading shift data:', e);
    }
  }, [configScope]);

  const loadOtherSettingsData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [lunchRes, leaveRes, restrictRes, dateRes, settingsRes] = await Promise.all([
        fetchConfiguration(DISABLE_LAUNCH_DEDUCTION_TIME_KEY),
        fetchConfiguration(LEAVE_MANAGEMENT),
        fetchConfiguration(RESTRICT_ATTENDANCE_TO_7_DAYS_KEY),
        fetchConfiguration(DATE_SETTINGS_KEY),
        fetchCompanySettings(),
      ]);

      const lunchConfig    = safeJsonParse(lunchRes?.data?.configuration?.configuration || '{}');
      const leaveConfig    = safeJsonParse(leaveRes?.data?.configuration?.configuration || '{}');
      const restrictConfig = safeJsonParse(restrictRes?.data?.configuration?.configuration || '{}');
      const dateConfig     = safeJsonParse(dateRes?.data?.configuration?.configuration || '{}');
      const appSettings    = settingsRes?.data?.appSettings;

      let restrictDays = restrictConfig?.restrictAttendanceTo7Days;
      if (typeof restrictDays === 'boolean') restrictDays = restrictDays ? 7 : 1;
      else if (typeof restrictDays !== 'number' || restrictDays < 1) restrictDays = 7;

      const onSiteVal = leaveConfig?.[onSiteAndHolidayWeekendSettingsOnOffName];

      setOtherSettingsData({
        enableLunchDeduction:         lunchConfig?.disableLaunchDeductionTime ?? false,
        onSiteHolidayWeekendSettings: onSiteVal === '1' || onSiteVal === 1,
        allowedDistance:              appSettings?.distanceAllowedInMeters || 12,
        restrictAttendanceRequestDays: restrictDays,
        showDataUpToToday:            dateConfig?.useDateSettings ?? false,
        monthlyAnnualLeaveLimit:      Number(leaveConfig?.['Number of Annual Leaves allowed per month'] || 2),
      });
    } catch (e) {
      console.error('Error loading other settings:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOtherSettingsData();
    loadDailyShiftData();
  }, [loadOtherSettingsData, loadDailyShiftData]);

  if (isLoading) return <Loader />;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{KEYFRAMES}</style>

      <div
        className="container-fluid py-6 px-0 cfg-fade-in"
        style={{ maxWidth: '100%', backgroundColor: C.bgPage }}
      >
        <ConfigPageLayout
          title="Attendance Configuration"
          subtitle="Configure shift timings, grace periods, leave policies, and attendance rules"
          tabs={TABS}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        >
          {/* ══════════════════════════════════════════════════════ */}
          {/* TAB: Attendance */}
          {/* ══════════════════════════════════════════════════════ */}
          {activeTab === 'attendance' && (
            <div key="attendance" className="cfg-fade-in">

              {/* Section heading */}
              <div style={{ marginBottom: SP.lg, paddingBottom: SP.md, borderBottom: `1px solid #f0f2f7` }}>
                <h2 style={{ fontFamily: FONT.heading, fontWeight: 700, fontSize: '17px', color: C.textPrimary, margin: 0, letterSpacing: '-0.2px' }}>
                  Shift &amp; Timing Settings
                </h2>
                <p style={{ fontFamily: FONT.body, fontSize: '12.5px', color: C.textMuted, margin: '4px 0 0 0', fontWeight: 400 }}>
                  Configure daily work schedules, lunch breaks, and grace periods.
                </p>
              </div>

              {/* ── Scope tabs ──────────────────────────────────────────────
                  Switch the shift config view between the organization default and each branch
                  override. The Daily Shift Time card, Default Shift Rules, and the Configure modal
                  all follow the active tab — so you can click through branches and instantly see
                  what shift each one uses. (Replaces the in-modal "Configuring for" dropdown.) */}
              {(subOrgOptions.length > 0 || branchOptions.length > 0) && (
                <div style={{ marginBottom: SP.lg }}>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'stretch', width: '100%' }}>
                    {[
                      // Root org default
                      { kind: 'org' as const, id: rootOrgId, label: rootOrgName, scope: { companyId: rootOrgId } },
                      // One default tab per sub-org
                      ...subOrgOptions.map((o) => ({ kind: 'org' as const, id: o.id, label: o.name, scope: { companyId: o.id } })),
                      // One override tab per branch (labelled with its owning org)
                      ...branchOptions.map((b) => ({ kind: 'branch' as const, id: b.id, label: b.orgName ? `${b.orgName} › ${b.name}` : b.name, scope: { branchId: b.id } })),
                    ].map((b) => {
                      const active = b.kind === 'branch'
                        ? configScope.branchId === b.id
                        : (!configScope.branchId && configScope.companyId === b.id);
                      const label = b.label;
                      return (
                        <button
                          key={`${b.kind}-${b.id || 'org'}`}
                          type="button"
                          onClick={() => setConfigScope(b.scope)}
                          style={{
                            padding: '7px 14px',
                            borderRadius: 8,
                            fontSize: '12.5px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            // Wrap long org›branch labels instead of overflowing on narrow screens.
                            whiteSpace: 'normal',
                            wordBreak: 'break-word',
                            maxWidth: '100%',
                            textAlign: 'center',
                            lineHeight: 1.3,
                            fontFamily: FONT.body,
                            border: active ? '1px solid #1E3A8A' : '1px solid #e4e6ef',
                            background: active ? '#1E3A8A' : '#fff',
                            color: active ? '#fff' : '#5e6278',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  <p style={{ fontFamily: FONT.body, fontSize: '12px', color: configScope.branchId ? '#1E3A8A' : '#6c757d', margin: '8px 0 0 0' }}>
                    {configScope.branchId
                      ? 'Showing this branch’s override — the cards and Configure below apply to this branch only.'
                      : (configScope.companyId && configScope.companyId !== rootOrgId)
                        ? 'Showing this sub-org’s default — applies to every branch under it unless that branch has its own override.'
                        : 'Showing the organization default — applies to every sub-org & branch unless they have their own override.'}
                  </p>
                </div>
              )}

              <div className="row g-4">
                {/* ── Daily Shift Time card ────────────────────── */}
                <div className="col-12 col-lg-7">
                  <ConfigSectionCard
                    title="Daily Shift Time"
                    description="Manage check-in, check-out, and total shift hours per day"
                    icon="bi-calendar-week"
                    iconColor="blue"
                    primaryAction={{
                      label: 'Configure',
                      icon: 'bi-pencil',
                      variant: 'outline',
                      onClick: () => { setShiftKey((k) => k + 1); setShowDailyShiftModal(true); },
                    }}
                  >
                    {/* Column headers */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '0 0 10px 0',
                      marginBottom: '2px',
                    }}>
                      <span style={{ fontFamily: FONT.body, fontSize: '10.5px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.7px', width: '90px' }}>Day</span>
                      <div style={{ display: 'flex', gap: '24px', flex: 1, justifyContent: 'flex-end' }}>
                        <span style={{ fontFamily: FONT.body, fontSize: '10.5px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.7px', minWidth: '72px', textAlign: 'center' }}>In</span>
                        <span style={{ fontFamily: FONT.body, fontSize: '10.5px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.7px', minWidth: '72px', textAlign: 'center' }}>Out</span>
                        <span style={{ fontFamily: FONT.body, fontSize: '10.5px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.7px', minWidth: '58px', textAlign: 'center' }}>Total</span>
                      </div>
                    </div>

                    {dailyShiftData.map((item) => (
                      <ShiftRow key={item.day} {...item} />
                    ))}

                    {/* Lunch / Grace info tiles */}
                    <div style={{ marginTop: SP.md, paddingTop: SP.md, borderTop: '1px dashed #e5e7eb' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        {[
                          { label: 'Lunch Time',     val: lunchTime,          icon: 'bi-cup-hot' },
                          { label: 'Deduction',      val: deductionTime,      icon: 'bi-dash-circle' },
                          { label: 'Grace – Office', val: graceTimeOffice,    icon: 'bi-building' },
                          { label: 'Grace – Site',   val: enforceOnsiteDeadline ? graceTimeOnSite : 'Disabled', icon: 'bi-geo-alt' },
                        ].map(({ label, val, icon }) => (
                          <div key={label} style={{
                            background: 'linear-gradient(135deg, #fafbfd 0%, #f4f6fb 100%)',
                            border: '1px solid #eaecf3',
                            borderRadius: RADIUS.lg,
                            padding: '12px 14px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                          }}>
                            <div style={{
                              width: '30px', height: '30px',
                              borderRadius: RADIUS.md,
                              backgroundColor: '#fff',
                              border: '1px solid #e5e7eb',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              flexShrink: 0,
                            }}>
                              <i className={`bi ${icon}`} style={{ fontSize: '13px', color: '#6b7280' }} />
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontFamily: FONT.body, fontSize: '10.5px', fontWeight: 500, color: '#9ca3af', marginBottom: '1px' }}>{label}</div>
                              <div style={{ fontFamily: FONT.body, fontSize: '13.5px', fontWeight: 700, color: C.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{val}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </ConfigSectionCard>
                </div>

                {/* ── Other Settings card ──────────────────────── */}
                <div className="col-12 col-lg-5">
                  <ConfigSectionCard
                    title="Attendance Settings"
                    description="Control policies, distance limits, and request windows"
                    icon="bi-sliders2"
                    iconColor="primary"
                    primaryAction={{
                      label: 'Configure',
                      icon: 'bi-pencil',
                      variant: 'outline',
                      onClick: () => { setOtherSettingsKey((k) => k + 1); setShowOtherSettingsModal(true); },
                    }}
                  >
                    <SettingToggleRow
                      label="Show Data Up to Today"
                      value=""
                      enabled={otherSettingsData.showDataUpToToday}
                    />
                    <SettingToggleRow
                      label="Enable Lunch Deduction Time"
                      value=""
                      enabled={otherSettingsData.enableLunchDeduction}
                    />
                    <SettingToggleRow
                      label="On-site, Holiday & Weekend Late Settings"
                      value=""
                      enabled={otherSettingsData.onSiteHolidayWeekendSettings}
                    />
                    <SettingToggleRow
                      label="Check-in Distance (meters)"
                      value={`${otherSettingsData.allowedDistance} m`}
                    />
                    <SettingToggleRow
                      label="Restrict Attendance Requests"
                      value={`${otherSettingsData.restrictAttendanceRequestDays} days`}
                    />
                    <SettingToggleRow
                      label="Annual Leaves per Month"
                      value={otherSettingsData.monthlyAnnualLeaveLimit}
                    />
                  </ConfigSectionCard>
                </div>
              </div>

              {/* Default Shift Rules */}
              <div style={{ marginTop: SP.xl }}>
                <div style={{ marginBottom: SP.md, paddingBottom: SP.md, borderBottom: '1px solid #f0f2f7' }}>
                  <h2 style={{ fontFamily: FONT.heading, fontWeight: 700, fontSize: '17px', color: C.textPrimary, margin: 0, letterSpacing: '-0.2px' }}>
                    Default Shift Rules
                  </h2>
                  <p style={{ fontFamily: FONT.body, fontSize: '12.5px', color: C.textMuted, margin: '4px 0 0 0', fontWeight: 400 }}>
                    Rules applied to all employees unless individually overridden.
                  </p>
                </div>
                <div style={{
                  backgroundColor: '#fff',
                  borderRadius: RADIUS.xl,
                  border: `1px solid ${C.border}`,
                  boxShadow: '0 2px 12px rgba(24,28,50,0.05)',
                  padding: SP.lg,
                }}>
                  <Rules fromAdmin={true} readOnly title="Default Shift Rules" hideGeneralSettings={true} scope={configScope} />
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════ */}
          {/* TAB: Leaves */}
          {/* ══════════════════════════════════════════════════════ */}
          {activeTab === 'leaves' && (
            <div key="leaves" className="cfg-fade-in">
              <div style={{ marginBottom: SP.lg, paddingBottom: SP.md, borderBottom: '1px solid #f0f2f7' }}>
                <h2 style={{ fontFamily: FONT.heading, fontWeight: 700, fontSize: '17px', color: C.textPrimary, margin: 0, letterSpacing: '-0.2px' }}>
                  Leave Policies
                </h2>
                <p style={{ fontFamily: FONT.body, fontSize: '12.5px', color: C.textMuted, margin: '4px 0 0 0', fontWeight: 400 }}>
                  Manage leave types, sandwich rules, carry-forward, and addon leave allowances.
                </p>
              </div>

              <div className="row g-4">
                <div className="col-12 col-md-6">
                  <ConfigSettingsRow
                    label="Leave Types & Balance"
                    description="Configure leave types and their balance for each branch"
                    icon="bi-calendar2-check"
                    iconColor="green"
                    actionLabel="Configure"
                    actionIcon="bi-arrow-right"
                    onAction={() => setShowLeaveTypesModal(true)}
                  />
                </div>
                <div className="col-12 col-md-6">
                  <ConfigSettingsRow
                    label="Sandwich Leave Rules"
                    description="Configure sandwich leave scenarios for payroll deductions"
                    icon="bi-layers"
                    iconColor="amber"
                    actionLabel="Configure"
                    actionIcon="bi-arrow-right"
                    onAction={() => setShowSandwichModal(true)}
                  />
                </div>
                <div className="col-12 col-md-6">
                  <ConfigSettingsRow
                    label="Addon Leaves Allowance"
                    description="Extra leave days based on employee tenure and experience"
                    icon="bi-plus-square"
                    iconColor="purple"
                    actionLabel="Configure"
                    actionIcon="bi-arrow-right"
                    onAction={() => setShowAddonLeavesModal(true)}
                  />
                </div>
                <div className="col-12 col-md-6">
                  <ConfigSettingsRow
                    label="Auto-Allocation Policy"
                    description="Probation restriction, paid-type consumption priority, and cumulative overflow"
                    icon="bi-shuffle"
                    iconColor="blue"
                    actionLabel="Configure"
                    actionIcon="bi-arrow-right"
                    onAction={() => setShowLeavePolicyModal(true)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════ */}
          {/* TAB: Appearance */}
          {/* ══════════════════════════════════════════════════════ */}
          {activeTab === 'appearance' && (
            <div key="appearance" className="cfg-fade-in">
              <div style={{ marginBottom: SP.lg }}>
                <h2 style={{ fontFamily: FONT.heading, fontWeight: 700, fontSize: '20px', color: C.textPrimary, margin: 0 }}>
                  Appearance Settings
                </h2>
                <p style={{ fontFamily: FONT.body, fontSize: '13px', color: C.textMuted, margin: '4px 0 0 0' }}>
                  Customize colors for attendance status, leave types, and charts.
                </p>
              </div>
              <div
                style={{
                  backgroundColor: C.bgCard,
                  borderRadius: RADIUS.xl,
                  border: `1px solid ${C.border}`,
                  boxShadow: C.shadowCard,
                  overflow: 'hidden',
                }}
              >
                <button
                  type="button"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                    padding: '20px 24px', border: 'none', background: 'none', cursor: 'pointer',
                    borderBottom: `1px solid ${C.border}`,
                    fontFamily: FONT.heading, fontWeight: 700, fontSize: '15px', color: C.textPrimary,
                  }}
                  onClick={() => setShowAppearanceModal(true)}
                >
                  <i className="bi bi-palette" style={{ fontSize: 18, color: '#7c3aed' }} />
                  Open Appearance Editor
                  <i className="bi bi-arrow-right ms-auto" style={{ fontSize: 14, color: '#9ca3af' }} />
                </button>
                <div style={{ padding: '16px 24px' }}>
                  <p style={{ fontFamily: FONT.body, fontSize: 13, color: C.textMuted, margin: 0 }}>
                    Customize colors for attendance calendar statuses, leave type indicators, working pattern metrics, work location tags, and chart series.
                  </p>
                </div>
              </div>
            </div>
          )}
        </ConfigPageLayout>
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────────── */}

      {/* Daily Shift Time — GlassDialog */}
      <DailyShiftTimeModal
        open={showDailyShiftModal}
        onClose={() => { setShowDailyShiftModal(false); loadDailyShiftData(); }}
        mountKey={shiftKey}
        scope={configScope}
        scopeLabel={(() => {
          const activeBranch = configScope.branchId ? branchOptions.find(b => b.id === configScope.branchId) : undefined;
          return activeBranch
            ? `Branch override — ${activeBranch.orgName ? `${activeBranch.orgName} › ${activeBranch.name}` : activeBranch.name}`
            : `${rootOrgName} — default for all branches`;
        })()}
        canEdit={canEditConfig}
      />

      {/* Other Settings — GlassDialog */}
      <OtherSettingsModal
        open={showOtherSettingsModal}
        onClose={() => { setShowOtherSettingsModal(false); loadOtherSettingsData(); }}
        mountKey={otherSettingsKey}
      />

      {/* Sandwich Leave — self-contained GlassDialog */}
      <SandwichLeave open={showSandwichModal} showSandWhichLeaveModal={(v: boolean) => setShowSandwichModal(v)} />

      {/* Appearance — GlassDialog */}
      <AppearanceModal open={showAppearanceModal} onClose={() => setShowAppearanceModal(false)} />

      {/* Addon Leaves — GlassDialog */}
      <AddonLeavesModal open={showAddonLeavesModal} onClose={() => setShowAddonLeavesModal(false)} />

      {/* Auto-Allocation Policy — GlassDialog */}
      <LeavePolicyModal open={showLeavePolicyModal} onClose={() => setShowLeavePolicyModal(false)} />

      {/* Leave Types & Balance — GlassDialog */}
      <LeaveTypesBalanceModal open={showLeaveTypesModal} onClose={() => setShowLeaveTypesModal(false)} />
    </>
  );
};

export default AttendanceConfig;
