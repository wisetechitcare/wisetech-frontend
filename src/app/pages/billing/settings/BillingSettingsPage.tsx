import React from "react";
import { Box, Stack, Typography } from "@mui/material";
import { GlassCard, IconBox, ToneChip, TRIO, type Trio } from "@app/modules/common/components/ui";
import { BillingPageHeader } from "../components";

/**
 * Billing settings.
 *
 * UI scaffold only — nothing here writes. Each section says where its setting will
 * actually live, because several of them already have a home elsewhere in the app and
 * must NOT be reimplemented here:
 *
 *  - numbering  → `prefixSettingRepo` / `PrefixIdentifier` already issue project numbers
 *  - GST + bank → the `Organization` record already holds our GSTIN/PAN/TAN and bank
 *  - approvals  → the generic approval framework, configured per employee in App Settings
 *
 * Wiring those up is a matter of surfacing existing data here, not building new stores.
 */

interface SettingSection {
  key: string;
  title: string;
  description: string;
  icon: string;
  trio: Trio;
  /** Where the underlying data already lives, when it does. */
  backedBy?: string;
}

const SECTIONS: SettingSection[] = [
  {
    key: "invoice-numbering",
    title: "Invoice Numbering",
    description: "Prefix, fiscal-year segment and running sequence for tax invoices.",
    icon: "abstract-26",
    trio: TRIO.blue,
    backedBy: "Extends the existing PrefixIdentifier scheme",
  },
  {
    key: "proforma-numbering",
    title: "Proforma Numbering",
    description: "Separate series from tax invoices, so the two never share a number.",
    icon: "abstract-26",
    trio: TRIO.cyan,
    backedBy: "Extends the existing PrefixIdentifier scheme",
  },
  {
    key: "request-numbering",
    title: "Billing Request Numbering",
    description: "Currently BR/YYYY/NNNN, issued max-based so a deleted draft never frees a number.",
    icon: "file-added",
    trio: TRIO.slate,
    backedBy: "Live — see billingEligibility.nextRequestNumber",
  },
  {
    key: "gst",
    title: "GST Settings",
    description: "Our GSTIN, place of supply, and the CGST/SGST vs IGST rule.",
    icon: "percentage",
    trio: TRIO.amber,
    backedBy: "Organization holds our GSTIN/PAN/TAN; the client's is on Company",
  },
  {
    key: "bank",
    title: "Bank Details",
    description: "Account shown on proformas and invoices for client remittance.",
    icon: "bank",
    trio: TRIO.green,
    backedBy: "Organization record",
  },
  {
    key: "terms",
    title: "Payment Terms",
    description: "Default due-days and the terms text printed on documents.",
    icon: "calendar",
    trio: TRIO.purple,
  },
  {
    key: "approval",
    title: "Billing Approval Workflow",
    description: "Who signs off a billing request, in what order.",
    icon: "check-circle",
    trio: TRIO.green,
    backedBy: "Live — App Settings → Approval Configuration → Billing Request (set per employee)",
  },
  {
    key: "templates",
    title: "Templates",
    description: "Document layouts for proformas and tax invoices.",
    icon: "document",
    trio: TRIO.blue,
  },
  {
    key: "signature",
    title: "Company Signature",
    description: "Authorised signatory image and label placed on issued documents.",
    icon: "pencil",
    trio: TRIO.rose,
  },
];

const BillingSettingsPage: React.FC = () => (
  <Box sx={{ maxWidth: 1600, mx: "auto", pb: 4 }}>
    <BillingPageHeader
      icon="setting-2"
      title="Billing Settings"
      description="Numbering, tax, banking, terms and document templates for the Billing module."
      trio={TRIO.slate}
    />

    <Box
      sx={{
        display: "grid",
        gap: 1.25,
        gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
      }}
    >
      {SECTIONS.map((section) => (
        <GlassCard key={section.key} preset="section" sx={{ p: { xs: 1.5, sm: 1.75 }, height: "100%" }}>
          <Stack direction="row" spacing={1.25} sx={{ height: "100%" }}>
            <IconBox icon={section.icon} trio={section.trio} size={38} fs="fs-3" />
            <Stack sx={{ flex: 1, minWidth: 0 }} spacing={0.4}>
              <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{section.title}</Typography>
              <Typography sx={{ fontSize: 12.5, color: "text.secondary", lineHeight: 1.45 }}>
                {section.description}
              </Typography>
              <Box sx={{ flex: 1 }} />
              {section.backedBy && (
                <Typography sx={{ fontSize: 11, color: "text.disabled", mt: 0.5, lineHeight: 1.4 }}>
                  {section.backedBy}
                </Typography>
              )}
              <Box sx={{ mt: 0.5 }}>
                <ToneChip
                  tone={section.backedBy?.startsWith("Live") ? "success" : "neutral"}
                  label={section.backedBy?.startsWith("Live") ? "Configured elsewhere" : "Not implemented"}
                  dense
                />
              </Box>
            </Stack>
          </Stack>
        </GlassCard>
      ))}
    </Box>
  </Box>
);

export default BillingSettingsPage;
