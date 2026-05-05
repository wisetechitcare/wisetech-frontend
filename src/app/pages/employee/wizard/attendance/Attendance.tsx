import Calendar from 'react-calendar';
import dayjs from 'dayjs';
// import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import { APIProvider, Map, AdvancedMarker, useAdvancedMarkerRef, Pin } from '@vis.gl/react-google-maps';
import { PageLink, PageTitle } from "@metronic/layout/core";
import MaterialTable from 'app/modules/common/components/MaterialTable';
import { useThemeMode } from '@metronic/partials';
import { useEffect, useMemo, useState } from 'react';
import SelectInput from 'app/modules/common/inputs/SelectInput';
import { MRT_ColumnDef } from 'material-react-table';
import { useSelector } from 'react-redux';
import { RootState } from '@redux/store';
import { KTIcon } from '@metronic/helpers';
import { checkAttendanceMarked, fetchAllEmployees, fetchAttendanceDetails, getAllKpiFactors, saveCheckIn, saveCheckOut, validateTokenInOut } from '@services/employee';
import { IAttendance } from '@models/employee';
import { convertToTimeZone, findTimeDifference, formatTime, generateDatesForMonth } from '@utils/date';
import { errorConfirmation, successConfirmation } from '@utils/modal';
import { PageHeadingTitle } from '@metronic/layout/components/header/page-title/PageHeadingTitle';

const OPEN_CAGE_API_KEY = import.meta.env.VITE_APP_OPEN_CAGE_API_KEY;
const OPEN_CAGE_API = import.meta.env.VITE_APP_OPEN_CAGE_API;
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_APP_GOOGLE_MAP_KEY;

const newAttendanceWizardBreadcrumb: Array<PageLink> = [
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
];

interface Location {
    latitude: number;
    longitude: number;
}

const mumbaiTz = 'Asia/Kolkata';

