import { safeJsonParse } from '@utils/safeJson';
import { useEffect, useRef, useState } from 'react';
import { parseWorkingDays } from '@utils/workingDays';
import { useFormik } from 'formik';
import Flatpickr from "react-flatpickr";
import { Modal } from 'react-bootstrap';
import dayjs from 'dayjs';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import bootstrapPlugin from '@fullcalendar/bootstrap';
import multiMonthPlugin from '@fullcalendar/multimonth';
import enGbLocale from '@fullcalendar/core/locales/en-gb';
import * as Yup from 'yup';
import { PageTitle } from '@metronic/layout/core';
import { fetchBranchById, fetchConfiguration, fetchPublicHolidays } from '@services/company';
import { archiveEvent, createCalendarEvent, fetchCalendarEvents } from '@services/calendar';
import { ICalendarEvent } from '@models/calendar';
import { deleteConfirmation, errorConfirmation, successConfirmation } from '@utils/modal';
import { useSelector } from 'react-redux';
import { RootState } from '@redux/store';
import PublicHoliday from '@app/pages/company/PublicHoliday';
import { KTIcon } from '@metronic/helpers';
import LeaveRequestForm from './attendance/personal/views/my-leaves/LeaveRequestForm';
import Holiday from '@pages/company/Holiday';
import PublicHolidaysListNew from './PublicHolidaysListNew';
import MeetingsForm from './attendance/personal/views/my-leaves/MeetingsForm';
import { hasPermission } from '@utils/authAbac';
import { permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase } from '@constants/statistics';
import { fetchAllColors } from '@services/options';
import { fetchAllUsers } from '@services/users';
import { fetchAllEmployees, getMeetings } from '@services/employee';
import { 
  SHOW_BIRTHDAYS_INTERNAL, 
  SHOW_BIRTHDAYS_INTERNAL_INACTIVE,
  SHOW_BIRTHDAYS_EXTERNAL, 
  SHOW_ANNIVERSARIES_INTERNAL, 
  SHOW_ANNIVERSARIES_INTERNAL_INACTIVE,
  SHOW_ANNIVERSARIES_EXTERNAL,
  SHOW_SATURDAY_ON_CALENDAR,
  SHOW_SUNDAY_ON_CALENDAR,
  SHOW_MEETINGS_ON_CALENDAR
} from '@constants/configurations-key';
import { getUpcomingContactsBirthdays } from '@services/companies';
import { fetchColorAndStoreInSlice } from '@utils/file';
import { Box, Button } from '@mui/material';
import PeriodNavigator from '@app/modules/common/components/PeriodNavigator';
import PeriodTabs from '@app/modules/common/components/PeriodTabs';

// View options shown in the shared PeriodTabs (same control used app-wide).
const CALENDAR_VIEW_OPTIONS = [
    { label: 'Day', value: 'dayGridDay' },
    { label: 'Week', value: 'dayGridWeek' },
    { label: 'Month', value: 'dayGridMonth' },
    { label: 'Year', value: 'multiMonthYear' },
];

const initialValues: ICalendarEvent = {
    employeeId: "",
    startDate: "",
    endDate: "",
    eventName: "",
    isActive: false
}

const calendarBreadcrumbs = [
    {
        title: 'Employees',
        path: '/employees',
        isSeparator: false,
        isActive: false,
    },
    {
        title: '',
        path: '',
        isSeparator: true,
        isActive: false,
    },
]

const calendarEventSchema = Yup.object().shape({
    startDate: Yup.date().required('Start date is required'),
    endDate: Yup.date().required('End date is required'),
    eventName: Yup.string().required('Event name is required'),
}).strict(true);

