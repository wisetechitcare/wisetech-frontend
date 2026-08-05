import React from "react";
import { TRIO } from "@app/modules/common/components/ui";
import BillingDocumentPlaceholder from "../components/BillingDocumentPlaceholder";

/** Proformas — raised from an approved billing request in the Accounts Queue. */
const ProformasPage: React.FC = () => (
  <BillingDocumentPlaceholder
    title="Proformas"
    description="Pro-forma invoices raised against approved billing requests."
    icon="receipt-square"
    trio={TRIO.cyan}
    columns={["Proforma No", "Billing Request", "Project", "Client", "Amount", "Issued", "Status"]}
    statuses={["DRAFT", "GENERATED", "SENT", "VIEWED", "PAYMENT_PENDING", "PAID", "CONVERTED"]}
    dependsOn="Generating a proforma already records the hand-off on its billing request — the document, numbering and PDF land with this module."
  />
);

export default ProformasPage;
