import React, { useMemo, useState } from 'react';
import { C, FONT, RADIUS } from '@/app/modules/configuration/ConfigDesignSystem';
import { AuditDiffResult, AuditFieldChange } from './audit.service';
import { ChangeTypeChip, ValueDelta, CategoryBadge, parseFieldSummary, FieldSummaryGrid } from './parts';
import { DIFF, resolveValue, humanizeSummary, categoryMeta } from './tokens';
import { diffWords } from './wordDiff';
import './DiffViewerResponsive.css';

export type DiffMode = 'unified' | 'sidebyside';

/** Structural subset of a revision's metadata, supplied by the Compare panel. */
export interface DiffSideMeta {
  rev: number;
  actorName: string;
  synthetic?: boolean;
}

interface Props {
  result: AuditDiffResult;
  mode: DiffMode;
  onModeChange: (m: DiffMode) => void;
  fromMeta?: DiffSideMeta;
  toMeta?: DiffSideMeta;
  /** Extra controls rendered in the header (e.g. Reset). */
  actions?: React.ReactNode;
}

const CATEGORY_ORDER = ['STATUS', 'BASIC_INFO', 'FINANCIAL', 'COMMERCIAL', 'CONTACT', 'TEAM', 'LOCATION', 'DATES'];

const StatChip: React.FC<{ icon: string; label: string; n: number; color: string }> = ({ icon, label, n, color }) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      fontFamily: FONT.body,
      fontSize: 12,
      fontWeight: 700,
      color: n > 0 ? color : C.textMuted,
      backgroundColor: n > 0 ? `${color}14` : C.bgSection,
      padding: '4px 10px',
      borderRadius: RADIUS.full,
    }}
  >
    <i className={icon} style={{ fontSize: 11 }} aria-hidden />
    {n} {label}
  </span>
);

const ModeBtn: React.FC<{ active: boolean; onClick: () => void; icon: string; label: string }> = ({ active, onClick, icon, label }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      padding: '5px 12px',
      borderRadius: RADIUS.md,
      border: 'none',
      cursor: 'pointer',
      fontFamily: FONT.body,
      fontSize: 12,
      fontWeight: 600,
      backgroundColor: active ? C.bgCard : 'transparent',
      color: active ? C.primary : C.textSecondary,
      boxShadow: active ? C.shadowSm : 'none',
    }}
  >
    <i className={icon} style={{ fontSize: 12 }} aria-hidden />
    {label}
  </button>
);

/* ─── Word-level inline highlighting ──────────────────────────────────────── */
const InlineWordDiff: React.FC<{ oldText: string; newText: string }> = ({ oldText, newText }) => {
  const segs = diffWords(oldText, newText);
  if (!segs) return null;
  return (
    <span style={{ fontFamily: FONT.body, fontSize: 12.5, lineHeight: 1.5 }}>
      {segs.map((s, i) =>
        s.type === 'same' ? (
          <span key={i} style={{ color: C.textPrimary }}>{s.value}</span>
        ) : s.type === 'removed' ? (
          <span key={i} style={{ color: DIFF.removed, backgroundColor: DIFF.removedBg, textDecoration: 'line-through', textDecorationColor: `${DIFF.removed}80`, borderRadius: 3, padding: '0 1px' }}>
            {s.value}
          </span>
        ) : (
          <span key={i} style={{ color: DIFF.added, backgroundColor: DIFF.addedBg, borderRadius: 3, padding: '0 1px', fontWeight: 600 }}>
            {s.value}
          </span>
        ),
      )}
    </span>
  );
};

/** True when a change is a text edit worth a word-level diff. */
function wordDiffable(change: AuditFieldChange): { oldText: string; newText: string } | null {
  if (change.changeType !== 'MODIFIED') return null;
  const o = resolveValue(change.oldValue, change.oldValueFormatted);
  const n = resolveValue(change.newValue, change.newValueFormatted);
  if (o.placeholder || n.placeholder) return null;
  if (o.text.length > 200 || n.text.length > 200) return null;
  // Only worthwhile if they share some common run (otherwise plain chips are clearer).
  if (!/[a-zA-Z0-9]/.test(o.text) || !/[a-zA-Z0-9]/.test(n.text)) return null;
  return { oldText: o.text, newText: n.text };
}

const SideCell: React.FC<{ value: unknown; formatted: string; tone: 'old' | 'new' | 'empty'; words?: React.ReactNode }> = ({
  value,
  formatted,
  tone,
  words,
}) => {
  const resolved = resolveValue(value, formatted);
  const isEmpty = tone === 'empty' || resolved.placeholder;
  const map = {
    old: { color: DIFF.removed, bg: DIFF.removedBg },
    new: { color: DIFF.added, bg: DIFF.addedBg },
    empty: { color: C.textMuted, bg: C.bgSection },
  }[isEmpty ? 'empty' : tone];
  const summary = !words && !isEmpty ? parseFieldSummary(resolved.text) : null;
  return (
    <div
      style={{
        backgroundColor: map.bg,
        color: map.color,
        borderRadius: RADIUS.sm,
        padding: '7px 10px',
        fontFamily: FONT.body,
        fontSize: 12.5,
        fontWeight: isEmpty ? 500 : 600,
        fontStyle: isEmpty ? 'italic' : 'normal',
        wordBreak: 'break-word',
        minHeight: 32,
        border: `1px solid ${map.color}1f`,
      }}
    >
      {summary ? <FieldSummaryGrid rows={summary} valueColor={map.color} /> : words ?? resolved.text}
    </div>
  );
};

