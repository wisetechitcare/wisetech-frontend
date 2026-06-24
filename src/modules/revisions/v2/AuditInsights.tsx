import React, { useMemo, useState } from 'react';
import { C, FONT, RADIUS, ICON_COLORS } from '@/app/modules/configuration/ConfigDesignSystem';
import { AuditEntityType, EntityInsights } from './auditV2.service';
import { useAuditInsights } from './hooks';
import { categoryMeta, changeTypeMeta, initials, IMPACT_COLOR } from './tokens';
import { fromNow, fullDateTime } from './time';

interface Props {
  type: AuditEntityType;
  id: string;
}

const pct = (n: number, total: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

/* ─── Primitives ──────────────────────────────────────────────────────────── */

const Kpi: React.FC<{
  icon: string;
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  accent: keyof typeof ICON_COLORS;
}> = ({ icon, label, value, sub, accent }) => {
  const { bg, color } = ICON_COLORS[accent] ?? ICON_COLORS.primary;
  return (
    <div
      style={{
        backgroundColor: C.bgCard,
        border: `1px solid ${C.border}`,
        borderRadius: RADIUS.lg,
        padding: '14px 15px',
        boxShadow: C.shadowSm,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        minWidth: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: RADIUS.md,
            backgroundColor: bg,
            color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
          aria-hidden
        >
          <i className={icon} style={{ fontSize: 15 }} />
        </div>
        <div style={{ fontFamily: FONT.body, fontSize: 11.5, color: C.textMuted, fontWeight: 600 }}>{label}</div>
      </div>
      <div style={{ fontFamily: FONT.heading, fontSize: 26, fontWeight: 700, color: C.textPrimary, lineHeight: 1 }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontFamily: FONT.body, fontSize: 11, color: C.textMuted, display: 'flex', alignItems: 'center', gap: 5, minHeight: 14 }}>
          {sub}
        </div>
      )}
    </div>
  );
};

const Panel: React.FC<{ title: string; icon: string; right?: React.ReactNode; children: React.ReactNode }> = ({
  title,
  icon,
  right,
  children,
}) => (
  <div style={{ border: `1px solid ${C.border}`, borderRadius: RADIUS.lg, backgroundColor: C.bgCard, padding: '15px 16px', boxShadow: C.shadowSm }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
      <i className={icon} style={{ fontSize: 13, color: C.primary }} aria-hidden />
      <span style={{ fontFamily: FONT.heading, fontSize: 13.5, fontWeight: 700, color: C.textPrimary }}>{title}</span>
      {right && <span style={{ marginLeft: 'auto' }}>{right}</span>}
    </div>
    {children}
  </div>
);

const Bar: React.FC<{ label: React.ReactNode; count: number; max: number; total: number; color: string }> = ({
  label,
  count,
  max,
  total,
  color,
}) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 9 }}>
    <div style={{ width: 120, flexShrink: 0, fontFamily: FONT.body, fontSize: 12, color: C.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
      {label}
    </div>
    <div style={{ flex: 1, height: 20, backgroundColor: C.bgSection, borderRadius: RADIUS.sm, overflow: 'hidden', position: 'relative' }}>
      <div
        style={{
          width: `${max > 0 ? Math.max(8, (count / max) * 100) : 0}%`,
          height: '100%',
          background: `linear-gradient(90deg, ${color}, ${color}cc)`,
          borderRadius: RADIUS.sm,
          transition: 'width 0.4s cubic-bezier(.4,0,.2,1)',
        }}
      />
    </div>
    <div style={{ width: 56, textAlign: 'right', fontFamily: FONT.body, fontSize: 12, fontWeight: 700, color: C.textPrimary }}>
      {count}
      <span style={{ color: C.textMuted, fontWeight: 500, marginLeft: 4 }}>{pct(count, total)}%</span>
    </div>
  </div>
);

/* ─── Activity chart (interactive) ────────────────────────────────────────── */
const VolumeChart: React.FC<{ data: EntityInsights['volume'] }> = ({ data }) => {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 96, position: 'relative' }}>
      {data.map((d, i) => {
        const h = (d.count / max) * 70;
        const active = hover === i;
        return (
          <div
            key={d.date}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, cursor: 'default' }}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          >
            <div style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'flex-end', height: 74 }}>
              {active && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: h + 8,
                    backgroundColor: C.textPrimary,
                    color: '#fff',
                    fontFamily: FONT.body,
                    fontSize: 10.5,
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: RADIUS.sm,
                    whiteSpace: 'nowrap',
                    zIndex: 2,
                  }}
                >
                  {d.count} change{d.count === 1 ? '' : 's'}
                </div>
              )}
              <div
                style={{
                  width: '78%',
                  maxWidth: 26,
                  height: Math.max(d.count > 0 ? 5 : 3, h),
                  background:
                    d.count > 0
                      ? active
                        ? `linear-gradient(180deg, ${C.primaryMid}, ${C.primary})`
                        : `linear-gradient(180deg, ${C.primary}cc, ${C.primary})`
                      : C.border,
                  borderRadius: 4,
                  transition: 'height .3s ease, background .15s ease',
                }}
              />
            </div>
            <span style={{ fontFamily: FONT.body, fontSize: 9, color: active ? C.primary : C.textMuted, fontWeight: active ? 700 : 500 }}>
              {d.date.slice(8, 10)}
            </span>
          </div>
        );
      })}
    </div>
  );
};

