import React, { useEffect, useMemo, useRef, useState } from 'react';
import { C, FONT, RADIUS } from '@/app/modules/configuration/ConfigDesignSystem';
import { AuditEntityType } from './audit.service';
import { DiffViewer, DiffMode } from './DiffViewer';
import { useAuditDiff, useAuditTimeline } from './hooks';
import { actorKind, displayActor, humanizeSummary, initials } from './tokens';
import { fromNow } from './time';

export interface RevisionMeta {
  rev: number;
  actorName: string;
  isSystem: boolean;
  changedAt?: string | null;
  summary?: string;
  source?: string | null;
  /** The synthetic "Original (R0)" baseline has no captured change set. */
  synthetic?: boolean;
}

interface Props {
  type: AuditEntityType;
  id: string;
  from: number | null;
  to: number | null;
  onApply: (from: number, to: number) => void;
  onReset: (rev: number) => void;
  canReset: boolean;
}

const ORIGINAL: RevisionMeta = {
  rev: 0,
  actorName: 'Original record',
  isSystem: true,
  synthetic: true,
  summary: 'Baseline — before any tracked change',
};

/* ─── Avatar ──────────────────────────────────────────────────────────────── */
const Avatar: React.FC<{ meta: RevisionMeta; size?: number }> = ({ meta, size = 30 }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: RADIUS.md,
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: FONT.heading,
      fontWeight: 700,
      fontSize: size * 0.36,
      backgroundColor: meta.isSystem ? C.bgSection : C.primaryLight,
      color: meta.isSystem ? C.textMuted : C.primary,
      border: `1px solid ${meta.isSystem ? C.border : `${C.primary}22`}`,
    }}
    aria-hidden
  >
    {meta.isSystem ? (
      <i className="bi bi-gear-fill" style={{ fontSize: size * 0.42 }} />
    ) : (
      initials(meta.actorName.split(' ')[0], meta.actorName.split(' ')[1])
    )}
  </div>
);

