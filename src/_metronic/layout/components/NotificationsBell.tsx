import { useState, useEffect, useCallback } from 'react';
import { getSocket } from '../../../utils/socketClient';
import { Modal, Button } from 'react-bootstrap';
import { KTIcon } from '../../helpers';
import {
  fetchNotificationsByEmployeeId,
  updateNotificationStatus,
  markAllAsRead,
} from '../../../services/employee';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { formatNotificationDate } from '../../../utils/date';
import {
  getNotificationIcon,
  getNotificationColors,
  getNotificationBorderColor,
  type AttendanceNotificationType,
} from '../../../utils/notificationStyles';

interface Notification {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  path: string;
  status?: AttendanceNotificationType | string;
}

interface NotificationsProps {
  employeeId: string;
}

const NotificationsBell: React.FC<NotificationsProps> = ({ employeeId }) => {
  const [show, setShow] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const navigate = useNavigate();
  const location = useLocation();

  const fetchNotifications = useCallback(async (updateUnread: boolean = false) => {
    try {
      const response = await fetchNotificationsByEmployeeId(employeeId);
      const data = response.data ?? [];
      setNotifications(data);
      if (updateUnread) {
        setUnreadCount(data.length);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]);
      if (updateUnread) {
        setUnreadCount(0);
      }
    }
  }, [employeeId]);

  useEffect(() => {
    if (!employeeId) return;
    fetchNotifications(true);
  }, [employeeId, location.pathname, fetchNotifications]);

  const handleOpen = () => {
    setShow(true);
    setNotifications([]);
    fetchNotifications(false);
    setUnreadCount(0);
  };

  const handleClose = () => setShow(false);

  const handleClearSingle = useCallback(async (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    try {
      await updateNotificationStatus(employeeId, notificationId, true);
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to clear notification:', error);
    }
  }, [employeeId]);

  const handleClearAll = useCallback(async () => {
    try {
      await markAllAsRead(employeeId);
      setNotifications([]);
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to clear all notifications:', error);
    }
  }, [employeeId]);

  const handleNavigation = (path: string) => {
    setShow(false);
    navigate(path);
  };

  // Real-time: socket pushes → prepend to list + badge + toast
  useEffect(() => {
    if (!employeeId) return;

    const socket = getSocket();

    const onNotification = (notification: Notification) => {
      setNotifications((prev) => [notification, ...prev]);
      if (!show) setUnreadCount((prev) => prev + 1);

      // Show a browser-level toast so the employee is alerted even when panel is closed
      toast(
        <div className="d-flex align-items-start gap-2">
          <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>
            {getNotificationIcon(notification.status)}
          </span>
          <div>
            <p className="mb-0 fw-semibold small">{notification.title}</p>
            <p className="mb-0 text-muted" style={{ fontSize: '0.78rem' }}>
              {notification.message.slice(0, 90)}{notification.message.length > 90 ? '…' : ''}
            </p>
          </div>
        </div>,
        {
          position: 'top-right',
          autoClose: 6000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          style: {
            borderLeft: `4px solid ${getNotificationBorderColor(notification.status)}`,
            borderRadius: '8px',
          },
        },
      );
    };

    socket.on('newNotification', onNotification);
    return () => { socket.off('newNotification', onNotification); };
  }, [employeeId, show]);

  return (
    <div className="d-flex align-items-center cursor-pointer">
      {/* Bell icon with animated badge */}
      <div onClick={handleOpen} className="position-relative" title="Notifications">
        <KTIcon iconName="notification-on" className="text-muted fs-2qx" />
        {unreadCount > 0 && (
          <span
            className="position-absolute top-0 start-100 translate-middle badge rounded-pill text-white notification-badge-pulse"
            style={{ backgroundColor: '#9D4141', fontSize: '0.65rem', minWidth: '18px' }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </div>

      {/* Side-panel modal */}
      <Modal
        show={show}
        onHide={handleClose}
        dialogClassName="notification-side-panel"
        contentClassName="notification-panel-content"
      >
        <Modal.Header className="border-0 pb-1 d-flex align-items-center justify-content-between">
          <Modal.Title className="fs-5 fw-bold d-flex align-items-center gap-2">
            <KTIcon iconName="notification-on" className="text-primary fs-3" />
            Notifications
            {notifications.length > 0 && (
              <span className="badge rounded-pill text-white ms-1" style={{ backgroundColor: '#9D4141', fontSize: '0.7rem' }}>
                {notifications.length}
              </span>
            )}
          </Modal.Title>
          <div className="d-flex align-items-center gap-3">
            {notifications.length > 0 && (
              <button
                onClick={handleClearAll}
                className="btn btn-sm btn-light-danger fw-semibold fs-8 py-1 px-3 rounded-pill"
                style={{ transition: 'all 0.15s' }}
              >
                Clear all
              </button>
            )}
            <button
              type="button"
              className="btn btn-icon btn-sm btn-active-light-primary border-0 bg-transparent p-0"
              onClick={handleClose}
              style={{ width: '28px', height: '28px' }}
            >
              <KTIcon iconName="cross" className="fs-2 text-gray-500" />
            </button>
          </div>
        </Modal.Header>

        <Modal.Body className="notification-scroll p-2">
          {notifications.length > 0 ? (
            notifications.map((n) => {
              const { bg, text } = getNotificationColors(n.status);
              const borderColor = getNotificationBorderColor(n.status);
              const icon = getNotificationIcon(n.status);
              return (
                <div
                  key={n.id}
                  onClick={() => handleNavigation(n.path)}
                  className="d-flex align-items-start gap-3 p-3 mb-2 rounded-3 cursor-pointer notification-item"
                  style={{
                    background: bg,
                    borderLeft: `4px solid ${borderColor}`,
                    transition: 'box-shadow 0.15s',
                  }}
                >
                  {/* Type icon */}
                  <span
                    className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                    style={{
                      width: 40,
                      height: 40,
                      background: borderColor + '20',
                      fontSize: '1.35rem',
                    }}
                  >
                    {icon}
                  </span>

                  <div className="flex-grow-1 overflow-hidden">
                    <div className="d-flex justify-content-between align-items-start gap-2">
                      <p className="mb-0 fw-semibold small text-truncate" style={{ color: text, flex: 1 }}>
                        {n.title ? n.title.replace(/^\?\s*/, '') : ''}
                      </p>
                      <button
                        onClick={(e) => handleClearSingle(e, n.id)}
                        className="btn btn-icon btn-sm btn-active-light-danger p-0 border-0 bg-transparent"
                        style={{ width: '20px', height: '20px', minWidth: '20px' }}
                        title="Clear notification"
                      >
                        <KTIcon iconName="cross" className="fs-6 text-muted text-hover-danger" />
                      </button>
                    </div>
                    <p className="mb-1 text-muted" style={{ fontSize: '0.78rem', lineHeight: 1.4 }}>
                      {n.message}
                    </p>
                    <p className="mb-0 text-muted" style={{ fontSize: '0.72rem' }}>
                      {formatNotificationDate(n.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="d-flex flex-column align-items-center justify-content-center py-5 text-muted">
              <KTIcon iconName="notification" className="fs-2tx mb-3 opacity-25" />
              <p className="mb-0 small">You're all caught up!</p>
            </div>
          )}
        </Modal.Body>

        <Modal.Footer className="border-top pt-3 pb-5 pb-lg-3 px-4 bg-body" style={{ zIndex: 10 }}>
          <Link to="/employees/notifications" className="w-100 text-decoration-none" onClick={handleClose}>
            <Button variant="primary" className="w-100 py-3 fw-semibold fs-7" style={{ borderRadius: '8px' }}>
              View all notifications
            </Button>
          </Link>
        </Modal.Footer>
      </Modal>

      <style>{`
        /* Pulse animation on badge */
        @keyframes notif-pulse {
          0%   { box-shadow: 0 0 0 0 rgba(157,65,65,.6); }
          70%  { box-shadow: 0 0 0 6px rgba(157,65,65,0); }
          100% { box-shadow: 0 0 0 0 rgba(157,65,65,0); }
        }
        .notification-badge-pulse { animation: notif-pulse 1.8s infinite; }

        @keyframes slideUpMobile {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }

        /* Side-panel positioning */
        .notification-side-panel {
          position: fixed;
          top: 68px;
          right: 18px;
          width: 380px;
          margin: 0;
          height: calc(100vh - 88px);
          z-index: 1050;
        }
        .notification-panel-content {
          height: 100%;
          border-radius: 14px;
          box-shadow: 0 8px 32px rgba(0,0,0,.14);
          display: flex;
          flex-direction: column;
        }
        .notification-scroll {
          flex: 1;
          overflow-y: auto;
          max-height: calc(100vh - 200px);
        }
        .notification-scroll::-webkit-scrollbar { width: 5px; }
        .notification-scroll::-webkit-scrollbar-thumb {
          background: var(--bs-primary);
          border-radius: 10px;
        }
        .notification-item:hover {
          box-shadow: 0 2px 10px rgba(0,0,0,.09);
          cursor: pointer;
        }

        @media (max-width: 768px) {
          .notification-side-panel {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            height: 100% !important;
            margin: 0 !important;
            z-index: 999999 !important;
            animation: slideUpMobile 0.28s cubic-bezier(0.32, 0.94, 0.6, 1) forwards !important;
          }
          .notification-panel-content {
            height: 100% !important;
            border-radius: 0 !important;
            border: none !important;
          }
          .notification-scroll {
            max-height: calc(100vh - 120px) !important;
          }
        }
      `}</style>
    </div>
  );
};

export default NotificationsBell;