/* ─── Donut (change-type mix) ─────────────────────────────────────────────── */
const Donut: React.FC<{ segments: Array<{ label: string; value: number; color: string }>; total: number }> = ({
  segments,
  total,
}) => {
  const size = 132;
  const stroke = 18;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
      <svg width={size} height={size} style={{ flexShrink: 0 }} role="img" aria-label="Change type distribution">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={C.bgSection} strokeWidth={stroke} />
        {total > 0 &&
          segments.map((s) => {
            const len = (s.value / total) * circ;
            const el = (
              <circle
                key={s.label}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth={stroke}
                strokeDasharray={`${len} ${circ - len}`}
                strokeDashoffset={-offset}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                style={{ transition: 'stroke-dasharray .5s ease' }}
              />
            );
            offset += len;
            return el;
          })}
        <text x="50%" y="46%" textAnchor="middle" style={{ fontFamily: FONT.heading, fontWeight: 700, fontSize: 24, fill: C.textPrimary }}>
          {total}
        </text>
        <text x="50%" y="60%" textAnchor="middle" style={{ fontFamily: FONT.body, fontWeight: 600, fontSize: 10, fill: C.textMuted }}>
          changes
        </text>
      </svg>
      <div style={{ flex: 1, minWidth: 130 }}>
        {segments.map((s) => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: s.color, flexShrink: 0 }} aria-hidden />
            <span style={{ flex: 1, fontFamily: FONT.body, fontSize: 12.5, color: C.textSecondary }}>{s.label}</span>
            <span style={{ fontFamily: FONT.body, fontSize: 12.5, fontWeight: 700, color: C.textPrimary }}>{s.value}</span>
            <span style={{ fontFamily: FONT.body, fontSize: 11, color: C.textMuted, width: 34, textAlign: 'right' }}>{pct(s.value, total)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ─── Stacked segment bar (impact mix) ────────────────────────────────────── */
const ImpactBar: React.FC<{ segments: Array<{ label: string; value: number; color: string }>; total: number }> = ({
  segments,
  total,
}) => (
  <div>
    <div style={{ display: 'flex', height: 14, borderRadius: RADIUS.full, overflow: 'hidden', backgroundColor: C.bgSection, marginBottom: 14 }}>
      {total > 0 &&
        segments.map((s) =>
          s.value > 0 ? (
            <div key={s.label} title={`${s.label}: ${s.value}`} style={{ width: `${(s.value / total) * 100}%`, backgroundColor: s.color, transition: 'width .4s ease' }} />
          ) : null,
        )}
    </div>
    {segments.map((s) => (
      <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: s.color, flexShrink: 0 }} aria-hidden />
        <span style={{ flex: 1, fontFamily: FONT.body, fontSize: 12.5, color: C.textSecondary }}>{s.label}</span>
        <span style={{ fontFamily: FONT.body, fontSize: 12.5, fontWeight: 700, color: C.textPrimary }}>{s.value}</span>
        <span style={{ fontFamily: FONT.body, fontSize: 11, color: C.textMuted, width: 34, textAlign: 'right' }}>{pct(s.value, total)}%</span>
      </div>
    ))}
  </div>
);

