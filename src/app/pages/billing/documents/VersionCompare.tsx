import React, { useMemo, useState } from "react";
import { ArrowRight, Check, ChevronDown, CircleCheck, Lock, Pencil } from "lucide-react";
import { cn } from "@/ds/lib/utils";
import { Badge } from "@/ds/ui/badge";
import { Button } from "@/ds/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/ds/ui/collapsible";
import { DynamicIcon } from "@/ds/ui/dynamic-icon";
import { IconBox } from "@/ds/patterns/icon-box";
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

/**
 * Each kind's Badge variant, its label, and the token its keyline is drawn from. The keyline rides a CSS
 * variable so one `shadow-[inset…]` class serves every kind.
 */
const KIND: Record<Kind, { variant: "success" | "danger" | "warning" | "neutral"; label: string; line: string }> = {
  changed: { variant: "warning", label: "Changed", line: "[--kind-line:var(--warning)]" },
  added: { variant: "success", label: "Added", line: "[--kind-line:var(--success)]" },
  removed: { variant: "danger", label: "Removed", line: "[--kind-line:var(--destructive)]" },
  unchanged: { variant: "neutral", label: "Same", line: "" },
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

/** Yes/No switches read as a badge; everything else as text. */
const Value: React.FC<{ value: string | null; muted?: boolean; struck?: boolean; strong?: boolean }> = ({
  value, muted, struck, strong,
}) => {
  if (value === "Yes" || value === "No") {
    return <Badge variant={value === "Yes" ? "success" : "neutral"}>{value === "Yes" ? "Shown" : "Hidden"}</Badge>;
  }
  return (
    <p
      className={cn(
        "min-w-0 text-[12.5px] leading-normal break-words whitespace-pre-line",
        value == null || muted ? "text-muted-foreground" : "text-foreground",
        strong ? "font-semibold" : "font-normal",
        struck && "line-through",
      )}
    >
      {value ?? "—"}
    </p>
  );
};

/** Field / before / after. One definition, so the captions and every row line up. */
const ROW_GRID = "grid-cols-1 md:grid-cols-[200px_minmax(0,1fr)_minmax(0,1fr)]";

/** One field. A changed field tints its old value red and its new value green, with a keyline in the change's tone. */
const ChangeRow: React.FC<{ change: FieldChange; label: string; beforeLabel: string; afterLabel: string }> = ({
  change, label, beforeLabel, afterLabel,
}) => {
  const same = change.kind === "unchanged";
  const kind = KIND[change.kind];
  // On a phone the columns stack, so each value says which version it is.
  const mobileTag = (text: string) => (
    <p className="mb-0.5 block text-[10px] font-bold tracking-[0.4px] text-muted-foreground md:hidden">{text}</p>
  );
  return (
    <div
      className={cn(
        "grid items-start gap-x-3 gap-y-1 border-t border-border px-3 py-2 hover:bg-accent",
        ROW_GRID,
        !same && cn(kind.line, "shadow-[inset_3px_0_0_var(--kind-line)]"),
      )}
    >
      <div className="flex min-w-0 flex-row flex-wrap items-center gap-1.5 py-1.5">
        <p className={cn("text-[12.5px] font-semibold", same ? "text-muted-foreground" : "text-foreground")}>{label}</p>
        {!same && <Badge variant={kind.variant}>{kind.label}</Badge>}
      </div>
      {/* The /10 tints are token-based, so they follow light and dark; the destructive token documents
          that level as the one its own text stays readable on. */}
      <div className={cn("min-w-0 rounded-lg px-2.5 py-1.5", !same && change.kind !== "added" && "bg-destructive/10")}>
        {mobileTag(beforeLabel)}
        <Value value={change.before} muted={same} struck={change.kind === "removed" || change.kind === "changed"} />
      </div>
      <div className={cn("min-w-0 rounded-lg px-2.5 py-1.5", !same && change.kind !== "removed" && "bg-success/10")}>
        {mobileTag(afterLabel)}
        <Value value={change.after} muted={same} strong={!same} />
      </div>
    </div>
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
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <Collapsible open={open} onOpenChange={setOpen}>
        {/* The whole header is the trigger, so the hit area is the row rather than the chevron (Fitts). */}
        <CollapsibleTrigger
          render={
            <button
              type="button"
              className="flex w-full cursor-pointer items-center gap-2.5 px-3 py-[9px] text-left hover:bg-accent focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring"
            />
          }
        >
          {/* The group's icon is DATA (the profile's configured name), so it resolves through DynamicIcon. */}
          <IconBox icon={<DynamicIcon name={group.icon} />} tone={changed ? "amber" : "slate"} size="sm" />
          <p className="min-w-0 flex-1 text-[13.5px] font-bold">{group.name}</p>
          {readOnly && <Badge variant="neutral">Read-only</Badge>}
          {changed > 0
            ? <Badge variant="warning">{changed} change{changed === 1 ? "" : "s"}</Badge>
            : <p className="text-[11.5px] text-muted-foreground">No changes · {group.rows.length} field{group.rows.length === 1 ? "" : "s"}</p>}
          <ChevronDown
            aria-hidden
            className={cn("text-muted-foreground transition-transform duration-200", open && "rotate-180")}
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          {/* Column captions, once per card, on wide screens only (stacked rows tag each value instead). */}
          <div
            className={cn(
              "hidden gap-x-3 border-t border-border bg-accent px-3 py-1.5 md:grid",
              ROW_GRID,
              "[&>*]:heading-case [&>*]:text-[10.5px] [&>*]:font-bold [&>*]:tracking-[0.5px] [&>*]:text-muted-foreground",
            )}
          >
            <p>Field</p>
            <p className="px-2.5">{beforeLabel}</p>
            <p className="px-2.5">{afterLabel}</p>
          </div>
          {rows.map(({ change, label }) => (
            <ChangeRow key={change.field} change={change} label={label} beforeLabel={beforeLabel} afterLabel={afterLabel} />
          ))}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

/** A part of the diff (Edited content / Financial): a heading, then one card per section. */
const Part: React.FC<{
  title: string; hint: string; icon: React.ReactNode; tone: string; groups: Group[]; showUnchanged: boolean;
  beforeLabel: string; afterLabel: string; readOnly?: boolean;
}> = ({ title, hint, icon, tone, groups, showUnchanged, beforeLabel, afterLabel, readOnly }) => {
  const all = groups.flatMap((g) => g.rows.map((r) => r.change));
  if (!all.length) return null;
  const changed = all.filter((c) => c.kind !== "unchanged").length;
  const quiet = groups.filter((g) => g.rows.every((r) => r.change.kind === "unchanged"));
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-row items-center gap-2.5">
        <IconBox icon={icon} tone={tone} size="default" />
        <div className="min-w-0 flex-1">
          <p className="text-[14.5px] font-bold">{title}</p>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
        <p className="text-xs whitespace-nowrap text-muted-foreground">
          {changed ? `${changed} of ${all.length} changed` : `${all.length} fields · no changes`}
        </p>
      </div>
      {groups.map((group) => (
        <GroupCard
          key={group.name} group={group} showUnchanged={showUnchanged}
          beforeLabel={beforeLabel} afterLabel={afterLabel} readOnly={readOnly}
        />
      ))}
      {/* With unchanged rows hidden, say which sections were checked and found identical rather than dropping them silently. */}
      {!showUnchanged && quiet.length > 0 && (
        <div className="flex flex-row flex-wrap items-center gap-1.5 px-1">
          <CircleCheck aria-hidden className="text-success" />
          <p className="text-xs text-muted-foreground">No changes in</p>
          {quiet.map((g) => <Badge key={g.name} variant="neutral">{g.name}</Badge>)}
        </div>
      )}
    </div>
  );
};

/** One version's badge in the summary banner. */
const VersionTag: React.FC<{ side: VersionComparison["before"] }> = ({ side }) => (
  <div className="flex min-w-0 flex-col gap-0.5">
    <div className="flex flex-row items-center gap-1.5">
      <p className="text-sm font-bold">Version {side.versionNumber}</p>
      <BillingStatusBadge status={side.status} />
    </div>
    <p className="text-[11.5px] text-muted-foreground">{formatDate(side.createdAt)}</p>
  </div>
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

  return (
    <div className="flex flex-col gap-5">
      {/* Summary: what is compared with what, and how much moved. The banner's tint comes from a status
          token, so it deepens in dark mode on its own — no theme lookup. */}
      <div
        className={cn(
          "flex flex-wrap items-center gap-4 rounded-xl border p-3.5",
          identical
            ? "border-success/35 bg-success/6 dark:bg-success/12"
            : "border-warning/35 bg-warning/6 dark:bg-warning/12",
        )}
      >
        <div className="flex min-w-0 flex-row items-center gap-3">
          <VersionTag side={comparison.before} />
          <ArrowRight aria-hidden className="text-muted-foreground" />
          <VersionTag side={comparison.after} />
        </div>
        <div className="flex-1" />
        {identical ? (
          <div className="flex flex-row flex-wrap items-center gap-2.5">
            <IconBox icon={<Check aria-hidden />} tone="green" size="sm" />
            <div>
              <p className="text-[13.5px] font-bold">Identical</p>
              <p className="text-xs text-muted-foreground">All {total} fields are the same in both versions.</p>
            </div>
            {!showUnchanged && onShowUnchanged && (
              <Button variant="ghost" size="sm" onClick={() => onShowUnchanged(true)}>
                Show all fields
              </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-row flex-wrap items-center gap-1.5">
            {counts.changed > 0 && <Badge variant="warning">{counts.changed} changed</Badge>}
            {counts.added > 0 && <Badge variant="success">{counts.added} added</Badge>}
            {counts.removed > 0 && <Badge variant="danger">{counts.removed} removed</Badge>}
            <Badge variant="neutral">{counts.unchanged} unchanged</Badge>
          </div>
        )}
      </div>

      {/* Nothing moved and unchanged rows are hidden: the banner already said so; the sections would be empty. */}
      {(!identical || showUnchanged) && (
        <>
          <Part
            title="Edited content" icon={<Pencil aria-hidden />} tone="blue"
            hint="What someone typed or switched in the editor."
            groups={editable} showUnchanged={showUnchanged} beforeLabel={beforeLabel} afterLabel={afterLabel}
          />
          <Part
            title="Financial & ERP data" icon={<Lock aria-hidden />} tone="slate"
            hint="Read-only here — these change only by regenerating from Billing."
            groups={financial} showUnchanged={showUnchanged} beforeLabel={beforeLabel} afterLabel={afterLabel} readOnly
          />
        </>
      )}
    </div>
  );
};

export default VersionCompare;
