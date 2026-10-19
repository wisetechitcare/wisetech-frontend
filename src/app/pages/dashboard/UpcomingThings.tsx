import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSelector } from "react-redux";
import {
  Box,
  CircularProgress,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import { RootState } from "@redux/store";
import { getMeetings } from "@services/employee";
import { fetchPublicHolidays } from "@services/company";
import { fetchCalendarEvents } from "@services/calendar";
import { KTIcon } from "@metronic/helpers";
import dayjs from "dayjs";
import { eventsTypeProfileIcons } from "@metronic/assets/sidepanelicons";
import { fetchAllUsers } from "@services/users";
import MeetingViewModal from "@pages/employee/MeetingViewModal";
import { getTimeTokens } from '@utils/timeFormat';
import { isPackEnabled } from '@utils/tenantPacks';
import { useColorMode } from '@app/theme/ColorMode';
import {
  GlassCard,
  SegmentedControl,
  WtEmptyState,
  label,
} from '@app/modules/common/components/ui';

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
  // Was two `toLocaleString` calls hardwired to `hour12: true`, which also meant the
  // date rendered in the BROWSER's locale rather than the company format.
  const { TIME } = getTimeTokens();
  return `${dayjs(startDate).format(`dddd, DD MMMM YYYY, ${TIME}`)} - ${dayjs(endDate).format(TIME)}`;
};

const CARD_HEIGHT = 555;

