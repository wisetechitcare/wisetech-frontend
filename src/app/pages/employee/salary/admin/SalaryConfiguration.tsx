import React, { useState } from 'react';
import GrossPayDistribution from './views/salary-configuration/GrossPayDistribution';
import DeductionRules from './views/salary-configuration/DeductionRules';
import CustomRules from './views/salary-configuration/CustomRules';
import GeneralSettings from './views/salary-configuration/GeneralSettings';
import { ConfigPageLayout, C, KEYFRAMES } from '@app/modules/configuration';
import type { ConfigTab } from '@app/modules/configuration';

const TABS: ConfigTab[] = [
  { id: 'general',   label: 'General Settings',      icon: 'bi-gear'        },
  { id: 'gross',     label: 'Gross Pay Distribution', icon: 'bi-cash-stack'  },
  { id: 'deduction', label: 'Deduction Rules',        icon: 'bi-dash-square' },
  { id: 'custom',    label: 'Custom Rules',           icon: 'bi-sliders'     },
];

const SalaryConfiguration: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('general');

  return (
    <>
      <style>{KEYFRAMES}</style>
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
          </div>
        </ConfigPageLayout>
      </div>
    </>
  );
};

export default SalaryConfiguration;
