import { useEffect, useState } from 'react';
import { fetchApprovalAudit } from '@services/employee';
import { usePermission } from '@hooks/usePermission';

interface AuditEntry {
  id: string;
  action: string;
  actorId: string;
  actorName: string;
  level?: number | null;
  comments?: string | null;
  requestModel: string;
  requestId: string;
  createdAt: string;
}

interface Props {
  instanceId: string;
}

const ACTION_STYLE: Record<string, { bg: string; color: string }> = {
  approved: { bg: '#e8fff3', color: '#50cd89' },
  rejected: { bg: '#fff5f8', color: '#f1416c' },
  created:  { bg: '#f1faff', color: '#009ef7' },
};

function fmt(d: string) {
  return new Date(d).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function ApprovalAuditPanel({ instanceId }: Props) {
  const canAudit = usePermission('approvals.audit.all');
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!canAudit) return;
    setLoading(true);
    setError(false);
    fetchApprovalAudit(instanceId)
      .then((res) => setLogs(res?.data ?? res ?? []))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [instanceId, canAudit]);

  if (!canAudit) {
    return (
      <div style={{ padding: '12px 0', color: '#a1a5b7', fontSize: 13 }}>
        Audit access restricted.
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: '16px 0', textAlign: 'center' }}>
        <span className='spinner-border spinner-border-sm text-primary me-2' />
        <span style={{ fontSize: 13, color: '#a1a5b7' }}>Loading audit trail...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '12px 0', color: '#f1416c', fontSize: 13 }}>
        Failed to load audit trail.
      </div>
    );
  }

  if (!logs.length) {
    return (
      <div style={{ padding: '12px 0', color: '#a1a5b7', fontSize: 13 }}>
        No audit entries found.
      </div>
    );
  }

  return (
    <div>
      <div style={{
        fontSize: 11, fontWeight: 700, color: '#a1a5b7',
        textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10,
      }}>
        Audit Trail
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #eff2f5' }}>
              {['Time', 'Actor', 'Action', 'Level', 'Notes'].map((h) => (
                <th key={h} style={{
                  padding: '6px 10px', textAlign: 'left',
                  fontWeight: 700, color: '#a1a5b7', fontSize: 11,
                  textTransform: 'uppercase', letterSpacing: '0.4px',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => {
              const s = ACTION_STYLE[log.action] ?? { bg: '#f5f5f5', color: '#a1a5b7' };
              return (
                <tr key={log.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                  <td style={{ padding: '8px 10px', color: '#a1a5b7', whiteSpace: 'nowrap' }}>
                    {fmt(log.createdAt)}
                  </td>
                  <td style={{ padding: '8px 10px', fontWeight: 600, color: '#181c32' }}>
                    {log.actorName}
                  </td>
                  <td style={{ padding: '8px 10px' }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 8px',
                      borderRadius: 10, backgroundColor: s.bg, color: s.color,
                      textTransform: 'uppercase', letterSpacing: '0.4px',
                    }}>
                      {log.action}
                    </span>
                  </td>
                  <td style={{ padding: '8px 10px', color: '#3f4254' }}>
                    {log.level != null ? `L${log.level}` : '—'}
                  </td>
                  <td style={{ padding: '8px 10px', color: '#a1a5b7', fontStyle: log.comments ? 'italic' : 'normal' }}>
                    {log.comments ? `"${log.comments}"` : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ApprovalAuditPanel;