const EventItem = React.memo(({ item, onClick }: { item: any; onClick?: () => void }) => {
  const { mode } = useColorMode();
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Stack
      direction="row"
      spacing={1.5}
      alignItems="flex-start"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      sx={{
        py: 1.25,
        cursor: onClick ? 'pointer' : 'default',
        borderRadius: 1.5,
        px: 0.5,
        transition: 'background-color 0.15s ease',
        bgcolor: isHovered && onClick ? 'action.hover' : 'transparent',
      }}
    >
      <Box
        component="img"
        src={item.icon}
        alt=""
        sx={{ width: 30, height: 30, mt: 0.25, flexShrink: 0 }}
      />
      <Box sx={{ minWidth: 0 }}>
        <Typography
          sx={{
            fontSize: 14,
            fontWeight: 500,
            color: onClick && isHovered ? 'primary.main' : label(mode, 'primary'),
          }}
        >
          {item.type === 'Birthdays'
            ? `${item.firstName} ${item.lastName}'s Birthday`
            : item.title}
        </Typography>
        <Typography sx={{ fontSize: 12, color: label(mode, 'secondary'), mt: 0.25 }}>
          {item.date}
          {item.type === 'Birthdays' ? ' · Birthday' : ''}
        </Typography>
      </Box>
    </Stack>
  );
});




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


  // Memoized fetch functions — CRM meetings only when PSA is entitled
  const fetchMeetings = useCallback(async () => {
    if (!employeeId) return;
    if (!isPackEnabled('psa')) {
      setMeetings([]);
      setLoadingMeetings(false);
      return;
    }

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
        color: "#1E3A8A",
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
        // `isActive` is the login account and survives an exit, so it has to be paired
        // with the employee flag or leavers stay in the upcoming-birthday list.
        if (!user.isActive || !user.hasActiveEmployee) return false;
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

    // The widget only shows with Read on Calendar (useDashboardSettings), which covers all of these.
    const allFormattedData = [
      ...formattedMeetings,
      ...formattedHolidays,
      ...formattedEvents,
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
      meetings: formattedMeetings,
      holidays: formattedHolidays,
      events: formattedEvents,
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

  const handleTabChange = useCallback(
    (tab: "All" | "Meetings" | "Holidays" | "Events") => {
      setSelectedTab(tab);
      setCurrentPage(0);
    },
    [],
  );

  const handlePageChange = useCallback((newPage: number) => {
    setCurrentPage(newPage);
  }, []);

  const { mode } = useColorMode();

  const tabOptions = useMemo(
    () =>
      (['All', 'Meetings', 'Holidays', 'Events'] as const)
        .filter((tab) => tab !== 'Meetings' || isPackEnabled('psa'))
        .map((tab) => ({ value: tab, label: tab })),
    [],
  );

  const emptyTitle =
    selectedTab === 'Holidays'
      ? 'No upcoming holidays'
      : selectedTab === 'Meetings'
        ? 'No upcoming meetings'
        : selectedTab === 'Events'
          ? 'No upcoming events'
          : selectedTab === 'Birthdays'
            ? 'No birthdays this month'
            : 'Nothing upcoming';

  // SegmentedControl value must be one of the visible options (Meetings may be pack-gated).
  const segmentValue = (
    tabOptions.some((o) => o.value === selectedTab) ? selectedTab : 'All'
  ) as 'All' | 'Meetings' | 'Holidays' | 'Events';

  return (
    <>
      <GlassCard
        preset="section"
        sx={{
          height: CARD_HEIGHT,
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <Stack spacing={2} sx={{ height: '100%', minHeight: 0 }}>
          <Typography
            sx={{
              fontWeight: 700,
              fontSize: { xs: 17, sm: 19 },
              color: label(mode, 'primary'),
              letterSpacing: '-0.02em',
            }}
          >
            {selectedTab === 'All' ? 'Upcoming Activities' : `Upcoming ${selectedTab}`}
          </Typography>

          <SegmentedControl
            ariaLabel="Upcoming activity type"
            options={tabOptions}
            value={segmentValue}
            onChange={handleTabChange}
            fullWidth
          />

          <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
            {isLoading && (
              <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 280 }}>
                <CircularProgress size={32} />
              </Stack>
            )}

            {!isLoading && error && (
              <WtEmptyState dense variant="error" title="Could not load activities" hint={error} />
            )}

            {!isLoading && !error && selectedData.length === 0 && (
              <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 240 }}>
                <WtEmptyState dense title={emptyTitle} hint="Check back later for new items." />
              </Stack>
            )}

            {!isLoading && !error && selectedData.length > 0 && (
              <Stack spacing={0} divider={<Box sx={{ borderBottom: 1, borderColor: 'divider' }} />}>
                {paginatedData.map((item: FormattedItem, index: number) => (
                  <EventItem
                    key={`${item.type}-${index}`}
                    item={item}
                    onClick={
                      item.type === 'Meetings'
                        ? () => {
                            setSelectedMeetingItemId(item.id);
                            setShowMeetingViewModal(true);
                          }
                        : undefined
                    }
                  />
                ))}
              </Stack>
            )}
          </Box>

          {selectedData.length > itemsPerPage && (
            <Stack direction="row" alignItems="center" justifyContent="flex-end" spacing={1.5}>
              <IconButton
                size="small"
                disabled={currentPage === 0}
                aria-label="Previous page"
                onClick={() => currentPage > 0 && handlePageChange(currentPage - 1)}
              >
                <KTIcon iconName="arrow-left" className="fs-3" />
              </IconButton>
              <Typography sx={{ fontSize: 13, color: label(mode, 'secondary') }}>
                {currentPage + 1} / {totalPages}
              </Typography>
              <IconButton
                size="small"
                disabled={currentPage >= totalPages - 1}
                aria-label="Next page"
                onClick={() =>
                  currentPage < totalPages - 1 && handlePageChange(currentPage + 1)
                }
              >
                <KTIcon iconName="arrow-right" className="fs-3" />
              </IconButton>
            </Stack>
          )}
        </Stack>
      </GlassCard>
      <MeetingViewModal
        show={showMeetingViewModal}
        onClose={() => setShowMeetingViewModal(false)}
        meetingId={selectedMeetingItemId}
      />
    </>
  );
};

export default React.memo(UpcomingEventsCard);