function CustomCalendar() {
    const employeeId = useSelector((state: RootState) => state.employee.currentEmployee.id);
    const branchId = useSelector((state:RootState)=>state?.employee?.currentEmployee?.branchId);  
    // const weekendColor =  useSelector((state:RootState) => state?.customColors?.attendanceCalendar?.weekendColor);
    const birthdaysColor = useSelector((state:RootState) => state?.customColors?.momentsThatMatter?.birthdaysColor);  
    const anniversariesColor = useSelector((state:RootState) => state?.customColors?.momentsThatMatter?.anniversariesColor);  


    const dateOfBirth = useSelector((state: RootState) => state.auth.currentUser.dateOfBirth);


    const anniversaryDate = useSelector((state: RootState) => state.employee.currentEmployee.anniversary);
    const [holidays, setHolidays] = useState<any[]>([]);
    // console.log("hodlidays","holidays =>",holidays)
    const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
    // console.log("calendarEvents=>",calendarEvents)
    const [meetings, setMeetings] = useState<any[]>([]);
    const [filterInternalBirthdays, setFilterInternalBirthdays] = useState(true);
    const [filterExternalBirthdays, setFilterExternalBirthdays] = useState(true);
    const [filterInternalAnniversaries, setFilterInternalAnniversaries] = useState(true);
    const [filterExternalAnniversaries, setFilterExternalAnniversaries] = useState(true);
    const [colorInternalBday, setColorInternalBday] = useState('#E91E63');
    const [colorExternalBday, setColorExternalBday] = useState('#0288d1');
    const [colorInternalAnny, setColorInternalAnny] = useState('#9C27B0');
    const [colorExternalAnny, setColorExternalAnny] = useState('#f57c00');
    const [colorSaturday, setColorSaturday] = useState('#FFB300');
    const [colorSunday, setColorSunday] = useState('#F44336');
    const [showOptionsModal, setShowOptionsModal] = useState(false);
    const [showEventForm, setShowEventForm] = useState(false);
    const [showHolidayForm, setShowHolidayForm] = useState(false);
    const [showMeetingsForm, setShowMeetingsForm] = useState(false);
    const [showNewHolidayForm, setShowNewHolidayForm] = useState(false);
    // console.log("ShowNewHodlidayForm => =>",showNewHolidayForm)
    const [showLeaveRequestForm, setShowLeaveRequestForm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [holidayRefresh, setHolidayRefresh] = useState(false);
    const [selectedDateTimeInfo, setSelectedDateTimeInfo] = useState<{ startStr: string } | undefined>(undefined);
    const calendarRef = useRef<FullCalendar | null>(null);
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear() + '');
    // console.log("currentYear => =>",currentYear)
    const [selectedViewForCalendar, setSelectedViewForCalendar] = useState('dayGridMonth');
    // Title shown in the shared PeriodNavigator (e.g. "July 2026"). Kept in sync
    // with FullCalendar via datesSet.
    const [periodTitle, setPeriodTitle] = useState('');
    const [selectedStartDate, setSelectedStartDate] = useState('');
    const [selectedEndDate, setSelectedEndDate] = useState('');
    const [maxColumns, setMaxColumns] = useState(2);
    const [branchWorkingAndOffDays, setBranchWorkingAndOffDays] = useState<any>({});
    // console.log("branchWorkingAndOffDays =>",branchWorkingAndOffDays)
    const selectRef = useRef(null);

       useEffect(() => {
            fetchColorAndStoreInSlice();
        }, []);
    

    // Drive FullCalendar from the shared Period toolbar controls.
    const handleViewChangeByValue = (value: string) => {
        setSelectedViewForCalendar(value);
        calendarRef?.current?.getApi()?.changeView(value);
    };
    const handleToday = () => calendarRef?.current?.getApi()?.today();
    const handlePrevPeriod = () => calendarRef?.current?.getApi()?.prev();
    const handleNextPeriod = () => calendarRef?.current?.getApi()?.next();
    const formik = useFormik<ICalendarEvent>({
        initialValues,
        validationSchema: calendarEventSchema,
        onSubmit: async (values) => {
            setLoading(true);
            try {
                const res = await createCalendarEvent({
                    ...values,
                    employeeId,
                    isActive: true,
                });
                if (res && !res.hasError) {
                    setShowEventForm(false);
                    successConfirmation('Successfully created calendar event');
                    if (selectedDateTimeInfo) {
                        const calendarApi = (selectedDateTimeInfo as any).view.calendar;
                        calendarApi.unselect();
                        const { eventName, startDate, endDate } = values;
                        calendarApi.addEvent({
                            title: eventName,
                            start: startDate,
                            end: endDate,
                            color: "#AA393D"
                        });
                    }
                    setLoading(false);
                    formik.resetForm();
                }
            }
            catch {
                setLoading(false);
                errorConfirmation('Error occured while saving the event');
                formik.resetForm();
                setShowEventForm(false);
            }
        },
        enableReinitialize: true,
        validateOnMount: true,
    });

    const handleCloseEventForm = () => {
        setShowEventForm(false);
        formik.resetForm();
    };

    const handleShowEventForm = () => {
        if (selectedDateTimeInfo && selectedDateTimeInfo.startStr) {
            formik.setFieldValue('startDate', selectedDateTimeInfo.startStr);
        }
        setShowEventForm(true);
    };

    const handleCloseHolidayForm = () => {
        setShowHolidayForm(false);
    };

    const handleShowHolidayForm = () => {
        setShowHolidayForm(true);
    };
    const handleCloseLeaveRequestForm = () => {
        setShowLeaveRequestForm(false);
    };

    const handleDateSelect = (selectInfo: any) => {
        setSelectedDateTimeInfo(selectInfo);
        setShowOptionsModal(true);
    };

    const handleShowLeaveRequestForm = () => {
        setShowLeaveRequestForm(true);
        setShowOptionsModal(false);
    };

    const handleCloseNewHolidayForm = () => {
        setShowNewHolidayForm(false);
        setShowHolidayForm(true);
    };

    const handleCloseMeetingForm = () => {
        setShowMeetingsForm(false);
    };

    const handleshowMeetingForm = () => {
        setShowMeetingsForm(true);
        setShowOptionsModal(false);
    };

    const handleDatesSet = (e: any) => {
        setSelectedStartDate(e?.startStr);
        setSelectedEndDate(e?.endStr);
        const calendarApi = calendarRef.current?.getApi();
        if (!calendarApi) return;
        const currentYear = calendarApi.getDate().getFullYear();
        setCurrentYear(currentYear + "");
        setPeriodTitle(calendarApi.view?.title ?? "");
        setSelectedViewForCalendar(calendarApi.view?.type ?? selectedViewForCalendar);
    };

    // const handleEventClick = async (clickInfo: any) => {
    //     const isPublicHoliday = holidays.filter((holiday: any) => holiday.title === clickInfo.event.title).length > 0;
    //     if (isPublicHoliday) return;
    //     const userRes = await deleteConfirmation('Your event has been deleted successfully');
    //     if (userRes) {
    //         clickInfo.event.remove();
    //         await archiveEvent(clickInfo.event.title);
    //     };
    // };

    useEffect(() => {
        async function getData() {
          if (!employeeId || !branchId) return;
      
          // Fetch data sequentially with individual await statements
          const { data: { publicHolidays } } = await fetchPublicHolidays(currentYear, "India");
          
          const branchRes = await fetchBranchById(branchId);
          const calendarRes = await fetchCalendarEvents(employeeId);
          const [
            colorsRes,
            allUsers,
            showBirthdaysInternalRes,
            showBirthdaysInternalInactiveRes,
            showBirthdaysExternalRes,
            showAnniversariesInternalRes,
            showAnniversariesInternalInactiveRes,
            showAnniversariesExternalRes,
            showSaturdayRes,
            showSundayRes,
            showMeetingsRes,
            allEmployeeDateOfjoining,
            meetingsRes
          ] = await Promise.all([
            fetchAllColors(),
            fetchAllUsers(),
            fetchConfiguration(SHOW_BIRTHDAYS_INTERNAL),
            fetchConfiguration(SHOW_BIRTHDAYS_INTERNAL_INACTIVE),
            fetchConfiguration(SHOW_BIRTHDAYS_EXTERNAL),
            fetchConfiguration(SHOW_ANNIVERSARIES_INTERNAL),
            fetchConfiguration(SHOW_ANNIVERSARIES_INTERNAL_INACTIVE),
            fetchConfiguration(SHOW_ANNIVERSARIES_EXTERNAL),
            fetchConfiguration(SHOW_SATURDAY_ON_CALENDAR),
            fetchConfiguration(SHOW_SUNDAY_ON_CALENDAR),
            fetchConfiguration(SHOW_MEETINGS_ON_CALENDAR),
            fetchAllEmployees(true),
            getMeetings(employeeId)
          ]);
          const colors = colorsRes?.data?.colors;
          const parsedBdayInt = safeJsonParse(showBirthdaysInternalRes?.data?.configuration?.configuration || '{}');
          const parsedBdayIntInactive = safeJsonParse(showBirthdaysInternalInactiveRes?.data?.configuration?.configuration || '{}');
          const parsedBdayExt = safeJsonParse(showBirthdaysExternalRes?.data?.configuration?.configuration || '{}');
          const parsedAnnyInt = safeJsonParse(showAnniversariesInternalRes?.data?.configuration?.configuration || '{}');
          const parsedAnnyIntInactive = safeJsonParse(showAnniversariesInternalInactiveRes?.data?.configuration?.configuration || '{}');
          const parsedAnnyExt = safeJsonParse(showAnniversariesExternalRes?.data?.configuration?.configuration || '{}');
          const parsedSaturday = safeJsonParse(showSaturdayRes?.data?.configuration?.configuration || '{}');
          const parsedSunday = safeJsonParse(showSundayRes?.data?.configuration?.configuration || '{}');
          const parsedMeetings = safeJsonParse(showMeetingsRes?.data?.configuration?.configuration || '{}');

          const showBirthdaysInternalEnabled = parsedBdayInt.enabled ?? parsedBdayInt.showBirthdaysInternal ?? false;
          const showBirthdaysInternalInactiveEnabled = parsedBdayIntInactive.enabled ?? false;
          const showBirthdaysExternalEnabled = parsedBdayExt.enabled ?? parsedBdayExt.showBirthdaysExternal ?? false;
          const showAnniversariesInternalEnabled = parsedAnnyInt.enabled ?? parsedAnnyInt.showAnniversariesInternal ?? false;
          const showAnniversariesInternalInactiveEnabled = parsedAnnyIntInactive.enabled ?? false;
          const showAnniversariesExternalEnabled = parsedAnnyExt.enabled ?? parsedAnnyExt.showAnniversariesExternal ?? false;
          const showSaturdayEnabled = parsedSaturday.enabled ?? false;
          const showSundayEnabled = parsedSunday.enabled ?? false;
          const showMeetingsEnabled = parsedMeetings.enabled ?? false;

          const parsedColorBdayInt = parsedBdayInt.color || birthdaysColor || '#E91E63';
          const parsedColorBdayIntInactive = parsedBdayIntInactive.color || '#E91E63';
          const parsedColorBdayExt = parsedBdayExt.color || '#0288d1';
          const parsedColorAnnyInt = parsedAnnyInt.color || anniversariesColor || '#9C27B0';
          const parsedColorAnnyIntInactive = parsedAnnyIntInactive.color || '#9C27B0';
          const parsedColorAnnyExt = parsedAnnyExt.color || '#f57c00';
          const parsedColorSaturday = parsedSaturday.color || '#FFB300';
          const parsedColorSunday = parsedSunday.color || '#F44336';
          const parsedColorMeetings = parsedMeetings.color || '#2196F3';

          setColorInternalBday(parsedColorBdayInt);
          setColorExternalBday(parsedColorBdayExt);
          setColorInternalAnny(parsedColorAnnyInt);
          setColorExternalAnny(parsedColorAnnyExt);
          setColorSaturday(parsedColorSaturday);
          setColorSunday(parsedColorSunday);
          
          const meetingsData = meetingsRes?.data?.meetings || meetingsRes?.meetings || meetingsRes?.data || meetingsRes || [];
          const finalMeetingsData = Array.isArray(meetingsData) ? meetingsData : [];
          setMeetings(finalMeetingsData);
            
          let weekendColor = null;
          if (colors?.length) {
            try {
              const attendanceCalendar = JSON.parse(colors[0].attendanceCalendar || '{}');
              weekendColor = attendanceCalendar.weekendColor;
            } catch (e) {
              console.error("Error parsing attendanceCalendar colors:", e);
            }
          }
      
          const holidaysFromAPI = publicHolidays
          .filter((holiday: any) => {
            const isActive = holiday?.isActive ?? holiday?.holiday?.isActive;
            const isFixed = holiday?.isFixed ?? holiday?.holiday?.isFixed;
            return isActive === true && isFixed === true;
          })
          .map((holiday: any) => {
            const holidayName = holiday?.holiday?.name || "Unnamed Holiday";
            const timeFrom = holiday?.from;
            const timeTo = holiday?.to;

            let title = holidayName;
            if (timeFrom && timeTo) {
              title = `${holidayName} (${timeFrom} - ${timeTo})`;
            } else if (timeFrom) {
              title = `${holidayName} (from ${timeFrom})`;
            } else if (timeTo) {
              title = `${holidayName} (until ${timeTo})`;
            }

            return {
              title,
              color: holiday?.colorCode,
              date: holiday?.date
            };
          });
        //   debugger;
          const workingAndOffDays = parseWorkingDays(branchRes?.data?.branch?.workingAndOffDays);
          setBranchWorkingAndOffDays(workingAndOffDays);
      
          const weekendHolidays: any[] = [];
          const start = dayjs(`${currentYear}-01-01`);
          const end = dayjs(`${currentYear}-12-31`);

          // Users linked to an ACTIVE employee record. A user account can stay
          // active after the employee is deactivated, so user.isActive alone is
          // not enough — birthdays must be limited to current employees.
          const activeEmployeeUserIds = new Set(
            (allEmployeeDateOfjoining?.data?.employees || [])
              .map((employee: any) => employee?.users?.id ?? employee?.userId)
              .filter(Boolean)
          );

          // Fetch contacts birthdays if external configs are enabled
          let allContacts: any[] = [];
          if (showBirthdaysExternalEnabled || showAnniversariesExternalEnabled) {
            try {
              const contactsRes = await getUpcomingContactsBirthdays(`${currentYear}-01-01`, `${currentYear}-12-31`);
              allContacts = contactsRes?.allContacts || [];
            } catch (err) {
              console.error("Error fetching contacts birthdays:", err);
            }
          }

          // 1. Process user birthdays (Internal Team)
          let userBirthdays: any[] = [];
          
          userBirthdays = allUsers?.data?.users
            ?.filter((user: any) => user.dateOfBirth)
            .map((user: any) => {
              const birthDate = dayjs(user.dateOfBirth);
              const today = dayjs().startOf('day');
              let nextBirthday = dayjs(birthDate).year(today.year());
              if (nextBirthday.isBefore(today, 'day')) {
                nextBirthday = dayjs(birthDate).year(Number(currentYear));
              }
              const isInactive = !user.isActive || !activeEmployeeUserIds.has(user.id);
              
              if (isInactive && !showBirthdaysInternalInactiveEnabled) return null;
              if (!isInactive && !showBirthdaysInternalEnabled) return null;

              const bgColor = isInactive ? parsedColorBdayIntInactive : parsedColorBdayInt;
              const iconToUse = isInactive ? parsedBdayIntInactive.icon : parsedBdayInt.icon;

              return {
                title: `${user.firstName} ${user.lastName}'s Birthday${isInactive ? ' (Inactive Employee)' : ''}`,
                start: nextBirthday.format('YYYY-MM-DD'),
                allDay: true,
                color: bgColor,
                textColor: '#FFFFFF',
                borderColor: bgColor,
                className: 'birthday-event',
                extendedProps: {
                  type: 'birthday',
                  icon: iconToUse,
                  user: {
                    id: user.id,
                    name: `${user.firstName} ${user.lastName}`,
                    avatar: user.avatar
                  }
                }
              };
            }).filter(Boolean) || [];

          // 2. Process contact birthdays (External Team)
          let contactBirthdays: any[] = [];
          if (showBirthdaysExternalEnabled) {
            contactBirthdays = allContacts
              .filter((c: any) => c.dateOfBirth)
              .map((c: any) => {
                const birthDate = dayjs(c.dateOfBirth);
                const today = dayjs().startOf('day');
                let nextBirthday = dayjs(birthDate).year(today.year());
                if (nextBirthday.isBefore(today, 'day')) {
                  nextBirthday = dayjs(birthDate).year(Number(currentYear));
                }
                return {
                  title: `${c.name}'s Birthday`,
                  start: nextBirthday.format('YYYY-MM-DD'),
                  allDay: true,
                  color: parsedColorBdayExt,
                  textColor: '#FFFFFF',
                  borderColor: parsedColorBdayExt,
                  className: 'birthday-event-external',
                  extendedProps: {
                    type: 'contact-birthday',
                    icon: parsedBdayExt.icon,
                    contact: c
                  }
                };
              });
          }

          // 3. Process employee anniversaries (Internal Team)
          let employeeAnniversaries: any[] = [];
          
          employeeAnniversaries = allEmployeeDateOfjoining?.data?.employees
            ?.filter((employee: any) => employee.dateOfJoining && employee?.users)
            .map((employee: any) => {
              const anniversaryDate = dayjs(employee.dateOfJoining);
              const today = dayjs().startOf('day');
              let nextAnniversary = dayjs(anniversaryDate).year(today.year());
              if (nextAnniversary.isBefore(today, 'day')) {
                nextAnniversary = dayjs(anniversaryDate).year(Number(currentYear));
              }
              const isInactive = employee.isActive === false || employee.users?.isActive === false;
              
              if (isInactive && !showAnniversariesInternalInactiveEnabled) return null;
              if (!isInactive && !showAnniversariesInternalEnabled) return null;

              const bgColor = isInactive ? parsedColorAnnyIntInactive : parsedColorAnnyInt;
              const iconToUse = isInactive ? parsedAnnyIntInactive.icon : parsedAnnyInt.icon;

              return {
                title: `${employee.users.firstName} ${employee.users.lastName}'s Work Anniversary${isInactive ? ' (Inactive Employee)' : ''}`,
                start: nextAnniversary.format('YYYY-MM-DD'),
                allDay: true,
                color: bgColor,
                textColor: '#FFFFFF',
                borderColor: bgColor,
                className: 'anniversary-event',
                extendedProps: {
                  type: 'anniversary',
                  icon: iconToUse,
                  user: {
                    id: employee.users.id,
                    name: `${employee.users.firstName} ${employee.users.lastName}`,
                    avatar: employee.users.avatar
                  }
                }
              };
            }).filter(Boolean) || [];

          // 4. Process contact anniversaries (External Team)
          let contactAnniversaries: any[] = [];
          if (showAnniversariesExternalEnabled) {
            contactAnniversaries = allContacts
              .filter((c: any) => c.anniversary)
              .map((c: any) => {
                const anniversaryDate = dayjs(c.anniversary);
                const today = dayjs().startOf('day');
                let nextAnniversary = dayjs(anniversaryDate).year(today.year());
                if (nextAnniversary.isBefore(today, 'day')) {
                  nextAnniversary = dayjs(anniversaryDate).year(Number(currentYear));
                }
                return {
                  title: `${c.name}'s Anniversary`,
                  start: nextAnniversary.format('YYYY-MM-DD'),
                  allDay: true,
                  color: parsedColorAnnyExt,
                  textColor: '#FFFFFF',
                  borderColor: parsedColorAnnyExt,
                  className: 'anniversary-event-external',
                  extendedProps: {
                    type: 'contact-anniversary',
                    icon: parsedAnnyExt.icon,
                    contact: c
                  }
                };
              });
          }

          for (let d = start; d.isBefore(end); d = d.add(1, 'day')) {
            const dayIndex = d.day(); // 0: Sunday, 6: Saturday
            const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            const dayName = dayNames[dayIndex];
            
            if (dayName === "saturday" && workingAndOffDays[dayName] === "0" && showSaturdayEnabled) {
              weekendHolidays.push({
                title: `Saturday`,
                color: parsedColorSaturday,
                date: d.format('YYYY-MM-DD'),
                fixed: true,
                extendedProps: {
                  icon: parsedSaturday.icon
                }
              });
            } else if (dayName === "sunday" && workingAndOffDays[dayName] === "0" && showSundayEnabled) {
              weekendHolidays.push({
                title: `Sunday`,
                color: parsedColorSunday,
                date: d.format('YYYY-MM-DD'),
                fixed: true,
                extendedProps: {
                  icon: parsedSunday.icon
                }
              });
            }
          }
          
          // 5. Process Meetings
          let meetingEvents: any[] = [];
          if (showMeetingsEnabled) {
            meetingEvents = finalMeetingsData.map((meeting: any) => ({
              title: meeting.title,
              start: dayjs(meeting.startDate).format(),
              end: dayjs(meeting.endDate).format(),
              color: parsedColorMeetings,
              className: 'meeting-event',
              extendedProps: {
                type: 'meeting',
                icon: parsedMeetings.icon,
                meeting: meeting
              }
            }));
          }
      
          // Add user birthdays and meetings to calendar events
          const calendarEventList = [
            ...(calendarRes?.data?.calendarEvents?.map((event: any) => ({
              title: event.eventName,
              start: dayjs(event.startDate).format(),
              end: dayjs(event.endDate).format(),
              color: "#AA393D"
            })) || []),
            ...userBirthdays,
            ...contactBirthdays,
            ...employeeAnniversaries,
            ...contactAnniversaries,
            ...meetingEvents
          ];
      
        //   const specialDates = [];
        //   if (dateOfBirth) {
        //     specialDates.push({
        //       title: "Your Birthday",
        //       color: "#AA393D",
        //       start: dayjs(dateOfBirth).format(),
        //       end: dayjs(dateOfBirth).format()
        //     });
        //   }
        //   if (anniversaryDate) {
        //     specialDates.push({
        //       title: "Your Anniversary",
        //       color: "#AA393D",
        //       start: dayjs(anniversaryDate).format(),
        //       end: dayjs(anniversaryDate).format()
        //     });
        //   }
      
          setHolidays([...holidaysFromAPI, ...weekendHolidays]);
          setCalendarEvents([...calendarEventList]);
        }
      
        getData();

        // console.log("=> => =>",currentYear, employeeId, branchId, dateOfBirth, anniversaryDate, holidayRefresh)
      }, [currentYear, employeeId, branchId, dateOfBirth, anniversaryDate, holidayRefresh]);

    function handleDayCellClassNames(arg: any) {
        let classNamesToAdd = [];
        if (arg.date.toDateString() === new Date().toDateString()) {
            classNamesToAdd.push('today-highlight');
        }
        const eventsOnDate: any = holidays.filter((event: any) => {
            return new Date(event?.date)?.toISOString().split('T')[0] === new Date(new Date(arg.date).setDate(new Date(arg.date).getDate() + 1))
                .toISOString().split('T')[0];
        });
        return classNamesToAdd;
    }

    useEffect(() => {
        const updateColumns=() => {
            if(window.innerWidth < 768){
                setMaxColumns(1);
            }
            else {
                setMaxColumns(2);
            }
        }
        updateColumns();
        window.addEventListener('resize', updateColumns);
        return () => window.removeEventListener('resize', updateColumns);
    }, []);

    return (
        <>
            <div id="fullcalendar__wrapper" className='d-flex flex-column'>
                <div className='w-100 pl-10 pr-10'>
                    <PageTitle breadcrumbs={calendarBreadcrumbs}>Calendar</PageTitle>

                    {/* Calendar header built from the shared Period components
                        (PeriodTabs + PeriodNavigator) used across the app, so the
                        controls look and behave consistently everywhere. */}
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: { xs: 'column', md: 'row' },
                            alignItems: { xs: 'stretch', md: 'center' },
                            justifyContent: 'space-between',
                            gap: 1.5,
                            mb: 2,
                        }}
                    >
                        <PeriodTabs
                            value={selectedViewForCalendar}
                            options={CALENDAR_VIEW_OPTIONS}
                            onChange={handleViewChangeByValue}
                            ariaLabel="calendar view selection"
                            sx={{ width: { xs: '100%', md: 'fit-content' } }}
                        />

                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: { xs: 'space-between', md: 'flex-end' },
                                gap: 1.5,
                            }}
                        >
                            <Button
                                onClick={handleToday}
                                disableElevation
                                sx={{
                                    height: 32,
                                    minWidth: 'fit-content',
                                    px: 1.75,
                                    borderRadius: '4px',
                                    backgroundColor: '#ffffff',
                                    border: '1px solid #eef2f7',
                                    boxShadow: '0 4px 12px rgba(15, 23, 42, 0.06)',
                                    color: '#9d4141',
                                    fontSize: 12,
                                    fontWeight: 700,
                                    lineHeight: '32px',
                                    textTransform: 'none',
                                    '&:hover': { backgroundColor: '#f8fafc' },
                                }}
                            >
                                Today
                            </Button>

                            <PeriodNavigator
                                label={periodTitle}
                                onPrevious={handlePrevPeriod}
                                onNext={handleNextPeriod}
                                previousTitle="Previous"
                                nextTitle="Next"
                                minWidth={180}
                                sx={{ flex: { xs: 1, md: 'unset' } }}
                            />
                        </Box>
                    </Box>

                    <FullCalendar
                        dayCellClassNames={(e) => handleDayCellClassNames(e)}
                        locale={enGbLocale}
                        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, bootstrapPlugin, multiMonthPlugin]}
                        headerToolbar={false}
                        views={{
                            multiMonthYear: {
                                type: "multiMonthYear",
                                multiMonthMaxColumns: maxColumns,
                                multiMonthMinWidth: 300,
                            },
                        }}
                        initialView="dayGridMonth"
                        weekends={true}
                        events={[...holidays, ...calendarEvents]}
                        eventContent={renderEventContent}
                        eventDisplay='block'
                        selectable={true}
                        // editable={true}
                        select={handleDateSelect}
                        longPressDelay={1}
                        // eventClick={handleEventClick}
                        ref={calendarRef}
                        datesSet={handleDatesSet}
                        height={"auto"}
                        contentHeight={"auto"}
                    />

                    <Modal className='custom-modal-dialog container' show={showOptionsModal} onHide={() => setShowOptionsModal(false)} centered>
                        <Modal.Header closeButton >
                            <Modal.Title>Select Event Type</Modal.Title>
                        </Modal.Header>
                        <Modal.Body>
                            <div className="d-flex flex-column">
                                {(() => {
                                    let isPastDate = false;
                                    if (selectedDateTimeInfo && selectedDateTimeInfo.startStr) {
                                        const selectedDate = dayjs(selectedDateTimeInfo.startStr).startOf('day');
                                        const today = dayjs().startOf('day');
                                        isPastDate = selectedDate.isBefore(today);
                                    }
                                    if (isPastDate) {
                                        return (<>
                                            <div className="alert alert-warning mb-3">
                                                You have selected a past date. You cannot create events, holidays, or meetings for past dates.<br />
                                                <strong>Note:</strong> You can still create a leave request for a past date.
                                            </div>
                                            {hasPermission(resourceNameMapWithCamelCase.leave, permissionConstToUseWithHasPermission.create) && <label
                                                className='btn btn-outline btn-outline-dashed btn-outline-default mb-3 p-3 d-flex align-items-center'
                                                onClick={handleShowLeaveRequestForm}
                                            >
                                                <KTIcon iconName='bi bi-file-earmark-text fs-2x' className='fs-3x me-5' />
                                                <span className='d-block fw-bold text-start'>
                                                    <span className='text-gray-900 fw-bolder d-block fs-4 mb-2'>Create a Leave Request</span>
                                                    <span className='text-gray-500 fw-bold fs-6'>
                                                        Fill in the leave request form
                                                    </span>
                                                </span>
                                            </label>}
                                        </>);
                                    } else {
                                        return (<>
                                            <label
                                                className='btn btn-outline btn-outline-dashed btn-outline-default p-3 d-flex align-items-center mb-3'
                                                onClick={() => { setShowOptionsModal(false); handleShowEventForm(); }}
                                            >
                                                <KTIcon iconName='bi bi-calendar-check fs-2x' className='fs-3x me-5' />
                                                <span className='d-block fw-bold text-start'>
                                                    <span className='text-gray-900 fw-bolder d-block fs-4 mb-2'>Create New Event</span>
                                                    <span className='text-gray-500 fw-bold fs-6'>
                                                        Fill in the event form
                                                    </span>
                                                </span>
                                            </label>
                                            {hasPermission(resourceNameMapWithCamelCase.holiday, permissionConstToUseWithHasPermission.editOthers) && <label
                                                className='btn btn-outline btn-outline-dashed btn-outline-default p-3 d-flex align-items-center mb-3'
                                                onClick={() => { setShowOptionsModal(false); handleShowHolidayForm(); }}
                                            >
                                                <KTIcon iconName='calendar' className='fs-3x me-5' />
                                                <span className='d-block fw-bold text-start'>
                                                    <span className='text-gray-900 fw-bolder d-block fs-4 mb-2'>Create a Holiday</span>
                                                    <span className='text-gray-500 fw-bold fs-6'>
                                                        Fill in the holiday form
                                                    </span>
                                                </span>
                                            </label>}
                                            {hasPermission(resourceNameMapWithCamelCase.leave, permissionConstToUseWithHasPermission.create) && <label
                                                className='btn btn-outline btn-outline-dashed btn-outline-default mb-3 p-3 d-flex align-items-center'
                                                onClick={handleShowLeaveRequestForm}
                                            >
                                                <KTIcon iconName='bi bi-file-earmark-text fs-2x' className='fs-3x me-5' />
                                                <span className='d-block fw-bold text-start'>
                                                    <span className='text-gray-900 fw-bolder d-block fs-4 mb-2'>Create a Leave Request</span>
                                                    <span className='text-gray-500 fw-bold fs-6'>
                                                        Fill in the leave request form
                                                    </span>
                                                </span>
                                            </label>}
                                            {hasPermission(resourceNameMapWithCamelCase.meeting, permissionConstToUseWithHasPermission.create) && <label
                                                className='btn btn-outline btn-outline-dashed btn-outline-default p-3 d-flex align-items-center'
                                                onClick={handleshowMeetingForm}
                                            >
                                                <KTIcon iconName='bi bi-file-earmark-text fs-2x' className='fs-3x me-5' />
                                                <span className='d-block fw-bold text-start'>
                                                    <span className='text-gray-900 fw-bolder d-block fs-4 mb-2'>Create Meetings</span>
                                                    <span className='text-gray-500 fw-bold fs-6'>
                                                        Fill in the meetings form
                                                    </span>
                                                </span>
                                            </label>}
                                        </>);
                                    }
                                })()}
                            </div>
                        </Modal.Body>
                    </Modal>

            {/* Holiday Form Modal */}
            <Modal show={showHolidayForm} onHide={handleCloseHolidayForm} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Create New Holiday</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                <PublicHoliday 
                    onClose={()=>{setShowHolidayForm(false)}} 
                    setShowNewHolidayForm={undefined} 
                    selectedDateTimeInfo={selectedDateTimeInfo}
                    setRefetch={setHolidayRefresh}
                    sendNotification={() => successConfirmation('Holiday added successfully')}
                />
                </Modal.Body>
            </Modal>

            {/* Leave Request Form Modal */}
            <Modal show={showLeaveRequestForm} onHide={handleCloseLeaveRequestForm} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Create New Leave Request</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                <LeaveRequestForm onClose={handleCloseLeaveRequestForm} selectedDateTimeInfo={selectedDateTimeInfo} />
                </Modal.Body>
            </Modal>

            {/* Add New Holiday Form Modal */}
            <Modal show={showNewHolidayForm} onHide={handleCloseNewHolidayForm} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Add New Holiday</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Holiday 
                        onCloseHolidayForm={handleCloseNewHolidayForm} 
                        refreshHolidayList={() => setHolidayRefresh(prev => !prev)}
                    />
                </Modal.Body>
            </Modal>

                    {/* Add new Meeting form model */}
                    <Modal show={showMeetingsForm} onHide={handleCloseMeetingForm} centered>
                        <Modal.Header closeButton>
                            <Modal.Title>Add New Meetings</Modal.Title>
                        </Modal.Header>
                        <Modal.Body>
                    <MeetingsForm onClose={handleCloseMeetingForm} selectedDateTimeInfo={selectedDateTimeInfo}/>
                        </Modal.Body>
                    </Modal>

                    {/* Event Form Modal */}
                    <Modal show={showEventForm} onHide={handleCloseEventForm} centered>
                        <Modal.Header closeButton>
                            <Modal.Title className='px-9'>Create New Event</Modal.Title>
                        </Modal.Header>
                        <Modal.Body>
                            <form onSubmit={formik.handleSubmit} noValidate className='form'>
                                <div className='card-body px-9'>
                                    <div className='row mb-9'>
                                        <div className='col-lg-12'>
                                            <label className='required fs-6 fw-bold form-label mb-3'>Event name</label>
                                            <input
                                                type='text'
                                                className='form-control form-control-lg form-control-solid'
                                                placeholder='Event name'
                                                {...formik.getFieldProps('eventName')}
                                            />
                                            {formik.touched.eventName && formik.errors.eventName && (
                                                <div className='fv-plugins-message-container'>
                                                    <div className='fv-help-block'>{formik.errors.eventName}</div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className='row mb-9'>
                                        <div className='col-lg-6'>
                                            <label className='required fs-6 fw-bold form-label mb-3'>Start date</label>
                                            <Flatpickr
                                                value={formik.values.startDate}
                                                className='form-control form-control-lg form-control-solid'
                                                placeholder='Start date'
                                                onChange={(selectedDates: Date[]) => {
                                                    // console.log("start => ", selectedDates[0]);
                                                    formik.setFieldValue('startDate', selectedDates[0], true);
                                                }}
                                                options={{
                                                    dateFormat: "Y-m-d H:i",
                                                    time_24hr: false,
                                                    altInput: true,
                                                    altFormat: "F j, Y H:i",
                                                    enableTime: true,
                                                }}
                                            />
                                            {formik.touched.startDate && formik.errors.startDate && (
                                                <div className='fv-plugins-message-container'>
                                                    <div className='fv-help-block'>{formik.errors.startDate}</div>
                                                </div>
                                            )}
                                        </div>

                                        <div className='col-lg-6 fv-row'>
                                            <label className='required fs-6 fw-bold form-label mb-3'>End date</label>
                                            <Flatpickr
                                                value={formik.values.endDate}
                                                className='form-control form-control-lg form-control-solid'
                                                placeholder='End date'
                                                onChange={(selectedDates: Date[]) => {
                                                    // console.log("end => ", selectedDates[0]);
                                                    formik.setFieldValue('endDate', selectedDates[0], true);

                                                }}
                                                options={{
                                                    dateFormat: "Y-m-d H:i",
                                                    time_24hr: false,
                                                    altInput: true,
                                                    altFormat: "F j, Y H:i",
                                                    enableTime: true,
                                                }}
                                            />
                                            {formik.touched.startDate && formik.errors.startDate && (
                                                <div className='fv-plugins-message-container'>
                                                    <div className='fv-help-block'>{formik.errors.startDate}</div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className='card-footer d-flex justify-content-end px-9'>
                                        <div className='col-lg-12'>
                                            <button
                                                type='submit'
                                                className='btn btn-primary'
                                                disabled={loading}
                                            >
                                                {loading ? 'Saving...' : 'Save Event'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </Modal.Body>
                    </Modal>
                </div>
                <div className='w-100 mt-3'>
                    <div className="">
                        <div className="">
                            {/* <h3 className="card-title">Holidays List</h3> */}
                        </div>
                        <div>
                            <PublicHolidaysListNew selectedYear={currentYear} selectedStartDate={selectedStartDate} selectedEndDate={selectedEndDate} selectedView={selectedViewForCalendar} holidaysToShow={[...holidays, ...calendarEvents]} />
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
function renderEventContent(eventInfo: any) {
    const icon = eventInfo.event.extendedProps?.icon;
    const isKtIcon = icon?.startsWith("kt:");
    
    return (
        <div className='fullcalendar__event__wrapper d-flex align-items-center gap-1' style={{ backgroundColor: eventInfo.backgroundColor }}>
            {icon && (
                isKtIcon ? (
                    <span style={{ color: eventInfo.textColor || '#fff', marginRight: '4px', display: 'flex', alignItems: 'center' }}>
                        <KTIcon iconName={icon.slice(3)} className="fs-6" />
                    </span>
                ) : (
                    <img src={icon} alt="icon" style={{ width: 14, height: 14, objectFit: 'contain', marginRight: '4px' }} />
                )
            )}
            <span>{eventInfo.event.title}</span>
        </div>
    )
}

export default CustomCalendar;