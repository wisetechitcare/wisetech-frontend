import { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { Modal, Button } from "react-bootstrap";
import { KTIcon } from "../../helpers";
import { fetchNotificationsByEmployeeId } from "../../../services/employee";
import { Link, useNavigate } from "react-router-dom";
import CircleNotificationsIcon from "@mui/icons-material/CircleNotifications";
import { formatNotificationDate } from "../../../utils/date";

const API_URL = import.meta.env.VITE_APP_WISE_TECH_BACKEND;

interface Notification {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  path: string;
}

interface NotificationsProps {
  employeeId: string;
}

const NotificationsBell: React.FC<NotificationsProps> = ({ employeeId }) => {
  const [show, setShow] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const socketRef = useRef<Socket | null>(null);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      const response = await fetchNotificationsByEmployeeId(employeeId);
      setNotifications(response.data);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  const handleOpen = () => {
    setShow(true);
    setNotifications([]);
    fetchNotifications();
    setUnreadCount(0);
  };

  const handleClose = () => {
    setShow(false);
  };

  const handleNavigation = (path: string) => {
    setShow(false);
    navigate(path);
  };

  useEffect(() => {
    if (!employeeId) return;

    if (!socketRef.current) {
      socketRef.current = io(`${API_URL}`, {
        transports: ["websocket"],
        path: "/socket.io/",
      });

      socketRef.current.emit("joinRoom", employeeId);

      socketRef.current.on("newNotification", (notification: Notification) => {
        setNotifications((prev) => [notification, ...prev]);
        if (!show) {
          setUnreadCount((prev) => prev + 1);
        }
      });
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.off("newNotification");
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [employeeId]);

  return (
    <div className="d-flex align-items-center cursor-pointer">
      <div onClick={handleOpen} className="position-relative">
        <KTIcon iconName="notification-on" className="text-muted fs-2qx" />
        {unreadCount > 0 && (
          <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill text-white" style={{backgroundColor:'#9D4141'}}>
            {unreadCount}
          </span>
        )}
      </div>

      <Modal
        show={show}
        onHide={handleClose}
        dialogClassName="custom-modal"
        contentClassName="custom-modal-content"
      >
        <Modal.Header closeButton>
          <Modal.Title>Notifications</Modal.Title>
        </Modal.Header>

        <Modal.Body className="modal-body-scroll">
          {notifications.length > 0 ? (
            notifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleNavigation(notification.path)}
                className="d-flex justify-content-between align-items-center  p-2 mb-2  cursor-pointer"
              >
                <div className="d-flex align-items-center">
                  <CircleNotificationsIcon
                    className="text-muted me-2"
                    style={{ fontSize: "3rem" }}
                  />

                  <div>
                    <p className="mb-0  medium">{notification.message}</p>

                    <p className="mb-0 text-muted small">
                      {formatNotificationDate(notification.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-muted">No notifications available</p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button className="btn btn-primary" onClick={handleClose}>
            <Link to={"employees/notifications"} className="text-white">
              View all notifications
            </Link>
          </Button>
        </Modal.Footer>
      </Modal>

      <style>
        {`
        /* Modal Styling */
        .custom-modal {
          position: fixed;
          top: 70px;
          right: 20px;
          width: 400px;
          height: calc(100vh - 90px);
          margin: 0;
         
          z-index: 1050;
        }
  
        .custom-modal-content {
          height: 100%;
     
          border-radius: 10px;
        }
  
        .custom-modal-content .modal-body-scroll {
          max-height: calc(100vh - 180px);
          min-height: 300px;
          overflow-y: scroll !important;
          padding: 5px;
        }
  
        .custom-modal-content .modal-body-scroll::-webkit-scrollbar {
          width: 12px;
          display: block;
        }
  
        .custom-modal-content .modal-body-scroll::-webkit-scrollbar-thumb {
          background: var(--bs-primary); 
          border-radius: 10px;
        }
  
        .custom-modal-content .modal-body-scroll::-webkit-scrollbar-track {
          background: #f1f1f1;
        }
          
  
        /* For Firefox */
        .custom-modal-content .modal-body-scroll {
          scrollbar-width: thin;
          scrollbar-color: var(--bs-primary) #f1f1f1; 
        }
  
      
        .custom-modal-content .modal-body-scroll::-webkit-scrollbar-button {
          display: none;
        }
  
        .custom-modal.show {
          transform: translateX(0);
          opacity: 1;
        }
  
        .custom-modal.hide {
          transform: translateX(100%);
          opacity: 0;
        }
  
      
        @media (max-width: 768px) {
          .custom-modal {
            left: 20px;
            right: 20px;
            width: calc(100% - 40px); 
            height: calc(100vh - 60px); 
            top: 50px; 
          }
        }
  
        @media (max-width: 576px) {
          .custom-modal {
            left: 10px;
            right: 10px;
            width: calc(100% - 20px);
            height: calc(100vh - 250px);
            top: 40px;
          }
        }

      `}
      </style>
    </div>
  );
};

export default NotificationsBell;
