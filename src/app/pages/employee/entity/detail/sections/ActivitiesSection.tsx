import React from 'react';
import dayjs from 'dayjs';
import { useSelector } from 'react-redux';
import type { RootState } from '@redux/store';
import { EmptyState } from '../widgets';
import { employeeUserName, employeeNameById, DASH } from '../entityViewModel';

const TYPE_META: Record<string, { icon: string; color: string }> = {
  call: { icon: 'bi bi-telephone-fill', color: '#3b82f6' },
  meeting: { icon: 'bi bi-people-fill', color: '#7c3aed' },
  email: { icon: 'bi bi-envelope-fill', color: '#0d9488' },
  whatsapp: { icon: 'bi bi-whatsapp', color: '#16a34a' },
  note: { icon: 'bi bi-journal-text', color: '#f5a623' },
  visit: { icon: 'bi bi-geo-alt-fill', color: '#9d4141' },
};
const metaFor = (type?: string) => TYPE_META[(type || '').toLowerCase()] || { icon: 'bi bi-dot', color: '#64748B' };

interface FeedItem {
  ts: number;
  icon: string;
  color: string;
  title: string;
  meta?: string;
  body?: string;
  badge?: string;
  who?: string | null;
}

/**
 * Activities tab — ONE unified timeline for the whole entity: lead + project
 * connections, lifecycle events (created/updated/cancelled), proposal events and
 * the project-created event. There is no second activity widget anywhere.
 */
const ActivitiesSection: React.FC<{ lead: any }> = ({ lead }) => {
  const allEmployees = useSelector((s: RootState) => s.allEmployees?.list) || [];
  const conns: any[] = [...(lead?.connections || []), ...(lead?.project?.connections || [])];
  const items: FeedItem[] = [];

  if (lead?.createdAt) {
    items.push({ ts: new Date(lead.createdAt).getTime(), icon: 'bi bi-plus-circle-fill', color: '#16a34a', title: 'Lead created', who: employeeUserName(lead?.createdBy) });
  }
  if (lead?.updatedAt && lead?.updatedAt !== lead?.createdAt) {
    items.push({ ts: new Date(lead.updatedAt).getTime(), icon: 'bi bi-pencil-fill', color: '#3b82f6', title: 'Lead updated', who: employeeUserName(lead?.updatedBy) });
  }
  if (lead?.project?.createdAt) {
    items.push({ ts: new Date(lead.project.createdAt).getTime(), icon: 'bi bi-kanban-fill', color: '#0d9488', title: 'Became a project', meta: lead?.project?.prefix, who: employeeUserName(lead?.project?.createdBy) });
  }
  if (lead?.isCancelled && lead?.cancellationDate) {
    items.push({ ts: new Date(lead.cancellationDate).getTime(), icon: 'bi bi-x-octagon-fill', color: '#f1416c', title: 'Lead cancelled', body: lead?.reason?.name || lead?.cancellationNote || undefined });
  }
  (lead?.generatedProposals || []).forEach((d: any) => {
    items.push({ ts: new Date(d?.createdAt).getTime(), icon: 'bi bi-file-earmark-text-fill', color: '#7c3aed', title: 'Proposal generated', meta: d?.template?.templateName, body: d?.revisionNumber != null ? `Revision ${d.revisionNumber}` : undefined, who: employeeUserName(d?.creator) });
  });
  conns.forEach(c => {
    const m = metaFor(c?.type);
    items.push({
      ts: new Date(c?.date || c?.createdAt).getTime(),
      icon: m.icon,
      color: m.color,
      title: c?.type ? c.type.charAt(0).toUpperCase() + c.type.slice(1) : 'Activity',
      meta: c?.status,
      body: c?.description || c?.notes,
      badge: c?.outcome,
      who: employeeNameById(allEmployees, c?.createdBy),
    });
  });
  items.sort((a, b) => b.ts - a.ts);

  if (items.length === 0) {
    return (
      <EmptyState
        icon="bi bi-chat-square-dots"
        title="No activity yet"
        message="Calls, meetings, emails and notes logged against this lead will appear here as a timeline."
        hint="Activities come from the connections log"
      />
    );
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, padding: '22px 24px' }}>
      <div style={{ position: 'relative', paddingLeft: 8 }}>
        {items.map((it, i) => (
          <div key={i} style={{ display: 'flex', gap: 14, position: 'relative', paddingBottom: i === items.length - 1 ? 0 : 22 }}>
            {i !== items.length - 1 && <div style={{ position: 'absolute', left: 17, top: 36, bottom: 0, width: 2, background: '#EEF2F6' }} />}
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: `${it.color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 1 }}>
              <i className={it.icon} style={{ color: it.color, fontSize: 15 }} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'Barlow', fontWeight: 700, fontSize: 14, color: '#1E293B' }}>{it.title}</span>
                {it.meta && <span style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: 600, color: '#64748B', background: '#F1F5F9', borderRadius: 999, padding: '2px 8px' }}>{it.meta}</span>}
                {it.badge && <span style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: 600, color: '#0A5C2A', background: '#EDFDF3', borderRadius: 999, padding: '2px 8px' }}>{it.badge}</span>}
              </div>
              {it.body && <div style={{ fontFamily: 'Inter', fontSize: 13, color: '#475569', marginTop: 3, whiteSpace: 'pre-wrap' }}>{it.body}</div>}
              <div style={{ fontFamily: 'Inter', fontSize: 11, color: '#94A3B8', marginTop: 4 }}>
                {isFinite(it.ts) ? dayjs(it.ts).format('DD MMM YYYY, h:mm A') : DASH}
                {it.who ? ` · ${it.who}` : ''}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ActivitiesSection;
