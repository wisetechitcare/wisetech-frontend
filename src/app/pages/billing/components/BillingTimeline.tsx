import React from "react";
import { Timeline, type TimelineItem } from "@/ds/patterns/timeline";
import { formatDateTime } from "@utils/dateFormats";

/**
 * The financial life of one thing — request raised → approved → proforma → payment →
 * invoice — as a vertical timeline.
 *
 * Purely presentational and document-agnostic: the caller supplies the steps. That is
 * what lets Projects render a billing timeline by READING Billing data, without owning
 * or duplicating any of it.
 *
 * The LOOK and the markup are the kit's `Patterns/Timeline`; this file is only the
 * mapping from Billing's step shape onto it, plus the date formatting. It was a
 * hand-built MUI timeline with four hardcoded hexes (#12805C, #1E3A8A, #9AA4B2,
 * #C0392B) and KTIcon glyphs — the second hand-built timeline in the codebase, which is
 * what earned the pattern its place in `src/ds`.
 */

export type BillingTimelineState = "done" | "current" | "upcoming" | "failed";

export interface BillingTimelineStep {
  key: string;
  label: string;
  state: BillingTimelineState;
  /** ISO timestamp; rendered in the company date format when present. */
  at?: string | null;
  detail?: string | null;
  /** What happened while this step was current (downloads, shares, status moves) — drawn as a sub-list under it. */
  events?: BillingTimelineEvent[];
}

export interface BillingTimelineEvent {
  key: string;
  message: string;
  actor?: string | null;
  at: string;
}

/** "2026.03.04 16:02 · Stage 2 of 4", dropping whichever half is absent. */
const metaLine = (at?: string | null, detail?: string | null): string =>
  [at ? formatDateTime(at) : "", detail ?? ""].filter(Boolean).join(" · ");

const toItem = (step: BillingTimelineStep): TimelineItem => ({
  key: step.key,
  title: step.label,
  state: step.state,
  meta: metaLine(step.at, step.detail),
  events: step.events?.map((event) => ({
    key: event.key,
    message: event.message,
    // An unattributed event is the system's own — a cron, a webhook — not a missing name.
    meta: `${event.actor ?? "System"} · ${formatDateTime(event.at)}`,
  })),
});

const BillingTimeline: React.FC<{ steps: BillingTimelineStep[]; dense?: boolean }> = ({
  steps, dense = false,
}) => <Timeline items={steps.map(toItem)} dense={dense} />;

export default BillingTimeline;
