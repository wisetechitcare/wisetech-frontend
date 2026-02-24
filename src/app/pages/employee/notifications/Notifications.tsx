import { useState, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { RootState } from "@redux/store";
import {
  fetchNotificationsAllByEmployeeId,
  markAllAsRead,
} from "../../../../services/employee";
import CircleNotificationsIcon from "@mui/icons-material/CircleNotifications";
import { formatNotificationDate } from "../../../../utils/date";
import { Pagination, Spinner, Alert } from "react-bootstrap";

interface Notification {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  path: string;
}

const Notifications: React.FC = () => {
  const employeeId = useSelector(
    (state: RootState) => state.employee.currentEmployee.id
  );
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const limit = 10;

  const fetchNotifications = useCallback(async () => {
    if (!employeeId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetchNotificationsAllByEmployeeId(
        employeeId,
        page,
        limit
      );

      setNotifications(response.data.notifications || []);
      setTotalPages(response.data.totalPages || 1);
    } catch (error) {
      console.error("Error fetching notifications or (No notifications found):", error);
      // setError("Failed to load notifications. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [employeeId, page, limit]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Handle marking all notifications as read
  const handleMarkAllAsRead = async () => {
    if (!employeeId) return;

    setLoading(true);
    try {
      await markAllAsRead(employeeId);
      setNotifications([]);
      setPage(1);
      setTotalPages(1);
    } catch (error) {
      console.error("Error marking all as read or (No notifications found):", error);
      setError("Failed to mark notifications as read.");
    } finally {
      setLoading(false);
    }
  };

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  // Render pagination buttons
  const renderPagination = () => (
    <Pagination>
      <Pagination.First
        onClick={() => handlePageChange(1)}
        disabled={page === 1}
      />
      <Pagination.Prev
        onClick={() => handlePageChange(page - 1)}
        disabled={page === 1}
      />

      {[...Array(totalPages)].map((_, index) => (
        <Pagination.Item
          key={index + 1}
          active={index + 1 === page}
          onClick={() => handlePageChange(index + 1)}
        >
          {index + 1}
        </Pagination.Item>
      ))}

      <Pagination.Next
        onClick={() => handlePageChange(page + 1)}
        disabled={page === totalPages}
      />
      <Pagination.Last
        onClick={() => handlePageChange(totalPages)}
        disabled={page === totalPages}
      />
    </Pagination>
  );

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="font-barlow">Notifications</h1>
        <button
          onClick={handleMarkAllAsRead}
          className="btn btn-primary"
          disabled={notifications.length === 0}
        >
          {loading ? (
            <Spinner animation="border" size="sm" />
          ) : (
            "Mark all as read"
          )}
        </button>
      </div>

      {loading ? (
        <div className="text-center">
          <Spinner animation="border" />
        </div>
      ) : error ? (
        <Alert variant="danger">{error}</Alert>
      ) : (
        <div className="bg-white rounded-4 p-2">
          {notifications.length > 0 ? (
            notifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleNavigation(notification.path)}
                className="d-flex justify-content-between align-items-center p-2 mb-2 cursor-pointer"
                style={{ cursor: "pointer" }}
              >
                <div className="d-flex align-items-center">
                  <CircleNotificationsIcon
                    className="text-muted me-2"
                    style={{ fontSize: "3rem" }}
                  />

                  <div>
                    <p className="mb-0 medium">{notification.message}</p>
                    <p className="mb-0 text-muted small">
                      {formatNotificationDate(notification.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p>No notifications available</p>
          )}
        </div>
      )}

      <div className="d-flex justify-content-center mt-4">
        {renderPagination()}
      </div>
    </div>
  );
};

export default Notifications;
