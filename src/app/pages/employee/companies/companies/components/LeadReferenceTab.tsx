import React, { useMemo, useState } from "react";
import dayjs from "dayjs";
import PeriodFilter, { PeriodRange } from "@app/modules/common/components/PeriodFilter";
import LeadReferralAnalytics, { referredLeadDate } from "./LeadReferralAnalytics";
import CompanyLeadReferences from "./CompanyLeadReferences";

interface ReferredLead {
  id: string;
  lead?: { id: string; createdAt?: string; inquiryDate?: string | null } | null;
  [key: string]: any;
}

/**
 * Lead Reference tab: a period filter drives BOTH the referred-leads analytics
 * chart and the table below it, so they always reflect the same window.
 * Dates are the leads' INQUIRY dates (business date), not createdAt.
 */
const LeadReferenceTab: React.FC<{ referredLeads?: ReferredLead[] }> = ({ referredLeads = [] }) => {
  const [range, setRange] = useState<PeriodRange>({ mode: "monthly", start: null, end: null, label: "" });

  const filtered = useMemo(() => {
    if (!range.start || !range.end) return referredLeads; // "All Year" / unset → everything
    const s = range.start.valueOf();
    const e = range.end.valueOf();
    return referredLeads.filter((r) => {
      const d = referredLeadDate(r);
      if (!d) return false;
      const t = dayjs(d).valueOf();
      return t >= s && t <= e;
    });
  }, [referredLeads, range.start, range.end]);

  return (
    <div>
      <div className="mb-3">
        <PeriodFilter onChange={setRange} initialMode="monthly" storageKey="leadReferencePeriodMode" />
      </div>

      <LeadReferralAnalytics
        referredLeads={filtered}
        totalCount={referredLeads.length}
        mode={range.mode}
        rangeStart={range.start}
        rangeEnd={range.end}
      />

      <CompanyLeadReferences referredLeads={filtered as any} />
    </div>
  );
};

export default LeadReferenceTab;
