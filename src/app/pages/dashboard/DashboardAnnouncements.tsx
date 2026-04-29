import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Modal } from "react-bootstrap";
import SVG from "react-inlinesvg";
import CloseIcon from "@mui/icons-material/Close";
import { miscellaneousIcons } from "../../../_metronic/assets/miscellaneousicons";
import { formatDate } from "@utils/date";
import { getAllAnnouncements } from "@services/company";
import { RootState, store } from "@redux/store";
import { ShareWith } from "@constants/statistics";

interface IShareWith {
  EVERYONE: string;
  SELECTED_MEMBERS: string;
}

interface IAnnouncement {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  shareWith: IShareWith;
  departmentId?: string | null;
  fromDate: string;
  toDate: string;
  createdAt: string;
  isActive: boolean;
  selectedUsers?: any[];
  department?: any | null;
}

const DashboardAnnouncements = () => {
  const [announcements, setAnnouncements] = useState<IAnnouncement[]>([]);
  const [currentAnnouncement, setcurrentAnnouncement] = useState<IAnnouncement | null>(null);
  const [currAnnouncementIndex, setCurrAnnouncementIndex] = useState(0);
  const [show, setShow] = useState(false);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);

  console.log("Current Announcement: ===================>", currentAnnouncement);
  const navigate = useNavigate();

  // Extract userId as a primitive to prevent unnecessary re-renders and API calls
  const employeeUserId = useSelector(
    (state: RootState) => state.employee.currentEmployee?.userId
  );

  // Filter out expired announcements (where toDate has passed)
  const filteredAnnouncements = useMemo(() => {
    const now = new Date().getTime();
    return announcements.filter((announcement) => {
      const toTime = new Date(announcement.toDate).getTime();
      return toTime >= now; // Only show announcements where toDate is in the future or current
    });
  }, [announcements]);

  // Sync currentAnnouncement with currAnnouncementIndex
  useEffect(() => {
    if (filteredAnnouncements?.length > 0 && currAnnouncementIndex >= 0 && currAnnouncementIndex < filteredAnnouncements.length) {
      setcurrentAnnouncement(filteredAnnouncements[currAnnouncementIndex]);
    }
  }, [currAnnouncementIndex, filteredAnnouncements]);

  // Auto scroll through announcements
  useEffect(() => {
    if (!filteredAnnouncements?.length || !autoScrollEnabled) {
      return;
    }

    const timer = setInterval(() => {
      setCurrAnnouncementIndex((prev) => prev === filteredAnnouncements.length - 1 ? 0 : prev + 1);
    }, 5000); // Change announcement every 5 seconds

    return () => clearInterval(timer);
  }, [filteredAnnouncements, autoScrollEnabled]);

  // Fetch announcements
  useEffect(() => {
    if (!employeeUserId) {
      return;
    }

    async function fetchAnnouncements() {
      try {
        const {
          data: { announcements },
        } = await getAllAnnouncements();

        if (announcements?.length > 0) {
          setcurrentAnnouncement(announcements[0]);
          setAnnouncements(announcements);
        } else {
          setcurrentAnnouncement(null);
          setAnnouncements([]);
        }
      } catch (error) {
        console.error('Error fetching announcements:', error);
        setcurrentAnnouncement(null);
        setAnnouncements([]);
      }
    }

    fetchAnnouncements();
  }, [employeeUserId]);

  const checkIfAnnouncementShouldBeShown = (announcement: any): boolean => {
    const employeeDetails = store.getState().employee.currentEmployee;

    // 1. check for date range if not in range return false
    if (announcement?.fromDate && announcement?.toDate) {
      const dateToday = new Date().getTime();
      const newFromDate = new Date(announcement?.fromDate).getTime();
      const newToDate = new Date(announcement?.toDate).getTime();
      if (newFromDate > dateToday || newToDate < dateToday) {
        return false;
      }
    }

    // 2. checkFor shareWith value, if (EVERYONE) show it to all by default
    if (announcement?.shareWith === ShareWith.EVERYONE) {
      return true;
    }

    // 4. check for shareWith value, if (USER) check if the user is the target
    if (announcement?.shareWith == ShareWith.SELECTED_MEMBERS) {
      if (!announcement?.selectedUsers?.length) return false;
      const selectedUsers = announcement?.selectedUsers;
      const filteredUsers = selectedUsers?.filter(
        (user: any) => user?.id === employeeDetails?.userId
      );
      if (filteredUsers?.length > 0) {
        return true;
      }
    }
    return false;
  };

  return (
    <>
      <div className="col-lg-7 col-md-12 mb-3 mb-lg-0 h-100">
        <div className="card border-0 rounded-3 h-100" style={{ boxShadow: '12px 12px 44px 0px rgba(0,0,0,0.08)' }}>
          <div className="card-body p-3 p-md-4">
            {/* Header */}
            <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
              <h5 className="fw-bold mb-0" style={{ fontFamily: 'Barlow', fontSize: 'clamp(16px, 4vw, 20px)', letterSpacing: '0.2px' }}>
                Announcements
              </h5>
              <button
                type="button"
                className="btn btn-sm"
                style={{
                  borderColor: '#9d4141',
                  color: '#9d4141',
                  fontFamily: 'Inter',
                  fontSize: '14px',
                  fontWeight: '500',
                  borderRadius: '6px',
                  border: '1px solid #9d4141',
                  padding: '8px 18px',
                  whiteSpace: 'nowrap',
                }}
                onClick={() => navigate('/company/announcements')}
              >
                View all
              </button>
            </div>

            {/* Announcement Content */}
            {filteredAnnouncements?.length > 0 && currentAnnouncement ? (
              <div
                className="cursor-pointer"
                onClick={() => {
                  setShow(true);
                  setAutoScrollEnabled(false);
                }}
              >
                <div className="d-flex flex-column flex-md-row gap-3">
                  {/* Image */}
                  {currentAnnouncement?.imageUrl && (
                    <div
                      className="flex-shrink-0 mx-auto mx-md-0"
                      style={{
                        width: '100%',
                        maxWidth: '225px',
                        height: '168px'
                      }}
                    >
                      <img
                        src={currentAnnouncement.imageUrl}
                        alt="Announcement"
                        className="rounded-2 w-100 h-100"
                        style={{ objectFit: 'cover' }}
                      />
                    </div>
                  )}

                  {/* Content */}
                  <div className="d-flex flex-column justify-content-center flex-grow-1">
                    <div className="mb-3">
                      {/* Title */}
                      <h6 className="fw-semibold mb-2" style={{
                        fontFamily: 'Barlow',
                        fontSize: 'clamp(16px, 3.5vw, 18px)',
                        letterSpacing: '0.18px',
                        lineHeight: '1.2'
                      }}>
                        {currentAnnouncement.title}
                      </h6>

                      {/* Description */}
                      <p className="text-muted mb-2" style={{
                        fontSize: 'clamp(11px, 2.5vw, 12px)',
                        lineHeight: '1.4',
                        fontFamily: 'Inter'
                      }}>
                        {currentAnnouncement.description?.length > 150
                          ? currentAnnouncement.description.slice(0, 150) + ".."
                          : currentAnnouncement.description}
                      </p>
                    </div>

                    {/* Posted Date */}
                    {currentAnnouncement.createdAt && (
                      <p className="text-muted mb-3" style={{
                        fontSize: 'clamp(11px, 2.5vw, 12px)',
                        fontWeight: '500',
                        fontFamily: 'Inter',
                        color: '#70829a'
                      }}>
                        Posted on {formatDate(new Date(currentAnnouncement.createdAt))}
                      </p>
                    )}

                    {/* Bottom Controls */}
                    <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                      {/* Pagination Dots */}
                      {filteredAnnouncements.length > 1 && (
                        <div className="d-flex align-items-center gap-1">
                          {filteredAnnouncements.map((_, index) => (
                            <span
                              key={index}
                              onClick={(e) => {
                                e.stopPropagation();
                                setCurrAnnouncementIndex(index);
                              }}
                              style={{
                                width: currAnnouncementIndex === index ? '6px' : '4px',
                                height: currAnnouncementIndex === index ? '6px' : '4px',
                                borderRadius: '50%',
                                backgroundColor: currAnnouncementIndex === index ? '#9d4141' : '#bec7d4',
                                cursor: 'pointer',
                                display: 'inline-block',
                                transition: 'all 0.2s'
                              }}
                            />
                          ))}
                        </div>
                      )}

                      {/* Navigation Arrows */}
                      {filteredAnnouncements.length > 1 && (
                        <div className="d-flex align-items-center gap-2">
                          <button
                            className="btn btn-link p-0 border-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              currAnnouncementIndex > 0
                                ? setCurrAnnouncementIndex((prev) => prev - 1)
                                : setCurrAnnouncementIndex(filteredAnnouncements.length - 1);
                            }}
                            style={{ width: '28px', height: '28px' }}
                          >
                            <i className="fa fa-chevron-left" style={{ fontSize: '14px', color: '#6c757d' }}></i>
                          </button>
                          <button
                            className="btn btn-link p-0 border-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              currAnnouncementIndex < filteredAnnouncements.length - 1
                                ? setCurrAnnouncementIndex((prev) => prev + 1)
                                : setCurrAnnouncementIndex(0);
                            }}
                            style={{ width: '28px', height: '28px' }}
                          >
                            <i className="fa fa-chevron-right" style={{ fontSize: '14px', color: '#6c757d' }}></i>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div
                className="d-flex align-items-center justify-content-center gap-3 flex-wrap w-100"
                style={{ minHeight: '200px' }}
              >
                <span className="menu-icon">
                  <SVG
                    src={miscellaneousIcons.announcementHorn}
                    className="menu-svg-icon"
                  />
                </span>
                <div>
                  <h6 className="fw-semibold mb-1">No Announcements Found</h6>
                  <p className="text-muted mb-0 small">
                    No announcements have been created yet.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Announcement Details Modal */}
      <Modal
        show={show}
        onHide={() => {
          setShow(false);
          setAutoScrollEnabled(true); // Resume auto-scroll when modal closes
        }}
        className="announcement-detail-modal"
      >
        <div
          className="pt-4 d-flex justify-content-center"
          style={{ color: "#9D4141", fontSize: "14px", fontWeight: "500" }}
        >
          ANNOUNCEMENT
        </div>

        {/* Custom Close Button */}
        <button
          onClick={() => setShow(false)}
          style={{
            position: "absolute",
            top: "10px",
            right: "15px",
            background: "none",
            border: "none",
            fontSize: "18px",
            cursor: "pointer",
            color: "#6c757d",
          }}
        >
          <CloseIcon style={{ fontSize: "20px" }} />
        </button>

        <Modal.Header className="border-0">
          <Modal.Title className="w-100">
            <div
              className="d-flex justify-content-center card-title text-center h5 w-100"
              style={{
                fontFamily: "barlow",
                fontSize: "18px",
                fontWeight: "600",
              }}
            >
              {currentAnnouncement?.title}
            </div>
            <div className="d-flex justify-content-center align-items-center gap-3 w-100">
              {currentAnnouncement?.createdAt && (
                <p
                  className="card-text mt-1 text-center"
                  style={{ fontSize: "10px", color: "#6c757d" }}
                >
                  Posted On:{" "}
                  {formatDate(new Date(currentAnnouncement?.createdAt))}
                </p>
              )}
            </div>
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <div className="d-flex flex-column align-items-center justify-content-center w-100">
            <div className="d-flex justify-content-center w-100">
              <img
                src={currentAnnouncement?.imageUrl}
                className="text-center"
                style={{
                  width: "80%",
                  height: "auto",
                  objectFit: "contain",
                  margin: "0 auto 1rem",
                  borderRadius: "7px",
                }}
              />
            </div>
            <div>
              <p className="card-text small align-center my-2 fs-7">
                {currentAnnouncement?.description}
              </p>
            </div>
            {filteredAnnouncements?.length > 1 && (
              <div className="d-flex align-items-center gap-5 my-4">
                {/* icons for left and right shift */}
                <div
                  className="bg-primary cursor-pointer py-2 px-3 rounded"
                  onClick={() =>
                    currAnnouncementIndex > 0
                      ? setCurrAnnouncementIndex((prev) => prev - 1)
                      : setCurrAnnouncementIndex(filteredAnnouncements?.length - 1)
                  }
                >
                  <i className="fa fa-arrow-left text-white"></i>
                </div>
                <div
                  className="bg-primary cursor-pointer py-2 px-3 rounded"
                  onClick={() =>
                    currAnnouncementIndex < filteredAnnouncements?.length - 1
                      ? setCurrAnnouncementIndex((prev) => prev + 1)
                      : setCurrAnnouncementIndex(0)
                  }
                >
                  <i className="fa fa-arrow-right text-white"></i>
                </div>
              </div>
            )}
          </div>
        </Modal.Body>
      </Modal>
    </>
  );
};

export default DashboardAnnouncements;
