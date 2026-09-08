import React from "react";
import AnalyticsTab from "@app/modules/common/components/AnalyticsTab";
import { referredLeadDate } from "./LeadReferralAnalytics";
import CompanyLeadReferences from "./CompanyLeadReferences";

interface ReferredLead {
  id: string;
  lead?: {
    id: string;
    title?: string;
    createdAt?: string;
    inquiryDate?: string | null;
    status?: { name: string; color?: string | null } | null;
    commercials?: Array<{ cost?: number | string | null }> | null;
  } | null;
  [key: string]: any;
}

/** A referred lead is worth the sum of its fee line items. */
export const leadValue = (r: ReferredLead): number =>
  (r.lead?.commercials || []).reduce((sum, c) => sum + (Number(c?.cost) || 0), 0);

/** Bars split by lead status, so the mix of Received / Pending / Not Received is visible. */
export const leadRow = (r: ReferredLead) => ({
  date: referredLeadDate(r),
  value: leadValue(r),
  series: r.lead?.status?.name || "No status",
  color: r.lead?.status?.color,
  label: r.lead?.title,
  href: r.lead?.id ? `/leads/${r.lead.id}` : undefined,
});

/**
 * Company → Lead Reference: the leads this company referred to us, over time.
 * Dates are the leads' INQUIRY dates (the business date), not createdAt.
 */
const LeadReferenceTab: React.FC<{ referredLeads?: ReferredLead[] }> = ({ referredLeads = [] }) => (
  <AnalyticsTab
    items={referredLeads}
    toRow={leadRow}
    title="Referred Leads — Business"
    noun="lead"
    storageKey="leadReferencePeriodMode"
  >
    {(filtered) => <CompanyLeadReferences referredLeads={filtered as any} />}
  </AnalyticsTab>
);

export default LeadReferenceTab;