function Attendance() {
    const { mode } = useThemeMode();
    const [activeStartDate, setActiveStartDate] = useState(new Date());
    const [tableData, setTableData] = useState<IAttendance[]>([]);
    const [location, setLocation] = useState<Location>();
    const [address, setAddress] = useState('');
    const [checkInDisabled, setCheckInDisabled] = useState(false);
    const [checkOutDisabled, setCheckOutDisabled] = useState(false);
    const [locationPermission, setLocationPermission] = useState(false); // New state for location permission
    const [empNameOptions, setEmpNameOptions] = useState(undefined);
    const employeeId = useSelector((state: RootState) => state.employee.currentEmployee.id);
    const isAdmin = useSelector((state: RootState) => state.auth.currentUser.isAdmin);
    const date = new Date();
    const [markerRef, marker] = useAdvancedMarkerRef();

    const mapData = (dates: any, attendance: IAttendance[]) => {
        const tblData = dates.map((date: any) => {
            const attendanceRecord = attendance.find((el: any) => (dayjs(convertToTimeZone(el.checkIn, mumbaiTz)).format('DD/MM/YYYY') == date.date));
            const { checkIn = '', checkOut = '' } = attendanceRecord || {};
            const utcCheckIn = convertToTimeZone(checkIn, mumbaiTz);
            const utcCheckOut = convertToTimeZone(checkOut, mumbaiTz);
            const formattedCheckIn = formatTime(utcCheckIn);
            const formattedCheckOut = formatTime(utcCheckOut);

            return {
                ...date,
                id: attendanceRecord?.id,
                status: (checkIn || checkOut) ? 'Present' : 'N/A',
                checkIn: checkIn ? formattedCheckIn : 'N/A',
                checkOut: checkOut ? formattedCheckOut : 'N/A',
                durations: findTimeDifference(formattedCheckIn, formattedCheckOut)
            }
        });

        return tblData;
    }

    const handleCheckIn = async () => {
        let ls = localStorage.getItem("check_in_token");
        let parsedLs = ls ? ls : null;
        const payload = {
            employeeId,
            checkIn: new Date(),
            latitude: location?.latitude || 0,
            longitude: location?.longitude || 0
        }
        try {
            const data = await saveCheckIn(payload);
            successConfirmation(data.message);
            if (!parsedLs) {
                localStorage.setItem('check_in_token', data.data.token);
                ls = localStorage.getItem("check_in_token")
            };
            if (!ls) return;
            const { data: { isDisabled } } = await validateTokenInOut({ id: employeeId, token: ls });
            setCheckInDisabled(isDisabled);
        }
        catch (err: any) {
            errorConfirmation(err.data.detail);
        }
    }

    const handleCheckOut = async () => {
        let ls = localStorage.getItem("check_out_token");
        let parsedLs = ls ? ls : null;
        const date = dayjs().format('DD/MM/YYYY');
        const attendanceRecord = tableData.find((el: any) => el.date == date);
        if (!attendanceRecord) return;
        const payload = {
            attendanceId: attendanceRecord.id,
            latitude: location ? parseFloat(location.latitude.toFixed(7)) : 0,
            longitude: location ? parseFloat(location.longitude.toFixed(7)) : 0,
            checkOut: new Date(),
            employeeId
        }
        if (!payload.latitude || !payload.longitude) return;
        try {
            const res = await saveCheckOut(payload);
            successConfirmation(res.data.message);
            if (!parsedLs) {
                localStorage.setItem('check_out_token', res.data.token);
                ls = localStorage.getItem("check_out_token")
            };
            if (!ls) return;
            const { data: { isDisabled } } = await validateTokenInOut({ id: employeeId, token: ls });
            setCheckOutDisabled(isDisabled);
        }
        catch (err: any) {
            errorConfirmation(err.data.detail)
        }
    }

    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((position: any) => {
                const { coords: { latitude, longitude } } = position;
                setLocation({ latitude: Number(latitude.toFixed(7)), longitude: Number(longitude.toFixed(7)) });
                setLocationPermission(true);
                fetch(`${OPEN_CAGE_API}/geocode/v1/json?q=${latitude}+${longitude}&key=${OPEN_CAGE_API_KEY}`)
                    .then(response => response.json())
                    .then(data => {
                        if (data.results && data.results.length > 0) {
                            setAddress(data.results[0].formatted);
                            // console.log("addresss",data.results[0].formatted);
                        } else {
                            setAddress('Address not found');
                        }
                    })
                    .catch(() => setAddress('Failed to fetch address'));
            },
                (error: any) => {
                    setLocationPermission(false);
                    errorConfirmation("Location access denied. Please enable location services to mark attendance.");
                }
                , {
                    enableHighAccuracy: true
                }
            );
        } else {
            console.log('Geo location API is not supported')
        }

        if (!employeeId) return;

        const now = new Date();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();
        const dates = generateDatesForMonth(`${year}-${month}-01`);

        async function fetchAttendance() {
            const { data: { attendance } } = await fetchAttendanceDetails(employeeId, month, year);
            const tblData = mapData(dates, attendance);
            setTableData(tblData);
        }

        fetchAttendance();
    }, [employeeId, checkInDisabled, checkOutDisabled]);

    useEffect(() => {

        async function attendanceMarked() {
            const date = dayjs().format('YYYY/MM/DD');
            const res = await checkAttendanceMarked(date, employeeId);
            if (res.data.attendance) {
                const { attendance: { checkIn, checkOut } } = res.data;
                if (checkIn) setCheckInDisabled(true);
                if (checkOut) setCheckOutDisabled(true);
            }
        }

        async function validateToken() {
            let lsCheckIn = localStorage.getItem("check_in_token");
            let lsCheckOut = localStorage.getItem("check_out_token");
            if (!lsCheckIn || !employeeId) return;
            const { data: { isDisabled: checkInExpired } } = await validateTokenInOut({ id: employeeId, token: lsCheckIn });
            setCheckInDisabled(checkInExpired);
            if (!checkInExpired) localStorage.removeItem('check_in_token');
            if (!lsCheckOut || !employeeId) return;
            const { data: { isDisabled: checkOutExpired } } = await validateTokenInOut({ id: employeeId, token: lsCheckOut });
            setCheckOutDisabled(checkOutExpired);
            if (!checkOutExpired) localStorage.removeItem('check_out_token');
        }

        attendanceMarked();
        validateToken();
    }, [employeeId]);

    useEffect(() => {
        async function fetchEmployeeNames() {
            const { data: { employees } } = await fetchAllEmployees();
            const empNameOptions = employees.map((emp: any) => ({ label: `${emp.users.firstName} ${emp.users.lastName}`, value: emp.id }));
            setEmpNameOptions(empNameOptions);
        }

        fetchEmployeeNames();
    }, []);

    const handleEmployeeChange = async (empId: string) => {
        const now = new Date();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();
        const dates = generateDatesForMonth(`${year}-${month}-01`);
        const { data: { attendance } } = await fetchAttendanceDetails(empId, 7, 2024);
        const tblData = mapData(dates, attendance);
        setTableData(tblData);
    }

    const handleMonthChange = async (el: any) => {
        const { activeStartDate } = el;
        setActiveStartDate(activeStartDate);
        const month = activeStartDate.getMonth() + 1;
        const year = activeStartDate.getFullYear();
        const { data: { attendance } } = await fetchAttendanceDetails(employeeId, month, year);
        const dates = generateDatesForMonth(`${year}-${month}-01`);
        const tblData = mapData(dates, attendance);
        setTableData(tblData);
    }

    const columns = useMemo<MRT_ColumnDef<IAttendance>[]>(() => [
        {
            accessorKey: "date",
            header: "Date",
            Cell: ({ renderedCellValue }: any) => <strong>{renderedCellValue}</strong>
        },
        {
            accessorKey: "status",
            header: "Status",
            Cell: ({ renderedCellValue }: any) => {
                return <strong>{renderedCellValue}</strong>;
            }
        },
        {
            accessorKey: "checkIn",
            header: "Check In",
            Cell: ({ renderedCellValue }: any) => {
                return <strong>{renderedCellValue}</strong>;
            }
        },
        {
            accessorKey: "checkOut",
            header: "Check Out",
            Cell: ({ renderedCellValue }: any) => <strong>{renderedCellValue}</strong>
        },
        {
            accessorKey: "durations",
            header: "Durations",
            Cell: ({ renderedCellValue }: any) => <strong>{renderedCellValue}</strong>
        },
        {
            accessorKey: "remarks",
            header: "Remarks",
            Cell: ({ renderedCellValue }: any) => <strong>{renderedCellValue}</strong>
        },
    ], []);

    const getTileClassName = ({ date, view }: any) => {
        const formattedDate = dayjs(date).format('DD/MM/YYYY');
        const currentMonth = dayjs(activeStartDate).month();
        if (view === 'month') {
            // if (date.getMonth() !== currentMonth) {
            //     return 'd-none'
            // }

            const matchedDate = tableData.find((el) => el.date === formattedDate);

            if (matchedDate) {
                switch (matchedDate.status) {
                    case 'Present':
                        return 'react__calendar__status__present';
                    case 'N/A':
                        return 'react__calendar__status__missing';
                    default:
                        return 'react__calendar__status__default'
                }
            }
        }

        return ''
    }

    return (
        <>
            <PageTitle breadcrumbs={newAttendanceWizardBreadcrumb}>Attendance</PageTitle>
            <PageHeadingTitle />
            <div className="d-flex justify-content-between">
                <h3>Mark attendance for today!, {date.toDateString()}</h3>
                <div>
                    <button onClick={handleCheckIn}
                        className='btn btn-lg btn-light-primary text-uppercase mx-5'
                        disabled={checkInDisabled || !locationPermission} // Disable if location permission is not granted
                    >
                        Check In
                    </button>
                    <button onClick={handleCheckOut}
                        className='btn btn-lg btn-light-primary text-uppercase'
                        disabled={checkOutDisabled || !locationPermission} // Disable if location permission is not granted
                    >
                        Check Out
                    </button>
                </div>
            </div>

            <div className="row mt-7">
                <div className="col-lg-6 react_calendar__wrapper">
                    <Calendar
                        onActiveStartDateChange={handleMonthChange}
                        className={mode === 'dark' ? 'calendar-dark' : 'calendar-light'}
                        tileClassName={getTileClassName}
                    />
                    {/*begin::Menu*/}
                    <div className='d-flex my-2 react_calendar__status__wrapper gap-3'>
                        <div className='d-flex react_calendar__status fs-8 text-muted align-items-center'>
                            <div className='react_calendar__status__dot dot_today'></div>Today
                        </div>
                        <div className='d-flex react_calendar__status fs-8 text-muted align-items-center'>
                            <div className='react_calendar__status__dot dot_present'></div>Present
                        </div>
                        <div className='d-flex react_calendar__status fs-8 text-muted align-items-center'>
                            <div className='react_calendar__status__dot dot_missing'></div>Checkin/Checkout missing
                        </div>
                        <div className='d-flex react_calendar__status fs-8 text-muted align-items-center'>
                            <div className='react_calendar__status__dot dot_absent'></div>Absent
                        </div>
                        <div className='d-flex react_calendar__status fs-8 text-muted align-items-center'>
                            <div className='react_calendar__status__dot dot_leave'></div>Leave
                        </div>
                        <div className='d-flex react_calendar__status fs-8 text-muted align-items-center'>
                            <div className='react_calendar__status__dot leave_requested'></div>Leave Requested
                        </div>
                    </div>
                </div>
                <div className="col-lg-6">
                    {/* <MapContainer
                        center={[location?.latitude || 0, location?.longitude || 0]}
                        zoom={6}
                        scrollWheelZoom={false}>
                        <TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <Marker position={[location?.latitude || 0, location?.longitude || 0]}>
                            <Popup>
                                {address}
                            </Popup>
                        </Marker>
                    </MapContainer> */}
                    <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
                        <Map
                            style={{ width: '100%', height: '256px' }}
                            // defaultCenter={{lat: 22.54992, lng: 0}}
                            defaultZoom={
                                location?.latitude ? 20 : 5
                            }
                            defaultCenter={{
                                lat: location?.latitude || 20.5937,
                                lng: location?.longitude || 78.9629
                            }}
                            gestureHandling={'greedy'}
                            disableDefaultUI={true}
                            mapId="5eebd05f5882f6e2"
                        >
                            <AdvancedMarker ref={markerRef} position={{
                                lat: location?.latitude || 0,
                                lng: location?.longitude || 0
                            }}>
                                <Pin
                                    background={'#AA393D'}
                                    glyphColor={'#7a2124'}
                                />
                            </AdvancedMarker>
                        </Map>
                    </APIProvider>
                </div>
            </div >
            {isAdmin && <div className="d-flex justify-content-end mt-7">
                <SelectInput
                    options={empNameOptions}
                    placeholder="Select Employee"
                    value={''}
                    dropdown="employee names"
                    passData={handleEmployeeChange} />
            </div>
            }
            <MaterialTable
                columns={columns}
                data={tableData}
                tableName='Attendance'
                employeeId={employeeId} />
        </>
    );
}

export default Attendance;