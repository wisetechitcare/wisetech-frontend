import React, { useMemo, useState } from "react";
import { Box, Collapse, Stack, Typography, useTheme } from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import { IconBox, ToneChip, TRIO, WtButton, toneAlpha, type Trio } from "@app/modules/common/components/ui";
import { tonePair } from "@app/theme/tokens";
import { formatDate } from "@utils/dateFormats";
import type { DocumentProfile } from "@modules/document-editor";
import type { FieldChange, VersionComparison } from "@services/billingDocuments";
import { BillingStatusBadge } from "../components";

/**
 * Side-by-side diff of two revisions, laid out in the SAME sections the editor uses (Bill To, Ship To, References,
 * Bank Details…), so a reader finds a field where they typed it.
 *
 * Two parts, because they answer different questions. EDITED CONTENT is "what did someone change". FINANCIAL is
 * "did the ERP data move under us" — nobody did that on purpose and nobody can undo it here; it changes only by
 * regenerating from Billing.
 *
 * Unchanged rows are hidden by default: forty identical fields beside two real changes hide the two.
 */

type Kind = FieldChange["kind"];

const KIND: Record<Kind, { tone: "success" | "danger" | "warning" | "neutral"; label: string }> = {
  changed: { tone: "warning", label: "Changed" },
  added: { tone: "success", label: "Added" },
  removed: { tone: "danger", label: "Removed" },
  unchanged: { tone: "neutral", label: "Same" },
};

/** Fields the profile does not place: each billed row's Amount / Share, and anything else the server sends. */
const LINES_GROUP = "Bill Lines";
const OTHER_GROUP = "Details";
const FALLBACK_ICONS: Record<string, string> = {
  [LINES_GROUP]: "bill",
  Sections: "element-plus",
  [OTHER_GROUP]: "information-5",
};

interface Group { name: string; icon: string; rows: { change: FieldChange; label: string }[] }

/** Buckets the changes by the profile's groups, in the profile's order; unknown fields go last. */
const groupChanges = (changes: FieldChange[], profile?: DocumentProfile): Group[] => {
  const buckets = new Map<string, Group["rows"]>();
  for (const change of changes) {
    const meta = profile?.fields?.[change.field];
    const name = meta?.group
      ?? (profile?.isPageOnlyField?.(change.field) ? LINES_GROUP : OTHER_GROUP);
    // Inside a "Bill To" card the profile's short label ("Name") reads better than "Client Name".
    const label = meta?.label ?? change.label;
    if (!buckets.has(name)) buckets.set(name, []);
    buckets.get(name)!.push({ change, label });
  }
  const order = [...(profile?.groupOrder ?? []), LINES_GROUP, OTHER_GROUP];
  const rank = (name: string) => (order.includes(name) ? order.indexOf(name) : order.length);
  return [...buckets.entries()]
    .sort(([a], [b]) => rank(a) - rank(b))
    .map(([name, rows]) => ({
      name,
      icon: profile?.groupIcons?.[name] ?? FALLBACK_ICONS[name] ?? "abstract-26",
      rows,
    }));
};

const countKinds = (changes: FieldChange[]) =>
  changes.reduce<Record<Kind, number>>(
    (acc, c) => ({ ...acc, [c.kind]: acc[c.kind] + 1 }),
    { changed: 0, added: 0, removed: 0, unchanged: 0 },
  );

/** Yes/No switches read as a chip; everything else as text. */
const Value: React.FC<{ value: string | null; muted?: boolean; struck?: boolean; strong?: boolean }> = ({
  value, muted, struck, strong,
}) => {
  if (value === "Yes" || value === "No") {
    return <ToneChip tone={value === "Yes" ? "success" : "neutral"} label={value === "Yes" ? "Shown" : "Hidden"} dense />;
  }
  return (
    <Typography
      sx={{
        fontSize: 12.5, lineHeight: 1.5, whiteSpace: "pre-line", wordBreak: "break-word", minWidth: 0,
        color: value == null || muted ? "text.secondary" : "text.primary",
        fontWeight: strong ? 600 : 400,
        textDecoration: struck ? "line-through" : "none",
      }}
    >
      {value ?? "—"}
    </Typography>
  );
};

