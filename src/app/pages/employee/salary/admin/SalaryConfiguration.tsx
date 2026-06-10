import React, { useState } from 'react';
import GrossPayDistribution from './views/salary-configuration/GrossPayDistribution';
import DeductionRules from './views/salary-configuration/DeductionRules';
import CustomRules from './views/salary-configuration/CustomRules';
import GeneralSettings from './views/salary-configuration/GeneralSettings';
import DeductionMaster from './views/salary-configuration/DeductionMaster';
import { ConfigPageLayout, C, KEYFRAMES } from '@app/modules/configuration';
import type { ConfigTab } from '@app/modules/configuration';

const TABS: ConfigTab[] = [
  { id: 'general',   label: 'General Settings',      icon: 'bi-gear'        },
  { id: 'gross',     label: 'Gross Pay Distribution', icon: 'bi-cash-stack'  },
  { id: 'deduction', label: 'Deduction Rules',        icon: 'bi-dash-square' },
  { id: 'custom',    label: 'Custom Rules',           icon: 'bi-sliders'     },
  { id: 'master',    label: 'Salary Master',          icon: 'bi-grid-3x3-gap' },
];

const SALARY_CONFIG_CSS = `
  /* ── Salary Config – Responsive Styles ──────────────────────────────── */

  /* Tablet (≤ 768px) */
  @media (max-width: 767.98px) {
    .sc-modal-body    { padding: 24px !important; }
    .sc-modal-body-lg { padding: 24px 28px !important; max-height: 80vh !important; }
    .sc-card-header   { padding: 16px 20px !important; }
    .sc-card-body     { padding: 20px !important; }
    .sc-container     { padding: 20px !important; gap: 20px !important; }
    .sc-page-header   { flex-wrap: wrap !important; gap: 10px !important; }
  }

  /* Phone (≤ 576px) */
  @media (max-width: 575.98px) {
    .sc-modal-body       { padding: 16px !important; }
    .sc-modal-body-lg    { padding: 16px !important; }
    .sc-modal-title      { font-size: 16px !important; letter-spacing: -0.2px !important; }
    .sc-card-header      { padding: 12px 14px !important; flex-wrap: wrap !important; gap: 10px !important; }
    .sc-card-body        { padding: 14px !important; }
    .sc-container        { padding: 14px !important; gap: 14px !important; }
    .sc-configure-btn    { width: 100% !important; justify-content: center !important; }
    .sc-header-title     { font-size: 18px !important; letter-spacing: -0.3px !important; }
    .sc-page-header      { flex-wrap: wrap !important; gap: 8px !important; }
    .sc-settings-row     { flex-wrap: wrap !important; align-items: flex-start !important; }
    .sc-row-right        { width: 100% !important; margin-top: 4px !important; flex-wrap: wrap !important; gap: 8px !important; }
    .sc-row-right select { flex: 1 !important; min-width: unset !important; }
    .sc-row-right .sc-save-btn { flex: 1 !important; justify-content: center !important; }
    .sc-rule-row         { flex-wrap: wrap !important; gap: 6px !important; padding: 10px 12px !important; }
    .sc-form-footer      { flex-wrap: wrap !important; gap: 8px !important; margin-right: 0 !important; }
    .sc-form-footer > button { flex: 1 1 calc(50% - 4px) !important; min-width: 100px !important; justify-content: center !important; margin-right: 0 !important; }
    .sc-pf-modal         { padding: 24px !important; }
    .pt-header-row > div { font-size: 10px !important; letter-spacing: 0.3px !important; }
    .sc-section-panel    { padding: 16px !important; }
  }

  /* Small phone (≤ 400px) */
  @media (max-width: 400px) {
    .sc-modal-body    { padding: 12px !important; }
    .sc-modal-body-lg { padding: 12px !important; }
    .sc-card-header   { padding: 10px 12px !important; }
    .sc-card-body     { padding: 10px !important; }
    .sc-container     { padding: 10px !important; }
    .sc-form-footer > button { flex: 1 1 100% !important; }
    .sc-pf-modal      { padding: 16px !important; }
  }
`;

const SalaryConfiguration: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('general');

  return (
    <>
      <style>{KEYFRAMES}</style>
      <style>{SALARY_CONFIG_CSS}</style>
      <div
        className="container-fluid py-6 px-0 cfg-fade-in"
        style={{ maxWidth: '100%', backgroundColor: C.bgPage }}
      >
        <ConfigPageLayout
          title="Salary Configuration"
          subtitle="Manage salary structures, deduction rules, and payroll formulas"
          tabs={TABS}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        >
          <div key={activeTab} className="cfg-fade-in">
            {activeTab === 'general'   && <GeneralSettings />}
            {activeTab === 'gross'     && <GrossPayDistribution />}
            {activeTab === 'deduction' && <DeductionRules />}
            {activeTab === 'custom'    && <CustomRules />}
            {activeTab === 'master'    && <DeductionMaster />}
          </div>
        </ConfigPageLayout>
      </div>
    </>
  );
};

export default SalaryConfiguration;
