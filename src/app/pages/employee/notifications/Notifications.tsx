import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { RootState } from '@redux/store';
import {
  fetchNotificationsAllByEmployeeId,
  markAllAsRead,
} from '../../../../services/employee';
import { formatNotificationDate } from '../../../../utils/date';
import {
  getNotificationIcon,
  getNotificationColors,
  getNotificationBorderColor,
  getNotificationLabel,
  ATTENDANCE_NOTIFICATION_TYPE,
} from '../../../../utils/notificationStyles';
import { Pagination, Spinner, Alert } from 'react-bootstrap';
import { KTIcon } from '../../../../_metronic/helpers';

interface Notification {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  path: string;
  status?: string;
}

// Filter tabs
const FILTER_TABS = [
  { key: 'all',           label: 'All' },
  { key: 'checkin',       label: 'Check-In' },
  { key: 'checkout',      label: 'Checkout' },
  { key: 'late',          label: 'Late / Penalty' },
  { key: 'other',         label: 'Other' },
] as const;

type FilterKey = (typeof FILTER_TABS)[number]['key'];

const CHECKIN_TYPES = new Set([
  ATTENDANCE_NOTIFICATION_TYPE.EARLY_CHECKIN,
  ATTENDANCE_NOTIFICATION_TYPE.CHECKIN_REMINDER,
  ATTENDANCE_NOTIFICATION_TYPE.LATE_WARNING,
]);
const CHECKOUT_TYPES = new Set([
  ATTENDANCE_NOTIFICATION_TYPE.CHECKOUT_REMINDER,
  ATTENDANCE_NOTIFICATION_TYPE.MISSING_CHECKOUT,
]);
const LATE_TYPES = new Set([
  ATTENDANCE_NOTIFICATION_TYPE.LATE_CONFIRMED,
  ATTENDANCE_NOTIFICATION_TYPE.SALARY_DEDUCTION,
]);

function matchesFilter(notification: Notification, filter: FilterKey): boolean {
  if (filter === 'all') return true;
  const s = notification.status ?? '';
  if (filter === 'checkin')  return CHECKIN_TYPES.has(s as any);
  if (filter === 'checkout') return CHECKOUT_TYPES.has(s as any);
  if (filter === 'late')     return LATE_TYPES.has(s as any);
  if (filter === 'other')    return !CHECKIN_TYPES.has(s as any) && !CHECKOUT_TYPES.has(s as any) && !LATE_TYPES.has(s as any);
  return true;
}

