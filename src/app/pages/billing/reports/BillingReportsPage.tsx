import React from "react";
import { Box, Stack, Typography } from "@mui/material";
import { GlassCard, IconBox, ToneChip, TRIO, type Trio } from "@app/modules/common/components/ui";
import { BillingPageHeader } from "../components";

/**
 * Billing reports.
 *
 * Each report is listed with what it will actually measure and what it needs before it
 * can — a report card that says "Revenue" over a fake chart tells a reader nothing and
 * invites them to trust a number that doesn't exist.
 */

interface ReportDef {
  key: string;
  title: string;
  description: string;
  icon: string;
  trio: Trio;
  /** Modules that must exist before this report can be produced. */
  needs: string[];
}

const REPORTS: ReportDef[] = [
  {
    key: "revenue",
    title: "Revenue Report",
    description: "Invoiced revenue by period, project and client.",
    icon: "chart-line-up",
    trio: TRIO.green,
    needs: ["Tax Invoices"],
  },
  {
    key: "collection",
    title: "Collection Report",
    description: "What was invoiced against what was actually received.",
    icon: "wallet",
    trio: TRIO.blue,
    needs: ["Payments", "Tax Invoices"],
  },
  {
    key: "outstanding",
    title: "Outstanding Report",
    description: "Issued and unpaid, aged into buckets.",
    icon: "information-5",
    trio: TRIO.rose,
    needs: ["Payments", "Tax Invoices"],
  },
  {
    key: "receivable",
    title: "Receivable Report",
    description: "Approved and proforma'd work not yet invoiced.",
    icon: "delivery",
    trio: TRIO.amber,
    needs: ["Proformas"],
  },
  {
    key: "monthly",
    title: "Monthly Billing Report",
    description: "Requests raised, approved, proforma'd and invoiced per month.",
    icon: "calendar",
    trio: TRIO.purple,
    needs: ["Proformas", "Tax Invoices"],
  },
  {
    key: "client",
    title: "Client Billing Report",
    description: "Everything billed to one client across all their projects.",
    icon: "profile-user",
    trio: TRIO.cyan,
    needs: ["Proformas", "Payments"],
  },
  {
    key: "project",
    title: "Project Billing Report",
    description: "Stage-wise billed vs remaining for a single project.",
    icon: "abstract-26",
    trio: TRIO.slate,
    // This one is genuinely close: stage amounts and billing requests both exist today.
    needs: [],
  },
];

const BillingReportsPage: React.FC = () => (
  <Box sx={{ maxWidth: 1600, mx: "auto", pb: 4 }}>
    <BillingPageHeader
      icon="chart-simple"
      title="Reports"
      description="Financial reporting across requests, proformas, payments and invoices."
      trio={TRIO.purple}
    />

    <Box
      sx={{
        display: "grid",
        gap: 1.25,
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
      }}
    >
      {REPORTS.map((report) => (
        <GlassCard key={report.key} preset="section" sx={{ p: { xs: 1.5, sm: 1.75 }, height: "100%" }}>
          <Stack direction="row" spacing={1.25} sx={{ height: "100%" }}>
            <IconBox icon={report.icon} trio={report.trio} size={38} fs="fs-3" />
            <Stack sx={{ flex: 1, minWidth: 0 }} spacing={0.4}>
              <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{report.title}</Typography>
              <Typography sx={{ fontSize: 12.5, color: "text.secondary", lineHeight: 1.45 }}>
                {report.description}
              </Typography>
              {/* Bottom-pinned so the tiles line up regardless of description length. */}
              <Box sx={{ flex: 1 }} />
              <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mt: 0.5 }}>
                {report.needs.length === 0 ? (
                  <ToneChip tone="success" label="Data available" dense />
                ) : (
                  report.needs.map((need) => (
                    <ToneChip key={need} tone="neutral" label={`Needs ${need}`} dense />
                  ))
                )}
              </Stack>
            </Stack>
          </Stack>
        </GlassCard>
      ))}
    </Box>
  </Box>
);

export default BillingReportsPage;
