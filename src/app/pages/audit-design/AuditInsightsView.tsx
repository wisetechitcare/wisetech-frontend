import React from 'react';
import { C, FONT, RADIUS, ICON_COLORS } from '@/app/modules/configuration/ConfigDesignSystem';
import { EntityInsights } from './types';
import { categoryMeta, initials } from './designTokens';
import { fromNow } from './time';

const Kpi: React.FC<{ icon: string; label: string; value: React.ReactNode; accent: keyof typeof ICON_COLORS }> = ({ icon, label, value, accent }) => {
  const { bg, color } = ICON_COLORS[accent] ?? ICON_COLORS.primary;
  return (
    <div style={{ backgroundColor: C.bgCard, border: `1px solid ${C.border}`, borderRadius: RADIUS.lg, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: C.shadowSm }}>
      <div style={{ width: 36, height: 36, borderRadius: RADIUS.md, backgroundColor: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }} aria-hidden>
        <i className={icon} style={{ fontSize: 16 }} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: FONT.heading, fontSize: 19, fontWeight: 700, color: C.textPrimary, lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontFamily: FONT.body, fontSize: 11, color: C.textMuted, whiteSpace: 'nowrap' }}>{label}</div>
      </div>
    </div>
  );
};

const Panel: React.FC<{ title: string; icon: string; children: React.ReactNode }> = ({ title, icon, children }) => (
  <div style={{ border: `1px solid ${C.border}`, borderRadius: RADIUS.lg, backgroundColor: C.bgCard, padding: '14px 16px' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
      <i className={icon} style={{ fontSize: 13, color: C.primary }} aria-hidden />
      <span style={{ fontFamily: FONT.heading, fontSize: 13.5, fontWeight: 700, color: C.textPrimary }}>{title}</span>
    </div>
    {children}
  </div>
);

const Bar: React.FC<{ label: React.ReactNode; count: number; max: number; color: string }> = ({ label, count, max, color }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
    <div style={{ width: 120, flexShrink: 0, fontFamily: FONT.body, fontSize: 12, color: C.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</div>
    <div style={{ flex: 1, height: 18, backgroundColor: C.bgSection, borderRadius: RADIUS.sm, overflow: 'hidden' }}>
      <div style={{ width: `${max > 0 ? Math.max(6, (count / max) * 100) : 0}%`, height: '100%', backgroundColor: color, borderRadius: RADIUS.sm, transition: 'width 0.3s ease' }} />
    </div>
    <div style={{ width: 26, textAlign: 'right', fontFamily: FONT.body, fontSize: 12, fontWeight: 700, color: C.textPrimary }}>{count}</div>
  </div>
);

const VolumeChart: React.FC<{ data: EntityInsights['volume'] }> = ({ data }) => {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 70 }}>
      {data.map((d) => (
        <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }} title={`${d.date}: ${d.count}`}>
          <div style={{ width: '100%', height: `${(d.count / max) * 54}px`, minHeight: d.count > 0 ? 4 : 2, backgroundColor: d.count > 0 ? C.primary : C.border, borderRadius: 3 }} />
          <span style={{ fontFamily: FONT.body, fontSize: 8.5, color: C.textMuted }}>{d.date.slice(8, 10)}</span>
        </div>
      ))}
    </div>
  );
};

export const AuditInsightsView: React.FC<{ data: EntityInsights }> = ({ data }) => {
  const fieldMax = Math.max(1, ...data.hotFields.map((f) => f.count));
  const editorMax = Math.max(1, ...data.topEditors.map((e) => e.count));
  const catMax = Math.max(1, ...data.categoryMix.map((c) => c.count));

  return (
    <div className="ci-fade-in" style={{ paddingTop: 4 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 14 }}>
        <Kpi icon="bi bi-layers" label="Revisions" value={data.totalRevisions} accent="primary" />
        <Kpi icon="bi bi-pencil-square" label="Field changes" value={data.totalChanges} accent="blue" />
        <Kpi icon="bi bi-people" label="Editors" value={data.distinctEditors} accent="purple" />
        <Kpi icon="bi bi-arrow-counterclockwise" label="Restores" value={data.restoreCount} accent="amber" />
      </div>

      <div style={{ marginBottom: 14 }}>
        <Panel title="Activity — last 14 days" icon="bi bi-activity">
          <VolumeChart data={data.volume} />
          <div style={{ fontFamily: FONT.body, fontSize: 11, color: C.textMuted, marginTop: 8 }}>
            Last changed {fromNow(data.lastChangedAt)} · first changed {fromNow(data.firstChangedAt)}
          </div>
        </Panel>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14, marginBottom: 14 }}>
        <Panel title="Most-changed fields" icon="bi bi-fire">
          {data.hotFields.map((f) => <Bar key={f.field} label={f.label} count={f.count} max={fieldMax} color={C.primary} />)}
        </Panel>
        <Panel title="Change categories" icon="bi bi-pie-chart">
          {data.categoryMix.map((c) => {
            const meta = categoryMeta(c.category);
            const { color } = ICON_COLORS[meta.accent] ?? ICON_COLORS.primary;
            return (
              <Bar key={c.category} label={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><i className={meta.icon} style={{ fontSize: 11, color }} aria-hidden />{meta.label}</span>} count={c.count} max={catMax} color={color} />
            );
          })}
        </Panel>
      </div>

      <Panel title="Top editors" icon="bi bi-person-badge">
        {data.topEditors.map((e) => (
          <div key={e.actorId} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: RADIUS.md, backgroundColor: C.primaryLight, color: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT.heading, fontWeight: 700, fontSize: 11, flexShrink: 0 }} aria-hidden>
              {initials(e.name.split(' ')[0], e.name.split(' ')[1])}
            </div>
            <div style={{ flex: 1, fontFamily: FONT.body, fontSize: 13, color: C.textPrimary }}>{e.name}</div>
            <div style={{ flex: 1, height: 14, backgroundColor: C.bgSection, borderRadius: RADIUS.sm, overflow: 'hidden', maxWidth: 160 }}>
              <div style={{ width: `${Math.max(8, (e.count / editorMax) * 100)}%`, height: '100%', backgroundColor: C.purple, borderRadius: RADIUS.sm }} />
            </div>
            <div style={{ width: 26, textAlign: 'right', fontFamily: FONT.body, fontSize: 12, fontWeight: 700, color: C.textPrimary }}>{e.count}</div>
          </div>
        ))}
      </Panel>
    </div>
  );
};

export default AuditInsightsView;
