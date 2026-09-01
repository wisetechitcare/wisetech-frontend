import React from "react";
import { useNavigate } from "react-router-dom";
import { Box, Stack, Typography } from "@mui/material";
import { GlassCard, IconBox, ToneChip, TRIO, type Trio } from "@app/modules/common/components/ui";
import { BillingPageHeader } from "../components";

/**
 * Billing reports — the landing page. Each card opens its own dedicated
 * report under `/billing/reports/:path`; this page itself renders no data.
 */

interface ReportDef {
  key: string;
  /** Route segment under /billing/reports. */
  path: string;
  title: string;
  description: string;
  icon: string;
  trio: Trio;
}

const REPORTS: ReportDef[] = [
  {
    key: "revenue",
    path: "revenue",
    title: "Revenue Report",
    description: "Invoiced revenue by period, project and client.",
    icon: "chart-line-up",
    trio: TRIO.green,
  },
  {
    key: "collection",
    path: "collections",
    title: "Collection Report",
    description: "What was invoiced against what was actually received.",
    icon: "wallet",
    trio: TRIO.blue,
  },
  {
    key: "outstanding",
    path: "outstanding",
    title: "Outstanding Report",
    description: "Issued and unpaid, aged into buckets.",
    icon: "information-5",
    trio: TRIO.rose,
  },
  {
    key: "receivable",
    path: "receivables",
    title: "Receivable Report",
    description: "Approved and proforma'd work not yet invoiced.",
    icon: "delivery",
    trio: TRIO.amber,
  },
  {
    key: "monthly",
    path: "monthly",
    title: "Monthly Billing Report",
    description: "Requests raised, approved, proforma'd and invoiced per month.",
    icon: "calendar",
    trio: TRIO.purple,
  },
  {
    key: "client",
    path: "client",
    title: "Client Billing Report",
    description: "Everything billed to one client across all their projects.",
    icon: "profile-user",
    trio: TRIO.cyan,
  },
  {
    key: "project",
    path: "project",
    title: "Project Billing Report",
    description: "Stage-wise billed vs remaining for a single project.",
    icon: "abstract-26",
    trio: TRIO.slate,
  },
];

const BillingReportsPage: React.FC = () => {
  const navigate = useNavigate();

  return (
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
          <GlassCard
            key={report.key}
            preset="section"
            onClick={() => navigate(`/billing/reports/${report.path}`)}
            sx={{
              p: { xs: 1.5, sm: 1.75 }, height: "100%", cursor: "pointer",
              transition: "border-color .15s, transform .15s",
              "&:hover": { transform: "translateY(-2px)" },
            }}
          >
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
                  <ToneChip tone="success" label="Open report" dense />
                </Stack>
              </Stack>
            </Stack>
          </GlassCard>
        ))}
      </Box>
    </Box>
  );
};

export default BillingReportsPage;