const Notifications: React.FC = () => {
  const employeeId = useSelector(
    (state: RootState) => state.employee.currentEmployee.id,
  );
  const navigate = useNavigate();

  const [notifications, setNotifications]   = useState<Notification[]>([]);
  const [page, setPage]                     = useState(1);
  const [totalPages, setTotalPages]         = useState(1);
  const [loading, setLoading]               = useState(false);
  const [clearing, setClearing]             = useState(false);
  const [error, setError]                   = useState<string | null>(null);
  const [activeFilter, setActiveFilter]     = useState<FilterKey>('all');
  const limit = 20;

  const fetchNotifications = useCallback(async () => {
    if (!employeeId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetchNotificationsAllByEmployeeId(employeeId, page, limit);
      setNotifications(response.data.notifications ?? []);
      setTotalPages(response.data.totalPages ?? 1);
    } catch {
      // Silently ignore — empty state shown instead
    } finally {
      setLoading(false);
    }
  }, [employeeId, page, limit]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const handleMarkAllAsRead = async () => {
    if (!employeeId) return;
    setClearing(true);
    try {
      await markAllAsRead(employeeId);
      setNotifications([]);
      setPage(1);
      setTotalPages(1);
    } catch {
      setError('Failed to mark notifications as read. Please try again.');
    } finally {
      setClearing(false);
    }
  };

  const filtered = notifications.filter((n) => matchesFilter(n, activeFilter));

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="container-fluid px-0">

      {/* ── Page header ── */}
      <div className="d-flex justify-content-between align-items-center mb-5">
        <div>
          <h2 className="fw-bold mb-1" style={{ fontFamily: 'var(--bs-font-sans-serif)' }}>
            <KTIcon iconName="notification-on" className="text-primary fs-2x me-2" />
            Notifications
          </h2>
          <p className="text-muted mb-0 small">Your attendance alerts and system messages</p>
        </div>
        <button
          onClick={handleMarkAllAsRead}
          className="btn btn-sm btn-light-primary"
          disabled={notifications.length === 0 || clearing}
        >
          {clearing ? <Spinner animation="border" size="sm" className="me-1" /> : null}
          Mark all as read
        </button>
      </div>

      {/* ── Filter tabs ── */}
      <div className="d-flex gap-2 flex-wrap mb-4">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveFilter(tab.key)}
            className={`btn btn-sm rounded-pill px-4 ${
              activeFilter === tab.key ? 'btn-primary' : 'btn-light'
            }`}
            style={{ fontWeight: activeFilter === tab.key ? 600 : 400, transition: 'all .15s' }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Error ── */}
      {error && <Alert variant="danger" onClose={() => setError(null)} dismissible>{error}</Alert>}

      {/* ── Content ── */}
      {loading ? (
        <div className="d-flex justify-content-center align-items-center py-5">
          <Spinner animation="border" variant="primary" />
        </div>
      ) : filtered.length > 0 ? (
        <div className="d-flex flex-column gap-3">
          {filtered.map((n) => {
            const { bg, text } = getNotificationColors(n.status);
            const borderColor  = getNotificationBorderColor(n.status);
            const icon         = getNotificationIcon(n.status);
            const label        = getNotificationLabel(n.status);

            return (
              <div
                key={n.id}
                onClick={() => navigate(n.path)}
                className="d-flex align-items-start gap-3 p-4 rounded-3 cursor-pointer notification-row"
                style={{
                  background:   bg,
                  borderLeft:   `5px solid ${borderColor}`,
                  cursor:       'pointer',
                  transition:   'box-shadow .15s',
                }}
              >
                {/* Icon badge */}
                <span
                  className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                  style={{
                    width:      48,
                    height:     48,
                    background: borderColor + '22',
                    fontSize:   '1.5rem',
                  }}
                >
                  {icon}
                </span>

                {/* Text */}
                <div className="flex-grow-1 overflow-hidden">
                  <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                    <span
                      className="badge rounded-pill small fw-semibold px-2"
                      style={{ background: borderColor + '22', color: text, fontSize: '0.7rem' }}
                    >
                      {label}
                    </span>
                    <span className="text-muted" style={{ fontSize: '0.72rem' }}>
                      {formatNotificationDate(n.createdAt)}
                    </span>
                  </div>
                  <p className="mb-1 fw-semibold" style={{ color: text, fontSize: '0.9rem' }}>
                    {n.title}
                  </p>
                  <p className="mb-0 text-muted" style={{ fontSize: '0.82rem', lineHeight: 1.5 }}>
                    {n.message}
                  </p>
                </div>

                {/* Chevron */}
                <KTIcon iconName="arrow-right" className="text-muted fs-5 flex-shrink-0 mt-1" />
              </div>
            );
          })}
        </div>
      ) : (
        <div className="d-flex flex-column align-items-center justify-content-center py-5 text-muted">
          <KTIcon iconName="notification" className="fs-5x mb-3 opacity-25" />
          <p className="mb-1 fw-semibold">No notifications here</p>
          <p className="small mb-0">
            {activeFilter === 'all'
              ? "You're all caught up — nothing to show."
              : `No ${FILTER_TABS.find((t) => t.key === activeFilter)?.label.toLowerCase()} notifications.`}
          </p>
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && !loading && (
        <div className="d-flex justify-content-center mt-5">
          <Pagination>
            <Pagination.First onClick={() => setPage(1)} disabled={page === 1} />
            <Pagination.Prev  onClick={() => setPage(page - 1)} disabled={page === 1} />
            {[...Array(totalPages)].map((_, i) => (
              <Pagination.Item
                key={i + 1}
                active={i + 1 === page}
                onClick={() => setPage(i + 1)}
              >
                {i + 1}
              </Pagination.Item>
            ))}
            <Pagination.Next onClick={() => setPage(page + 1)} disabled={page === totalPages} />
            <Pagination.Last onClick={() => setPage(totalPages)} disabled={page === totalPages} />
          </Pagination>
        </div>
      )}

      <style>{`
        .notification-row:hover { box-shadow: 0 4px 16px rgba(0,0,0,.08); }
      `}</style>
    </div>
  );
};

export default Notifications;
