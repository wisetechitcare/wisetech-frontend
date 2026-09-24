import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@redux/store';
import { fetchApprovalAudit } from '@services/employee';
import { usePermission } from '@hooks/usePermission';
import MaterialTable from '@app/modules/common/components/MaterialTable';

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
  const currentUserId = useSelector((s: RootState) => s.auth?.currentUser?.id);
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Cells render exactly what the hand-written <table> rendered; the row data is
  // already flat (real dates/numbers/strings), so sort + search work on values.
  const columns = useMemo(() => [
    {
      accessorKey: 'createdAt',
      header: 'Time',
      Cell: ({ cell }: any) => (
        <span style={{ color: '#a1a5b7', whiteSpace: 'nowrap' }}>{fmt(cell.getValue())}</span>
      ),
    },
    {
      accessorKey: 'actorName',
      header: 'Actor',
      Cell: ({ cell }: any) => <span style={{ fontWeight: 600, color: '#181c32' }}>{cell.getValue()}</span>,
    },
    {
      accessorKey: 'action',
      header: 'Action',
      Cell: ({ cell }: any) => {
        const action = cell.getValue() as string;
        const s = ACTION_STYLE[action] ?? { bg: '#f5f5f5', color: '#a1a5b7' };
        return (
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '2px 8px',
            borderRadius: 10, backgroundColor: s.bg, color: s.color,
            textTransform: 'uppercase', letterSpacing: '0.4px',
          }}>
            {action}
          </span>
        );
      },
    },
    {
      accessorKey: 'level',
      header: 'Level',
      Cell: ({ cell }: any) => (
        <span style={{ color: '#3f4254' }}>{cell.getValue() != null ? `L${cell.getValue()}` : '—'}</span>
      ),
    },
    {
      accessorKey: 'comments',
      header: 'Notes',
      Cell: ({ cell }: any) => {
        const comments = cell.getValue() as string | null;
        return (
          <span style={{ color: '#a1a5b7', fontStyle: comments ? 'italic' : 'normal' }}>
            {comments ? `"${comments}"` : '—'}
          </span>
        );
      },
    },
  ], []);

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

      <MaterialTable
        tableName="ApprovalAudit"
        employeeId={currentUserId}
        data={logs}
        columns={columns}
        hidePagination
        hideExportCenter
        enableColumnActions={false}
      />
    </div>
  );
}

export default ApprovalAuditPanel;
