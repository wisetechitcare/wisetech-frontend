import React from "react";
import AnalyticsTab from "@app/modules/common/components/AnalyticsTab";
import { leadRow } from "../../companies/components/LeadReferenceTab";
import CompanyLeadReferences from "../../companies/components/CompanyLeadReferences";

/**
 * Contact → Lead Reference: the leads this person referred to us, over time.
 * Same records and same mapping as the company tab — a referral is a referral,
 * only the side of the relationship differs.
 */
const ContactLeadReferenceTab: React.FC<{ referrals?: any[] }> = ({ referrals = [] }) => (
  <AnalyticsTab
    items={referrals}
    toRow={leadRow}
    title="Referred Leads — Business"
    noun="lead"
    storageKey="contactLeadReferencePeriodMode"
  >
    {(filtered) => <CompanyLeadReferences referrals={filtered as any} tableName="contact-lead-references" />}
  </AnalyticsTab>
);

export default ContactLeadReferenceTab;
