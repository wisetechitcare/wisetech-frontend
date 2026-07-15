import { safeJsonParse } from '@utils/safeJson';
import { T as UiTokens } from '@app/modules/common/components/ui/tokens';
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
import { KTIcon, toAbsoluteUrl } from '@metronic/helpers';
import ApplyLeave from './attendance/personal/views/my-leaves/ApplyLeave';
import Holiday from '@pages/company/Holiday';
import './CustomCalendar.premium.css';
import MeetingsForm from './attendance/personal/views/my-leaves/MeetingsForm';
import SmartAvatar from '@app/modules/common/components/SmartAvatar';
import PremiumButton from '@app/modules/common/components/PremiumButton';
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
  SHOW_MARRIAGE_ANNIVERSARY_INTERNAL,
  SHOW_MARRIAGE_ANNIVERSARY_INTERNAL_INACTIVE,
  SHOW_MARRIAGE_ANNIVERSARY_EXTERNAL,
  SHOW_SATURDAY_ON_CALENDAR,
  SHOW_SUNDAY_ON_CALENDAR,
  SHOW_MEETINGS_ON_CALENDAR
} from '@constants/configurations-key';
import { getUpcomingContactsBirthdays } from '@services/companies';
import { fetchColorAndStoreInSlice } from '@utils/file';
import PeriodNavigator from '@app/modules/common/components/PeriodNavigator';
import PeriodTabs from '@app/modules/common/components/PeriodTabs';

