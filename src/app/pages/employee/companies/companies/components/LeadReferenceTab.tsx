import React, { useMemo, useState } from "react";
import dayjs from "dayjs";
import PeriodFilter, { PeriodRange } from "@app/modules/common/components/PeriodFilter";
import LeadReferralAnalytics from "./LeadReferralAnalytics";
import CompanyLeadReferences from "./CompanyLeadReferences";

interface ReferredLead {
  id: string;
  lead?: { id: string; createdAt?: string } | null;
  [key: string]: any;
}

/**
 * Lead Reference tab: a period filter drives BOTH the referred-leads analytics
 * chart and the table below it, so they always reflect the same window.
 */
const LeadReferenceTab: React.FC<{ referredLeads?: ReferredLead[] }> = ({ referredLeads = [] }) => {
  const [range, setRange] = useState<PeriodRange>({ mode: "allyear", start: null, end: null, label: "All time" });

  const filtered = useMemo(() => {
    if (!range.start || !range.end) return referredLeads; // "All Year" / unset → everything
    const s = range.start.valueOf();
    const e = range.end.valueOf();
    return referredLeads.filter((r) => {
      if (!r.lead?.createdAt) return false;
      const t = dayjs(r.lead.createdAt).valueOf();
      return t >= s && t <= e;
    });
  }, [referredLeads, range.start, range.end]);

  return (
    <div>
      <div className="mb-3">
        <PeriodFilter onChange={setRange} initialMode="allyear" storageKey="leadReferencePeriodMode" />
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
