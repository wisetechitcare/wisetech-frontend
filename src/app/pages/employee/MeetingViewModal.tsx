import { RootState } from "@redux/store";
import { fetchAllEmployees, getMeetings } from "@services/employee";
import dayjs from "dayjs";
import { useCallback, useEffect, useState } from "react";
import { Modal, Button } from "react-bootstrap";
import CopyToClipboard from "react-copy-to-clipboard";
import { useSelector } from "react-redux";
import EditMeetingModal from "./EditMeetingModal";
import { useEventBus } from "@hooks/useEventBus";
import { EVENT_KEYS } from "@constants/eventKeys";

interface Meetings {
  id: string;
  title: string;
  isOnline: boolean;
  startDate: string;
  endDate: string;
  employeeId: string;
  participants: string[];
  participantNames?: string[];
  organizerName: string;
  organizerId: string;
  description?: string;
  meetingLink?: string;
  location?: string;
}

interface EmployeeUser {
  firstName: string;
  lastName: string;
}

interface Employee {
  id: string;
  users: EmployeeUser;
}

interface MeetingViewModalProps {
  show?: boolean;
  onClose?: () => void;
  meetingId?: string;
}

const MeetingViewModal = ({ show, onClose, meetingId }: MeetingViewModalProps) => {

    // console.log("meetingId", meetingId);
    
  const [viewModelMeeting, setViewModelMeeting] = useState<Meetings | null>(null);
  const [copied, setCopied] = useState(false);
  const employeeId = useSelector((state: RootState) => state.employee.currentEmployee?.id);
  const [employees, setEmployees] = useState<Record<string, Employee>>({});
  const [loadingEmployees, setLoadingEmployees] = useState<boolean>(true);
  const [editingMeeting, setEditingMeeting] = useState<Meetings | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [participants, setParticipants] = useState<{ label: string; value: string }[]>([]);
  const [meetings, setMeetings] = useState<Meetings[]>([]);

  const getEmployeeFullName = (employee: Employee | undefined): string => {
    if (!employee || !employee.users) return "Unknown";
    const { firstName, lastName } = employee.users;
    return `${firstName} ${lastName}`.trim();
  };

  const fetchAllEmployeesData = useCallback(async () => {
    try {
      const response = await fetchAllEmployees();
      const empMap: Record<string, Employee> = {};
      response?.data?.employees?.forEach((e: Employee) => (empMap[e.id] = e));
      setEmployees(empMap);
      const formattedParticipants = response.data.employees.map((emp: any) => ({
        label: `${emp.users.firstName} ${emp.users.lastName}`,
        value: emp.id,
      }));
      setParticipants(formattedParticipants);
    } catch (err) {
      console.error("Error fetching employees:", err);
    } finally {
      setLoadingEmployees(false);
    }
  }, []);

  const formatMeetingData = (meeting: any): Meetings => {
    const participantIds: string[] =
      typeof meeting.participants === "string"
        ? JSON.parse(meeting.participants)
        : meeting.participants || [];

    return {
      ...meeting,
      participantNames: participantIds.map((id: string) =>
        getEmployeeFullName(employees[id])
      ),
      organizerName: getEmployeeFullName(employees[meeting.employeeId]),
    };
  };

  const fetchMeetingById = useCallback(async () => {
    if (!meetingId || !employeeId || loadingEmployees) return;
    try {
      const response = await getMeetings(employeeId);
      const matched = response?.data?.find((m: any) => m.id === meetingId);
      if (matched) {
        setViewModelMeeting(formatMeetingData(matched));
      }
    } catch (err) {
      console.error("Failed to fetch meeting:", err);
    }
  }, [meetingId, employeeId, employees, loadingEmployees]);

  useEffect(() => {
    fetchAllEmployeesData();
  }, [fetchAllEmployeesData]);

  useEffect(() => {
    if (Object.keys(employees).length > 0) {
      fetchMeetingById();
    }
  }, [employees, fetchMeetingById]);

  useEventBus(EVENT_KEYS.meetingUpdated, () => {
    fetchMeetingById();
    fetchAllEmployeesData();
  });

  const openLink = () => {
    if (!viewModelMeeting) return;
    if (viewModelMeeting.meetingLink) {
      window.open(viewModelMeeting.meetingLink, "_blank");
    } else if (viewModelMeeting.location) {
      const mapUrl = `https://www.google.com/maps/search/?api=1&query=${viewModelMeeting.location}`;
      window.open(mapUrl, "_blank");
    }
  };

  return (
    <>
    <Modal show={!!show} onHide={onClose}>
      <Modal.Header closeButton>
      <Modal.Title>
            <div className="d-flex align-items-center">
              <div
                className="rounded-circle mb-4"
                style={{
                  width: "12px",
                  height: "12px",
                  backgroundColor: "#007BFF",
                  marginRight: "8px",
                }}
              ></div>
              <p style={{ fontWeight: "400" }}>Meetings</p>
              <br />
            </div>
            <div>{viewModelMeeting?.title}</div>
          </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {viewModelMeeting ? (
          <>
            <p className="text-muted mb-0">Organizer</p>
            <div className="mb-2">{viewModelMeeting.organizerName}</div>

            <p className="text-muted mb-0">Participants</p>
            <div className="mb-2">
              {viewModelMeeting.participantNames?.join(", ") || "N/A"}
            </div>

            <div className="d-flex mb-3">
              <div className="me-4">
                <p className="text-muted mb-0">Start Time</p>
                <div>{dayjs(viewModelMeeting.startDate).format("DD MMM, hh:mm A")}</div>
              </div>
              <div>
                <p className="text-muted mb-0">End Time</p>
                <div>{dayjs(viewModelMeeting.endDate).format("DD MMM, hh:mm A")}</div>
              </div>
            </div>

            {(viewModelMeeting.meetingLink || viewModelMeeting.location) && (
              <div
                className="p-3 mb-3"
                style={{ border: "1px solid #ccc", borderRadius: "10px", position: "relative" }}
              >
                <p className="text-muted mb-1">
                  {viewModelMeeting.meetingLink ? "Meeting Link" : "Location"}
                </p>
                <div>
                  {(viewModelMeeting.meetingLink || viewModelMeeting.location)?.slice(0, 30)}
                  {((viewModelMeeting.meetingLink || "").length ?? 0) > 30 && "..."}
                </div>
                <CopyToClipboard
                  text={viewModelMeeting.meetingLink || viewModelMeeting.location || ""}
                  onCopy={() => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                >
                  <span
                    className="ms-5"
                    style={{
                      position: "absolute",
                      right: "2rem",
                      top: "1rem",
                      cursor: "pointer",
                      color: copied ? "green" : "#B22E22",
                      fontWeight: "500",
                    }}
                  >
                    {copied ? "Copied!" : "Copy"}
                  </span>
                </CopyToClipboard>
              </div>
            )}

            <div className="d-flex justify-content-between">
              <Button onClick={openLink}>
                {viewModelMeeting.meetingLink?.includes("http") ? "Join" : "View on map"}
              </Button>
              {employeeId === viewModelMeeting.organizerId || employeeId === viewModelMeeting.employeeId && (
                <Button disabled={dayjs(viewModelMeeting.startDate).isBefore(dayjs())} onClick={() => {
                  setEditingMeeting(viewModelMeeting);
                  setIsEditModalOpen(true);
                }}>
                  Edit
                </Button>
              )}
            </div>
          </>
        ) : (
          <div>Loading...</div>
        )}
      </Modal.Body>
    </Modal>

        <EditMeetingModal
            isEditModalOpen={isEditModalOpen}
            setIsEditModalOpen={setIsEditModalOpen}
            editingMeeting={editingMeeting}
            participants={participants}
        />
    </>
  );
};

export default MeetingViewModal;