// ---- Premium outline icon set (consistent, no emoji) ----
const ICONS: Record<string, JSX.Element> = {
    plus: <path d="M12 5v14M5 12h14" />,
    x: <path d="M18 6L6 18M6 6l12 12" />,
    chevL: <path d="M15 18l-6-6 6-6" />,
    chevR: <path d="M9 18l6-6-6-6" />,
    calendar: <><rect x="3" y="4.5" width="18" height="16" rx="3" /><path d="M3 9h18M8 2.5v4M16 2.5v4" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7.5V12l3 2" /></>,
    video: <><rect x="2" y="6" width="14" height="12" rx="2.5" /><path d="M22 8l-6 4 6 4V8z" /></>,
    cake: <><path d="M4 21v-8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8" /><path d="M3 21h18" /><path d="M4 16.5s1-1 2.7-1 2.6 1.4 4 1.4 2.3-1.4 4-1.4 2.6 1 2.6 1" /><path d="M8 10.5V8M12 10.5V7.5M16 10.5V8" /></>,
    award: <><circle cx="12" cy="9" r="6" /><path d="M8.5 14L7 22l5-3 5 3-1.5-8" /></>,
    sun: <><circle cx="12" cy="12" r="4.5" /><path d="M12 1.5v2.5M12 20v2.5M3.5 12H1M23 12h-2.5M5 5l1.8 1.8M17.2 17.2L19 19M5 19l1.8-1.8M17.2 6.8L19 5" /></>,
    users: <><path d="M16 20v-1.5A3.5 3.5 0 0 0 12.5 15h-6A3.5 3.5 0 0 0 3 18.5V20" /><circle cx="9.5" cy="8" r="3.5" /></>,
    flag: <><path d="M4 15s1-.8 3.5-.8S12 15.8 15 15.8 19 15 19 15V4s-1 .8-4 .8S9.5 3 6.5 3 4 3.8 4 3.8z" /><path d="M4 21v-6" /></>,
    spark: <path d="M12 3l1.8 4.9L19 9.7l-5.2 1.8L12 16l-1.8-4.5L5 9.7l5.2-1.8z" />,
    gift: <><rect x="3.5" y="8.5" width="17" height="12" rx="2" /><path d="M3.5 12.5h17M12 8.5v12" /><path d="M12 8.5S10.5 4 8 4a2 2 0 0 0 0 4h4zM12 8.5S13.5 4 16 4a2 2 0 0 1 0 4h-4z" /></>,
    file: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5z" /><path d="M14 3v5h5M9 13h6M9 17h4" /></>,
    eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></>,
    eyeOff: <><path d="M9.9 5.1A9.8 9.8 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4M6.5 6.6C3.7 8.2 2 12 2 12s3.5 7 10 7a9.7 9.7 0 0 0 4.2-.9M3 3l18 18M9.9 9.9a3 3 0 0 0 4.2 4.2" /></>,
};
const Ico = ({ n, cls = '' }: { n: string; cls?: string }) => (
    <svg className={`mrd-ico ${cls}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">{ICONS[n]}</svg>
);

// Category → premium look (icon / accent / soft tint / label). Keeps the palette
// consistent regardless of the arbitrary configured event colours.
const CAT: Record<string, { color: string; tint: string; icon: string; label: string }> = {
    holiday: { color: 'var(--mrd-primary)', tint: 'var(--mrd-primary-tint)', icon: 'sun', label: 'Public holiday' },
    meeting: { color: 'var(--mrd-violet)', tint: 'var(--mrd-violet-tint)', icon: 'video', label: 'Meeting' },
    birthday: { color: 'var(--mrd-rose)', tint: 'var(--mrd-rose-tint)', icon: 'cake', label: 'Birthday' },
    'contact-birthday': { color: 'var(--mrd-rose)', tint: 'var(--mrd-rose-tint)', icon: 'cake', label: 'Birthday · contact' },
    anniversary: { color: 'var(--mrd-blue)', tint: 'var(--mrd-blue-tint)', icon: 'award', label: 'Work anniversary' },
    'contact-anniversary': { color: 'var(--mrd-blue)', tint: 'var(--mrd-blue-tint)', icon: 'award', label: 'Anniversary · contact' },
    'marriage-anniversary': { color: 'var(--mrd-amber)', tint: 'var(--mrd-amber-tint)', icon: 'heart', label: 'Marriage anniversary' },
    'contact-marriage-anniversary': { color: 'var(--mrd-amber)', tint: 'var(--mrd-amber-tint)', icon: 'heart', label: 'Marriage anniversary · contact' },
    event: { color: 'var(--mrd-primary)', tint: 'var(--mrd-primary-tint)', icon: 'calendar', label: 'Event' },
};

// Calendar legend groups → drive the visibility toggles in the right panel.
// Each row maps a friendly label to one or more underlying event `type`s.
const LEGEND: { key: string; label: string; color: string; types: string[] }[] = [
    { key: 'event', label: 'My Calendar', color: 'var(--mrd-primary)', types: ['event'] },
    { key: 'meeting', label: 'Meetings', color: 'var(--mrd-violet)', types: ['meeting'] },
    { key: 'birthday', label: 'Birthdays', color: 'var(--mrd-rose)', types: ['birthday', 'contact-birthday'] },
    { key: 'anniversary', label: 'Anniversaries', color: 'var(--mrd-blue)', types: ['anniversary', 'contact-anniversary'] },
    { key: 'marriage-anniversary', label: 'Marriage Anniversaries', color: 'var(--mrd-amber)', types: ['marriage-anniversary', 'contact-marriage-anniversary'] },
    { key: 'holiday', label: 'Holidays', color: 'var(--mrd-primary)', types: ['holiday'] },
];

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
    const [hiddenCats, setHiddenCats] = useState<Set<string>>(new Set());
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
    // Day selected in the right-hand detail panel (independent of the create flow).
    const [panelDate, setPanelDate] = useState<Date>(new Date());
    // Below this width the day-detail panel (.mrd-panel) stops being an
    // always-stacked block and becomes an on-demand bottom sheet instead —
    // otherwise its five sections (timeline/create/upcoming/quick actions/
    // legend) would dump a very long scroll between the calendar and the
    // bento cards on every phone. Matches the existing 760px CSS breakpoint.
    const [isMobile, setIsMobile] = useState(false);
    const [panelSheetOpen, setPanelSheetOpen] = useState(false);
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
                            color: UiTokens.color.accent
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
        setPanelDate(new Date(selectInfo.startStr));
        if (isMobile) setPanelSheetOpen(true);
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
        const calendarApi = e?.view?.calendar || calendarRef.current?.getApi();
        if (!calendarApi) return;
        const currentYear = calendarApi.getDate().getFullYear();
        setCurrentYear(currentYear + "");
        setPeriodTitle(e?.view?.title || calendarApi.view?.title || "");
        setSelectedViewForCalendar(e?.view?.type || calendarApi.view?.type || selectedViewForCalendar);
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
            showMarriageAnnyInternalRes,
            showMarriageAnnyInternalInactiveRes,
            showMarriageAnnyExternalRes,
            showSaturdayRes,
            showSundayRes,
            showMeetingsRes,
            allEmployeeDateOfjoining,
            meetingsRes
          ] = await Promise.all([
            fetchAllColors(),
            fetchAllUsers(),
            // A not-yet-configured module makes the GET endpoint respond 400. Catch each
            // config request so one missing module can't reject the whole batch and blank
            // out birthdays / anniversaries / meetings / weekends on the calendar. A null
            // result simply parses to `{}` (defaults) downstream.
            fetchConfiguration(SHOW_BIRTHDAYS_INTERNAL).catch(() => null),
            fetchConfiguration(SHOW_BIRTHDAYS_INTERNAL_INACTIVE).catch(() => null),
            fetchConfiguration(SHOW_BIRTHDAYS_EXTERNAL).catch(() => null),
            fetchConfiguration(SHOW_ANNIVERSARIES_INTERNAL).catch(() => null),
            fetchConfiguration(SHOW_ANNIVERSARIES_INTERNAL_INACTIVE).catch(() => null),
            fetchConfiguration(SHOW_ANNIVERSARIES_EXTERNAL).catch(() => null),
            fetchConfiguration(SHOW_MARRIAGE_ANNIVERSARY_INTERNAL).catch(() => null),
            fetchConfiguration(SHOW_MARRIAGE_ANNIVERSARY_INTERNAL_INACTIVE).catch(() => null),
            fetchConfiguration(SHOW_MARRIAGE_ANNIVERSARY_EXTERNAL).catch(() => null),
            fetchConfiguration(SHOW_SATURDAY_ON_CALENDAR).catch(() => null),
            fetchConfiguration(SHOW_SUNDAY_ON_CALENDAR).catch(() => null),
            fetchConfiguration(SHOW_MEETINGS_ON_CALENDAR).catch(() => null),
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
          const parsedMarriageAnnyInt = safeJsonParse(showMarriageAnnyInternalRes?.data?.configuration?.configuration || '{}');
          const parsedMarriageAnnyIntInactive = safeJsonParse(showMarriageAnnyInternalInactiveRes?.data?.configuration?.configuration || '{}');
          const parsedMarriageAnnyExt = safeJsonParse(showMarriageAnnyExternalRes?.data?.configuration?.configuration || '{}');
          const parsedSaturday = safeJsonParse(showSaturdayRes?.data?.configuration?.configuration || '{}');
          const parsedSunday = safeJsonParse(showSundayRes?.data?.configuration?.configuration || '{}');
          const parsedMeetings = safeJsonParse(showMeetingsRes?.data?.configuration?.configuration || '{}');

          const showBirthdaysInternalEnabled = parsedBdayInt.enabled ?? parsedBdayInt.showBirthdaysInternal ?? false;
          const showBirthdaysInternalInactiveEnabled = parsedBdayIntInactive.enabled ?? false;
          const showBirthdaysExternalEnabled = parsedBdayExt.enabled ?? parsedBdayExt.showBirthdaysExternal ?? false;
          const showAnniversariesInternalEnabled = parsedAnnyInt.enabled ?? parsedAnnyInt.showAnniversariesInternal ?? false;
          const showAnniversariesInternalInactiveEnabled = parsedAnnyIntInactive.enabled ?? false;
          const showAnniversariesExternalEnabled = parsedAnnyExt.enabled ?? parsedAnnyExt.showAnniversariesExternal ?? false;
          const showMarriageAnnyInternalEnabled = parsedMarriageAnnyInt.enabled ?? false;
          const showMarriageAnnyInternalInactiveEnabled = parsedMarriageAnnyIntInactive.enabled ?? false;
          const showMarriageAnnyExternalEnabled = parsedMarriageAnnyExt.enabled ?? false;
          const showSaturdayEnabled = parsedSaturday.enabled ?? false;
          const showSundayEnabled = parsedSunday.enabled ?? false;
          const showMeetingsEnabled = parsedMeetings.enabled ?? false;

          const parsedColorBdayInt = parsedBdayInt.color || birthdaysColor || '#E91E63';
          const parsedColorBdayIntInactive = parsedBdayIntInactive.color || '#E91E63';
          const parsedColorBdayExt = parsedBdayExt.color || '#0288d1';
          const parsedColorAnnyInt = parsedAnnyInt.color || anniversariesColor || '#9C27B0';
          const parsedColorAnnyIntInactive = parsedAnnyIntInactive.color || '#9C27B0';
          const parsedColorAnnyExt = parsedAnnyExt.color || '#f57c00';
          const parsedColorMarriageAnnyInt = parsedMarriageAnnyInt.color || '#E64980';
          const parsedColorMarriageAnnyIntInactive = parsedMarriageAnnyIntInactive.color || '#E64980';
          const parsedColorMarriageAnnyExt = parsedMarriageAnnyExt.color || '#AE3EC9';
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

          const employeeMapByUserId = new Map(
            (allEmployeeDateOfjoining?.data?.employees || [])
              .map((employee: any) => {
                const uid = employee?.users?.id ?? employee?.userId;
                return uid ? [uid, employee] : null;
              })
              .filter(Boolean) as [any, any][]
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

              const empRecord = employeeMapByUserId.get(user.id);
              const resolvedAvatar = empRecord?.avatar || user.avatar || empRecord?.users?.avatar || null;

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
                    avatar: resolvedAvatar
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
                    avatar: employee.avatar || employee.users?.avatar || null
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

          // 5. Process employee marriage anniversaries (Internal Team) — same
          // recurrence math as Work Anniversary, driven by `employee.anniversary`
          // (the marriage/wedding date captured on the employee profile) instead
          // of `dateOfJoining`. Uses a distinct `marriage-anniversary` type so it
          // doesn't collide with the Work Anniversary category/legend/filters.
          let employeeMarriageAnniversaries: any[] = [];

          employeeMarriageAnniversaries = allEmployeeDateOfjoining?.data?.employees
            ?.filter((employee: any) => employee.anniversary && employee?.users)
            .map((employee: any) => {
              const marriageAnniversaryDate = dayjs(employee.anniversary);
              const today = dayjs().startOf('day');
              let nextMarriageAnniversary = dayjs(marriageAnniversaryDate).year(today.year());
              if (nextMarriageAnniversary.isBefore(today, 'day')) {
                nextMarriageAnniversary = dayjs(marriageAnniversaryDate).year(Number(currentYear));
              }
              const isInactive = employee.isActive === false || employee.users?.isActive === false;

              if (isInactive && !showMarriageAnnyInternalInactiveEnabled) return null;
              if (!isInactive && !showMarriageAnnyInternalEnabled) return null;

              const bgColor = isInactive ? parsedColorMarriageAnnyIntInactive : parsedColorMarriageAnnyInt;
              const iconToUse = isInactive ? parsedMarriageAnnyIntInactive.icon : parsedMarriageAnnyInt.icon;

              return {
                title: `${employee.users.firstName} ${employee.users.lastName}'s Marriage Anniversary${isInactive ? ' (Inactive Employee)' : ''}`,
                start: nextMarriageAnniversary.format('YYYY-MM-DD'),
                allDay: true,
                color: bgColor,
                textColor: '#FFFFFF',
                borderColor: bgColor,
                className: 'marriage-anniversary-event',
                extendedProps: {
                  type: 'marriage-anniversary',
                  icon: iconToUse,
                  user: {
                    id: employee.users.id,
                    name: `${employee.users.firstName} ${employee.users.lastName}`,
                    avatar: employee.avatar || employee.users?.avatar || null
                  }
                }
              };
            }).filter(Boolean) || [];

          // 6. Process contact marriage anniversaries (External Team) — reuses the
          // same `contact.anniversary` field as Work Anniversary's External Team
          // (there's no separate "marriage" date on the Contact model), so a
          // contact with both toggles enabled will surface on both. Kept
          // consistent with the existing External Team convention rather than
          // inventing a second contact field.
          let contactMarriageAnniversaries: any[] = [];
          if (showMarriageAnnyExternalEnabled) {
            contactMarriageAnniversaries = allContacts
              .filter((c: any) => c.anniversary)
              .map((c: any) => {
                const marriageAnniversaryDate = dayjs(c.anniversary);
                const today = dayjs().startOf('day');
                let nextMarriageAnniversary = dayjs(marriageAnniversaryDate).year(today.year());
                if (nextMarriageAnniversary.isBefore(today, 'day')) {
                  nextMarriageAnniversary = dayjs(marriageAnniversaryDate).year(Number(currentYear));
                }
                return {
                  title: `${c.name}'s Marriage Anniversary`,
                  start: nextMarriageAnniversary.format('YYYY-MM-DD'),
                  allDay: true,
                  color: parsedColorMarriageAnnyExt,
                  textColor: '#FFFFFF',
                  borderColor: parsedColorMarriageAnnyExt,
                  className: 'marriage-anniversary-event-external',
                  extendedProps: {
                    type: 'contact-marriage-anniversary',
                    icon: parsedMarriageAnnyExt.icon,
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
              color: "#1E3A8A"
            })) || []),
            ...userBirthdays,
            ...contactBirthdays,
            ...employeeAnniversaries,
            ...contactAnniversaries,
            ...employeeMarriageAnniversaries,
            ...contactMarriageAnniversaries,
            ...meetingEvents
          ];
      
        //   const specialDates = [];
        //   if (dateOfBirth) {
        //     specialDates.push({
        //       title: "Your Birthday",
        //       color: "#1E3A8A",
        //       start: dayjs(dateOfBirth).format(),
        //       end: dayjs(dateOfBirth).format()
        //     });
        //   }
        //   if (anniversaryDate) {
        //     specialDates.push({
        //       title: "Your Anniversary",
        //       color: "#1E3A8A",
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
        const classNamesToAdd = [];
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
            setIsMobile(window.innerWidth <= 760);
        }
        updateColumns();
        window.addEventListener('resize', updateColumns);
        return () => window.removeEventListener('resize', updateColumns);
    }, []);

    // Lock background scroll while the mobile day-detail sheet is open, and
    // let Escape close it (the same affordance the backdrop/close button give).
    useEffect(() => {
        if (!isMobile || !panelSheetOpen) return;
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') setPanelSheetOpen(false); };
        window.addEventListener('keydown', onKeyDown);
        return () => {
            document.body.style.overflow = prevOverflow;
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [isMobile, panelSheetOpen]);

    /* -----------------------------------------------------------------
       Derived, presentation-only data. Built entirely from state that is
       already fetched above (holidays / calendarEvents / meetings), so the
       premium panel + cards stay perfectly in sync with the calendar.
       ----------------------------------------------------------------- */
    const dkey = (d: any) => dayjs(d).format('YYYY-MM-DD');
    const mergedEvents = [...holidays, ...calendarEvents];
    const evDateOf = (e: any) => e.date || e.start;
    const evType = (e: any): string => e.extendedProps?.type || (e.date ? 'holiday' : 'event');
    const evMeta = (e: any) => CAT[evType(e)] || CAT.event;
    

    const renderProfileOrIcon = (
        e: any,
        size: number,
        shape: "circle" | "rounded" = "circle",
        fallbackClass: string,
        useDotFallback: boolean = false
    ) => {
        const type = evType(e);
        const isProfileEvent = ['birthday', 'anniversary', 'contact-birthday', 'contact-anniversary', 'marriage-anniversary', 'contact-marriage-anniversary'].includes(type);
        
        if (isProfileEvent) {
            const user = e.extendedProps?.user;
            const contact = e.extendedProps?.contact;
            const name = user?.name || contact?.name || e.title || '';
            const imageUrl = user?.avatar || contact?.profilePhoto || null;
            const id = user?.id || contact?.id || null;
            
            return (
                <SmartAvatar
                    name={name}
                    id={id}
                    imageUrl={resolveAvatarUrl(imageUrl)}
                    size={size}
                    shape={shape}
                    imageFit="cover"
                />
            );
        }
        
        const m = evMeta(e);
        if (useDotFallback) {
            return <span className={fallbackClass} style={{ background: m.color }} />;
        }
        
        return (
            <span className={fallbackClass} style={{ background: m.tint, color: m.color }}>
                <Ico n={m.icon} cls="sm" />
            </span>
        );
    };
    const allDayTypes = ['birthday', 'anniversary', 'contact-birthday', 'contact-anniversary', 'marriage-anniversary', 'contact-marriage-anniversary', 'holiday'];
    const evTimeOf = (e: any) => {
        const s = e.start;
        if (!s || allDayTypes.includes(evType(e))) return '';
        const d = dayjs(s);
        if (!d.isValid() || d.format('HH:mm') === '00:00') return '';
        return d.format('h:mm A');
    };
    // Events currently visible after applying the legend visibility toggles.
    const visibleEvents = mergedEvents.filter((e) => !hiddenCats.has(evType(e)));
    const toggleCat = (types: string[]) => setHiddenCats((prev) => {
        const next = new Set(prev);
        const allHidden = types.every((t) => next.has(t));
        types.forEach((t) => (allHidden ? next.delete(t) : next.add(t)));
        return next;
    });

    const eventsOn = (d: Date) => visibleEvents
        .filter((e) => dkey(evDateOf(e)) === dkey(d))
        .sort((a, b) => (evTimeOf(a) || 'zz').localeCompare(evTimeOf(b) || 'zz'));

    const panelEvents = eventsOn(panelDate);
    const todayEvents = eventsOn(new Date());

    /* Distinct configured category icons present on a given day. An event only
       carries an `icon` (in extendedProps) when that category has one selected
       in its "Configure …" modal, so we simply skip events without one. Icons
       are de-duplicated per category, so a day with e.g. a birthday + an
       anniversary shows the two icons side by side. */
    const iconsOn = (d: Date): string[] => {
        const seen = new Set<string>();
        const out: string[] = [];
        eventsOn(d).forEach((e: any) => {
            const ic: string | undefined = e?.extendedProps?.icon;
            if (ic && !seen.has(ic)) { seen.add(ic); out.push(ic); }
        });
        return out;
    };
    const renderDayIcon = (icon: string, i: number) => (
        icon.startsWith('kt:')
            ? <span className="mrd-daybadge" key={i}><KTIcon iconName={icon.slice(3)} className="mrd-daybadge__kt" /></span>
            : <img className="mrd-daybadge mrd-daybadge__img" src={icon} alt="" key={i} />
    );
    // Rendered into FullCalendar's day-number anchor; the icon cluster is
    // absolutely positioned to the bottom-right of the cell frame via CSS.
    const renderDayCellContent = (arg: any) => {
        const vt: string = arg?.view?.type || '';
        const icons = vt.startsWith('multiMonth') ? [] : iconsOn(arg.date);   // skip the tiny year-view cells
        return (
            <>
                {arg.dayNumberText}
                {icons.length > 0 && (
                    <span className="mrd-daybadges">
                        {icons.slice(0, 4).map((ic, i) => renderDayIcon(ic, i))}
                        {icons.length > 4 && <span className="mrd-daybadge mrd-daybadge__more">+{icons.length - 4}</span>}
                    </span>
                )}
            </>
        );
    };

    const startOfToday = dayjs().startOf('day');
    const upcomingMeetings = [...meetings]
        .filter((m: any) => m?.startDate && dayjs(m.startDate).isValid() && !dayjs(m.startDate).startOf('day').isBefore(startOfToday))
        .sort((a: any, b: any) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
        .slice(0, 5);

    const celebrations = calendarEvents
        .filter((e: any) => ['birthday', 'contact-birthday', 'anniversary', 'contact-anniversary'].includes(e.extendedProps?.type))
        .filter((e: any) => e.start && dayjs(e.start).isValid())
        .sort((a: any, b: any) => new Date(a.start).getTime() - new Date(b.start).getTime())
        .slice(0, 6);

    const holidayList = holidays
        .filter((h: any) => { const t = (h.title || '').toLowerCase(); return t !== 'saturday' && t !== 'sunday'; })
        .filter((h: any) => h.date && dayjs(h.date).format('YYYY') === currentYear)
        .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const thisMonthCount = mergedEvents.filter((e) => dayjs(evDateOf(e)).format('YYYY-MM') === dayjs().format('YYYY-MM')).length;

    const relLabel = (d: any) => {
        const diff = dayjs(d).startOf('day').diff(startOfToday, 'day');
        if (diff === 0) return 'Today';
        if (diff === 1) return 'Tomorrow';
        if (diff > 1 && diff < 7) return dayjs(d).format('ddd');
        return dayjs(d).format('MMM D');
    };
    const panelLabel = relLabel(panelDate) === 'Today' || relLabel(panelDate) === 'Tomorrow'
        ? relLabel(panelDate)
        : dayjs(panelDate).startOf('day').diff(startOfToday, 'day') === -1 ? 'Yesterday' : 'Selected day';

    // Upcoming, forward-looking feed for the right panel — from today onward,
    // respecting the legend visibility toggles.
    const upcomingEvents = visibleEvents
        .filter((e) => { const d = dayjs(evDateOf(e)); return d.isValid() && !d.startOf('day').isBefore(startOfToday); })
        .sort((a, b) => new Date(evDateOf(a)).getTime() - new Date(evDateOf(b)).getTime())
        .slice(0, 6);

    const panelPrev = () => setPanelDate((d) => dayjs(d).subtract(1, 'day').toDate());
    const panelNext = () => setPanelDate((d) => dayjs(d).add(1, 'day').toDate());
    const panelToday = () => setPanelDate(new Date());
    const openCreateFor = (d: Date) => {
        setSelectedDateTimeInfo({ startStr: dayjs(d).format('YYYY-MM-DD') } as any);
        setShowOptionsModal(true);
        // On mobile the "Select Event Type" chooser lives inside the day panel, which is a
        // bottom sheet translated off-screen until panelSheetOpen flips it into view — without
        // this the FAB/"New" button silently did nothing on mobile (desktop's panel is a
        // static rail with no sheet state, so it never needed this).
        if (isMobile) setPanelSheetOpen(true);
    };

    // Quick-action shortcuts — open the same forms as the "Select Event Type"
    // modal, pre-seeded with the currently selected panel day.
    const canHoliday = hasPermission(resourceNameMapWithCamelCase.holiday, permissionConstToUseWithHasPermission.editOthers);
    const canLeave = hasPermission(resourceNameMapWithCamelCase.leave, permissionConstToUseWithHasPermission.create);
    const canMeeting = hasPermission(resourceNameMapWithCamelCase.meeting, permissionConstToUseWithHasPermission.create);
    const qaNewEvent = () => { formik.setFieldValue('startDate', dayjs(panelDate).format('YYYY-MM-DD')); setShowEventForm(true); };
    const qaNewMeeting = () => setShowMeetingsForm(true);
    const qaNewHoliday = () => setShowHolidayForm(true);
    const qaLeave = () => setShowLeaveRequestForm(true);
    const emptyInline = (t: string) => (<div style={{ padding: '22px 6px', textAlign: 'center', color: 'var(--mrd-ink-3)', fontSize: 12.5 }}>{t}</div>);

    return (
        <>
            <div className="mrd">
                    <PageTitle breadcrumbs={calendarBreadcrumbs}>Calendar</PageTitle>

                    {/* Premium toolbar — reuses the shared PeriodTabs + PeriodNavigator
                        so behaviour stays consistent with the rest of the app. The
                        "Workspace calendar" title always sits on its own row; the view
                        tabs + Today + date nav always share a single controls row below
                        it, at every viewport — a simpler, more predictable structure
                        than title/tabs and today/nav splitting left/right. */}
                    <div className="mrd-toolbar">
                        <div className="mrd-eyebrow mrd-toolbar__title">Workspace calendar</div>
                        <div className="mrd-toolbar__controls">
                            <PeriodTabs
                                value={selectedViewForCalendar}
                                options={CALENDAR_VIEW_OPTIONS}
                                onChange={handleViewChangeByValue}
                                ariaLabel="calendar view selection"
                                selectedColor="var(--mrd-primary)"
                            />
                            <span className="mrd-spacer" />
                            {/* Icon-only on mobile (CSS hides .mrd-btn__lbl there) — the tabs
                                + this + the date navigator's two fixed 32px icon buttons need
                                more width than most phones have as plain text, and unlike the
                                navigator this button has no unavoidable minimum content. */}
                            <button type="button" className="mrd-btn mrd-btn--today" onClick={handleToday} aria-label="Jump to today" title="Today">
                                <Ico n="calendar" cls="sm" />
                                <span className="mrd-btn__lbl">Today</span>
                            </button>
                            <PeriodNavigator
                                label={periodTitle}
                                onPrevious={handlePrevPeriod}
                                onNext={handleNextPeriod}
                                previousTitle="Previous"
                                nextTitle="Next"
                                // 170px was tuned for desktop; on mobile that alone pushed the
                                // navigator past what's left after the view tabs + Today button,
                                // wrapping it to its own row. 108px still fits "July 2026" with
                                // room to spare and keeps everything on one line.
                                minWidth={isMobile ? 108 : 170}
                                labelColor="var(--mrd-primary)"
                            />
                            {/* Hidden below 760px (mrd-btn--new) — the mrd-fab below takes over
                                so the controls row doesn't have to fit a fourth element on a
                                narrow phone. */}
                            <PremiumButton className="mrd-btn--new" icon="bi-plus" onClick={() => openCreateFor(panelDate)}>
                                New
                            </PremiumButton>
                        </div>
                    </div>

                    {/* Mobile-only floating Create action — replaces the toolbar's "New"
                        button below 760px (see .mrd-btn--new / .mrd-fab in the CSS) so the
                        primary create action stays reachable with a thumb without crowding
                        the compact toolbar. Respects safe-area-inset-bottom. */}
                    <button type="button" className="mrd-fab" onClick={() => openCreateFor(panelDate)} aria-label="Create new event">
                        <Ico n="plus" />
                    </button>

                    <div className="mrd-main">
                        {/* ---- Main calendar card (FullCalendar engine, restyled) ---- */}
                        <section className="mrd-card mrd-cal">
                            <FullCalendar
                                dayCellClassNames={(e) => handleDayCellClassNames(e)}
                                locale={enGbLocale}
                                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, bootstrapPlugin, multiMonthPlugin]}
                                headerToolbar={false}
                                // "July 2026" vs "Jul 2026" — a few px that matter when the title
                                // sits in the same one-line row as the view tabs + Today button
                                // and the date navigator's two fixed-width icon buttons.
                                titleFormat={isMobile ? { month: 'short', year: 'numeric' } : { month: 'long', year: 'numeric' }}
                                views={{
                                    multiMonthYear: {
                                        type: "multiMonthYear",
                                        multiMonthMaxColumns: maxColumns,
                                        // 300px can exceed a 320-375px phone viewport once card
                                        // padding is subtracted, forcing horizontal scroll in Year
                                        // view. Narrower minimum on mobile keeps it in-bounds.
                                        multiMonthMinWidth: isMobile ? 250 : 300,
                                    },
                                }}
                                initialView="dayGridMonth"
                                weekends={true}
                                fixedWeekCount={false}
                                events={visibleEvents}
                                eventContent={renderEventContent}
                                dayCellContent={renderDayCellContent}
                                eventDisplay='block'
                                // A day column is only ~55px wide on a phone in Month/Week
                                // view — without a cap FullCalendar renders every event
                                // stacked full-height, which is what made cells unreadable.
                                // true = auto-fit to the cell's own height, collapsing the
                                // rest into the already-styled "+N more" popover link.
                                dayMaxEvents={true}
                                selectable={true}
                                // editable={true}
                                select={handleDateSelect}
                                dateClick={(info: any) => { setPanelDate(info.date); if (isMobile) setPanelSheetOpen(true); }}
                                longPressDelay={1}
                                // eventClick={handleEventClick}
                                ref={calendarRef}
                                datesSet={handleDatesSet}
                                height={"auto"}
                                contentHeight={"auto"}
                            />
                        </section>

                        {/* Compact mobile trigger bar — glanceable day summary that opens the
                            bottom sheet on tap. Hidden while the sheet itself is open. */}
                        {isMobile && !panelSheetOpen && (
                            <button type="button" className="mrd-daybar" onClick={() => setPanelSheetOpen(true)}>
                                <span className="mrd-daybar__date">
                                    <strong>{dayjs(panelDate).format('MMM D')}</strong>
                                    <span>{panelLabel}</span>
                                </span>
                                <span className="mrd-spacer" />
                                <span className="mrd-daybar__count">
                                    {panelEvents.length ? `${panelEvents.length} event${panelEvents.length > 1 ? 's' : ''}` : 'No events'}
                                </span>
                                <Ico n="chevR" cls="sm" />
                            </button>
                        )}

                        {/* Backdrop for the mobile bottom-sheet variant of the panel below —
                            inert/invisible on tablet+ (CSS), tapping it closes the sheet. */}
                        {isMobile && (
                            <div
                                className={`mrd-panel-backdrop${panelSheetOpen ? ' is-open' : ''}`}
                                onClick={() => setPanelSheetOpen(false)}
                                aria-hidden="true"
                            />
                        )}

                        {/* ---- Day detail panel (Linear/Notion style) — a persistent side
                            rail on tablet/laptop/desktop; an on-demand bottom sheet on mobile
                            (opened by tapping a day, or the compact bar below) so its five
                            sections don't dump a long scroll under the calendar on every phone. ---- */}
                        <aside className={`mrd-card mrd-panel${isMobile ? ' mrd-panel--sheet' : ''}${panelSheetOpen ? ' is-open' : ''}`}>
                            <div className="mrd-panel__head">
                                <div className="mrd-panel__top">
                                    {isMobile && <span className="mrd-panel__grabber" aria-hidden="true" />}
                                    <span className="mrd-eyebrow">{panelLabel}</span>
                                    <span className="mrd-spacer" />
                                    <button type="button" className="mrd-navbtn" onClick={panelPrev} aria-label="Previous day"><Ico n="chevL" cls="sm" /></button>
                                    <button type="button" className="mrd-navbtn" onClick={panelNext} aria-label="Next day"><Ico n="chevR" cls="sm" /></button>
                                    {isMobile && (
                                        <button type="button" className="mrd-navbtn" onClick={() => setPanelSheetOpen(false)} aria-label="Close day details">
                                            <Ico n="x" cls="sm" />
                                        </button>
                                    )}
                                </div>
                                <div className="mrd-panel__date">
                                    <h2>{dayjs(panelDate).format('MMM D')}</h2>
                                    <span className="wd">{dayjs(panelDate).format('dddd, YYYY')}</span>
                                </div>
                            </div>
                            <div className="mrd-panel__body">
                              {showOptionsModal ? (
                                /* ---- Inline "Select Event Type" chooser (replaces the old modal) ---- */
                                <div className="mrd-chooser">
                                    <div className="mrd-chooser__head">
                                        <span className="mrd-sect__t">Select Event Type</span>
                                        <button type="button" className="mrd-navbtn" onClick={() => setShowOptionsModal(false)} aria-label="Close" style={{ width: 30, height: 30 }}>
                                            <Ico n="x" cls="sm" />
                                        </button>
                                    </div>
                                    {(() => {
                                        let isPastDate = false;
                                        if (selectedDateTimeInfo && selectedDateTimeInfo.startStr) {
                                            isPastDate = dayjs(selectedDateTimeInfo.startStr).startOf('day').isBefore(dayjs().startOf('day'));
                                        }
                                        const Opt = ({ icon, tint, color, title, sub, onClick }: any) => (
                                            <button type="button" className="mrd-opt" onClick={onClick}>
                                                <span className="mrd-opt__ic" style={{ background: tint, color }}><Ico n={icon} /></span>
                                                <span className="mrd-opt__txt">
                                                    <span className="mrd-opt__t">{title}</span>
                                                    <span className="mrd-opt__s">{sub}</span>
                                                </span>
                                            </button>
                                        );
                                        if (isPastDate) {
                                            return (<>
                                                <div className="mrd-opt__note">
                                                    You've selected a past date — events, holidays and meetings can't be created for past dates. You can still submit a leave request.
                                                </div>
                                                {canLeave && <Opt icon="file" tint="var(--mrd-blue-tint)" color="var(--mrd-blue)" title="Create a Leave Request" sub="Fill in the leave request form" onClick={handleShowLeaveRequestForm} />}
                                            </>);
                                        }
                                        return (<>
                                            {canHoliday && <Opt icon="gift" tint="var(--mrd-amber-tint)" color="var(--mrd-amber)" title="Create a Holiday" sub="Fill in the holiday form" onClick={() => { setShowOptionsModal(false); handleShowHolidayForm(); }} />}
                                            {canLeave && <Opt icon="file" tint="var(--mrd-blue-tint)" color="var(--mrd-blue)" title="Create a Leave Request" sub="Fill in the leave request form" onClick={handleShowLeaveRequestForm} />}
                                            {canMeeting && <Opt icon="users" tint="var(--mrd-violet-tint)" color="var(--mrd-violet)" title="Create Meetings" sub="Fill in the meetings form" onClick={handleshowMeetingForm} />}
                                        </>);
                                    })()}
                                </div>
                              ) : (
                                <>
                                {/* Selected-day summary — timeline when busy, or a clean
                                    "no events" card with a Create Event CTA when clear. */}
                                {panelEvents.length ? (
                                    <div className="mrd-tl">
                                        {panelEvents.map((e: any, i: number) => {
                                            const m = evMeta(e);
                                            return (
                                                <div className="mrd-tl__item" key={i}>
                                                    <span className="mrd-tl__node" style={{ borderColor: m.color }} />
                                                    <div className="mrd-tl__time">{evTimeOf(e) || 'All day'}</div>
                                                    <div className="mrd-tl__card">
                                                        {renderProfileOrIcon(e, 36, "circle", "mrd-tl__ic")}
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <div className="mrd-tl__title">{e.title}</div>
                                                            <div className="mrd-tl__sub">{m.label}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="mrd-noev">
                                        <span className="mrd-noev__ic"><Ico n="calendar" /></span>
                                        <div className="mrd-noev__txt">
                                            <div className="mrd-noev__t">No events scheduled</div>
                                            <div className="mrd-noev__s">Enjoy your free day!</div>
                                        </div>
                                    </div>
                                )}

                                <button type="button" className="mrd-createbtn" onClick={() => openCreateFor(panelDate)}>
                                    <span className="mrd-createbtn__main"><Ico n="plus" cls="sm" /> Create Event</span>
                                    <span className="mrd-createbtn__chev"><Ico n="chevR" cls="xs" /></span>
                                </button>

                                {/* ---- Upcoming Events ---- */}
                                <div className="mrd-sect">
                                    <div className="mrd-sect__head">
                                        <span className="mrd-sect__t">Upcoming Events</span>
                                        <button type="button" className="mrd-sect__act" onClick={panelToday}>View all</button>
                                    </div>
                                    {upcomingEvents.length ? (
                                        <div className="mrd-up">
                                            {upcomingEvents.map((e: any, i: number) => {
                                                const m = evMeta(e);
                                                return (
                                                    <button type="button" className="mrd-up__row" key={i} onClick={() => setPanelDate(new Date(evDateOf(e)))}>
                                                        <span className="mrd-up__col">
                                                            {renderProfileOrIcon(e, 32, "circle", "mrd-up__dot", true)}
                                                        </span>
                                                        <span className="mrd-up__main">
                                                            <span className="mrd-up__t">{e.title}</span>
                                                            <span className="mrd-up__s">{relLabel(evDateOf(e))}</span>
                                                        </span>
                                                        <Ico n="chevR" cls="xs" />
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="mrd-sect__empty">No upcoming events</div>
                                    )}
                                </div>

                                </>
                              )}
                            </div>
                        </aside>
                    </div>

                    {/* "Select Event Type" is now rendered inline inside the right panel
                        (see .mrd-chooser above) instead of a centered modal. */}

            {/* Holiday Form Modal */}
            <Modal show={showHolidayForm} onHide={handleCloseHolidayForm} centered fullscreen="md-down">
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

            {/* Create Leave Request — the shared canonical ApplyLeave modal (apply mode), pre-selected
                to the clicked calendar day. It owns its own card chrome, so we provide the backdrop. */}
            {showLeaveRequestForm && (
                <div
                    onClick={(e) => { if (e.target === e.currentTarget) handleCloseLeaveRequestForm(); }}
                    style={{
                        position: 'fixed', inset: 0, zIndex: 1050, background: 'rgba(15,23,42,.45)', display: 'flex',
                        alignItems: (typeof window !== 'undefined' && window.innerWidth < 768) ? 'flex-end' : 'center',
                        justifyContent: 'center', padding: (typeof window !== 'undefined' && window.innerWidth < 768) ? 0 : 24, overflowY: 'auto',
                    }}
                >
                    <ApplyLeave mode="apply" initialDate={selectedDateTimeInfo?.startStr?.slice(0, 10)} onClose={handleCloseLeaveRequestForm} />
                </div>
            )}

            {/* Add New Holiday Form Modal */}
            <Modal show={showNewHolidayForm} onHide={handleCloseNewHolidayForm} centered fullscreen="md-down">
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
                    <Modal show={showMeetingsForm} onHide={handleCloseMeetingForm} centered fullscreen="md-down">
                        <Modal.Header closeButton>
                            <Modal.Title>Add New Meetings</Modal.Title>
                        </Modal.Header>
                        <Modal.Body>
                    <MeetingsForm onClose={handleCloseMeetingForm} selectedDateTimeInfo={selectedDateTimeInfo}/>
                        </Modal.Body>
                    </Modal>

                    {/* Event Form Modal */}
                    <Modal show={showEventForm} onHide={handleCloseEventForm} centered fullscreen="md-down">
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
                <div className="mrd-cards">
                    {/* Today's schedule */}
                    <section className="mrd-card mrd-card--hover mrd-col-4">
                        <div className="mrd-card__head">
                            <div className="mrd-card__title"><span className="mrd-thumb"><Ico n="clock" cls="sm" /></span>Today's schedule</div>
                            <span className="mrd-spacer" />
                            <span className="mrd-card__meta">{dayjs().format('MMM D')}</span>
                        </div>
                        <div className="mrd-card__body">
                            {todayEvents.length ? todayEvents.map((e: any, i: number) => {
                                const m = evMeta(e);
                                return (
                                    <div className="mrd-row" key={i}>
                                        {renderProfileOrIcon(e, 34, "circle", "mrd-av")}
                                        <div className="mrd-row__main"><div className="mrd-row__t">{e.title}</div><div className="mrd-row__s">{(evTimeOf(e) || 'All day')} · {m.label}</div></div>
                                        <span className={`mrd-tag ${evTimeOf(e) ? 'mrd-tag--today' : 'mrd-tag--wk'}`}>{evTimeOf(e) || 'All day'}</span>
                                    </div>
                                );
                            }) : emptyInline('No events scheduled today')}
                        </div>
                    </section>

                    {/* Upcoming meetings */}
                    <section className="mrd-card mrd-card--hover mrd-col-4">
                        <div className="mrd-card__head">
                            <div className="mrd-card__title"><span className="mrd-thumb" style={{ background: 'var(--mrd-violet-tint)', color: 'var(--mrd-violet)', borderColor: 'transparent' }}><Ico n="video" cls="sm" /></span>Upcoming meetings</div>
                            <span className="mrd-spacer" />
                            <span className="mrd-card__meta">{upcomingMeetings.length} scheduled</span>
                        </div>
                        <div className="mrd-card__body">
                            {upcomingMeetings.length ? upcomingMeetings.map((mtg: any, i: number) => (
                                <div className="mrd-row" key={i}>
                                    <span className="mrd-av" style={{ background: 'var(--mrd-violet-tint)', color: 'var(--mrd-violet)' }}><Ico n="video" cls="sm" /></span>
                                    <div className="mrd-row__main"><div className="mrd-row__t">{mtg.title || 'Meeting'}</div><div className="mrd-row__s">{dayjs(mtg.startDate).format('MMM D · h:mm A')}</div></div>
                                    <span className="mrd-tag mrd-tag--wk">{relLabel(mtg.startDate)}</span>
                                </div>
                            )) : emptyInline('No upcoming meetings')}
                        </div>
                    </section>

                    {/* Celebrations */}
                    <section className="mrd-card mrd-card--hover mrd-col-4">
                        <div className="mrd-card__head">
                            <div className="mrd-card__title"><span className="mrd-thumb" style={{ background: 'var(--mrd-rose-tint)', color: 'var(--mrd-rose)', borderColor: 'transparent' }}><Ico n="cake" cls="sm" /></span>Celebrations</div>
                            <span className="mrd-spacer" />
                            <span className="mrd-card__meta">Birthdays &amp; anniversaries</span>
                        </div>
                        <div className="mrd-card__body">
                            {celebrations.length ? celebrations.map((e: any, i: number) => {
                                const m = evMeta(e);
                                return (
                                    <div className="mrd-row" key={i}>
                                        {renderProfileOrIcon(e, 34, "circle", "mrd-av")}
                                        <div className="mrd-row__main"><div className="mrd-row__t">{e.title}</div><div className="mrd-row__s">{m.label}</div></div>
                                        <span className="mrd-tag mrd-tag--wk">{relLabel(e.start)}</span>
                                    </div>
                                );
                            }) : emptyInline('No celebrations coming up')}
                        </div>
                    </section>

                    {/* Holidays list */}
                    <section className="mrd-card mrd-card--hover mrd-col-7">
                        <div className="mrd-card__head">
                            <div className="mrd-card__title"><span className="mrd-thumb" style={{ background: 'var(--mrd-accent-tint)', color: 'var(--mrd-accent)', borderColor: 'transparent' }}><Ico n="sun" cls="sm" /></span>Public holidays</div>
                            <span className="mrd-spacer" />
                            <span className="mrd-card__meta">{currentYear} · {holidayList.length} days</span>
                        </div>
                        <div className="mrd-card__body">
                            <div style={{ maxHeight: 296, overflowY: 'auto', scrollbarWidth: 'thin' }}>
                                {holidayList.length ? holidayList.map((h: any, i: number) => (
                                    <div className="mrd-row" key={i}>
                                        <span className="mrd-av" style={{ background: 'var(--mrd-accent-tint)', color: 'var(--mrd-accent)' }}><Ico n="sun" cls="sm" /></span>
                                        <div className="mrd-row__main"><div className="mrd-row__t">{h.title}</div><div className="mrd-row__s">{dayjs(h.date).format('dddd')}</div></div>
                                        <span className="mrd-tag mrd-tag--soon">{dayjs(h.date).format('DD MMM')}</span>
                                    </div>
                                )) : emptyInline('No holidays found for this year')}
                            </div>
                        </div>
                    </section>

                    {/* Overview stats */}
                    <section className="mrd-card mrd-card--hover mrd-col-5">
                        <div className="mrd-card__head">
                            <div className="mrd-card__title"><span className="mrd-thumb"><Ico n="spark" cls="sm" /></span>Overview</div>
                            <span className="mrd-spacer" />
                            <span className="mrd-card__meta">{dayjs().format('MMMM YYYY')}</span>
                        </div>
                        <div className="mrd-card__body">
                            <div className="mrd-stats">
                                <div className="mrd-stat">
                                    <span className="mrd-stat__ic" style={{ background: 'var(--mrd-primary-tint)', color: 'var(--mrd-primary)' }}><Ico n="calendar" cls="sm" /></span>
                                    <div className="mrd-stat__val tnum">{thisMonthCount}</div>
                                    <div className="mrd-stat__lbl">Events this month</div>
                                </div>
                                <div className="mrd-stat">
                                    <span className="mrd-stat__ic" style={{ background: 'var(--mrd-violet-tint)', color: 'var(--mrd-violet)' }}><Ico n="video" cls="sm" /></span>
                                    <div className="mrd-stat__val tnum">{upcomingMeetings.length}</div>
                                    <div className="mrd-stat__lbl">Upcoming meetings</div>
                                </div>
                                <div className="mrd-stat">
                                    <span className="mrd-stat__ic" style={{ background: 'var(--mrd-accent-tint)', color: 'var(--mrd-accent)' }}><Ico n="sun" cls="sm" /></span>
                                    <div className="mrd-stat__val tnum">{holidayList.length}</div>
                                    <div className="mrd-stat__lbl">Holidays in {currentYear}</div>
                                </div>
                                <div className="mrd-stat">
                                    <span className="mrd-stat__ic" style={{ background: 'var(--mrd-rose-tint)', color: 'var(--mrd-rose)' }}><Ico n="cake" cls="sm" /></span>
                                    <div className="mrd-stat__val tnum">{celebrations.length}</div>
                                    <div className="mrd-stat__lbl">Celebrations soon</div>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </>
    );
}
const resolveAvatarUrl = (url?: string | null) => {
    if (!url) return null;
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
        return url;
    }
    if (!url.startsWith('media/') && !url.startsWith('/media/')) {
        const cleanUrl = url.startsWith('/') ? url.slice(1) : url;
        return toAbsoluteUrl(`media/${cleanUrl}`);
    }
    return toAbsoluteUrl(url);
};

function renderEventContent(eventInfo: any) {
    const ev = eventInfo.event;
    const type: string = ev.extendedProps?.type || (ev.allDay ? 'holiday' : 'event');
    const dotColor = ev.backgroundColor || eventInfo.backgroundColor || UiTokens.color.brand;
    const allDayTypes = ['birthday', 'anniversary', 'contact-birthday', 'contact-anniversary', 'marriage-anniversary', 'contact-marriage-anniversary', 'holiday'];

    // Mobile Month/Week previously collapsed events to bare color dots; now every
    // viewport renders the same pill — the title wraps (.mrd-ev__t) and the cell
    // grows to fit (height:auto on the calendar), so the text stays readable even
    // in a narrow phone column.

    let time = '';
    if (ev.start && !ev.allDay && !allDayTypes.includes(type)) {
        const d = dayjs(ev.start);
        if (d.isValid() && d.format('HH:mm') !== '00:00') time = d.format('h:mm');
    }

    const isProfileEvent = ['birthday', 'anniversary', 'contact-birthday', 'contact-anniversary', 'marriage-anniversary', 'contact-marriage-anniversary'].includes(type);
    let avatarNode = null;
    // Short mobile title: on a phone the pill tint already says birthday vs
    // anniversary, so just the person's name is what's actually relevant —
    // "Aslam Patel" instead of "Aslam Patel's Work Anniversary". Rendered
    // alongside the full title and toggled purely in CSS (≤760px media block).
    let shortTitle = '';
    if (isProfileEvent) {
        const user = ev.extendedProps?.user;
        const contact = ev.extendedProps?.contact;
        const name = user?.name || contact?.name || ev.title || '';
        const imageUrl = user?.avatar || contact?.profilePhoto || null;
        const id = user?.id || contact?.id || null;
        shortTitle = name;

        avatarNode = (
            // .mrd-ev__ava is a CSS hook: on phones the leading avatar is hidden
            // (the pill tint already signals the event type) so the whole ~50px
            // column width goes to the title text — see the ≤760px media block.
            <span className='mrd-ev__ava'>
                <SmartAvatar
                    name={name}
                    id={id}
                    imageUrl={resolveAvatarUrl(imageUrl)}
                    size={18}
                    shape="circle"
                    imageFit="cover"
                />
            </span>
        );
    } else {
        avatarNode = <span className='mrd-ev__dot' style={{ background: dotColor }} />;
    }

    return (
        <div 
            className='fullcalendar__event__wrapper'
            style={{
                ['--event-bg' as any]: `color-mix(in srgb, ${dotColor} 12%, transparent)`,
                ['--event-border' as any]: `color-mix(in srgb, ${dotColor} 20%, transparent)`,
                ['--event-hover-bg' as any]: `color-mix(in srgb, ${dotColor} 20%, transparent)`
            }}
        >
            {avatarNode}
            {time && <span className='mrd-ev__time'>{time}</span>}
            {/* Short variant first so the CSS can hide the full one that follows
                it (adjacent-sibling selector) — no JS viewport checks needed. */}
            <span className='mrd-ev__t'>
                {shortTitle && shortTitle !== ev.title && (
                    <span className='mrd-ev__t--short'>{shortTitle}</span>
                )}
                <span className='mrd-ev__t--full'>{ev.title}</span>
            </span>
        </div>
    );
}

export default CustomCalendar;