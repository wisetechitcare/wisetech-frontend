import { useState, useEffect } from 'react';
import { getSocket } from '../../../utils/socketClient';
import { Modal, Button } from 'react-bootstrap';
import { KTIcon } from '../../helpers';
import { fetchNotificationsByEmployeeId } from '../../../services/employee';
import { Link, useNavigate } from 'react-router-dom';
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

  const fetchNotifications = async () => {
    try {
      const response = await fetchNotificationsByEmployeeId(employeeId);
      setNotifications(response.data ?? []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const handleOpen = () => {
    setShow(true);
    setNotifications([]);
    fetchNotifications();
    setUnreadCount(0);
  };

  const handleClose = () => setShow(false);

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
        <Modal.Header closeButton className="border-0 pb-1">
          <Modal.Title className="fs-5 fw-bold d-flex align-items-center gap-2">
            <KTIcon iconName="notification-on" className="text-primary fs-3" />
            Notifications
            {unreadCount > 0 && (
              <span className="badge rounded-pill text-white ms-1" style={{ backgroundColor: '#9D4141', fontSize: '0.7rem' }}>
                {unreadCount}
              </span>
            )}
          </Modal.Title>
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
                    <p className="mb-0 fw-semibold small text-truncate" style={{ color: text }}>
                      {n.title}
                    </p>
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

        <Modal.Footer className="border-0 pt-1">
          <Button variant="primary" size="sm" className="w-100" onClick={handleClose}>
            <Link to="employees/notifications" className="text-white text-decoration-none">
              View all notifications
            </Link>
          </Button>
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
            left: 10px; right: 10px; width: calc(100% - 20px);
            height: calc(100vh - 60px); top: 50px;
          }
        }
      `}</style>
    </div>
  );
};

export default NotificationsBell;
