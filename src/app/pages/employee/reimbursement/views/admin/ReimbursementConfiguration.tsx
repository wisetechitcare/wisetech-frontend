import React, { useState } from 'react';
import Settings from './Settings';
import ReimbursementEmployeeLimit from './ReimbursementEmployeeLimit';
import { ConfigPageLayout, C, KEYFRAMES } from '@app/modules/configuration';
import type { ConfigTab } from '@app/modules/configuration';

const TABS: ConfigTab[] = [
  { id: 'categories', label: 'Reimbursement Categories', icon: 'bi-tag'          },
  { id: 'limits',     label: 'Employee Limits',          icon: 'bi-shield-check' },
];

const ReimbursementConfiguration: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('categories');

  return (
    <>
      <style>{KEYFRAMES}</style>
      <div
        className="container-fluid py-6 px-0 cfg-fade-in"
        style={{ maxWidth: '100%', backgroundColor: C.bgPage }}
      >
        <ConfigPageLayout
          title="Reimbursement Configuration"
          subtitle="Manage reimbursement categories and per-request employee limits"
          tabs={TABS}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        >
          <div key={activeTab} className="cfg-fade-in">
            {activeTab === 'categories' && <Settings />}
            {activeTab === 'limits'     && <ReimbursementEmployeeLimit />}
          </div>
        </ConfigPageLayout>
      </div>
    </>
  );
};

export default ReimbursementConfiguration;