const ROW_COLUMNS = { xs: "1fr", md: "200px minmax(0, 1fr) minmax(0, 1fr)" } as const;

/** One field. A changed field tints its old value red and its new value green, with a keyline in the change's tone. */
const ChangeRow: React.FC<{ change: FieldChange; label: string; beforeLabel: string; afterLabel: string }> = ({
  change, label, beforeLabel, afterLabel,
}) => {
  const same = change.kind === "unchanged";
  const accent = tonePair(KIND[change.kind].tone)?.fg ?? "#64748b";
  const red = tonePair("danger")?.fg ?? "#e11d48";
  const green = tonePair("success")?.fg ?? "#16a34a";
  const cell = (tint: string | null) => ({
    minWidth: 0,
    px: 1.25, py: 0.75,
    borderRadius: "8px",
    bgcolor: tint ? toneAlpha(tint, 0.08) : "transparent",
  });
  // On a phone the columns stack, so each value says which version it is.
  const mobileTag = (text: string) => (
    <Typography sx={{ display: { xs: "block", md: "none" }, fontSize: 10, fontWeight: 700, color: "text.secondary", letterSpacing: 0.4, mb: 0.25 }}>
      {text}
    </Typography>
  );
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: ROW_COLUMNS,
        columnGap: 1.5, rowGap: 0.5,
        alignItems: "start",
        px: 1.5, py: 1,
        borderTop: (t) => `1px solid ${t.palette.divider}`,
        boxShadow: same ? "none" : `inset 3px 0 0 ${accent}`,
        "&:hover": { bgcolor: "action.hover" },
      }}
    >
      <Stack direction="row" spacing={0.75} alignItems="center" useFlexGap flexWrap="wrap" sx={{ minWidth: 0, py: 0.75 }}>
        <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: same ? "text.secondary" : "text.primary" }}>{label}</Typography>
        {!same && <ToneChip tone={KIND[change.kind].tone} label={KIND[change.kind].label} dense />}
      </Stack>
      <Box sx={cell(same || change.kind === "added" ? null : red)}>
        {mobileTag(beforeLabel)}
        <Value value={change.before} muted={same} struck={change.kind === "removed" || change.kind === "changed"} />
      </Box>
      <Box sx={cell(same || change.kind === "removed" ? null : green)}>
        {mobileTag(afterLabel)}
        <Value value={change.after} muted={same} strong={!same} />
      </Box>
    </Box>
  );
};

/** A section card: header with its count, collapsible, rows underneath. */
const GroupCard: React.FC<{
  group: Group; showUnchanged: boolean; beforeLabel: string; afterLabel: string; readOnly?: boolean;
}> = ({ group, showUnchanged, beforeLabel, afterLabel, readOnly }) => {
  const counts = countKinds(group.rows.map((r) => r.change));
  const changed = group.rows.length - counts.unchanged;
  const [open, setOpen] = useState(true);
  const rows = showUnchanged ? group.rows : group.rows.filter((r) => r.change.kind !== "unchanged");
  if (!rows.length) return null;
  const trio: Trio = changed ? TRIO.amber : TRIO.slate;
  return (
    <Box sx={{ border: (t) => `1px solid ${t.palette.divider}`, borderRadius: "12px", overflow: "hidden", bgcolor: "background.paper" }}>
      <Box
        component="button"
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        sx={{
          all: "unset", boxSizing: "border-box", cursor: "pointer", width: "100%",
          display: "flex", alignItems: "center", gap: 1.25, px: 1.5, py: 1.1,
          "&:hover": { bgcolor: "action.hover" },
          "&:focus-visible": { outline: (t) => `2px solid ${t.palette.primary.main}`, outlineOffset: -2 },
        }}
      >
        <IconBox icon={<KTIcon iconName={group.icon} className="fs-4" />} trio={trio} size={30} />
        <Typography sx={{ fontSize: 13.5, fontWeight: 700, flex: 1, minWidth: 0 }}>{group.name}</Typography>
        {readOnly && <ToneChip tone="neutral" label="Read-only" dense />}
        {changed > 0
          ? <ToneChip tone="warning" label={`${changed} change${changed === 1 ? "" : "s"}`} dense />
          : <Typography sx={{ fontSize: 11.5, color: "text.secondary" }}>No changes · {group.rows.length} field{group.rows.length === 1 ? "" : "s"}</Typography>}
        <Box sx={{ display: "grid", color: "text.secondary", transition: "transform .2s", transform: open ? "rotate(180deg)" : "none" }}>
          <KTIcon iconName="down" className="fs-5" />
        </Box>
      </Box>
      <Collapse in={open} unmountOnExit>
        {/* Column captions, once per card, on wide screens only (stacked rows tag each value instead). */}
        <Box
          sx={{
            display: { xs: "none", md: "grid" }, gridTemplateColumns: ROW_COLUMNS, columnGap: 1.5,
            px: 1.5, py: 0.6, bgcolor: "action.hover",
            borderTop: (t) => `1px solid ${t.palette.divider}`,
            "& > *": { fontSize: 10.5, fontWeight: 700, letterSpacing: 0.5, color: "text.secondary", textTransform: "uppercase" },
          }}
        >
          <Typography>Field</Typography>
          <Typography sx={{ px: 1.25 }}>{beforeLabel}</Typography>
          <Typography sx={{ px: 1.25 }}>{afterLabel}</Typography>
        </Box>
        {rows.map(({ change, label }) => (
          <ChangeRow key={change.field} change={change} label={label} beforeLabel={beforeLabel} afterLabel={afterLabel} />
        ))}
      </Collapse>
    </Box>
  );
};

