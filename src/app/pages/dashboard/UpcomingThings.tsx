import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@redux/store";
import { fetchAllEmployees, getMeetings } from "@services/employee";
import { fetchPublicHolidays } from "@services/company";
import { fetchCalendarEvents } from "@services/calendar";
import { Card, ListGroup, Spinner, Alert, Container } from "react-bootstrap";
import { KTIcon } from "@metronic/helpers";
import dayjs from "dayjs";
import { eventsTypeProfileIcons } from "@metronic/assets/sidepanelicons";
import { hasPermission } from "@utils/authAbac";
import {
  permissionConstToUseWithHasPermission,
  resourceNameMapWithCamelCase,
} from "@constants/statistics";
import { fetchAllUsers } from "@services/users";
import Loader from "@app/modules/common/utils/Loader";
import MeetingViewModal from "@pages/employee/MeetingViewModal";

interface Meetings {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
}

interface PublicHoliday {
  title: string;
  date: string;
  color: string;
  fixed: boolean;
}

interface CalendarEvent {
  title: string;
  start: string;
  end: string;
  color: string;
  id?: string;
}

interface FormattedItem {
  title: string;
  type: "Meetings" | "Holidays" | "Events";
  icon: string;
  date: string;
  id?: string;
}

const formatDateRange = (startDate: string, endDate: string) => {
  return `${new Date(startDate).toLocaleString("en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })} - ${new Date(endDate).toLocaleString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })}`;
};

// Create a memoized Event Item component
const EventItem = React.memo(({ item, onClick }: { item: any; onClick?: () => void }) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
      <ListGroup.Item
        className="d-flex flex-column ms-3 border-0"
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          cursor: onClick ? "pointer" : "default"
        }}
      >
        <div className="d-flex align-items-center">
          <img
            src={item.icon}
            alt={`${item.type} Icon`}
            style={{ width: "30px", height: "30px" }}
            className="align-item-center pt-1"
          />
          <div
            className="mb-1 ms-4"
            style={{
              fontSize: "14px",
              fontWeight: "500",
              color: onClick && isHovered ? "#7A2124" : "#000"
            }}
          >
            {item.type === "Birthdays"
              ? `${item.firstName} ${item.lastName}'s Birthday`
              : item.title}
          </div>
        </div>
        <div className="text-muted ms-13 d-flex flex-column" style={{ fontSize: "12px" }}>
          {item.type === "Birthdays" ? (
            <>
              <span>{item.date}</span>
              <span className="text-success">Birthday</span>
            </>
          ) : (
            item.date
          )}
        </div>
      </ListGroup.Item>
    );
  }
);




