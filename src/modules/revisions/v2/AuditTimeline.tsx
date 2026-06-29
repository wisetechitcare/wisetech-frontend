import React, { useEffect, useMemo, useRef, useState } from 'react';
import { C, FONT, RADIUS, BTN, ICON_COLORS } from '@/app/modules/configuration/ConfigDesignSystem';
import { AuditEntityType, V2ChangeSet } from './auditV2.service';
import { useAuditTimeline } from './hooks';
import { ChangeSetCard } from './ChangeSetCard';
import { categoryMeta, isBaselineEntry } from './tokens';

interface Props {
  type: AuditEntityType;
  id: string;
  onCompare: (revisionNumber: number) => void;
  /** Admin-only: reset the record to a version. Omitted → no reset action shown. */
  onReset?: (revisionNumber: number) => void;
}

const RAIL_W = 30;

const Skeleton: React.FC = () => (
  <>
    {[0, 1, 2].map((i) => (
      <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
        <div className="ci-pulse" style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: C.border, marginTop: 16, marginLeft: 9 }} />
        <div
          className="ci-pulse"
          style={{ flex: 1, height: 82, borderRadius: RADIUS.lg, border: `1px solid ${C.border}`, backgroundColor: C.bgSection }}
        />
      </div>
    ))}
  </>
);

const Centered: React.FC<{ icon: string; title: string; subtitle?: string; children?: React.ReactNode }> = ({
  icon,
  title,
  subtitle,
  children,
}) => (
  <div style={{ textAlign: 'center', padding: '48px 16px', color: C.textMuted }}>
    <div
      style={{
        width: 56,
        height: 56,
        borderRadius: '50%',
        backgroundColor: C.bgSection,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
      }}
    >
      <i className={icon} style={{ fontSize: 24, color: C.textMuted }} aria-hidden />
    </div>
    <div style={{ fontFamily: FONT.heading, fontSize: 15, fontWeight: 700, color: C.textSecondary }}>{title}</div>
    {subtitle && (
      <div style={{ fontFamily: FONT.body, fontSize: 13, color: C.textMuted, marginTop: 4 }}>{subtitle}</div>
    )}
    {children}
  </div>
);

