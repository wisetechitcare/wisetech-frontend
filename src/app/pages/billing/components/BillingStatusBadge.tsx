import React from "react";
import { Box } from "@mui/material";
/**
 * Screen-reader-only text. Spelled out rather than imported from `@mui/utils`: that package was never a declared
 * dependency here, only reachable through another package, and a reinstall made it unresolvable.
 */
const visuallyHidden = {
  border: 0, clip: "rect(0 0 0 0)", height: "1px", margin: "-1px", overflow: "hidden",
  padding: 0, position: "absolute", whiteSpace: "nowrap", width: "1px",
} as const;
import { ToneChip, isHexColor, type SemanticTone } from "@app/modules/common/components/ui";
import { SolidChip } from "@app/modules/common/components/ui/SolidChip";
import { tonePair } from "@app/theme/tokens";
import { useBillingLabels } from "./useBillingLabels";

/**
 * The fallback tone for every Billing code, so a status never means one colour on one screen and another elsewhere.
 * Billing → Configure overrides any of these; this is what shows while that config is still on the wire.
 *
 * The bands are shared across groups on purpose: indigo while a document is out with the client, amber while money is
 * outstanding, cyan once it is collected and the invoice is due, green when done.
 */
export const BILLING_STATUS_TONES: Record<string, SemanticTone> = {
  // A bill (bills.status): DRAFT → PROFORMA / AWAITING_PAYMENT → PARTIALLY_PAID → PAID → INVOICED, or CANCELLED.
  DRAFT: "neutral",
  PROFORMA: "indigo",
  AWAITING_PAYMENT: "indigo",
  PARTIALLY_PAID: "warning",
  PAID: "success",
  INVOICED: "success",
  CANCELLED: "neutral",
  // A document (generated_documents.status) and its versions (document_versions.status).
  PUBLISHED: "indigo",
  GENERATED: "indigo",
  SENT: "cyan",
  VIEWED: "cyan",
  CLIENT_ACCEPTED: "success",
  CLIENT_REJECTED: "danger",
  // Being replaced by a newer revision is the system working, not a problem.
  SUPERSEDED: "neutral",
  ARCHIVED: "neutral",
  // A bill's payment state (`paymentStatusOf`): PENDING is "nothing in yet", not an error.
  PENDING: "neutral",
  FULLY_PAID: "success",
  // The Billing Tracker's Bill Stage (trackerStatus.ts) — also every document version's chip (its `stageCode`)…
  READY_FOR_PROFORMA: "cyan",
  PROFORMA_DRAFT: "neutral",
  PROFORMA_GENERATED: "success",
  PROFORMA_SENT: "indigo",
  PROFORMA_REJECTED: "danger",
  READY_FOR_INVOICE: "cyan",
  INVOICE_DRAFT: "neutral",
  INVOICE_GENERATED: "cyan",
  INVOICE_SENT: "indigo",
  INVOICE_REJECTED: "danger",
  COMPLETED: "success",
  ON_HOLD: "warning",
  // …and the band it sits in. Mirrors the server's defaults (`services/billing/statusLabels.ts`).
  PAYMENT: "warning",
  INVOICE: "cyan",
  CLOSED: "success",
};

/**
 * A Billing code's colour: Billing → Configure's tone name or hex, else the fallback above, so a chip is never
 * colourless while the config loads.
 */
const useBillingColour = () => {
  const labels = useBillingLabels();
  return (code: string): string => labels.tone(code) ?? BILLING_STATUS_TONES[code] ?? "neutral";
};

/** A Billing code as a soft chip. Every screen renders its statuses through here, so Configure changes all of them. */
export const BillingStatusBadge: React.FC<{ status?: string | null; dense?: boolean }> = ({
  status, dense = true,
}) => {
  const labels = useBillingLabels();
  const colourOf = useBillingColour();
  if (!status) return null;
  const colour = colourOf(status);
  const props = isHexColor(colour) ? { color: colour } : { tone: colour as SemanticTone };
  return <ToneChip {...props} label={labels.label(status)} dense={dense} />;
};

/**
 * A Billing code as the tint of the table cell it sits in, instead of a chip — the Leads table's convention
 * (`${statusColour}20`), applied per cell. The cell must be positioned; `trackerRowSx` does that for the trackers.
 * Colour alone carries no meaning to a screen reader, so the label is still there, visually hidden, and on hover.
 */
export const BillingStatusTint: React.FC<{ status: string; children: React.ReactNode }> = ({ status, children }) => {
  const labels = useBillingLabels();
  const colour = useBillingColour()(status);
  const solid = isHexColor(colour) ? colour : tonePair(colour as SemanticTone).fg;
  const label = labels.label(status);
  return (
    <>
      <Box aria-hidden sx={{ position: "absolute", inset: 0, pointerEvents: "none", bgcolor: `color-mix(in srgb, ${solid} 28%, transparent)` }} />
      <Box title={label} sx={{ position: "relative" }}>
        {children}
        <Box component="span" sx={visuallyHidden}>{label}</Box>
      </Box>
    </>
  );
};

/** A Billing code as a solid chip — the trackers' editable columns. Same wording and colour as the badge. */
export const BillingSolidChip: React.FC<{ code: string; dropdown?: boolean }> = ({ code, dropdown }) => {
  const labels = useBillingLabels();
  const colour = useBillingColour()(code);
  return (
    <SolidChip
      label={labels.label(code)}
      color={isHexColor(colour) ? colour : tonePair(colour as SemanticTone).fg}
      dropdown={dropdown}
    />
  );
};
