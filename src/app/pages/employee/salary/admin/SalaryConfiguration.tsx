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

  /* Deduction-rule panels are a fixed 4-column table (label | gross | tax |
     enable). Rather than squash the number inputs below the app's mobile
     breakpoint, keep the desktop proportions and let each panel scroll
     horizontally — matching the "data tables scroll inside their container"
     rule. Desktop (>=992px) is untouched. */
  @media (max-width: 991.98px) {
    .sc-section-panel { overflow-x: auto !important; }
    .sc-section-panel > .row { min-width: 520px !important; }
  }

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
    .sc-header-title     { font-size: 18px !important; letter-spacing: -0.3px !important; text-align: center !important; width: 100% !important; }
    .sc-page-header      { flex-direction: column !important; align-items: center !important; gap: 10px !important; }
    .sc-page-header > button { width: 100% !important; justify-content: center !important; }
    .sc-settings-row     { flex-wrap: wrap !important; align-items: flex-start !important; }
    .sc-row-right         { width: 100% !important; margin-top: 8px !important; flex-wrap: wrap !important; gap: 8px !important; }
    .sc-row-right select  { flex: 1 !important; min-width: unset !important; }
    .sc-row-right > button { flex: 1 !important; justify-content: center !important; }
    .sc-rule-row         { gap: 6px !important; padding: 10px 12px !important; }
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

  /* ── DeductionRules – global rule row design ──────────────────────── */

  /* Base row layout – always a single flex row */
  .sc-rule-row {
    display: flex !important;
    flex-wrap: nowrap !important;
    align-items: center !important;
    border: 1px solid #eef0f5 !important;
    border-left: 3px solid #E1E3EA !important;
    border-radius: 10px !important;
    background: #ffffff !important;
    margin-bottom: 0 !important;
    padding: 11px 16px !important;
    gap: 10px !important;
    transition: box-shadow 0.15s ease !important;
  }
  .sc-rule-row:hover {
    box-shadow: 0 2px 10px rgba(0,0,0,0.06) !important;
  }
  /* Condition text always fills available space */
  .sc-rule-condition { flex: 1 !important; min-width: 0 !important; }

  /* Male rows – blue accent + subtle tint */
  .sc-rule-male {
    border-left-color: #0085db !important;
    background: linear-gradient(to right, #f0f8ff 0%, #ffffff 60%) !important;
  }

  /* Female rows – pink accent + subtle tint */
  .sc-rule-female {
    border-left-color: #e91e8c !important;
    background: linear-gradient(to right, #fff5fb 0%, #ffffff 60%) !important;
  }

  /* Value pill – base (all screens) */
  .sc-rule-value {
    display: inline-flex !important;
    align-items: center !important;
    padding: 4px 14px !important;
    border-radius: 20px !important;
    font-family: 'Inter', sans-serif !important;
    font-size: 13.5px !important;
    font-weight: 700 !important;
    white-space: nowrap !important;
    letter-spacing: -0.2px !important;
    flex-shrink: 0 !important;
  }

  /* NIL – soft red */
  .sc-val-nil {
    background: #fff1f2 !important;
    border: 1px solid #fecdd3 !important;
    color: #be123c !important;
    letter-spacing: 0.8px !important;
    font-size: 11.5px !important;
    text-transform: uppercase !important;
    padding: 4px 12px !important;
  }

  /* Amount – green */
  .sc-val-amount {
    background: #f0fdf4 !important;
    border: 1px solid #86efac !important;
    color: #15803d !important;
  }

  /* Value + exception wrapper */
  .sc-val-group {
    display: inline-flex !important;
    flex-direction: column !important;
    align-items: flex-end !important;
    gap: 3px !important;
    flex-shrink: 0 !important;
  }

  /* Exception text – subdued, below the pill */
  .sc-except-text {
    font-family: 'Inter', sans-serif !important;
    font-size: 11px !important;
    color: #94a3b8 !important;
    font-weight: 500 !important;
    font-style: italic !important;
    text-align: right !important;
  }

  /* ── DeductionRules – mobile (≤ 575px) ─────────────────────────── */
  @media (max-width: 575.98px) {
    .sc-rule-row      { padding: 10px 12px !important; gap: 8px !important; }

    .sc-rule-condition { font-size: 12.5px !important; }
    .sc-rule-value     { font-size: 12.5px !important; padding: 3px 10px !important; }

    /* Exception aligns left on mobile */
    .sc-val-group      { align-items: flex-start !important; }
    .sc-except-text    { text-align: left !important; }

    /* EPF card */
    .sc-epf-label      { font-size: 11px !important; margin-bottom: 4px !important; }
    .sc-epf-name       { font-size: 13.5px !important; }
    .sc-deduction-tag  { font-size: 13px !important; }
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
