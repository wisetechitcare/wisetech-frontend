import React from "react";
import { TRIO } from "@app/modules/common/components/ui";
import BillingDocumentPlaceholder from "../components/BillingDocumentPlaceholder";

/** Tax invoices — the GST document, raised once payment is verified. */
const InvoicesPage: React.FC = () => (
  <BillingDocumentPlaceholder
    title="Tax Invoices"
    description="GST tax invoices issued after finance verifies payment."
    icon="receipt-square"
    trio={TRIO.purple}
    columns={["Invoice No", "Project", "Client", "Taxable", "GST", "Total", "Issued", "Status"]}
    statuses={["GENERATED", "SENT", "PAID", "ARCHIVED"]}
    dependsOn="A tax invoice follows a verified payment, so this module comes after Payments. Money fields will use Decimal(18,2) throughout — float drift breaks GST reconciliation."
  />
);

export default InvoicesPage;