const Empty: React.FC<{ text: string }> = ({ text }) => (
  <div style={{ fontFamily: FONT.body, fontSize: 12, color: C.textMuted, padding: '6px 0' }}>{text}</div>
);

const grid2: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14, marginBottom: 14 };

/* ─── Source label/icon ───────────────────────────────────────────────────── */
const SOURCE_META: Record<string, { label: string; icon: string }> = {
  UI_FORM: { label: 'Web form', icon: 'bi bi-input-cursor-text' },
  API: { label: 'API', icon: 'bi bi-code-slash' },
  BULK_IMPORT: { label: 'Bulk import', icon: 'bi bi-file-earmark-arrow-up' },
  SYSTEM: { label: 'System', icon: 'bi bi-gear-fill' },
  WEBHOOK: { label: 'Webhook', icon: 'bi bi-lightning-charge' },
  ROLLBACK: { label: 'Rollback', icon: 'bi bi-arrow-counterclockwise' },
};
const sourceMeta = (s: string) => SOURCE_META[s] ?? { label: s.replace(/_/g, ' '), icon: 'bi bi-dot' };

/* ─── Main ────────────────────────────────────────────────────────────────── */
export const AuditInsights: React.FC<Props> = ({ type, id }) => {
  const { data, isLoading, isError } = useAuditInsights(type, id);

  const derived = useMemo(() => {
    if (!data) return null;
    const avg = data.totalRevisions ? data.totalChanges / data.totalRevisions : 0;
    const critical = data.impactMix.find((i) => i.impact === 'CRITICAL')?.count ?? 0;
    const volumeTotal = data.volume.reduce((s, d) => s + d.count, 0);
    const busiest = data.volume.reduce((m, d) => (d.count > m.count ? d : m), data.volume[0] ?? { date: '', count: 0 });
    return { avg, critical, volumeTotal, busiest, topEditor: data.topEditors[0] };
  }, [data]);

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '44px 0', color: C.textMuted, fontFamily: FONT.body, fontSize: 13 }}>
        <i className="bi bi-arrow-repeat ci-spin" style={{ fontSize: 22 }} aria-hidden /> Computing insights…
      </div>
    );
  }
  if (isError || !data || !derived) {
    return (
      <div style={{ textAlign: 'center', padding: '44px 0', color: C.danger, fontFamily: FONT.body, fontSize: 13 }}>
        Couldn't load insights.
      </div>
    );
  }
  if (data.totalRevisions === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '46px 16px', color: C.textMuted }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', backgroundColor: C.bgSection, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
          <i className="bi bi-bar-chart" style={{ fontSize: 24, color: C.textMuted }} aria-hidden />
        </div>
        <div style={{ fontFamily: FONT.heading, fontSize: 15, fontWeight: 700, color: C.textSecondary }}>No insights yet</div>
        <div style={{ fontFamily: FONT.body, fontSize: 13, color: C.textMuted, marginTop: 4 }}>
          Charts appear once this record has a tracked change history.
        </div>
      </div>
    );
  }

  const fieldMax = Math.max(1, ...data.hotFields.map((f) => f.count));
  const editorMax = Math.max(1, ...data.topEditors.map((e) => e.count));
  const catMax = Math.max(1, ...data.categoryMix.map((c) => c.count));
  const sourceMax = Math.max(1, ...data.sourceMix.map((s) => s.count));
  const editorTotal = data.topEditors.reduce((s, e) => s + e.count, 0);

  const typeSegments = data.changeTypeMix.map((t) => {
    const meta = changeTypeMeta(t.type);
    return { label: meta.label, value: t.count, color: meta.color };
  });
  const IMPACT_LABEL: Record<string, string> = { CRITICAL: 'Critical', MAJOR: 'Major', MINOR: 'Minor' };
  const impactOrder = ['CRITICAL', 'MAJOR', 'MINOR'];
  const impactSegments = impactOrder
    .map((k) => ({ label: IMPACT_LABEL[k], value: data.impactMix.find((i) => i.impact === k)?.count ?? 0, color: IMPACT_COLOR[k] }))
    .filter((s) => s.value > 0);

  return (
    <div className="ci-fade-in" style={{ paddingTop: 4 }}>
      {/* Summary strip */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
          padding: '10px 14px',
          borderRadius: RADIUS.md,
          backgroundColor: C.primaryLight,
          border: `1px solid ${C.primary}22`,
          marginBottom: 14,
          fontFamily: FONT.body,
          fontSize: 12,
          color: C.textSecondary,
        }}
      >
        <i className="bi bi-clock-history" style={{ color: C.primary }} aria-hidden />
        <span>
          Tracked since <strong style={{ color: C.textPrimary }} title={fullDateTime(data.firstChangedAt)}>{fromNow(data.firstChangedAt)}</strong>
        </span>
        <Dot />
        <span>
          Last change <strong style={{ color: C.textPrimary }} title={fullDateTime(data.lastChangedAt)}>{fromNow(data.lastChangedAt)}</strong>
        </span>
        {data.sensitiveChanges > 0 && (
          <>
            <Dot />
            <span style={{ color: C.purple, fontWeight: 600 }}>
              <i className="bi bi-shield-lock-fill" aria-hidden /> {data.sensitiveChanges} sensitive
            </span>
          </>
        )}
        {data.restoreCount > 0 && (
          <>
            <Dot />
            <span>
              <i className="bi bi-arrow-counterclockwise" aria-hidden /> {data.restoreCount} restore{data.restoreCount === 1 ? '' : 's'}
            </span>
          </>
        )}
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 14 }}>
        <Kpi
          icon="bi bi-layers"
          label="Revisions"
          value={data.totalRevisions}
          accent="primary"
          sub={<><i className="bi bi-bar-chart-line" aria-hidden /> {derived.avg.toFixed(1)} changes each</>}
        />
        <Kpi
          icon="bi bi-pencil-square"
          label="Field changes"
          value={data.totalChanges}
          accent="blue"
          sub={<>across {data.hotFields.length} field{data.hotFields.length === 1 ? '' : 's'}</>}
        />
        <Kpi
          icon="bi bi-people"
          label="Contributors"
          value={data.distinctEditors}
          accent="purple"
          sub={derived.topEditor ? <><i className="bi bi-star-fill" style={{ color: C.amber }} aria-hidden /> {derived.topEditor.name}</> : undefined}
        />
        <Kpi
          icon="bi bi-exclamation-triangle"
          label="Critical changes"
          value={derived.critical}
          accent={derived.critical > 0 ? 'danger' : 'green'}
          sub={derived.critical > 0 ? <span style={{ color: C.danger }}>needs attention</span> : <span style={{ color: '#16a34a' }}>all clear</span>}
        />
      </div>

      {/* Activity */}
      <div style={{ marginBottom: 14 }}>
        <Panel
          title="Activity — last 14 days"
          icon="bi bi-activity"
          right={
            <span style={{ fontFamily: FONT.body, fontSize: 11.5, color: C.textMuted }}>
              {derived.volumeTotal} change{derived.volumeTotal === 1 ? '' : 's'} this period
            </span>
          }
        >
          <VolumeChart data={data.volume} />
          {derived.busiest && derived.busiest.count > 0 && (
            <div style={{ fontFamily: FONT.body, fontSize: 11, color: C.textMuted, marginTop: 10 }}>
              <i className="bi bi-fire" style={{ color: C.amber }} aria-hidden /> Busiest day: {derived.busiest.date} ({derived.busiest.count} changes)
            </div>
          )}
        </Panel>
      </div>

      {/* Change types + Impact */}
      <div style={grid2}>
        <Panel title="Change types" icon="bi bi-diagram-3">
          {typeSegments.length === 0 ? <Empty text="No field changes recorded." /> : <Donut segments={typeSegments} total={data.totalChanges} />}
        </Panel>
        <Panel title="Impact level" icon="bi bi-shield-exclamation">
          {impactSegments.length === 0 ? <Empty text="No impact data." /> : <ImpactBar segments={impactSegments} total={impactSegments.reduce((s, x) => s + x.value, 0)} />}
        </Panel>
      </div>

      {/* Hot fields + Categories */}
      <div style={grid2}>
        <Panel title="Most-changed fields" icon="bi bi-fire">
          {data.hotFields.length === 0 ? (
            <Empty text="No field changes." />
          ) : (
            data.hotFields.map((f) => <Bar key={f.field} label={f.label} count={f.count} max={fieldMax} total={data.totalChanges} color={C.primary} />)
          )}
        </Panel>

        <Panel title="Change categories" icon="bi bi-pie-chart">
          {data.categoryMix.map((c) => {
            const meta = categoryMeta(c.category);
            const { color } = ICON_COLORS[meta.accent] ?? ICON_COLORS.primary;
            return (
              <Bar
                key={c.category}
                label={
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <i className={meta.icon} style={{ fontSize: 11, color }} aria-hidden />
                    {meta.label}
                  </span>
                }
                count={c.count}
                max={catMax}
                total={data.totalRevisions}
                color={color}
              />
            );
          })}
        </Panel>
      </div>

      {/* Editors + Sources */}
      <div style={grid2}>
        <Panel title="Top editors" icon="bi bi-person-badge">
          {data.topEditors.map((e) => (
            <div key={e.actorId} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: RADIUS.md,
                  backgroundColor: C.primaryLight,
                  color: C.primary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: FONT.heading,
                  fontWeight: 700,
                  fontSize: 11.5,
                  flexShrink: 0,
                  border: `1px solid ${C.primary}22`,
                }}
                aria-hidden
              >
                {initials(e.name.split(' ')[0], e.name.split(' ')[1])}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: FONT.body, fontSize: 12.5, fontWeight: 600, color: C.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {e.name}
                </div>
                <div style={{ height: 6, backgroundColor: C.bgSection, borderRadius: RADIUS.full, overflow: 'hidden', marginTop: 4 }}>
                  <div style={{ width: `${Math.max(8, (e.count / editorMax) * 100)}%`, height: '100%', background: `linear-gradient(90deg, ${C.purple}, ${C.purple}bb)`, borderRadius: RADIUS.full }} />
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontFamily: FONT.body, fontSize: 12.5, fontWeight: 700, color: C.textPrimary }}>{e.count}</div>
                <div style={{ fontFamily: FONT.body, fontSize: 10, color: C.textMuted }}>{pct(e.count, editorTotal)}%</div>
              </div>
            </div>
          ))}
        </Panel>

        <Panel title="Change sources" icon="bi bi-signpost-split">
          {data.sourceMix.length === 0 ? (
            <Empty text="No source data." />
          ) : (
            data.sourceMix.map((s) => {
              const meta = sourceMeta(s.source);
              return (
                <Bar
                  key={s.source}
                  label={
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <i className={meta.icon} style={{ fontSize: 11, color: C.teal }} aria-hidden />
                      {meta.label}
                    </span>
                  }
                  count={s.count}
                  max={sourceMax}
                  total={data.totalRevisions}
                  color={C.teal}
                />
              );
            })
          )}
        </Panel>
      </div>
    </div>
  );
};

const Dot: React.FC = () => <span style={{ color: C.textMuted, opacity: 0.5 }}>·</span>;

export default AuditInsights;