/** A part of the diff (Edited content / Financial): a heading, then one card per section. */
const Part: React.FC<{
  title: string; hint: string; icon: string; trio: Trio; groups: Group[]; showUnchanged: boolean;
  beforeLabel: string; afterLabel: string; readOnly?: boolean;
}> = ({ title, hint, icon, trio, groups, showUnchanged, beforeLabel, afterLabel, readOnly }) => {
  const all = groups.flatMap((g) => g.rows.map((r) => r.change));
  if (!all.length) return null;
  const changed = all.filter((c) => c.kind !== "unchanged").length;
  const quiet = groups.filter((g) => g.rows.every((r) => r.change.kind === "unchanged"));
  return (
    <Stack spacing={1.25}>
      <Stack direction="row" spacing={1.25} alignItems="center">
        <IconBox icon={<KTIcon iconName={icon} className="fs-3" />} trio={trio} size={36} />
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography sx={{ fontSize: 14.5, fontWeight: 700 }}>{title}</Typography>
          <Typography sx={{ fontSize: 12, color: "text.secondary" }}>{hint}</Typography>
        </Box>
        <Typography sx={{ fontSize: 12, color: "text.secondary", whiteSpace: "nowrap" }}>
          {changed ? `${changed} of ${all.length} changed` : `${all.length} fields · no changes`}
        </Typography>
      </Stack>
      {groups.map((group) => (
        <GroupCard
          key={group.name} group={group} showUnchanged={showUnchanged}
          beforeLabel={beforeLabel} afterLabel={afterLabel} readOnly={readOnly}
        />
      ))}
      {/* With unchanged rows hidden, say which sections were checked and found identical rather than dropping them silently. */}
      {!showUnchanged && quiet.length > 0 && (
        <Stack direction="row" spacing={0.75} alignItems="center" useFlexGap flexWrap="wrap" sx={{ px: 0.5 }}>
          <Box sx={{ display: "grid", color: TRIO.green.c }}><KTIcon iconName="check-circle" className="fs-5" /></Box>
          <Typography sx={{ fontSize: 12, color: "text.secondary" }}>No changes in</Typography>
          {quiet.map((g) => <ToneChip key={g.name} tone="neutral" label={g.name} dense />)}
        </Stack>
      )}
    </Stack>
  );
};

/** One version's badge in the summary banner. */
const VersionTag: React.FC<{ side: VersionComparison["before"] }> = ({ side }) => (
  <Stack spacing={0.25} sx={{ minWidth: 0 }}>
    <Stack direction="row" spacing={0.75} alignItems="center">
      <Typography sx={{ fontSize: 14, fontWeight: 700 }}>Version {side.versionNumber}</Typography>
      <BillingStatusBadge status={side.status} />
    </Stack>
    <Typography sx={{ fontSize: 11.5, color: "text.secondary" }}>{formatDate(side.createdAt)}</Typography>
  </Stack>
);

