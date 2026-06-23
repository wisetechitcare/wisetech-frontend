import React, { useEffect, useState } from 'react';
import { C, FONT, RADIUS, BTN } from '@/app/modules/configuration/ConfigDesignSystem';
import { AuditEntityType } from './auditV2.service';
import { useAuditTimeline } from './hooks';
import { ChangeSetCard } from './ChangeSetCard';

interface Props {
  type: AuditEntityType;
  id: string;
  onCompare: (revisionNumber: number) => void;
  onRestore: (revisionNumber: number) => void;
}

const Skeleton: React.FC = () => (
  <>
    {[0, 1, 2].map((i) => (
      <div
        key={i}
        className="ci-pulse"
        style={{
          height: 78,
          borderRadius: RADIUS.lg,
          border: `1px solid ${C.border}`,
          backgroundColor: C.bgSection,
          marginBottom: 12,
        }}
      />
    ))}
  </>
);

const Centered: React.FC<{ icon: string; title: string; subtitle?: string; children?: React.ReactNode }> = ({
  icon,
  title,
  subtitle,
  children,
}) => (
  <div style={{ textAlign: 'center', padding: '40px 16px', color: C.textMuted }}>
    <i className={icon} style={{ fontSize: 30, display: 'block', marginBottom: 10, color: C.textMuted }} aria-hidden />
    <div style={{ fontFamily: FONT.heading, fontSize: 15, fontWeight: 700, color: C.textSecondary }}>{title}</div>
    {subtitle && (
      <div style={{ fontFamily: FONT.body, fontSize: 13, color: C.textMuted, marginTop: 4 }}>{subtitle}</div>
    )}
    {children}
  </div>
);

export const AuditTimeline: React.FC<Props> = ({ type, id, onCompare, onRestore }) => {
  const query = useAuditTimeline(type, id);
  const { refetch } = query;
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

  const changeSets = query.data?.pages.flatMap((p) => p.changeSets) ?? [];

  const toolbar = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
      <span style={{ fontFamily: FONT.body, fontSize: 11.5, color: C.textMuted }}>
        {query.isFetching ? (
          <>
            <i className="bi bi-arrow-repeat ci-spin" aria-hidden /> Syncing…
          </>
        ) : (
          `${changeSets.length} change set${changeSets.length === 1 ? '' : 's'}`
        )}
      </span>
      <button
        type="button"
        onClick={() => refetch()}
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
        {changeSets.map((cs) => (
          <ChangeSetCard
            key={cs.id}
            cs={cs}
            expanded={expanded.has(cs.id)}
            onToggle={() => toggle(cs.id)}
            onCompare={onCompare}
            onRestore={onRestore}
          />
        ))}
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
