import { useState, useEffect, useCallback, useMemo } from "react";
import dayjs from "dayjs";
import isLeapYear from "dayjs/plugin/isLeapYear";
import { useSelector } from "react-redux";
import { RootState } from "@redux/store";
import {
  getMeetings,
  deleteMeeting,
  fetchAllEmployees,
} from "@services/employee";
import Tooltip from "react-bootstrap/Tooltip";
import { OverlayTrigger } from "react-bootstrap";
import { errorConfirmation, successConfirmation } from "@utils/modal";
import { Button, Modal, Spinner } from "react-bootstrap";
import { hasPermission } from "@utils/authAbac";
import {
  permissionConstToUseWithHasPermission,
  resourceNameMapWithCamelCase,
} from "@constants/statistics";
import MeetingViewModal from "./MeetingViewModal";
import EditMeetingModal from "./EditMeetingModal";
import { useEventBus } from "@hooks/useEventBus";
import { EVENT_KEYS } from "@constants/eventKeys";

dayjs.extend(isLeapYear);

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

export default function MeetingList() {
  const [meetings, setMeetings] = useState<Meetings[]>([]);
  const [employees, setEmployees] = useState<Record<string, Employee>>({});
  const [loadingMeetings, setLoadingMeetings] = useState<boolean>(true);
  const [loadingEmployees, setLoadingEmployees] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const employeeId = useSelector((state: RootState) => state.employee.currentEmployee?.id);
  const [participants, setParticipants] = useState<{ label: string; value: string }[]>([]);
  const [editingMeeting, setEditingMeeting] = useState<Meetings | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewModelMeeting, setViewModelMeeting] = useState<Meetings | null>(null);
  const [showMeetingViewModal, setShowMeetingViewModal] = useState(false);

  const getEmployeeFullName = (employee: Employee | undefined): string => {
    if (!employee || !employee.users) return "Unknown";
    const { firstName, lastName } = employee.users;
    return `${firstName || ""} ${lastName || ""}`.trim();
  };

  const fetchAllEmployeesData = useCallback(async () => {
    if (loadingEmployees) {
      try {
        const response = await fetchAllEmployees();
        if (response?.data?.employees) {
          const employeeMap: Record<string, Employee> = {};
          response.data.employees.forEach((employee: Employee) => {
            employeeMap[employee.id] = employee;
          });

          const formattedParticipants = response.data.employees.map((emp: any) => ({
            label: `${emp.users.firstName} ${emp.users.lastName}`,
            value: emp.id,
          }));

          setParticipants(formattedParticipants);
          setEmployees(employeeMap);
          setLoadingEmployees(false);
        }
      } catch (error) {
        console.error("Error fetching employees:", error);
        setLoadingEmployees(false);
      }
    }
  }, [loadingEmployees]);

  const formatMeetingData = useCallback((meetingData: any): Meetings => {
    const organizerId = meetingData.employeeId;
    const organizerName =
      getEmployeeFullName(employees[organizerId]) || "Unknown";

    let participantIds = [];
    try {
      participantIds = meetingData.participants
        ? typeof meetingData.participants === "string"
          ? JSON.parse(meetingData.participants)
          : meetingData.participants
        : [];
    } catch (e) {
      console.error("Error parsing participants:", e);
      participantIds = [];
    }

    const participantNames = participantIds.map(
      (id: string) => getEmployeeFullName(employees[id]) || "Unknown"
    );

    return {
      id: meetingData.id,
      title: meetingData.title,
      isOnline: meetingData.isOnline,
      startDate: meetingData.startDate,
      endDate: meetingData.endDate,
      employeeId: meetingData.employeeId,
      organizerName: organizerName,
      organizerId: organizerId,
      participants: participantIds,
      participantNames: participantNames,
      description: meetingData.description,
      meetingLink: meetingData.meetingLink,
      location: meetingData.location,
    };
  }, [employees]);

  const fetchMeetings = useCallback(async () => {
    if (!employeeId || Object.keys(employees).length === 0) return;

    setLoadingMeetings(true);
    try {
      const response = await getMeetings(employeeId);
      const formattedMeetings = response.data.map((meeting: any) =>
        formatMeetingData(meeting)
      );
      setMeetings(formattedMeetings);
    } catch (error) {
      console.error("Error fetching meetings:", error);
      setError("Failed to load meetings");
    } finally {
      setLoadingMeetings(false);
    }
  }, [employeeId, employees, formatMeetingData]);

  useEventBus(EVENT_KEYS.meetingUpdated, () => {
    fetchMeetings();
    fetchAllEmployeesData();
  });

  useEffect(() => {
    fetchAllEmployeesData();
  }, [fetchAllEmployeesData]);

  useEffect(() => {
    if (Object.keys(employees).length > 0 && employeeId) {
      fetchMeetings();
    }
  }, [employees, employeeId, fetchMeetings]);

  useEffect(() => {
    if (Object.keys(employees).length === 0) return;

    const handleMeetingAdded = (event: any) => {
      const newMeeting = event.detail;
      if (newMeeting && newMeeting.id) {
        try {
          const formattedMeeting = formatMeetingData(newMeeting);
          setMeetings((prevMeetings) => [formattedMeeting, ...prevMeetings]);
        } catch (error) {
          console.error("Error processing new meeting:", error);
        }
      } else {
        console.error("Invalid meeting received:", newMeeting);
      }
    };

    document.addEventListener("meetingAdded", handleMeetingAdded);
    return () => {
      document.removeEventListener("meetingAdded", handleMeetingAdded);
    };
  }, [employees, formatMeetingData]);

  const formatParticipants = (participantNames: string[] | undefined) => {
    if (!participantNames || participantNames.length === 0)
      return "No participants";
    if (participantNames.length <= 1) {
      return participantNames.join(", ");
    } else {
      return (
        <div
          className="position-relative d-inline-block"
          title={participantNames.join(", ")}
        >
          {`${participantNames[0]} +${participantNames.length - 1}`}
        </div>
      );
    }
  };

  const handleDeleteMeeting = async (meetingId: string) => {
    if (
      employeeId !==
      meetings.find((meeting) => meeting.id === meetingId)?.organizerId
    ) {
      errorConfirmation("You are not authorized to delete this meeting.");
      return;
    }
    try {
      await deleteMeeting(meetingId, employeeId);
      setMeetings((prevMeetings) =>
        prevMeetings.filter((meeting) => meeting.id !== meetingId)
      );
      successConfirmation("Meeting deleted successfully!");
    } catch (error) {
      console.error("Error deleting meeting:", error);
      errorConfirmation("Failed to delete meeting");
    }
  };

  const handleEditMeeting = (meeting: Meetings) => {
    setEditingMeeting(meeting);
    setIsEditModalOpen(true);
  };

  const handleViewMeeting = (meetingId: string) => {
    const latestMeetingData = meetings.find((m) => m.id === meetingId);
    if (latestMeetingData) {
      setViewModelMeeting({ ...latestMeetingData });
      setIsViewModalOpen(true);
      setShowMeetingViewModal(true);
    }
  };

  return (
    <>
      <div className="mt-5 card p-4">
        <div className="d-flex align-items-center">
          <div
            className="rounded-circle"
            style={{
              width: "12px",
              height: "12px",
              backgroundColor: "#007BFF",
              marginRight: "8px",
            }}
          ></div>
          <h3>Meetings</h3>
        </div>

        <div className="p-4">
          {loadingMeetings || loadingEmployees ? (
            <p>Loading meetings...</p>
          ) : error ? (
            <p className="text-danger">{error}</p>
          ) : meetings.length ? (
            <table className="table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th className="d-none d-md-table-cell">Type</th>
                  <th className="d-none d-md-table-cell">Organizer</th>
                  <th className="d-none d-md-table-cell">Participants</th>
                  <th className="d-none d-md-table-cell">Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {meetings.map((meeting) => {
                  const viewAllowed = hasPermission(
                    resourceNameMapWithCamelCase.meeting,
                    permissionConstToUseWithHasPermission.readOthers
                  );
                  const editAllowed = hasPermission(
                    resourceNameMapWithCamelCase.meeting,
                    permissionConstToUseWithHasPermission.editOthers
                  );
                  const deleteAllowed = hasPermission(
                    resourceNameMapWithCamelCase.meeting,
                    permissionConstToUseWithHasPermission.deleteOthers
                  );

                  return (
                    <tr key={meeting.id}>
                      <td className="overflow-hidden whitespace-nowrap text-ellipsis">
                        <OverlayTrigger
                          placement="right"
                          overlay={
                            <Tooltip id={`tooltip-${meeting.id}`}>
                              {meeting.title}
                            </Tooltip>
                          }
                        >
                          <span>
                            {meeting.title.length > 30
                              ? meeting.title.substring(0, 30) + "..."
                              : meeting.title}
                          </span>
                        </OverlayTrigger>
                      </td>
                      <td className="d-none d-md-table-cell">
                        {meeting.isOnline ? "Online" : "Offline"}
                      </td>
                      <td className="d-none d-md-table-cell">
                        {meeting.organizerName}
                      </td>
                      <td className="d-none d-md-table-cell">
                        {formatParticipants(meeting.participantNames)}
                      </td>
                      <td className="d-none d-md-table-cell">
                        {dayjs(meeting.startDate).format("DD MMM, hh:mm A")} -{" "}
                        {dayjs(meeting.endDate).format("hh:mm A")}
                      </td>

                      {viewAllowed && (
                        <td
                          style={{ cursor: "pointer", color: "#B22E2E" }}
                          onClick={() => handleViewMeeting(meeting.id)}
                        >
                          View
                        </td>
                      )}

                      {(employeeId === meeting.organizerId || employeeId === meeting.employeeId) && (
                        dayjs(meeting.startDate).isBefore(dayjs()) ? (
                          editAllowed && (
                            <td
                              style={{
                                cursor: "not-allowed",
                                color: "#B22E2E",
                              }}
                            >
                              Edit
                            </td>
                          )
                        ) : (
                          editAllowed && (
                            <td
                              style={{ cursor: "pointer", color: "#B22E2E" }}
                              onClick={() => handleEditMeeting(meeting)}
                            >
                              Edit
                            </td>
                          )
                        )
                      )}


                      {(employeeId === meeting.organizerId || employeeId === meeting.employeeId) && (
                        deleteAllowed && (
                        <td
                          style={{ cursor: "pointer", color: "#B22E2E" }}
                          onClick={() => handleDeleteMeeting(meeting.id)}
                        >
                          Delete
                        </td>
                      ))}

                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <span>No meetings found.</span>
          )}
        </div>
      </div>

      <MeetingViewModal
        show={showMeetingViewModal}
        onClose={() => setShowMeetingViewModal(false)}
        meetingId={viewModelMeeting?.id}
      />

      <EditMeetingModal
        isEditModalOpen={isEditModalOpen}
        setIsEditModalOpen={setIsEditModalOpen}
        editingMeeting={editingMeeting}
        participants={participants}
      />
    </>
  );
}
