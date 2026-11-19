import React from "react";
import type { DocumentProfile } from "@modules/document-editor";
import { BillingStatusBadge } from "../components";

/**
 * Each billed row's Amount and Share, one pair per bill line: `bill_amount_2` / `bill_share_2` edit the bill's 2nd line.
 * Mirrors the backend's `billLineField` / `MAX_BILL_LINES` (templates/billDocument.ts) — the server only accepts these.
 */
const MAX_BILL_LINES = 20;
const LINE_FIELD = /^bill_(amount|share)_\d+$/;
const LINKED = Array.from({ length: MAX_BILL_LINES }, (_, i) => [`bill_amount_${i + 1}`, `bill_share_${i + 1}`]).flat();

/** Proforma and Tax Invoice, as the document editor shows them. */
export const billDocumentProfile: DocumentProfile = {
  backPath: "/billing/proformas",
  detailPath: (documentId) => `/billing/documents/${documentId}`,
  groupOrder: ["Scope & Classification", "Bill To", "Ship To", "References", "Bank Details", "Signatory", "Sections", "Details"],
  groupIcons: {
    "Bill To": "user",
    "Ship To": "delivery-24",
    References: "document",
    Signatory: "security-user",
    "Bank Details": "bank",
    "Scope & Classification": "element-11",
  },
  fields: {
    client_name: { label: "Name", group: "Bill To" },
    client_address: { label: "Address", group: "Bill To", multiline: true },
    // Which Contact Person company Bill To bills — set by the Company picker, never typed.
    bill_to_party: { label: "Billed Company", group: "Bill To", hidden: true },
    ship_to_name: { label: "Name", group: "Ship To" },
    ship_to_address: { label: "Address", group: "Ship To", multiline: true },

    show_bill_to: { label: "Bill To", group: "Bill To", toggleDefault: "Yes", headerSwitch: true },
    show_ship_to: { label: "Ship To", group: "Ship To", toggleDefault: "Yes", headerSwitch: true },
    show_reference: { label: "Reference Details", group: "References", toggleDefault: "Yes", headerSwitch: true },
    show_bank: { label: "Payment Details", group: "Bank Details", toggleDefault: "Yes", headerSwitch: true },
    show_signature: { label: "Authorised Signatory", group: "Signatory", toggleDefault: "Yes", headerSwitch: true },
    show_project: { label: "Project bar", group: "Sections", toggleDefault: "Yes", hint: "Project name, scope and order value." },
    show_words: { label: "Amount in words", group: "Sections", toggleDefault: "Yes", hint: "The total written out under the summary." },
    show_thanks: { label: "Queries note", group: "Sections", toggleDefault: "Yes", hint: "\"In case of any queries…\" beside the signature." },
    show_footer: { label: "Footer", group: "Sections", toggleDefault: "Yes", hint: "Phone, email and the computer-generated note." },
    show_payment_page: {
      label: "Payment status page",
      group: "Sections",
      toggleDefault: "Yes",
      hint: "Adds a second page with the Bill Amount, GST and TDS status, the total and what is pending.",
    },

    service_description: {
      label: "Scope of Service",
      group: "Scope & Classification",
      multiline: true,
      hint: "The Particular line printed above the SAC code.",
    },
    sac_code: { label: "SAC Code", group: "Scope & Classification" },
    sac_description: { label: "SAC Description", group: "Scope & Classification" },
    subtotal_label: { label: "Subtotal Label", group: "Scope & Classification" },

    work_order_no: { label: "Work Order No.", group: "References", hint: "The client's PO / work order reference." },
    work_order_date: { label: "Work Order Dated", group: "References" },
    our_ref_no: { label: "Our Ref. No", group: "References" },
    ref_date: { label: "Ref. Dated", group: "References" },
    reverse_charge: { label: "RCM", group: "References", toggleDefault: "No", hint: "Reverse charge applicable." },

    bank_account_name: { label: "Account Name", group: "Bank Details" },
    bank_account_number: { label: "Bank Account Number", group: "Bank Details" },
    bank_name: { label: "Bank Name", group: "Bank Details", multiline: true },
    bank_ifsc: { label: "Bank IFSC Code", group: "Bank Details" },
    bank_branch: { label: "Branch", group: "Bank Details" },

    signatory_line: { label: "Signed For", group: "Signatory", hint: 'Prints below the signatory line, e.g. "For …Pvt. Ltd."' },
    show_stamp: { label: "Stamp", group: "Signatory", toggleDefault: "Yes", hint: "Print the company stamp." },
  },
  sectionSwitches: [
    "show_bill_to", "show_ship_to", "show_reference", "show_project", "show_bank",
    "show_words", "show_thanks", "show_signature", "show_footer", "show_payment_page",
    // Not a Yes/No, but the same need: a new Bill To company changes the GSTIN / state / GST split the page prints.
    "bill_to_party",
  ],
  requiredSection: {
    service_description: "show_project",
    client_name: "show_bill_to",
    bank_account_name: "show_bank",
    bank_account_number: "show_bank",
    bank_ifsc: "show_bank",
  },
  addressGroups: {
    // Bill To also records WHICH company it bills: that decides the client GSTIN / state the page prints.
    "Bill To": { nameKey: "client_name", addressKey: "client_address", partyKey: "bill_to_party" },
    "Ship To": { nameKey: "ship_to_name", addressKey: "ship_to_address" },
  },
  // Fee-schedule row cells (`percentage_2`, `stage_value_2`) and each billed row's linked Amount / Share.
  isPageOnlyField: (key) => /^(percentage|stage_value)_\d+$/.test(key) || LINE_FIELD.test(key),
  // Linked exactly as in the Raise Proforma dialog: the server prices the bill (capped at what is left on the stage).
  connectedFields: LINKED,
  fieldTitle: (field) => LINE_FIELD.test(field)
    ? "Linked to this row's bill line: change the amount or the share and the other, GST and the totals follow (up to what is left on the stage)"
    : undefined,
  previewToggles: [
    { selector: ".inv-p2", field: "show_payment_page", hide: "display" },
    { selector: ".inv-stamp", field: "show_stamp", hide: "visibility" },
  ],
  renderStatus: (status) => <BillingStatusBadge status={status} />,
  // Saving can change the bill's own amount, which the trackers and the project's Billing tab show.
  invalidateKeys: [["billing"], ["project-billing"]],
  lockedNote: "Client, project, deliverables, amounts, GST and the document number come straight from the bill this was raised from.",
  refreshNote: "Organisation, client, bank details, Bill To / Ship To, SAC and contact details are re-pulled "
    + "from the project as it is now, replacing what this draft shows for them. Work order details and scope of service are kept.",
};
