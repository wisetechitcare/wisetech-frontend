import React, { useState } from 'react';
import { CircleQuestionMark, Flag, ShieldCheck } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ds/ui/tabs';
import Settings from './Settings';
import ReimbursementEmployeeLimit from './ReimbursementEmployeeLimit';
import QueryTopics from './QueryTopics';

const TABS = [
  { id: 'categories', label: 'Reimbursement Categories', icon: Flag },
  { id: 'limits', label: 'Employee Limits', icon: ShieldCheck },
  { id: 'topics', label: 'Question Topics', icon: CircleQuestionMark },
] as const;

type TabId = (typeof TABS)[number]['id'];

/**
 * Reimbursement → Configure: categories, per-employee limits and question topics.
 *
 * The kit Tabs — the same control as the Payment tab's Queue / History. Only the open panel is
 * mounted (each one fetches its own data), as before.
 */
const ReimbursementConfiguration: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('categories');

  return (
    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabId)} className="gap-4 py-4">
      {/* Scrolls sideways on a phone instead of wrapping — a wrapped tab bar reads as two controls. */}
      <div className="max-w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <TabsList aria-label="Configuration">
          {TABS.map(({ id, label, icon: Icon }) => (
            <TabsTrigger key={id} value={id}>
              <Icon aria-hidden />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      <TabsContent value="categories">{activeTab === 'categories' && <Settings />}</TabsContent>
      <TabsContent value="limits">{activeTab === 'limits' && <ReimbursementEmployeeLimit />}</TabsContent>
      <TabsContent value="topics">{activeTab === 'topics' && <QueryTopics />}</TabsContent>
    </Tabs>
  );
};

export default ReimbursementConfiguration;