const DiffRow: React.FC<{ change: AuditFieldChange; mode: DiffMode }> = ({ change, mode }) => {
  const words = wordDiffable(change);
  return (
    <div className="diff-row" style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px', borderTop: `1px solid ${C.border}` }}>
      <div className="diff-row-label" style={{ width: 150, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontFamily: FONT.body, fontSize: 13, fontWeight: 600, color: C.textPrimary }}>{change.fieldLabel}</span>
          {change.isSensitive && (
            <i className="bi bi-shield-lock-fill" style={{ fontSize: 10, color: C.purple }} title="Sensitive field — value redacted" />
          )}
        </div>
        <div style={{ marginTop: 5 }}>
          <ChangeTypeChip changeType={change.changeType} />
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {mode === 'unified' ? (
          words ? (
            <InlineWordDiff oldText={words.oldText} newText={words.newText} />
          ) : (
            <ValueDelta change={change} stacked />
          )
        ) : (
          <div className="diff-sidebyside-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <SideCell
              value={change.oldValue}
              formatted={change.oldValueFormatted}
              tone={change.changeType === 'ADDED' ? 'empty' : 'old'}
            />
            <SideCell
              value={change.newValue}
              formatted={change.newValueFormatted}
              tone={change.changeType === 'REMOVED' ? 'empty' : 'new'}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export const DiffViewer: React.FC<Props> = ({ result, mode, onModeChange, fromMeta, toMeta, actions }) => {
  const [query, setQuery] = useState('');
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Category facets present in this diff (in a stable, meaningful order).
  const catCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const d of result.diffs) m.set(d.fieldCategory, (m.get(d.fieldCategory) ?? 0) + 1);
    return m;
  }, [result.diffs]);

  const orderedCats = useMemo(() => {
    const cats = [...catCounts.keys()];
    return cats.sort((a, b) => {
      const ia = CATEGORY_ORDER.indexOf(a);
      const ib = CATEGORY_ORDER.indexOf(b);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
  }, [catCounts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return result.diffs.filter((d) => {
      if (activeCat && d.fieldCategory !== activeCat) return false;
      if (q && !d.fieldLabel.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [result.diffs, query, activeCat]);

  const grouped = useMemo(() => {
    const g = new Map<string, AuditFieldChange[]>();
    for (const d of filtered) {
      if (!g.has(d.fieldCategory)) g.set(d.fieldCategory, []);
      g.get(d.fieldCategory)!.push(d);
    }
    return orderedCats.filter((c) => g.has(c)).map((c) => [c, g.get(c)!] as const);
  }, [filtered, orderedCats]);

  const copy = () => {
    const lines = [
      `Comparison · R${result.from} → R${result.to}`,
      humanizeSummary({ summary: result.summary, changes: result.diffs }),
      '',
      ...result.diffs.map((d) => {
        const o = resolveValue(d.oldValue, d.oldValueFormatted).text;
        const n = resolveValue(d.newValue, d.newValueFormatted).text;
        return `• ${d.fieldLabel} [${d.changeType}]: ${o} → ${n}`;
      }),
    ];
    navigator.clipboard?.writeText(lines.join('\n')).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      },
      () => undefined,
    );
  };

  return (
    <div className="ci-fade-in">
      {/* Summary + stats + mode toggle */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          flexWrap: 'wrap',
          padding: '13px 15px',
          backgroundColor: C.bgCard,
          border: `1px solid ${C.border}`,
          borderRadius: RADIUS.lg,
          marginBottom: 10,
          boxShadow: C.shadowSm,
        }}
      >
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ fontFamily: FONT.body, fontSize: 13.5, fontWeight: 700, color: C.textPrimary }}>
            R{result.from} → R{result.to}
          </div>
          <div style={{ fontFamily: FONT.body, fontSize: 12, color: C.textSecondary, marginTop: 2 }}>
            {humanizeSummary({ summary: result.summary, changes: result.diffs })}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <StatChip icon="bi bi-plus-circle-fill" label="added" n={result.stats.added} color="#16a34a" />
          <StatChip icon="bi bi-dash-circle-fill" label="removed" n={result.stats.removed} color={C.danger} />
          <StatChip icon="bi bi-pencil-fill" label="modified" n={result.stats.modified} color={C.amber} />
        </div>
        <div style={{ display: 'flex', gap: 4, backgroundColor: C.bgSection, padding: 3, borderRadius: RADIUS.md }}>
          <ModeBtn active={mode === 'unified'} onClick={() => onModeChange('unified')} icon="bi bi-list" label="Unified" />
          <ModeBtn active={mode === 'sidebyside'} onClick={() => onModeChange('sidebyside')} icon="bi bi-layout-split" label="Side by side" />
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            type="button"
            onClick={copy}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              borderRadius: RADIUS.md,
              border: `1px solid ${copied ? '#16a34a' : C.border}`,
              backgroundColor: copied ? C.successLight : C.bgCard,
              color: copied ? '#16a34a' : C.textSecondary,
              fontFamily: FONT.body,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all .15s ease',
            }}
            title="Copy this comparison as text"
          >
            <i className={`bi ${copied ? 'bi-check-lg' : 'bi-clipboard'}`} aria-hidden />
            {copied ? 'Copied' : 'Copy'}
          </button>
          {actions}
        </div>
      </div>

      {/* Filter bar (only when there is something to filter) */}
      {result.diffs.length > 2 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
          <div style={{ position: 'relative', flex: '0 0 auto' }}>
            <i className="bi bi-search" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: C.textMuted }} aria-hidden />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find a field…"
              style={{
                padding: '6px 10px 6px 28px',
                border: `1px solid ${C.border}`,
                borderRadius: RADIUS.md,
                fontFamily: FONT.body,
                fontSize: 12,
                color: C.textPrimary,
                width: 170,
                outline: 'none',
                backgroundColor: C.bgCard,
              }}
            />
          </div>
          <button
            type="button"
            onClick={() => setActiveCat(null)}
            style={catChipStyle(activeCat === null)}
          >
            All ({result.diffs.length})
          </button>
          {orderedCats.map((cat) => {
            const meta = categoryMeta(cat);
            return (
              <button key={cat} type="button" onClick={() => setActiveCat(activeCat === cat ? null : cat)} style={catChipStyle(activeCat === cat)}>
                <i className={meta.icon} style={{ fontSize: 10 }} aria-hidden /> {meta.label} ({catCounts.get(cat)})
              </button>
            );
          })}
        </div>
      )}

      {/* Side-by-side column headers with revision identity */}
      {mode === 'sidebyside' && filtered.length > 0 && (
        <div className="diff-sidebyside-header" style={{ display: 'flex', gap: 12, padding: '0 14px 8px 162px' }}>
          <div className="diff-sidebyside-grid" style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <ColHeader rev={result.from} meta={fromMeta} tone="old" />
            <ColHeader rev={result.to} meta={toMeta} tone="new" />
          </div>
        </div>
      )}

      {/* Body */}
      {result.diffs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '34px 0', color: C.textMuted, fontFamily: FONT.body, fontSize: 13 }}>
          <i className="bi bi-check2-circle" style={{ fontSize: 26, display: 'block', marginBottom: 8, color: '#16a34a' }} aria-hidden />
          These revisions are identical — no differences.
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '28px 0', color: C.textMuted, fontFamily: FONT.body, fontSize: 13 }}>
          No fields match your filter.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {grouped.map(([cat, rows]) => (
            <div key={cat} style={{ border: `1px solid ${C.border}`, borderRadius: RADIUS.lg, overflow: 'hidden', backgroundColor: C.bgCard }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', backgroundColor: C.bgSection, borderBottom: `1px solid ${C.border}` }}>
                <CategoryBadge category={cat} />
                <span style={{ fontFamily: FONT.body, fontSize: 11.5, color: C.textMuted, fontWeight: 600 }}>
                  {rows.length} field{rows.length === 1 ? '' : 's'}
                </span>
              </div>
              {rows.map((d, i) => (
                <DiffRow key={`${d.fieldName}-${i}`} change={d} mode={mode} />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const ColHeader: React.FC<{ rev: number; meta?: DiffSideMeta; tone: 'old' | 'new' }> = ({ rev, meta, tone }) => {
  const color = tone === 'old' ? DIFF.removed : DIFF.added;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: FONT.body, fontSize: 11, fontWeight: 700, color }}>
      <i className={tone === 'old' ? 'bi bi-dash-circle' : 'bi bi-plus-circle'} style={{ fontSize: 10 }} aria-hidden />
      R{rev}
      {meta && <span style={{ color: C.textMuted, fontWeight: 600 }}>· {meta.actorName}</span>}
    </span>
  );
};

function catChipStyle(active: boolean): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    padding: '5px 11px',
    borderRadius: RADIUS.full,
    border: `1px solid ${active ? C.primary : C.border}`,
    backgroundColor: active ? C.primaryLight : C.bgCard,
    color: active ? C.primary : C.textSecondary,
    fontFamily: FONT.body,
    fontSize: 11.5,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all .15s ease',
  };
}

export default DiffViewer;
