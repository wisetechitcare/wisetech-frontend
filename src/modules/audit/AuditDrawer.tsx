import React, { useEffect, useRef, useState } from "react";
import dayjs from "dayjs";
import { useSelector } from "react-redux";
import { Box, Typography } from "@mui/material";
import type { RootState } from "@redux/store";
import { ShadcnDrawer, ShadcnDrawerButton, ShadcnDrawerCard, ToneChip } from "@app/modules/common/components/ui";
import { fetchConfiguration } from "@services/company";
import { getTimeTokens } from "@utils/timeFormat";
import type { AuditChangeSet, AuditEntityType } from "./audit.service";
import { useAuditTimeline } from "./hooks";
import { displayActor } from "./tokens";

/** Where each section keeps its audit window (Configure → Audit). Mirrors the backend's CRM_AUDIT. */
export const AUDIT_WINDOW_MODULE: Partial<Record<AuditEntityType, string>> = {
  CONTACT: "crm.contacts.audit",
  COMPANY: "crm.companies.audit",
};
export const DEFAULT_AUDIT_DAYS = 30;

/** The configured window in days (0 = all history), read the same way the server applies it. */
export const useAuditWindowDays = (module: string | undefined, enabled = true) => {
  const companyId = useSelector((s: RootState) => s.employee?.currentEmployee?.companyId as string | undefined);
  const [days, setDays] = useState<number | null>(null);
  useEffect(() => {
    if (!module || !enabled) return;
    let cancelled = false;
    fetchConfiguration(module, undefined, undefined, companyId ? { companyId } : undefined)
      .then(({ data }: any) => {
        const raw = data?.configuration?.configuration;
        const cfg = typeof raw === "string" ? JSON.parse(raw) : raw;
        const n = Number(cfg?.auditDays);
        if (!cancelled) setDays(Number.isFinite(n) && n >= 0 ? Math.floor(n) : DEFAULT_AUDIT_DAYS);
      })
      .catch(() => !cancelled && setDays(DEFAULT_AUDIT_DAYS));
    return () => { cancelled = true; };
  }, [module, enabled, companyId]);
  return days;
};

const stamp = (v?: string | null) => (v ? dayjs(v).format(`DD MMM YYYY, ${getTimeTokens().TIME}`) : "—");

/** createdBy / updatedBy as the record API returns them ({ users: { firstName, lastName } }). */
const personName = (rel: any): string =>
  [rel?.users?.firstName, rel?.users?.lastName].filter(Boolean).join(" ").trim() || "—";

/** Who created / last edited the record — read off the record itself, so no window hides it. */
export interface AuditRecordStamps {
  createdBy?: unknown;
  createdAt?: string | null;
  updatedBy?: unknown;
  updatedAt?: string | null;
}

const StampRow: React.FC<{ label: string; who: string; when: string }> = ({ label, who, when }) => (
  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 2, flexWrap: "wrap" }}>
    <Typography sx={{ fontSize: 13, color: "text.secondary" }}>{label}</Typography>
    <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: "text.primary", textAlign: "right" }}>
      {who === "—" ? null : who}
      <Box component="span" sx={{ fontWeight: 400, color: "text.secondary", ml: 1, fontVariantNumeric: "tabular-nums" }}>{when}</Box>
    </Typography>
  </Box>
);

/**
 * Internal columns the server no longer records (layout blob, a mirrored FK). Revisions saved
 * before that still carry them, so they are dropped here too; a save left with nothing to show
 * is not shown at all.
 */
const HIDDEN_FIELDS = new Set(["customSections", "sectionConfig", "companyTypeId", "phoneIdentity"]);
const visibleChangeSets = (sets: AuditChangeSet[]) =>
  sets
    .map((cs) => ({ ...cs, changes: cs.changes.filter((c) => !HIDDEN_FIELDS.has(c.fieldName)) }))
    .filter((cs) => cs.changes.length > 0);

/**
 * The revision that created the record: saved within a minute of the record's createdAt.
 * Not "revision 1 with only additions" — a record created before audit existed gets its first
 * revision from a later edit (adding a note is an addition too), and that is an edit.
 */
export const isCreate = (cs: AuditChangeSet, createdAt?: string | null) =>
  !!createdAt && Math.abs(dayjs(cs.changedAt).diff(dayjs(createdAt), "second")) <= 60;

