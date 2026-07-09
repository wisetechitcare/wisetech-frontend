import React, { useMemo, useState } from "react";
import dayjs from "dayjs";
import PeriodFilter, { PeriodRange } from "@app/modules/common/components/PeriodFilter";
import LeadReferralAnalytics, { referredLeadDate } from "../../companies/components/LeadReferralAnalytics";
import ContactLeadReferences from "./ContactLeadReferences";

interface Referral {
  id: string;
  lead?: { id: string; createdAt?: string; inquiryDate?: string | null; [key: string]: any } | null;
  [key: string]: any;
}

const ContactLeadReferenceTab: React.FC<{ referrals?: Referral[] }> = ({ referrals = [] }) => {
  const [range, setRange] = useState<PeriodRange>({ mode: "allyear", start: null, end: null, label: "All time" });

  const filtered = useMemo(() => {
    if (!range.start || !range.end) return referrals;
    const s = range.start.valueOf();
    const e = range.end.valueOf();
    return referrals.filter((r) => {
      const d = referredLeadDate(r);
      if (!d) return false;
      const t = dayjs(d).valueOf();
      return t >= s && t <= e;
    });
  }, [referrals, range.start, range.end]);

  return (
    <div>
      <div className="mb-3">
        <PeriodFilter onChange={setRange} initialMode="allyear" storageKey="contactLeadReferencePeriodMode" />
      </div>

      <LeadReferralAnalytics
        referredLeads={filtered as any}
        totalCount={referrals.length}
        mode={range.mode}
        rangeStart={range.start}
        rangeEnd={range.end}
      />

      <ContactLeadReferences referrals={filtered as any} />
    </div>
  );
};

export default ContactLeadReferenceTab;