export interface VersionCompareProps {
  comparison: VersionComparison;
  showUnchanged: boolean;
  /** Offered from the "identical" state, so the reader can still see what was compared. */
  onShowUnchanged?: (next: boolean) => void;
  /** The editor's profile: its groups, labels and order lay the diff out. Without it, everything is one section. */
  profile?: DocumentProfile;
}

const VersionCompare: React.FC<VersionCompareProps> = ({ comparison, showUnchanged, onShowUnchanged, profile }) => {
  const theme = useTheme();
  const editable = useMemo(() => groupChanges(comparison.editable, profile), [comparison.editable, profile]);
  const financial = useMemo(
    () => (comparison.financial.length ? [{ name: "Amounts & ERP fields", icon: "chart-simple", rows: comparison.financial.map((change) => ({ change, label: change.label })) }] : []),
    [comparison.financial],
  );
  const counts = countKinds([...comparison.editable, ...comparison.financial]);
  const total = comparison.editable.length + comparison.financial.length;
  const identical = counts.changed + counts.added + counts.removed === 0;
  const beforeLabel = `Version ${comparison.before.versionNumber}`;
  const afterLabel = `Version ${comparison.after.versionNumber}`;
  const bannerTone = identical ? TRIO.green : TRIO.amber;

  return (
    <Stack spacing={2.5}>
      {/* Summary: what is compared with what, and how much moved. */}
      <Box
        sx={{
          display: "flex", flexWrap: "wrap", alignItems: "center", gap: 2,
          p: 1.75, borderRadius: "12px",
          border: `1px solid ${toneAlpha(bannerTone.c, 0.35)}`,
          bgcolor: toneAlpha(bannerTone.c, theme.palette.mode === "dark" ? 0.12 : 0.06),
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
          <VersionTag side={comparison.before} />
          <Box sx={{ color: "text.secondary", display: "grid" }}><KTIcon iconName="arrow-right" className="fs-2" /></Box>
          <VersionTag side={comparison.after} />
        </Stack>
        <Box sx={{ flex: 1 }} />
        {identical ? (
          <Stack direction="row" spacing={1.25} alignItems="center" useFlexGap flexWrap="wrap">
            <IconBox icon={<KTIcon iconName="check" className="fs-3" />} trio={TRIO.green} size={32} />
            <Box>
              <Typography sx={{ fontSize: 13.5, fontWeight: 700 }}>Identical</Typography>
              <Typography sx={{ fontSize: 12, color: "text.secondary" }}>All {total} fields are the same in both versions.</Typography>
            </Box>
            {!showUnchanged && onShowUnchanged && (
              <WtButton ghost size="small" onClick={() => onShowUnchanged(true)} sx={{ minHeight: 30, fontSize: 12 }}>
                Show all fields
              </WtButton>
            )}
          </Stack>
        ) : (
          <Stack direction="row" spacing={0.75} alignItems="center" useFlexGap flexWrap="wrap">
            {counts.changed > 0 && <ToneChip tone="warning" label={`${counts.changed} changed`} />}
            {counts.added > 0 && <ToneChip tone="success" label={`${counts.added} added`} />}
            {counts.removed > 0 && <ToneChip tone="danger" label={`${counts.removed} removed`} />}
            <ToneChip tone="neutral" label={`${counts.unchanged} unchanged`} />
          </Stack>
        )}
      </Box>

      {/* Nothing moved and unchanged rows are hidden: the banner already said so; the sections would be empty. */}
      {(!identical || showUnchanged) && (
        <>
          <Part
            title="Edited content" icon="pencil" trio={TRIO.blue}
            hint="What someone typed or switched in the editor."
            groups={editable} showUnchanged={showUnchanged} beforeLabel={beforeLabel} afterLabel={afterLabel}
          />
          <Part
            title="Financial & ERP data" icon="lock-2" trio={TRIO.slate}
            hint="Read-only here — these change only by regenerating from Billing."
            groups={financial} showUnchanged={showUnchanged} beforeLabel={beforeLabel} afterLabel={afterLabel} readOnly
          />
        </>
      )}
    </Stack>
  );
};

export default VersionCompare;