const ChangeCard: React.FC<{ cs: AuditChangeSet; createdAt?: string | null }> = ({ cs, createdAt }) => {
  const created = isCreate(cs, createdAt);
  return (
    <ShadcnDrawerCard>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
        <Typography sx={{ fontSize: 14.5, fontWeight: 700, color: "text.primary" }}>
          {displayActor(cs.changedByFirstName, cs.changedByLastName)}
        </Typography>
        <ToneChip dense tone={created ? "success" : "neutral"} label={created ? "Created" : `${cs.changes.length} change${cs.changes.length === 1 ? "" : "s"}`} />
      </Box>
      <Typography sx={{ fontSize: 12.5, color: "text.secondary", mt: 0.25, fontVariantNumeric: "tabular-nums" }}>
        {stamp(cs.changedAt)}
      </Typography>
      {!created && cs.changes.length > 0 && (
        <Box component="ul" sx={{ listStyle: "none", m: 0, mt: 1.25, p: 0, display: "flex", flexDirection: "column", gap: 0.75 }}>
          {cs.changes.map((c, i) => (
            <Box component="li" key={c.id ?? `${c.fieldName}-${i}`} sx={{ fontSize: 13, lineHeight: 1.5, overflowWrap: "anywhere" }}>
              {/* "Note added: Hello" / "Note removed: Hello" / "Name: A → B" */}
              <Box component="span" sx={{ fontWeight: 600, color: "text.primary" }}>
                {c.fieldLabel}
                {c.changeType === "ADDED" ? " added" : c.changeType === "REMOVED" ? " removed" : ""}:{" "}
              </Box>
              {c.changeType !== "ADDED" && c.oldValueFormatted && (
                <Box component="span" sx={{ color: "text.secondary", textDecoration: "line-through" }}>{c.oldValueFormatted}</Box>
              )}
              {c.changeType === "MODIFIED" && c.oldValueFormatted && c.newValueFormatted && (
                <Box component="span" sx={{ color: "text.disabled", mx: 0.5 }}>→</Box>
              )}
              {c.changeType !== "REMOVED" && (
                <Box component="span" sx={{ color: "text.primary" }}>{c.newValueFormatted}</Box>
              )}
            </Box>
          ))}
        </Box>
      )}
    </ShadcnDrawerCard>
  );
};

interface Props {
  open: boolean;
  onClose: () => void;
  type: AuditEntityType;
  id: string;
  /** The record's name, shown under the title ("3 Codz"). */
  recordName?: string;
  /** Created / last edited — always shown, whatever the audit window. */
  record?: AuditRecordStamps;
}

/** Edit history of one company / contact in the shadcn-layout drawer. */
export const AuditDrawer: React.FC<Props> = ({ open, onClose, type, id, recordName, record }) => {
  const days = useAuditWindowDays(AUDIT_WINDOW_MODULE[type], open);
  const fresh = useRef(false);
  const timeline = useAuditTimeline(type, open ? id : undefined, 15, fresh);
  const changeSets = visibleChangeSets((timeline.data?.pages ?? []).flatMap((p) => p.changeSets));
  const windowText = days === null ? "" : days === 0 ? "All changes" : `Changes in the last ${days} day${days === 1 ? "" : "s"}`;

  const refresh = () => {
    fresh.current = true;
    timeline.refetch().finally(() => { fresh.current = false; });
  };

  return (
    <ShadcnDrawer
      open={open}
      onClose={onClose}
      title="Audit history"
      description={[recordName, windowText].filter(Boolean).join(" — ")}
      width={460}
      footer={
        <>
          <ShadcnDrawerButton onClick={refresh} disabled={timeline.isFetching}>
            {timeline.isFetching ? "Refreshing…" : "Refresh"}
          </ShadcnDrawerButton>
          <ShadcnDrawerButton variant="outline" onClick={onClose}>Close</ShadcnDrawerButton>
        </>
      }
    >
      {record && (
        <ShadcnDrawerCard sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <StampRow label="Created" who={personName(record.createdBy)} when={stamp(record.createdAt)} />
          <StampRow label="Last edited" who={personName(record.updatedBy)} when={stamp(record.updatedAt)} />
        </ShadcnDrawerCard>
      )}

      {timeline.isLoading ? (
        [0, 1, 2].map((i) => <ShadcnDrawerCard key={i} sx={{ height: 84, opacity: 0.5 }}><span /></ShadcnDrawerCard>)
      ) : timeline.isError ? (
        <Typography sx={{ fontSize: 13.5, color: "error.main", textAlign: "center", py: 3 }}>
          Couldn't load the audit history. Try Refresh.
        </Typography>
      ) : changeSets.length === 0 ? (
        <Typography sx={{ fontSize: 13.5, color: "text.secondary", textAlign: "center", py: 3 }}>
          {days ? `No changes in the last ${days} day${days === 1 ? "" : "s"}.` : "No changes recorded yet."}
        </Typography>
      ) : (
        changeSets.map((cs) => <ChangeCard key={cs.id} cs={cs} createdAt={record?.createdAt} />)
      )}

      {timeline.hasNextPage && (
        <ShadcnDrawerButton variant="outline" onClick={() => timeline.fetchNextPage()} disabled={timeline.isFetchingNextPage}>
          {timeline.isFetchingNextPage ? "Loading…" : "Load older changes"}
        </ShadcnDrawerButton>
      )}
    </ShadcnDrawer>
  );
};

export default AuditDrawer;