/* ─── Custom revision picker (rich options: actor + relative time) ─────────── */
const RevisionPicker: React.FC<{
  label: string;
  value: number | null;
  options: RevisionMeta[];
  disabledRev?: number | null;
  onChange: (rev: number) => void;
}> = ({ label, value, options, disabledRev, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.rev === value) ?? null;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <div style={{ position: 'relative', minWidth: 220, flex: 1 }} ref={ref}>
      <div style={{ fontFamily: FONT.body, fontSize: 11, fontWeight: 700, color: C.textSecondary, marginBottom: 6, letterSpacing: '0.3px' }}>
        {label}
      </div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 9,
          padding: '8px 10px',
          backgroundColor: C.bgCard,
          border: `1px solid ${open ? C.primary : C.border}`,
          borderRadius: RADIUS.md,
          cursor: 'pointer',
          textAlign: 'left',
          boxShadow: open ? `0 0 0 3px ${C.primary}1a` : 'none',
          transition: 'border-color .15s ease, box-shadow .15s ease',
        }}
      >
        {selected ? (
          <>
            <Avatar meta={selected} size={28} />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontFamily: FONT.body, fontSize: 12.5, fontWeight: 700, color: C.primary }}>
                  {selected.synthetic ? 'R0' : `R${selected.rev}`}
                </span>
                <span style={{ fontFamily: FONT.body, fontSize: 12.5, fontWeight: 600, color: C.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {selected.actorName}
                </span>
              </span>
              <span style={{ fontFamily: FONT.body, fontSize: 11, color: C.textMuted }}>
                {selected.synthetic ? 'Baseline' : fromNow(selected.changedAt)}
              </span>
            </span>
          </>
        ) : (
          <span style={{ flex: 1, fontFamily: FONT.body, fontSize: 13, color: C.textMuted }}>Select a revision…</span>
        )}
        <i className="bi bi-chevron-down" style={{ fontSize: 11, color: C.textMuted, transition: 'transform .2s ease', transform: open ? 'rotate(180deg)' : 'none' }} aria-hidden />
      </button>

      {open && (
        <div
          role="listbox"
          className="ci-fade-in"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            zIndex: 30,
            maxHeight: 280,
            overflowY: 'auto',
            backgroundColor: C.bgCard,
            border: `1px solid ${C.border}`,
            borderRadius: RADIUS.md,
            boxShadow: C.shadowCard,
            padding: 4,
          }}
        >
          {options.map((o) => {
            const isSel = o.rev === value;
            const isDisabled = disabledRev != null && o.rev === disabledRev;
            return (
              <button
                key={o.rev}
                type="button"
                role="option"
                aria-selected={isSel}
                disabled={isDisabled}
                onClick={() => {
                  onChange(o.rev);
                  setOpen(false);
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 9,
                  padding: '8px 9px',
                  border: 'none',
                  borderRadius: RADIUS.sm,
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                  textAlign: 'left',
                  backgroundColor: isSel ? C.primaryLight : 'transparent',
                  opacity: isDisabled ? 0.4 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!isSel && !isDisabled) e.currentTarget.style.backgroundColor = C.bgSection;
                }}
                onMouseLeave={(e) => {
                  if (!isSel) e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <Avatar meta={o} size={28} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontFamily: FONT.body, fontSize: 12, fontWeight: 700, color: C.primary }}>
                      {o.synthetic ? 'R0' : `R${o.rev}`}
                    </span>
                    <span style={{ fontFamily: FONT.body, fontSize: 12.5, fontWeight: 600, color: C.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {o.actorName}
                    </span>
                  </span>
                  <span style={{ fontFamily: FONT.body, fontSize: 11, color: C.textMuted, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {o.synthetic ? 'Baseline' : `${fromNow(o.changedAt)} · ${humanizeSummary({ summary: o.summary })}`}
                  </span>
                </span>
                {isSel && <i className="bi bi-check-lg" style={{ color: C.primary, fontSize: 14 }} aria-hidden />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const ComparePanel: React.FC<Props> = ({ type, id, from, to, onApply, onReset, canReset }) => {
  const [diffMode, setDiffMode] = useState<DiffMode>('unified');
  const timeline = useAuditTimeline(type, id);
  const diff = useAuditDiff(type, id, from, to);

  const changeSets = useMemo(
    () => timeline.data?.pages.flatMap((p) => p.changeSets) ?? [],
    [timeline.data],
  );

  const metaByRev = useMemo(() => {
    const m = new Map<number, RevisionMeta>();
    m.set(0, ORIGINAL);
    for (const cs of changeSets) {
      m.set(cs.revisionNumber, {
        rev: cs.revisionNumber,
        actorName: displayActor(cs.changedByFirstName, cs.changedByLastName),
        isSystem:
          actorKind({
            first: cs.changedByFirstName,
            last: cs.changedByLastName,
            changeSource: cs.changeSource,
            summary: cs.summary,
          }) === 'system',
        changedAt: cs.changedAt,
        summary: cs.summary,
        source: cs.changeSource,
      });
    }
    return m;
  }, [changeSets]);

  const getMeta = (rev: number | null): RevisionMeta =>
    (rev != null && metaByRev.get(rev)) || ORIGINAL;

  // Options: newest first, plus the synthetic Original at the bottom.
  const options = useMemo<RevisionMeta[]>(() => {
    const revs = [...metaByRev.values()].filter((m) => !m.synthetic).sort((a, b) => b.rev - a.rev);
    return [...revs, ORIGINAL];
  }, [metaByRev]);

  const latestRev = options.length > 1 ? options[0].rev : null;

  // Pending selection (defaults seeded from props / sensible latest↔previous).
  const [inFrom, setInFrom] = useState<number | null>(from);
  const [inTo, setInTo] = useState<number | null>(to);
  useEffect(() => setInFrom(from), [from]);
  useEffect(() => setInTo(to), [to]);

  const apply = (f: number | null, t: number | null) => {
    if (f == null || t == null || f === t) return;
    // Always present older → newer so the diff reads forward, not as a revert.
    const lo = Math.min(f, t);
    const hi = Math.max(f, t);
    onApply(lo, hi);
  };

  const swap = () => {
    setInFrom(inTo);
    setInTo(inFrom);
  };

  const sameSelected = inFrom != null && inFrom === inTo;
  const canCompare = inFrom != null && inTo != null && !sameSelected;
  const currentRev = latestRev;

  return (
    <div>
      {/* ── Control bar ── */}
      <div
        style={{
          backgroundColor: C.bgCard,
          border: `1px solid ${C.border}`,
          borderRadius: RADIUS.lg,
          padding: 16,
          marginBottom: 14,
          boxShadow: C.shadowSm,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
          <RevisionPicker
            label="COMPARE FROM"
            value={inFrom}
            options={options}
            disabledRev={inTo}
            onChange={setInFrom}
          />
          <button
            type="button"
            onClick={swap}
            title="Swap revisions"
            aria-label="Swap revisions"
            style={{
              marginBottom: 1,
              width: 36,
              height: 36,
              flexShrink: 0,
              borderRadius: RADIUS.md,
              border: `1px solid ${C.border}`,
              backgroundColor: C.bgCard,
              color: C.textSecondary,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <i className="bi bi-arrow-left-right" style={{ fontSize: 13 }} aria-hidden />
          </button>
          <RevisionPicker
            label="COMPARE TO"
            value={inTo}
            options={options}
            disabledRev={inFrom}
            onChange={setInTo}
          />
          <button
            type="button"
            disabled={!canCompare}
            onClick={() => apply(inFrom, inTo)}
            style={{
              marginBottom: 1,
              padding: '9px 22px',
              height: 38,
              borderRadius: RADIUS.md,
              border: 'none',
              backgroundColor: canCompare ? C.primary : C.border,
              color: canCompare ? '#fff' : C.textMuted,
              fontFamily: FONT.body,
              fontSize: 13,
              fontWeight: 700,
              cursor: canCompare ? 'pointer' : 'not-allowed',
              boxShadow: canCompare ? `0 4px 12px ${C.primaryShadow}` : 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              transition: 'all .15s ease',
            }}
          >
            <i className="bi bi-arrow-left-right" aria-hidden /> Compare
          </button>
        </div>

        {sameSelected && (
          <div style={{ fontFamily: FONT.body, fontSize: 11.5, color: C.amber, marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <i className="bi bi-exclamation-circle" aria-hidden /> Pick two different revisions to compare.
          </div>
        )}
      </div>

      {/* ── Result ── */}
      {from == null || to == null ? (
        <EmptyState />
      ) : diff.isLoading ? (
        <LoadingState />
      ) : diff.isError ? (
        <div style={{ textAlign: 'center', padding: '28px 0', color: C.danger, fontFamily: FONT.body, fontSize: 13 }}>
          <i className="bi bi-exclamation-triangle" style={{ fontSize: 22, display: 'block', marginBottom: 6 }} aria-hidden />
          Couldn't compute the diff (check the revision range).
        </div>
      ) : diff.data ? (
        <>
          <DiffViewer
            result={diff.data}
            mode={diffMode}
            onModeChange={setDiffMode}
            fromMeta={getMeta(from)}
            toMeta={getMeta(to)}
            actions={
              // Reset rewinds to the "Compare From" revision (the earlier/left side):
              // compare R2 ↔ R5 then Reset → rewinds to R2, deleting R3–R5. Hidden when
              // "from" is the synthetic baseline (R0) or already the current revision.
              canReset && from != null && from >= 1 && from !== currentRev ? (
                <button
                  type="button"
                  onClick={() => onReset(from)}
                  title={`Reset the record back to version ${from} (deletes all newer versions)`}
                  style={{
                    background: 'transparent',
                    color: C.danger,
                    border: `1px solid ${C.danger}55`,
                    borderRadius: RADIUS.md,
                    padding: '6px 12px',
                    fontFamily: FONT.body,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                  }}
                >
                  <i className="bi bi-arrow-counterclockwise" aria-hidden /> Reset to R{from}
                </button>
              ) : null
            }
          />
        </>
      ) : null}
    </div>
  );
};

const EmptyState: React.FC = () => (
  <div style={{ textAlign: 'center', padding: '46px 16px', color: C.textMuted }}>
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
      <i className="bi bi-file-earmark-diff" style={{ fontSize: 24, color: C.textMuted }} aria-hidden />
    </div>
    <div style={{ fontFamily: FONT.heading, fontSize: 15, fontWeight: 700, color: C.textSecondary }}>Compare two revisions</div>
    <div style={{ fontFamily: FONT.body, fontSize: 13, color: C.textMuted, marginTop: 4 }}>
      Pick a “from” and “to” above, or use a quick-compare shortcut.
    </div>
  </div>
);

const LoadingState: React.FC = () => (
  <div style={{ textAlign: 'center', padding: '40px 0', color: C.textMuted, fontFamily: FONT.body, fontSize: 13 }}>
    <i className="bi bi-arrow-repeat ci-spin" style={{ fontSize: 22 }} aria-hidden /> Computing differences…
  </div>
);

export default ComparePanel;