/** Left-rail node + connecting line wrapper for one timeline entry. */
const RailRow: React.FC<{
  color: string;
  bg: string;
  icon: string;
  isLast: boolean;
  children: React.ReactNode;
}> = ({ color, bg, icon, isLast, children }) => (
  <div style={{ display: 'flex', gap: 12, position: 'relative' }}>
    <div style={{ position: 'relative', width: RAIL_W, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
      {!isLast && (
        <div
          style={{
            position: 'absolute',
            top: 26,
            bottom: -14,
            width: 2,
            backgroundColor: C.border,
          }}
          aria-hidden
        />
      )}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          marginTop: 13,
          width: 26,
          height: 26,
          borderRadius: '50%',
          backgroundColor: bg,
          border: `2px solid ${C.bgCard}`,
          boxShadow: `0 0 0 1.5px ${color}55`,
          color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
        aria-hidden
      >
        <i className={icon} style={{ fontSize: 11 }} />
      </div>
    </div>
    <div style={{ flex: 1, minWidth: 0, paddingBottom: 14 }}>{children}</div>
  </div>
);

/** Collapsed group of consecutive automated baseline/backfill entries. */
const BaselineGroup: React.FC<{
  entries: V2ChangeSet[];
  isLast: boolean;
  onCompare: (rev: number) => void;
  onReset?: (rev: number) => void;
  resettableRev: (rev: number) => boolean;
}> = ({ entries, isLast, onCompare, onReset, resettableRev }) => {
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const revs = entries.map((e) => e.revisionNumber).sort((a, b) => a - b);
  const rangeLabel =
    revs.length > 1 ? `R${revs[0]}–R${revs[revs.length - 1]}` : `R${revs[0]}`;

  return (
    <RailRow color={C.textMuted} bg={C.bgSection} icon="bi bi-stack" isLast={isLast}>
      <div
        style={{
          border: `1px dashed ${C.borderDark}`,
          borderRadius: RADIUS.lg,
          backgroundColor: C.bgSection,
          overflow: 'hidden',
        }}
      >
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          style={{
            width: '100%',
            textAlign: 'left',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            padding: '12px 15px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: FONT.body, fontSize: 13, fontWeight: 700, color: C.textSecondary }}>
                System baseline
              </span>
              <span
                style={{
                  fontFamily: FONT.body,
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: C.textMuted,
                  backgroundColor: C.bgCard,
                  border: `1px solid ${C.border}`,
                  borderRadius: RADIUS.full,
                  padding: '1px 8px',
                }}
              >
                {rangeLabel}
              </span>
            </div>
            <div style={{ fontFamily: FONT.body, fontSize: 12, color: C.textMuted, marginTop: 3 }}>
              {entries.length} automated pre-audit {entries.length === 1 ? 'entry' : 'entries'} · {open ? 'hide' : 'show'} detail
            </div>
          </div>
          <i
            className="bi bi-chevron-down"
            style={{
              color: C.textMuted,
              fontSize: 13,
              flexShrink: 0,
              transition: 'transform .28s cubic-bezier(.4,0,.2,1)',
              transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
            aria-hidden
          />
        </button>

        <div
          style={{
            display: 'grid',
            gridTemplateRows: open ? '1fr' : '0fr',
            transition: 'grid-template-rows .28s cubic-bezier(.4,0,.2,1)',
          }}
        >
          <div style={{ overflow: 'hidden', minHeight: 0 }}>
            <div
              style={{
                padding: '0 12px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                opacity: open ? 1 : 0,
                transition: 'opacity .22s ease .04s',
              }}
            >
              {entries.map((cs) => (
                <ChangeSetCard
                  key={cs.id}
                  cs={cs}
                  expanded={expandedId === cs.id}
                  onToggle={() => setExpandedId((prev) => (prev === cs.id ? null : cs.id))}
                  onCompare={onCompare}
                  onReset={onReset && resettableRev(cs.revisionNumber) ? onReset : undefined}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </RailRow>
  );
};

type Row =
  | { kind: 'single'; cs: V2ChangeSet }
  | { kind: 'baseline'; entries: V2ChangeSet[]; key: string };

export const AuditTimeline: React.FC<Props> = ({ type, id, onCompare, onReset }) => {
  // freshRef makes an explicit Refresh click bypass the server's cached page.
  const freshRef = useRef(false);
  const query = useAuditTimeline(type, id, 15, freshRef);
  const { refetch } = query;
  const handleRefresh = () => {
    freshRef.current = true;
    void Promise.resolve(refetch()).finally(() => {
      freshRef.current = false;
    });
  };
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (csId: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(csId)) next.delete(csId);
      else next.add(csId);
      return next;
    });

  // Capture is asynchronous (~1–2s after a save). Do one delayed catch-up refetch
  // when the tab opens so a just-saved edit appears without a manual refresh.
  useEffect(() => {
    const t = setTimeout(() => refetch(), 2500);
    return () => clearTimeout(t);
  }, [id, refetch]);

  const changeSets = useMemo(
    () => query.data?.pages.flatMap((p) => p.changeSets) ?? [],
    [query.data],
  );

  // Latest revision is "current" — resetting to it is a no-op, so never offered.
  const maxRev = useMemo(
    () => changeSets.reduce((m, cs) => Math.max(m, cs.revisionNumber), 0),
    [changeSets],
  );
  const resettableRev = (rev: number) => rev !== maxRev;

  // Collapse runs of consecutive automated baseline/backfill entries into one group.
  const rows: Row[] = useMemo(() => {
    const out: Row[] = [];
    let bucket: V2ChangeSet[] = [];
    const flush = () => {
      if (bucket.length === 0) return;
      if (bucket.length === 1) out.push({ kind: 'single', cs: bucket[0] });
      else out.push({ kind: 'baseline', entries: bucket, key: `bl-${bucket[0].id}` });
      bucket = [];
    };
    for (const cs of changeSets) {
      if (isBaselineEntry(cs)) bucket.push(cs);
      else {
        flush();
        out.push({ kind: 'single', cs });
      }
    }
    flush();
    return out;
  }, [changeSets]);

  if (query.isLoading) return <Skeleton />;

  if (query.isError) {
    return (
      <Centered icon="bi bi-exclamation-triangle" title="Couldn't load the audit trail" subtitle="The server returned an error.">
        <button type="button" style={{ ...BTN.outline, marginTop: 14 }} onClick={() => refetch()}>
          <i className="bi bi-arrow-clockwise" aria-hidden /> Retry
        </button>
      </Centered>
    );
  }

  const toolbar = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
      <span style={{ fontFamily: FONT.body, fontSize: 12, color: C.textMuted, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        {query.isFetching ? (
          <>
            <i className="bi bi-arrow-repeat ci-spin" aria-hidden /> Syncing…
          </>
        ) : (
          <>
            <i className="bi bi-clock-history" aria-hidden />
            {changeSets.length} change{changeSets.length === 1 ? '' : 's'} on record
          </>
        )}
      </span>
      <button
        type="button"
        onClick={handleRefresh}
        disabled={query.isFetching}
        style={{ ...BTN.ghost, padding: '5px 10px', fontSize: 12 }}
        title="Refresh"
      >
        <i className={`bi bi-arrow-clockwise ${query.isFetching ? 'ci-spin' : ''}`} aria-hidden /> Refresh
      </button>
    </div>
  );

  if (changeSets.length === 0) {
    return (
      <div>
        {toolbar}
        <Centered
          icon="bi bi-clock-history"
          title="No changes captured yet"
          subtitle="History begins the next time this record is edited."
        />
      </div>
    );
  }

  return (
    <div>
      {toolbar}
      <div role="feed" aria-label="Change history">
        {rows.map((row, i) => {
          const isLast = i === rows.length - 1 && !query.hasNextPage;
          if (row.kind === 'baseline') {
            return (
              <BaselineGroup
                key={row.key}
                entries={row.entries}
                isLast={isLast}
                onCompare={onCompare}
                onReset={onReset}
                resettableRev={resettableRev}
              />
            );
          }
          const meta = categoryMeta(row.cs.category);
          const { bg, color } = ICON_COLORS[meta.accent] ?? ICON_COLORS.primary;
          return (
            <RailRow key={row.cs.id} color={color} bg={bg} icon={meta.icon} isLast={isLast}>
              <ChangeSetCard
                cs={row.cs}
                expanded={expanded.has(row.cs.id)}
                onToggle={() => toggle(row.cs.id)}
                onCompare={onCompare}
                onReset={onReset && resettableRev(row.cs.revisionNumber) ? onReset : undefined}
              />
            </RailRow>
          );
        })}
      </div>

      {query.hasNextPage && (
        <div style={{ textAlign: 'center', paddingTop: 6 }}>
          <button
            type="button"
            style={{ ...BTN.secondary }}
            disabled={query.isFetchingNextPage}
            onClick={() => query.fetchNextPage()}
          >
            {query.isFetchingNextPage ? (
              <>
                <i className="bi bi-arrow-repeat ci-spin" aria-hidden /> Loading…
              </>
            ) : (
              <>
                <i className="bi bi-arrow-down-circle" aria-hidden /> Load more
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default AuditTimeline;
