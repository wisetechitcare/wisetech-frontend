import React, { useState } from 'react';
import Settings from './Settings';
import ReimbursementEmployeeLimit from './ReimbursementEmployeeLimit';
import QueryTopics from './QueryTopics';
import { ConfigPageLayout, C, KEYFRAMES } from '@app/modules/configuration';
import type { ConfigTab } from '@app/modules/configuration';

const TABS: ConfigTab[] = [
  { id: 'categories', label: 'Reimbursement Categories', icon: 'bi-tag'             },
  { id: 'limits',     label: 'Employee Limits',          icon: 'bi-shield-check'    },
  { id: 'topics',     label: 'Question Topics',          icon: 'bi-question-circle' },
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
          subtitle="Manage reimbursement categories, per-request employee limits and query topics"
          tabs={TABS}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        >
          <div key={activeTab} className="cfg-fade-in">
            {activeTab === 'categories' && <Settings />}
            {activeTab === 'limits'     && <ReimbursementEmployeeLimit />}
            {activeTab === 'topics'     && <QueryTopics />}
          </div>
        </ConfigPageLayout>
      </div>
    </>
  );
};

export default ReimbursementConfiguration;
