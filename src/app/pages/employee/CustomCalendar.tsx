import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useFormik } from 'formik';
import Flatpickr from "react-flatpickr";
import { Modal } from 'react-bootstrap';
import dayjs from 'dayjs';
import Select from 'react-select';
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
import { fetchAllEmployees } from '@services/employee';
import { SHOW_BIRTHDAY_ON_CALENDAR, SHOW_WORK_ANIVERSARY_ON_CALENDAR } from '@constants/configurations-key';
import { fetchColorAndStoreInSlice } from '@utils/file';

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
    const isAdmin = useSelector((state: RootState) => state.auth.currentUser.isAdmin);
    const [holidays, setHolidays] = useState<any[]>([]);
    // console.log("hodlidays","holidays =>",holidays)
    const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
    // console.log("calendarEvents=>",calendarEvents)
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
    const [selectedStartDate, setSelectedStartDate] = useState('');
    const [selectedEndDate, setSelectedEndDate] = useState('');
    const [maxColumns, setMaxColumns] = useState(2);
    const [branchWorkingAndOffDays, setBranchWorkingAndOffDays] = useState<any>({});
    // console.log("branchWorkingAndOffDays =>",branchWorkingAndOffDays)
    const selectRef = useRef(null);

       useEffect(() => {
            fetchColorAndStoreInSlice();
        }, []);
    

    const handleViewChange = (event: any) => {
        const selectedView = event.value;
        setSelectedViewForCalendar(selectedView);
        const calendarApi = calendarRef?.current?.getApi();
        if (calendarApi) {
            calendarApi.changeView(selectedView);
        }
    };
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
          const [colorsRes, allUsers, showBirthdaysRes, showWorkAnniversaryRes, allEmployeeDateOfjoining] = await Promise.all([
            fetchAllColors(),
            fetchAllUsers(),
            fetchConfiguration(SHOW_BIRTHDAY_ON_CALENDAR),
            fetchConfiguration(SHOW_WORK_ANIVERSARY_ON_CALENDAR),
            fetchAllEmployees()
          ]);
          const colors = colorsRes?.data?.colors;
          const showBirthdays = JSON.parse(showBirthdaysRes?.data?.configuration?.configuration || '{}');
        //   debugger;
          const showWorkAnniversary = JSON.parse(showWorkAnniversaryRes?.data?.configuration?.configuration || '{}');
            
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
          const workingAndOffDays = JSON.parse(branchRes?.data?.branch?.workingAndOffDays || '{}');
          setBranchWorkingAndOffDays(workingAndOffDays);
      
          const weekendHolidays: any[] = [];
          const start = dayjs(`${currentYear}-01-01`);
          const end = dayjs(`${currentYear}-12-31`);

          // Process user birthdays for the calendar
          let userBirthdays: any[] = [];
          if (showBirthdays.showBirthdaysOnCalendar === true) {
          userBirthdays = allUsers?.data?.users
            ?.filter((user: any) => user?.isActive === true && user.dateOfBirth) // Only include users with birth dates
            .map((user: any) => {
              const birthDate = dayjs(user.dateOfBirth);
              const today = dayjs().startOf('day');
              let nextBirthday = dayjs(birthDate).year(today.year());
              
              // If birthday has already passed this year, use next year's date
              if (nextBirthday.isBefore(today, 'day')) {
                const nextyear = dayjs(currentYear);
                nextBirthday = dayjs(birthDate).year(nextyear.year());
                // console.log("Next birthday", nextBirthday);
              }
              
              return {
                title: `${user.firstName} ${user.lastName}'s Birthday`,
                start: nextBirthday.format('YYYY-MM-DD'),
                allDay: true,
                color: birthdaysColor,
                textColor: '#FFFFFF',
                borderColor: birthdaysColor,
                className: 'birthday-event',
                extendedProps: {
                  type: 'birthday',
                  user: {
                    id: user.id,
                    name: `${user.firstName} ${user.lastName}`,
                    avatar: user.avatar
                  }
                }
              };
            }) || [];
          }

          debugger;
          
          // Process employee anniversaries for the calendar
          let employeeAnniversaries: any[] = [];
          if (showWorkAnniversary.showWorkAnniversaryOnCalendar === true) {
            employeeAnniversaries = allEmployeeDateOfjoining?.data?.employees
            ?.filter((employee: any) => employee.dateOfJoining)
            .map((employee: any) => {
              const anniversaryDate = dayjs(employee.dateOfJoining);
              const today = dayjs().startOf('day');
              let nextAnniversary = dayjs(anniversaryDate).year(today.year());
              
              return {
                title: `${employee.users.firstName} ${employee.users.lastName}'s Work Anniversary`,
                start: nextAnniversary.format('YYYY-MM-DD'),
                allDay: true,
                color: anniversariesColor,
                textColor: '#FFFFFF',
                borderColor: anniversariesColor,
                className: 'anniversary-event',
                extendedProps: {
                  type: 'anniversary',
                  user: {
                    id: employee.users.id,
                    name: `${employee.users.firstName} ${employee.users.lastName}`,
                    avatar: employee.users.avatar
                  }
                }
              };
            }) || [];
          }

          for (let d = start; d.isBefore(end); d = d.add(1, 'day')) {
            const dayIndex = d.day(); // 0: Sunday, 6: Saturday
            const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            const dayName = dayNames[dayIndex];
            
            if (workingAndOffDays[dayName] === "0") {
              weekendHolidays.push({
                title: `${dayName.charAt(0).toUpperCase() + dayName.slice(1)}`,
                color: weekendColor,
                date: d.format('YYYY-MM-DD'),
                fixed: true
              });
            }
          }
      
          // Add user birthdays to calendar events
          const calendarEventList = [
            ...(calendarRes?.data?.calendarEvents?.map((event: any) => ({
              title: event.eventName,
              start: dayjs(event.startDate).format(),
              end: dayjs(event.endDate).format(),
              color: "#AA393D"
            })) || []),
            ...userBirthdays,
            ...employeeAnniversaries
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

    useEffect(() => {
        const intervalId = setInterval(() => {
            const selectButton = document.querySelector('.fc-viewSelectButton-button');
            if (selectButton) {
                const root = createRoot(selectButton);
                root.render(
                    <Select
                        menuPortalTarget={document.body}
                        classNamePrefix={"react-select"}
                        className='react-select-styled'
                        defaultValue={{ label: 'Month', value: 'dayGridMonth' }} 
                        menuPlacement='bottom'
                        options={
                            [
                                {
                                    label: 'Day',
                                    value: 'dayGridDay'
                                },
                                {
                                    label: 'Week',
                                    value: 'dayGridWeek'
                                },
                                {
                                    label: 'Month',
                                    value: 'dayGridMonth'
                                },
                                {
                                    label: 'Year',
                                    value: 'multiMonthYear'
                                },
                            ]
                        }
                        onChange={(e) => handleViewChange(e)}
                        styles={{
                            control: (base) => ({
                                ...base,
                                minWidth: "200px",
                                fontSize: "14px",
                            }),
                            menuPortal: (base) => ({
                                ...base,
                                zIndex: 9999,
                            }),
                        }}
                    />
                );
                clearInterval(intervalId);
            }
        }, 100);
        return () => {
            const selectButton = document.querySelector('.fc-viewSelectButton-button');
            if (selectButton) {
                const root = createRoot(selectButton);
                root.unmount();
            }
        };
    }, []);

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
                    <FullCalendar
                        dayCellClassNames={(e) => handleDayCellClassNames(e)}
                        locale={enGbLocale}
                        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, bootstrapPlugin, multiMonthPlugin]}
                        customButtons={{
                            'todayButton': {
                                text: 'Today',
                                click: function () {
                                    const calendarApi = calendarRef?.current?.getApi();
                                    if (calendarApi) {
                                        calendarApi.today();
                                    }
                                }
                            },
                            'viewSelectButton': {
                                text: '',
                                click: () => { },
                            },
                        }}
                        headerToolbar={{
                            left: 'todayButton prev next',
                            center: 'title',
                            right: 'viewSelectButton',
                        }}
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
                                            {isAdmin && hasPermission(resourceNameMapWithCamelCase.holiday, permissionConstToUseWithHasPermission.create) && <label
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
    return (
        <div className='fullcalendar__event__wrapper' style={{ backgroundColor: eventInfo.backgroundColor }}>
            <span>{eventInfo.event.title}</span>
        </div>
    )
}

export default CustomCalendar;