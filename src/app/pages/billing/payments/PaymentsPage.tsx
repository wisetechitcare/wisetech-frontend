import React from "react";
import { TRIO } from "@app/modules/common/components/ui";
import BillingDocumentPlaceholder from "../components/BillingDocumentPlaceholder";

/** Payments — client receipts recorded against a proforma or a tax invoice. */
const PaymentsPage: React.FC = () => (
  <BillingDocumentPlaceholder
    title="Payments"
    description="Client payments recorded against proformas and tax invoices."
    icon="wallet"
    trio={TRIO.green}
    columns={["Payment No", "Project", "Client", "Against", "Amount", "Date", "Status"]}
    statuses={["PENDING", "PAID", "FAILED"]}
    dependsOn="Payments record against a proforma or invoice, so this module follows those two."
  />
);

export default PaymentsPage;