const UpcomingEventsCard: React.FC = () => {

  const employeeId = useSelector((state: RootState) => state.employee.currentEmployee?.id);
  const [meetings, setMeetings] = useState<Meetings[]>([]);
  const [holidays, setHolidays] = useState<PublicHoliday[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);

  const [loadingMeetings, setLoadingMeetings] = useState<boolean>(true);
  const [loadingHolidays, setLoadingHolidays] = useState<boolean>(true);
  const [loadingEvents, setLoadingEvents] = useState<boolean>(true);

  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedTab, setSelectedTab] = useState<"All" | "Meetings" | "Holidays" | "Events" | "Birthdays">("All");
  const [currentYear] = useState(new Date().getFullYear() + "");
  const [birthdays, setBirthdays] = useState<any[]>([]);
  const [loadingBirthdays, setLoadingBirthdays] = useState<boolean>(true);
  const [showMeetingViewModal, setShowMeetingViewModal] = useState(false);
  const [selectedMeetingItemId, setSelectedMeetingItemId] = useState<string | undefined>(undefined);

  const itemsPerPage = 6;
  const country = "India";


  // Memoized fetch functions
  const fetchMeetings = useCallback(async () => {
    if (!employeeId) return;

    setLoadingMeetings(true);
    try {
      const response = await getMeetings(employeeId);

      const sortedMeetings = response.data
        ? response.data.sort(
            (a: Meetings, b: Meetings) =>
              new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
          )
        : [];

      setMeetings(sortedMeetings);
    } catch (err) {
      setError("Failed to fetch meetings.");
      console.error("Error fetching meetings:", err);
    } finally {
      setLoadingMeetings(false);
    }
  }, [employeeId]);

  const fetchHolidays = useCallback(async () => {
    setLoadingHolidays(true);
    try {
      const {
        data: { publicHolidays },
      } = await fetchPublicHolidays(currentYear, country);

      // Filter out past holidays
      const upcomingHolidays = publicHolidays.filter((holiday: any) => {
        const holidayDate = dayjs(holiday.date);
        return holidayDate.isAfter(dayjs());
      });

      // Transform the data
      const transformedRes = upcomingHolidays.map((holiday: any) => ({
        title: holiday.holiday.name,
        color: holiday.colorCode,
        date: dayjs(holiday.date).format("dddd DD MMMM YYYY"),
        fixed: holiday.isFixed,
      }));

      setHolidays(transformedRes);
    } catch (error) {
      console.error("Error fetching Public Holidays:", error);
    } finally {
      setLoadingHolidays(false);
    }
  }, [currentYear, country]);

  const fetchEvents = useCallback(async () => {
    if (!employeeId) return;

    setLoadingEvents(true);
    try {
      const {
        data: { calendarEvents },
      } = await fetchCalendarEvents(employeeId);
      const transformedRes = calendarEvents.map((events: any) => ({
        title: events.eventName,
        start: dayjs(events.startDate).format(),
        end: dayjs(events.endDate).format(),
        color: "#AA393D",
      }));
      setCalendarEvents(transformedRes);
    } catch (error) {
      console.error("Error fetching Calendar Events:", error);
    } finally {
      setLoadingEvents(false);
    }
  }, [employeeId]);

  // fetch all users for upcoming birthdays
  const fetchBirthdays = useCallback(async () => {
    setLoadingBirthdays(true);
    try {
      const {
        data: { users },
      } = await fetchAllUsers();
      const upcomingBirthdays = users.filter((user: any) => {
        if (!user.dateOfBirth) return false;
        const birthday = new Date(user.dateOfBirth);
        const today = new Date();
        const isSameMonthDay =
          birthday.getMonth() === today.getMonth() &&
          birthday.getDate() >= today.getDate();
        const isUpcoming =
          isSameMonthDay || birthday.getMonth() > today.getMonth();
        return isUpcoming;
      });
      setBirthdays(upcomingBirthdays);
    } catch (error) {
      console.error("Error fetching Birthdays:", error);
    } finally {
      setLoadingBirthdays(false);
    }
  }, []);

  // Parallel API calls
  useEffect(() => {
    const fetchData = async () => {
      const promises = [
        fetchMeetings(),
        fetchHolidays(),
        fetchEvents(),
        fetchBirthdays(),
      ];

      await Promise.all(promises);
    };

    fetchData();
  }, [fetchMeetings, fetchHolidays, fetchEvents, fetchBirthdays]);

  const formattedData = useMemo(() => {
    const formattedMeetings = meetings.map((meeting) => ({
      ...meeting,
      type: "Meetings" as const,
      icon: eventsTypeProfileIcons.meetingsProfileIcon,
      date: formatDateRange(meeting.startDate, meeting.endDate),
    }));

    const formattedHolidays = holidays.map((holiday) => ({
      ...holiday,
      type: "Holidays" as const,
      icon: eventsTypeProfileIcons.holidaysProfileIcon,
      date: holiday.date,
    }));

    const formattedEvents = calendarEvents.map((event) => ({
      ...event,
      type: "Events" as const,
      icon: eventsTypeProfileIcons.otherProfileIcon,
      date: formatDateRange(event.start, event.end),
    }));

    // Filter birthdays for the current month
    const today = dayjs();
    const endOfMonth = dayjs().endOf("month");
    const formattedBirthdays = birthdays
      .map((birthday) => {
        const birthDate = dayjs(birthday.dateOfBirth);
        let nextBirthday = birthDate.year(today.year());

        // If birthday already occurred this year, shift to next year
        if (nextBirthday.isBefore(today, "day")) {
          nextBirthday = nextBirthday.add(1, "year");
        }

        return {
          ...birthday,
          type: "Birthdays" as const,
          icon: eventsTypeProfileIcons.otherProfileIcon,
          date: nextBirthday.format("dddd, MMMM D, YYYY"),
          dateObject: nextBirthday.toDate(),
        };
      })
      .filter((birthday) => {
        const date = dayjs(birthday.dateObject);
        return (
          date.isSameOrAfter(today, "day") &&
          date.isSameOrBefore(endOfMonth, "day")
        );
      })
      .sort((a, b) => {
        return dayjs(a.dateObject).diff(dayjs(b.dateObject));
      });

    const allFormattedData = [
      ...(hasPermission(
        resourceNameMapWithCamelCase.meeting,
        permissionConstToUseWithHasPermission.readOthers
      )
        ? formattedMeetings
        : []),
      ...(hasPermission(
        resourceNameMapWithCamelCase.holiday,
        permissionConstToUseWithHasPermission.readOthers
      )
        ? formattedHolidays
        : []),
      ...(hasPermission(
        resourceNameMapWithCamelCase.event,
        permissionConstToUseWithHasPermission.readOthers
      )
        ? formattedEvents
        : []),
      // ...(hasPermission(resourceNameMapWithCamelCase.birthdays, permissionConstToUseWithHasPermission.readOthers) ? formattedBirthdays : [])
    ].sort((a, b) => {
      let dateA: number;
      let dateB: number;

      if (a.type === "Meetings") {
        dateA = new Date(a.startDate).getTime();
      } else if (a.type === "Holidays") {
        dateA = new Date(a.date).getTime();
      } else if (a.type === "Events") {
        dateA = new Date(a.start).getTime();
      } else {
        dateA = 0;
      }

      if (b.type === "Meetings") {
        dateB = new Date(b.startDate).getTime();
      } else if (b.type === "Holidays") {
        dateB = new Date(b.date).getTime();
      } else if (b.type === "Events") {
        dateB = new Date(b.start).getTime();
      } else {
        dateB = 0;
      }

      return dateA - dateB;
    });

    return {
      all: allFormattedData,
      meetings: hasPermission(
        resourceNameMapWithCamelCase.meeting,
        permissionConstToUseWithHasPermission.readOthers
      )
        ? formattedMeetings
        : [],
      holidays: hasPermission(
        resourceNameMapWithCamelCase.holiday,
        permissionConstToUseWithHasPermission.readOthers
      )
        ? formattedHolidays
        : [],
      events: hasPermission(
        resourceNameMapWithCamelCase.event,
        permissionConstToUseWithHasPermission.readOthers
      )
        ? formattedEvents
        : [],
      // birthdays: (hasPermission(resourceNameMapWithCamelCase.birthdays, permissionConstToUseWithHasPermission.readOthers) ? formattedBirthdays : [])
    };
  }, [meetings, holidays, calendarEvents, birthdays]);

  const selectedData = useMemo(() => {
    switch (selectedTab) {
      case "All":
        return formattedData.all;
      case "Meetings":
        return formattedData.meetings;
      case "Holidays":
        return formattedData.holidays;
      case "Events":
        return formattedData.events;
      // case "Birthdays":
      //   return formattedData.birthdays;
      default:
        return [];
    }
  }, [selectedTab, formattedData]);

  const { paginatedData, totalPages } = useMemo(() => {
    const total = Math.ceil(selectedData.length / itemsPerPage) || 1;
    const paginated = selectedData.slice(
      currentPage * itemsPerPage,
      (currentPage + 1) * itemsPerPage
    );
    return { paginatedData: paginated, totalPages: total };
  }, [selectedData, currentPage, itemsPerPage]);

  const isLoading = useMemo(() => {
    if (selectedTab === "All")
      return loadingMeetings || loadingHolidays || loadingEvents;
    if (selectedTab === "Meetings") return loadingMeetings;
    if (selectedTab === "Holidays") return loadingHolidays;
    if (selectedTab === "Events") return loadingEvents;
    return false;
  }, [selectedTab, loadingMeetings, loadingHolidays, loadingEvents]);

  // Handler for tab changes
  const handleTabChange = useCallback(
    (tab: "All" | "Meetings" | "Holidays" | "Events") => {
      setSelectedTab(tab);
      setCurrentPage(0);
    },
    []
  );

  // Handler for pagination
  const handlePageChange = useCallback((newPage: number) => {
    setCurrentPage(newPage);
  }, []);
  
  return (
    <>
    <Card
      className="shadow-sm border-0"
      style={{
        borderRadius: "12px",
        height: "555px",
        width: "100%",
        overflow: "hidden",
      }}
    >
      <Card.Body>
        <Card.Title className="d-flex justify-content-between align-items-center fs-3 mt-3">
          {selectedTab === "All"
            ? "Upcoming Activities"
            : `Upcoming ${selectedTab}`}
        </Card.Title>

        {/* Tabs */}
        <div className="d-flex flex-wrap gap-2 mb-3 mt-lg-12 mt-6">
          {["All", "Meetings", "Holidays", "Events"].map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab as any)}
              style={{
                backgroundColor:
                  selectedTab === tab ? "#a94442" : "transparent",
                color: selectedTab === tab ? "white" : "black",
                border: "1px solid #a94442",
                borderRadius: "20px",
                // padding: "5px 15px",
              }}
              className="px-3 py-1 px-lg-6 py-lg-2"
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Loading and error states */}
        {isLoading && <Loader />}
        {error && <Alert variant="danger">{error}</Alert>}

        {/* No Data Message */}
        {!isLoading && !error && selectedData.length === 0 && (
          <p className="text-center text-muted">
            {selectedTab === "Holidays"
              ? "No upcoming holidays"
              : selectedTab === "Meetings"
              ? "No upcoming meetings"
              : selectedTab === "Events"
              ? "No upcoming events"
              : selectedTab === "Birthdays"
              ? "No birthdays in this month"
              : "Nothing to show"}
          </p>
        )}

        {/* List of Meetings, Holidays, or Events */}
        {!isLoading && !error && selectedData.length > 0 && (
          <ListGroup variant="flush" className="mb-3 mt-4 d-flex">
            {paginatedData.map((item: FormattedItem, index: number) => (
              <EventItem
                key={`${item.type}-${index}`}
                item={item}
                onClick={
                  item.type === "Meetings"
                    ? () => {
                        setSelectedMeetingItemId(item.id);
                        setShowMeetingViewModal(true);
                      }
                    : undefined
                }
              />
            ))}



            {/* Pagination */}
            {selectedData.length > itemsPerPage && (
              <div className="d-flex justify-content-end mt-3 gap-3">
                <div
                  className={`fs-2 cursor-pointer ${
                    currentPage === 0 ? "text-muted" : ""
                  }`}
                  onClick={() =>
                    currentPage > 0 && handlePageChange(currentPage - 1)
                  }
                  style={{
                    color: currentPage === 0 ? "gray" : "#000",
                    cursor: currentPage === 0 ? "not-allowed" : "pointer",
                  }}
                >
                  <KTIcon iconName="arrow-left" className="fs-2" />
                </div>
                <span className="fs-5">
                  {currentPage + 1} / {totalPages}
                </span>
                <div
                  className={`fs-2 cursor-pointer ${
                    currentPage >= totalPages - 1 ? "text-muted" : ""
                  }`}
                  onClick={() =>
                    currentPage < totalPages - 1 &&
                    handlePageChange(currentPage + 1)
                  }
                  style={{
                    color: currentPage >= totalPages - 1 ? "gray" : "#000",
                    cursor:
                      currentPage >= totalPages - 1 ? "not-allowed" : "pointer",
                  }}
                >
                  <KTIcon iconName="arrow-right" className="fs-2" />
                </div>
              </div>
            )}
          </ListGroup>
        )}
      </Card.Body>
    </Card>
    <MeetingViewModal show={showMeetingViewModal} onClose={() => setShowMeetingViewModal(false)} meetingId={selectedMeetingItemId}/>
    </>
  );
};

export default React.memo(UpcomingEventsCard);
