import { KTIcon, toAbsoluteUrl } from '@metronic/helpers';
import { RootState, store } from '@redux/store';
import ReactApexChart from 'react-apexcharts';
import { Image, Card, Col, Modal, OverlayTrigger } from 'react-bootstrap';
import Identifiers from '../utils/Identifiers';
import { ATTENDANCE_STATUS, LEAVE_STATUS, LeaveStatus, WORKING_METHOD_TYPE } from '@constants/attendance';
import { useEffect, useMemo, useState } from 'react';
import { CustomLeaves, IAttendance, IAttendanceRequests } from '@models/employee';
import { MRT_ColumnDef } from 'material-react-table';
import MaterialTable from './MaterialTable';
import { convertMinutesIntoHrMinFormat, convertToIST, convertToTime, handleSendEmailForResetAttendanceRequestLimit, isValidTime, markWeekendOrHoliday, markWeekendOrHolidayForReportsTable } from '@utils/statistics';
import { useDispatch, useSelector } from 'react-redux';
import { permissionConstToUseWithHasPermission, REQUEST_RAISE_DISABLE_MESSAGE, resourceNameMapWithCamelCase, Status, weekDays } from '@constants/statistics';
import * as Yup from 'yup';
import { Form, Formik, FormikValues } from 'formik';
import TextInput from '../inputs/TextInput';
import { fetchWorkingMethods } from '@services/options';
import DropDownInput from '../inputs/DropdownInput';
import dayjs, { Dayjs } from 'dayjs';
import { deleteConfirmation, errorConfirmation, successConfirmation } from '@utils/modal';
import { createUpdateAttendanceRequest, deleteAttendanceRequestById, sendAttendanceRequestResetLimit } from '@services/employee';
import { saveToggleChange } from '@redux/slices/attendanceStats';
import { fetchCompanyOverview } from '@services/company';
import { getAttendanceRequest } from '@services/employee';
import { checkIfAnyValueIsUndefined, fetchColorAndStoreInSlice } from '@utils/file';
import { hasPermission } from '@utils/authAbac';
import { fetchRolesAndPermissions } from '@redux/slices/rolesAndPermissions';
import Tooltip from "react-bootstrap/Tooltip";
import TimePickerInput from '../inputs/TimeInput';
import { fetchAddressDetails } from '@services/location';
import { getGraceBasedThresholds } from '@utils/getGraceBasedThresholds';
import { convertTo12HourFormat } from '@utils/date';

const ProgessBar = ({ progessBarSeries, checkIn, checkOut, totalWorkingHours = "0h : 0m", totalAllowedHours = "0h : 0m" }: { progessBarSeries: any, checkIn?: string, checkOut?: string, totalWorkingHours?: string, totalAllowedHours?: string }) => {
    const progessBarOptions: ApexCharts.ApexOptions = {
        chart: {
            type: 'radialBar',
        },
        plotOptions: {
            radialBar: {
                hollow: {
                    size: '70%',
                },
                dataLabels: {
                    name: {
                        show: true,
                        fontSize: '22px',
                    },
                    value: {
                        show: true,
                        fontSize: '16px',
                        formatter: function (val: any) {
                            return `${val}%`;
                        },
                    },
                },
            },
        },
        labels: ['Progress'],
    };

    return (
        <>
            <Col md={4} className="mb-4">
                <Card className="shadow-sm" style={{ height: '300px' }}>
                    <Card.Body className="d-flex flex-column justify-content-between align-items-center">
                        <h5 className="mb-3">Working Time one two therr</h5>
                        <div className="d-flex flex-column justify-content-center align-items-center flex-grow-1">
                            <ReactApexChart
                                options={progessBarOptions}
                                series={progessBarSeries}
                                type="radialBar"
                                height={180}
                            />
                        </div>
                        <div>Check in: {checkIn && checkIn !== 'N/A' ? convertTo12HourFormat(checkIn) : 'N/A'}</div>
                        <div>Check out: {checkOut && checkOut !== 'N/A' ? convertTo12HourFormat(checkOut) : 'N/A'}</div>
                        <div className="mt-2 text-center fw-bold">
                            {totalWorkingHours} out of {totalAllowedHours}
                        </div>
                    </Card.Body>
                </Card>
            </Col>
        </>
    );
};

const Donut = ({ donutLabels, donutSeries, totalDays, customHeading, customStylesForCard, customStylesForCol, customColorsForDonut }: { donutLabels: string[], donutSeries: number[], totalDays?: number, customHeading?: string, customStylesForCard?: React.CSSProperties, customStylesForCol?: React.CSSProperties, customColorsForDonut?: string[] }) => {
    let customColors = useSelector((state: any) => state?.customColors?.attendanceOverview);
    const checkoutMissingColor = useSelector((state: any) => state?.customColors?.workingPattern?.missingCheckoutColor);
    const weekendColor = useSelector((state: any) => state?.customColors?.attendanceCalendar?.weekendColor);

    let colorsFinal = [customColors?.presentColor || '#000000', customColors?.absentColor || '#000000', customColors?.onLeaveColor || '#000000', customColors?.extraDayColor || '#000000', customColors?.holidayColor || '#000000', checkoutMissingColor || '#000000', weekendColor || '#000000']
    if (customColorsForDonut && customColorsForDonut.length > 0) {
        colorsFinal = customColorsForDonut;
    }

    const donutOptions: ApexCharts.ApexOptions = {
        chart: {
            type: 'donut',
        },
        colors: colorsFinal,
        labels: donutLabels.map((label, index) => `${label} ${donutSeries[index]}`),
        responsive: [
            {
                breakpoint: 400,
                options: {
                    chart: {
                        width: '100%',
                    },
                    legend: {
                        position: 'bottom',
                    },
                },
            },
        ],
    };

    return (
        <>
            <Col md={4} className="mb-4" style={{ ...customStylesForCol }}>
                <Card className="" style={{ height: '300px', ...customStylesForCard }}>
                    <Card.Body className="d-flex flex-column justify-content-between align-items-center">
                        <h5 className="mb-3">{customHeading ? customHeading : "Overview"}</h5>
                        <div className="d-flex flex-column justify-content-center align-items-center flex-grow-1">
                            <ReactApexChart options={donutOptions} series={donutSeries} type="donut" width={380} height={380} />
                            {totalDays && <div className="mt-2 text-center">
                                <small className="text-muted">Total: {totalDays} days</small>
                            </div>}
                        </div>
                    </Card.Body>
                </Card>
            </Col>
        </>
    );
};


const MultipleRadialBar = ({ multipleRadialBarLabels, multipleRadialBarSeries, totalWorkingDays }: { multipleRadialBarLabels: string[], multipleRadialBarSeries: number[], totalWorkingDays: number }) => {
    const customColors = useSelector((state: any) => state?.customColors?.workingPattern);

    // Update first label to include "Total Working Days"
    const updatedLabels = [...multipleRadialBarLabels];
    if (updatedLabels.length > 0) {
        updatedLabels[0] = `Total Working Days: ${multipleRadialBarSeries[0]} / ${totalWorkingDays}`;
    }

    const multipleRadialBarOption: any = {
        plotOptions: {
            radialBar: {
                offsetY: 15,
                startAngle: 0,
                endAngle: 230,
                hollow: {
                    margin: 5,
                    size: '30%',
                    background: 'transparent',
                    image: undefined,
                },
                track: {
                    show: true,
                },
                dataLabels: {
                    name: {
                        show: true,
                        fontSize: '8px',
                    },
                    value: {
                        show: true,
                        fontSize: '8px',
                        formatter: (val: number, { seriesIndex }: any) =>
                            seriesIndex === 0 ? `${val} Days` : `${val}%`,
                    },
                },
            },
        },
        colors: [customColors?.totalWorkingDaysColor || '#000000', customColors?.earlyCheckinColor || '#000000', customColors?.lateCheckinColor || '#000000', customColors?.earlyCheckoutColor || '#000000', customColors?.lateCheckoutColor || '#000000', customColors?.missingCheckoutColor || '#000000'],
        labels: updatedLabels,
        legend: {
            show: true,
            floating: true,
            fontSize: '10px',
            position: 'left',
            offsetX: -30,
            offsetY: -20,
            labels: {
                useSeriesColors: true,
                fontSize: '2px',
            },
            markers: {
                size: 0,
            },
            formatter: (seriesName: any, opts: any) => {
                if (opts.seriesIndex === 0) return seriesName; // Prevents duplication of Total Working Days
                return `${seriesName}: ${opts.w.globals.series[opts.seriesIndex]}`;
            },
        },
        responsive: [{
            breakpoint: 480,
            options: {
                legend: {
                    show: true,
                }
            }
        }]
    };

    return (
        <>
            <Col md={4} className="mb-4">
                <Card className="shadow-sm" style={{ height: '300px' }}>
                    <Card.Body className="d-flex flex-column justify-content-between align-items-center">
                        <h5 className="mb-3">Working Pattern</h5>

                        <div className="d-flex flex-column justify-content-center align-items-center flex-grow-1">
                            <ReactApexChart style={{ paddingLeft: '8px' }} options={multipleRadialBarOption} series={multipleRadialBarSeries} type="radialBar" />
                        </div>
                    </Card.Body>
                </Card>
            </Col>
        </>
    );
};

const Polar = ({ polarLabels, polarSeries, totalDays }: { polarLabels: string[], polarSeries: number[], totalDays: number }) => {
    let customColors = useSelector((state: any) => state?.customColors?.workingLocation);

    const polarOptions: ApexCharts.ApexOptions = {
        chart: {
            type: 'polarArea',
        },
        labels: polarLabels.map((label, index) => `${label} ${polarSeries[index]}`),
        fill: {
            opacity: 0.8,
        },
        stroke: {
            width: 1,
            colors: ['#fff'],
        },
        colors: [customColors?.remoteColor || '#000000', customColors?.onSiteColor || '#000000', customColors?.officeColor || '#000000'],
        responsive: [
            {
                breakpoint: 480,
                options: {
                    chart: {
                        width: 300,
                    },
                    legend: {
                        position: 'right',
                        horizontalAlign: 'center',
                        floating: false,
                    },
                },
            },
        ],
        legend: {
            position: 'right',
            offsetY: 0,
            height: 230,
            formatter: function (seriesName, opts) {
                const value = opts.w.globals.series[opts.seriesIndex];
                const percentage = ((value / totalDays) * 100).toFixed(1);
                return `${seriesName}: ${value} (${percentage}%)`;
            }
        },
        yaxis: {
            show: false,
        },
    };

    return (
        <Col md={4} xs={12} className="mb-4">
            <Card className="shadow-sm" style={{ height: '300px' }}>
                <Card.Body className="d-flex flex-column justify-content-between align-items-center w-100" style={{ overflow: 'hidden' }}>
                    <h5 className="mb-3">Working Locations</h5>

                    <div className="d-flex flex-column justify-content-center flex-grow-1">
                        <ReactApexChart
                            options={polarOptions}
                            series={polarSeries}
                            type="polarArea"
                            width='100%'
                        />
                    </div>
                    <div className="text-center mt-2">
                        <small className="text-muted">Total: {totalDays} days</small>
                    </div>
                </Card.Body>
            </Card>
        </Col>
    );
};

const StokedCircle = ({ stokedCircleSeries, totalWorkedDays, totalDays = 30 }: { stokedCircleSeries: any; totalWorkedDays: number; totalDays?: number; }) => {
    const stokedCircleOptions: ApexCharts.ApexOptions = {
        chart: {
            height: 350,
            type: 'radialBar',
            offsetY: 0,
        },
        plotOptions: {
            radialBar: {
                startAngle: -135,
                endAngle: 135,
                dataLabels: {
                    name: {
                        show: false,
                    },
                    value: {
                        offsetY: 6,
                        fontSize: '22px',
                        color: '#333',
                        formatter: function (val) {
                            return val + "%";
                        }
                    }
                }
            }
        },
        fill: {
            type: 'gradient',
            gradient: {
                shade: 'dark',
                shadeIntensity: 0.15,
                inverseColors: false,
                opacityFrom: 1,
                opacityTo: 1,
                stops: [0, 50, 65, 91]
            },
        },
        stroke: {
            dashArray: 4
        },
    };

    return (
        <Col md={4} className="mb-4">
            <Card className="shadow-sm" style={{ height: '300px' }}>
                <Card.Body className="d-flex flex-column justify-content-between align-items-center">
                    <h5 className="mb-3">Attendance</h5>

                    <div className="d-flex flex-column justify-content-center align-items-center flex-grow-1">
                        <ReactApexChart
                            options={stokedCircleOptions}
                            series={stokedCircleSeries}
                            type="radialBar"
                        />
                        <p className="mt-2 text-center">
                            {totalWorkedDays} days out of {totalDays} days
                        </p>
                    </div>
                </Card.Body>
            </Card>
        </Col>
    );
};

const StreakIndicator = ({ currentStreak, lastStreak, totalDays }: { currentStreak: string, lastStreak: string, totalDays: number }) => {
    return (
        <Col md={4} className="mb-4">
            <Card className="shadow-sm" style={{ height: '300px' }}>
                <Card.Body className="d-flex flex-column justify-content-between align-items-center">
                    <h5 className="mb-3">Check-in Streak</h5>

                    <div className="d-flex flex-column justify-content-center align-items-center flex-grow-1">
                        <Image src={toAbsoluteUrl('media/svg/misc/streak.svg')} alt="Streak Icon" style={{ width: '100px' }} />
                        <h2 className="mt-3"> {currentStreak} / {totalDays} {parseInt(currentStreak) === 1 ? 'Day' : 'Days'} </h2>

                        <div className="d-flex flex-row justify-content-between align-items-center mt-4" style={{ gap: '40px' }}>
                            <p>Last Check-In Streak</p>
                            <p>{lastStreak} {parseInt(lastStreak) === 1 ? 'Day' : 'Days'}</p>
                        </div>
                    </div>
                </Card.Body>
            </Card>
        </Col>
    );
};

const TotalWorkingTime = ({ totalWorkingTime, totalAllowedTime }: { totalWorkingTime: string, totalAllowedTime: string }) => {
    return (
        <>
            <Col md={4} className="mb-4">
                <Card className="shadow-sm" style={{ height: '300px' }}>
                    <Card.Body className="d-flex flex-column justify-content-between align-items-center">
                        <h5 className="mb-3">Total Working Time</h5>

                        <div className="d-flex flex-column justify-content-center align-items-center flex-grow-1">
                            <i className="bi bi-clock mt-4" style={{ fontSize: '48px', color: 'lightblue' }}></i>
                            <h2 className="mt-4 fs-3 d-flex">{totalWorkingTime} out of {totalAllowedTime}</h2>
                        </div>
                    </Card.Body>
                </Card>
            </Col>
        </>
    );
};

const Dumbell = ({ dumbellSeriesData, height, cardHeight, totalWorkedDays, totalDays }: { dumbellSeriesData: any, height: number, cardHeight?: boolean, totalWorkedDays: number, totalDays: number }) => {

    const colorValues = useSelector((state: RootState) => state?.customColors?.workingPattern)

    const datas = dumbellSeriesData;
    const statusMap = {
        checkIn: { label: 'CheckIn', color: colorValues?.checkInColor },
        checkOut: { label: 'CheckOut', color: colorValues?.checkoutColor },
        missingCheckOut: { label: 'MissingCheckOut', color: colorValues?.missingCheckoutColor }
    };

    // Initialize counts
    const statusCounts = {
        [statusMap.checkIn.label]: 0,
        [statusMap.checkOut.label]: 0,
        [statusMap.missingCheckOut.label]: 0
    };

    // Calculate actual counts based on data structure
    dumbellSeriesData.forEach((item: any) => {
        const [checkIn, checkOut] = item.y;

        if (checkIn > 0) statusCounts.CheckIn++;
        if (checkOut > 0) {
            statusCounts.CheckOut++;
        } else if (checkIn > 0) {
            statusCounts.MissingCheckOut++;
        }
    });


    const dumbellOptions: any = {
        chart: {
            height: 350,
            type: 'rangeBar',
            zoom: {
                enabled: false
            }
        },
        plotOptions: {
            bar: {
                isDumbbell: true,
                columnWidth: '10%',
                colors: {
                    ranges: [],
                },
                dumbbellShape: 'circle',
                dumbbellSize: 8,
            }
        },
        legend: {
            show: true,
            showForSingleSeries: true,
            position: 'top',
            horizontalAlign: 'left',
            customLegendItems: [
                `${statusMap.checkIn.label} ${statusCounts.CheckIn}`,
                `${statusMap.checkOut.label} ${statusCounts.CheckOut}`,
                `${statusMap.missingCheckOut.label} ${statusCounts.MissingCheckOut}`
            ],
            markers: {
                fillColors: [
                    statusMap.checkIn.color || "#0000FF",
                    statusMap.checkOut.color || "#00E396",
                    statusMap.missingCheckOut.color || "#FFA500"
                ],
                width: "12px",
                height: "12px",
                borderRadius: "50%",
            },
            labels: {
                colors: "#333",
                useSeriesColors: false,
            },
        },
        fill: {
            type: 'gradient',
            gradient: {
                type: 'vertical',
                gradientToColors: ['#00E396'],
                inverseColors: true,
                stops: [0, 100]
            }
        },
        grid: {
            xaxis: {
                lines: {
                    show: true
                }
            },
            yaxis: {
                lines: {
                    show: false
                }
            }
        },
        xaxis: {
            tickPlacement: 'on'
        },
        yaxis: {
            type: 'numeric',
            min: 0,
            max: 1440,
            tickAmount: 4,
            labels: {
                formatter: function (val: any) {
                    const hours = Math.floor(val / 60).toString().padStart(2, '0');
                    const minutes: any = (val % 60).toFixed(0).padStart(2, '0');
                    return `${hours}`;
                }
            }
        },
        tooltip: {
            shared: false,
            custom: function ({ series, seriesIndex, dataPointIndex, w }: { series: any, seriesIndex: any, dataPointIndex: any, w: any }) {
                const data = w.config.series[seriesIndex].data[dataPointIndex];

                // Extract check-in and check-out times (in minutes)
                const checkInMinutesTotal = data.y[0];
                const checkOutMinutesTotal = data.y[1];

                // Convert to hours and minutes (hh:mm format)
                const checkInHours = Math.floor(checkInMinutesTotal / 60);
                const checkInMinutes = (checkInMinutesTotal % 60).toFixed(0).padStart(2, '0');

                // Handle missing checkout case
                let checkOut = "Missing";
                let workDuration = "N/A";

                if (checkOutMinutesTotal !== -1) {
                    const checkOutHours = Math.floor(checkOutMinutesTotal / 60);
                    const checkOutMinutes = (checkOutMinutesTotal % 60).toFixed(0).padStart(2, '0');
                    checkOut = `${checkOutHours}:${checkOutMinutes}`;

                    // Calculate total working hours
                    const totalMinutesWorked = checkOutMinutesTotal - checkInMinutesTotal;
                    const workHours = Math.floor(totalMinutesWorked / 60);
                    const workMinutes = (totalMinutesWorked % 60).toFixed(0).padStart(2, '0');
                    workDuration = `${workHours}:${workMinutes}`; // Final formatted working hours
                }

                const checkIn = `${checkInHours}:${checkInMinutes}`;

                return `
                    <div style="padding: 5px; border: 1px solid #ddd; background-color: #fff;">
                        <strong>Total Work Hours:</strong> ${workDuration}<br>
                        <strong>Day:</strong> ${data.x}<br/>
                        <strong>Check-in:</strong> ${checkIn}<br/>
                        <strong>Check-out:</strong> ${checkOut}
                    </div>
                `;
            }
        },
    };

    const dumbellSeries = [
        {
            name: 'Work Hours',
            data: dumbellSeriesData.map((item: any) => {
                const [checkIn, checkOut] = item.y;

                let barColor = statusMap.checkOut.color;
                let checkInColor = statusMap.checkIn.color;

                if (checkOut === -1) {
                    barColor = statusMap.missingCheckOut.color;
                }

                return {
                    x: item.x,
                    y: item.y,
                    fillColor: barColor,
                    strokeColor: checkInColor,
                    marker: {
                        fillColors: [checkInColor, barColor],
                    }
                };
            }),
        }
    ];

    return (
        <>
            <Card className="d-flex flex-column flex-md-row shadow-sm w-100 mb-4">
                <Card.Body className="text-center ps-2" style={{ height: cardHeight ? '300px' : '' }}>
                    <h5 className="mb-3">Regularity {totalWorkedDays} days out of {totalDays} days</h5>
                    <ReactApexChart
                        options={{
                            ...dumbellOptions,
                            responsive: [
                                {
                                    breakpoint: 768,
                                    options: {
                                        chart: {
                                            height: 250,
                                        },
                                        xaxis: {
                                            labels: {
                                                rotate: 0,
                                                style: { fontSize: "10px" },
                                            }
                                        },
                                        dataLabels: { enabled: false },
                                        grid: { show: false }
                                    }
                                }
                            ]
                        }}
                        series={dumbellSeries}
                        type="rangeBar"
                        height={height}
                        width="100%"
                    />
                </Card.Body>
            </Card>
        </>
    );
};

const Bar = ({ barOption, barSeriesData, height, cardHeight, totalWorkingTime, totalAllowedTime }: { barOption: string[], barSeriesData: number[], height: number, cardHeight?: boolean, totalWorkingTime: string, totalAllowedTime: string }) => {
    const barOptions: ApexCharts.ApexOptions = {
        chart: {
            type: "bar",
            height: 350,
            toolbar: {
                show: false,
            },
        },
        plotOptions: {
            bar: {
                horizontal: false,
                columnWidth: "50%",
                borderRadius: 12,
            },
        },
        dataLabels: {
            enabled: false,
            formatter: function (val: number) {
                return `${val}`;
            },
            offsetY: -20,
            style: {
                fontSize: "12px",
                colors: ["#304758"],
            },
        },
        xaxis: {
            categories: barOption,
            labels: {
                style: {
                    fontSize: barOption.length == 7 ? '11px' : '12px',
                }
            }
        },
        yaxis: {
            min: 0,
            max: 1440,
            tickAmount: 4,
            labels: {
                formatter: function (val: number) {
                    let hours = Math.floor(val / 60);
                    let formattedHours = hours < 10 ? `0${hours}` : `${hours}`;
                    return `${formattedHours}`;
                },
            },
        },
        fill: {
            opacity: 1,
        },
        tooltip: {
            y: {
                formatter: function (val: number) {
                    let value = convertMinutesIntoHrMinFormat(val);
                    if (barOption.length == 12) {
                        value = val.toString();
                    }
                    return `${value}`;
                },
            },
        },
    };

    const barSeries = [{ name: "Working Hours", data: barSeriesData }];

    return (
        <>
            <Card className="shadow-sm w-100 mb-4">
                <Card.Body className="text-center ps-2 pb-2" style={{ height: cardHeight ? '300px' : '' }}>
                    <h5 className="mt-4 text-center"> Working Time - {totalWorkingTime} / {totalAllowedTime} {barOption.length === 12 ? `(Hrs)` : `(H M)`}</h5>

                    {/* Responsive Bar Chart */}
                    <ReactApexChart
                        options={{
                            ...barOptions,
                            chart: {
                                ...barOptions.chart,
                                toolbar: { show: false },
                            },
                            xaxis: {
                                ...barOptions.xaxis,
                                tickAmount: Math.min(10, barSeries[0]?.data.length / 2),
                                tickPlacement: "between",
                                labels: {
                                    show: true,
                                    rotate: -25,
                                    maxHeight: 50,
                                    style: { fontSize: '12px' },
                                    formatter: function (value: string, index: number) {
                                        return value.length > 10 ? value.substring(0, 10) + "..." : value;
                                    }
                                },
                            },
                            responsive: [
                                {
                                    breakpoint: 768,
                                    options: {
                                        chart: { height: 250 },
                                        xaxis: {
                                            labels: {
                                                rotate: -49,
                                                style: { fontSize: '9px' }
                                            }
                                        }
                                    }
                                }
                            ],
                        }}
                        series={barSeries}
                        type="bar"
                        height={height}
                        width="100%"
                    />
                </Card.Body>
            </Card>
        </>
    );
};

const HeatMap = ({ heatMapSeries, height, totalDays }: { heatMapSeries: any, height: number, totalDays: number }) => {
    // console.log("heatMapSeries",heatMapSeries);
    const colorValues = useSelector((state: RootState) => state?.customColors?.attendanceOverview);
    const checkoutMissingColor = useSelector((state: any) => state?.customColors?.workingPattern?.missingCheckoutColor);
    const weekendColor = useSelector((state: any) => state?.customColors?.attendanceCalendar?.weekendColor);

    // Define status mappings
    const statusMap: Record<number, { label: string; color: string }> = {
        0: { label: "Present", color: colorValues?.presentColor },
        1: { label: "Absent", color: colorValues?.absentColor },
        2: { label: "On Leave", color: colorValues?.onLeaveColor },
        3: { label: "Extra Day", color: colorValues?.extraDayColor },
        4: { label: "Holiday", color: colorValues?.holidayColor },
        5: { label: "N/A", color: "#F0F0F0" },
        6: { label: "Check Out Missing", color: checkoutMissingColor },
        7: { label: "Weekend", color: weekendColor },
    };

    // Count occurrences of each status
    const statusCounts: Record<string, number> = {};
    Object.values(statusMap).forEach(({ label }) => (statusCounts[label] = 0));

    heatMapSeries.forEach((seriesItem: any) => {
        seriesItem.data.forEach((value: number) => {
            const status = statusMap[value]?.label;
            if (status) statusCounts[status] += 1;
        });
    });

    const heatMapOptions: any = {
        chart: { type: "heatmap" },
        plotOptions: {
            heatmap: {
                shadeIntensity: 0.5,
                colorScale: {
                    ranges: Object.entries(statusMap).map(([key, { label, color }]) => ({
                        from: Number(key),
                        to: Number(key),
                        name: label,
                        color: color
                    }))
                }
            }
        },
        xaxis: {
            type: 'category',
            categories: heatMapSeries[0].data.length === 7 ? weekDays : Array.from({ length: 31 }, (_, i) => i + 1),
            title: {
                text: `Days (${totalDays})`
            },
        },
        yaxis: {
            title: { text: heatMapSeries[0]?.data.length === 7 ? "Week" : "Month" }
        },
        dataLabels: { enabled: false },
        tooltip: {
            y: { formatter: (value: any) => statusMap[value]?.label || "Unknown" }
        },
        legend: { show: false } // Hide default legend
    };

    return (
        <>
            <Card className="shadow-sm w-100 mb-4 p-0">
                <Card.Body className="text-center p-2">
                    <h5 className="mt-4 text-center">Heatmap</h5>

                    {/* Custom Legend with Counts */}
                    <div className="d-flex justify-content-center flex-wrap mb-3">
                        {Object.entries(statusMap).map(([key, { label, color }]) => (
                            <div key={label} className="d-flex align-items-center mx-2">
                                <span
                                    style={{
                                        display: "inline-block",
                                        width: "12px",
                                        height: "12px",
                                        backgroundColor: color,
                                        borderRadius: "50%",
                                        marginRight: "6px"
                                    }}
                                ></span>
                                <span>{`${label} ${statusCounts[label] || 0}`}</span>
                            </div>
                        ))}
                    </div>
                    {/* Responsive Heatmap Chart */}
                    <ReactApexChart
                        options={{
                            ...heatMapOptions,
                            chart: {
                                ...heatMapOptions.chart,
                                toolbar: { show: false },
                            },
                            xaxis: {
                                ...heatMapOptions.xaxis,
                                labels: {
                                    rotate: -45,
                                    style: {
                                        fontSize: '12px',
                                    },
                                },
                            },
                            yaxis: {
                                labels: {
                                    style: { fontSize: '12px' },
                                },
                            },
                            dataLabels: {
                                enabled: false,
                            },
                            responsive: [
                                {
                                    breakpoint: 768,
                                    options: {
                                        chart: { height: 250 },
                                        xaxis: {
                                            labels: { rotate: 0 },
                                        },
                                        yaxis: {
                                            labels: { style: { fontSize: '10px' } },
                                        },
                                    },
                                },
                            ],
                        }}
                        series={heatMapSeries}
                        type="heatmap"
                        height={height}
                        width="100%"
                    />
                </Card.Body>
            </Card>
        </>
    );
};

const faqSchema = Yup.object({
    workingMethodId: Yup.string().required().label('Working Method'),
    checkIn: Yup.string().required().label('Check In'),
    remarks: Yup.string().required().label('Remarks'),
});

let initialState = {
    employeeId: "",
    checkIn: "",
    checkOut: "",
    workingMethodId: "",
    remarks: "",
};

const StatisticsTable = ({ approvedLeaves, attendance, attendanceRequests, fromAdmin = false, location, resource = "", viewOwn = false, viewOthers = false, checkOwnWithOthers = false }: { approvedLeaves: any[], attendance: IAttendance[], attendanceRequests: IAttendanceRequests[], fromAdmin?: boolean, location?: any, resource: string, viewOwn?: boolean, viewOthers?: boolean, checkOwnWithOthers?: boolean }) => {

    const [disableRaiseRequest, setDisableRaiseRequest] = useState(false);
    const maxAttendanceRequestLimit = fromAdmin ? useSelector((state: RootState) => state.employee.selectedEmployee.attendanceRequestRaiseLimit) : useSelector((state: RootState) => state.employee.currentEmployee.attendanceRequestRaiseLimit);

    const [requestLimitResetLoading, setRequestLimitResetLoading] = useState(false)
    const employeeDeatils = fromAdmin ? useSelector((state: RootState) => state.employee.selectedEmployee) : useSelector((state: RootState) => state.employee.currentEmployee);
    const reportsToId = employeeDeatils.reportsToId;

    const allWeekends = useSelector((state: RootState) => state?.employee?.currentEmployee?.branches?.workingAndOffDays);
    const allHolidays = useSelector((state: RootState) => state?.attendanceStats?.publicHolidays);

    const colorValues = useSelector((state: RootState) => state?.customColors?.attendanceOverview);
    // console.log("colorValues:: ",colorValues);
    const colorValuesForAttendanceCalendar = useSelector((state: RootState) => state?.customColors?.attendanceCalendar);
    // console.log("colorValuesForAttendanceCalendar:: ",colorValuesForAttendanceCalendar);

    const worktypeColorValues = useSelector((state: RootState) => state?.customColors?.workingLocation);
    const missingColor = useSelector((state: RootState) => state?.customColors.workingPattern);
    const workingOnWeekendColor = useSelector((state: RootState) => state?.customColors.attendanceCalendar);
    const currentEmployeeId = useSelector((state: RootState) => state.employee.currentEmployee.id);
    const stableEmployeeId = useMemo(() => currentEmployeeId, [currentEmployeeId]);

    const attendanceWithRequest = attendance.map((dailyAttendance: IAttendance) => {
        const attendanceRequest = attendanceRequests.filter((request: IAttendanceRequests) =>
            request.formattedDate === dailyAttendance.formattedDate &&
            request.status == LeaveStatus.ApprovalPending)[0];
        return {
            ...dailyAttendance,
            attendanceRequests: attendanceRequest,
        };
    });

    // Merge approved leaves with attendance data
    const attendanceWithLeaves = attendanceWithRequest.map((dailyAttendance: IAttendance) => {
        // Check if there's an approved leave for this date
        let leaveType = "";
        const hasApprovedLeave = approvedLeaves?.some((leave: any) => {
            const leaveDate = dayjs(leave.date).format('DD/MM/YYYY');
            console.log("leaveDataDate:: ", leave);
            // console.log("dailyAttendance.formattedDate:: ", dailyAttendance.formattedDate);
            const tempLeaveType = leave?.leaveOptions?.leaveType || "";
            console.log("tempLeaveType:: ", tempLeaveType);

            if (tempLeaveType?.toLocaleLowerCase().includes('annual')) {
                leaveType = ATTENDANCE_STATUS.LEAVE_TYPE.ANNUAL_LEAVE;
            }
            else if (tempLeaveType?.toLocaleLowerCase().includes('maternal')) {
                leaveType = ATTENDANCE_STATUS.LEAVE_TYPE.MATERNAL_LEAVE;
            }
            else if (tempLeaveType?.toLocaleLowerCase().includes('floater')) {
                leaveType = ATTENDANCE_STATUS.LEAVE_TYPE.FLOATER_LEAVE;
            }
            else if (tempLeaveType?.toLocaleLowerCase().includes('casual')) {
                leaveType = ATTENDANCE_STATUS.LEAVE_TYPE.CASUAL_LEAVE;
            }
            else if (tempLeaveType?.toLocaleLowerCase().includes('sick')) {
                leaveType = ATTENDANCE_STATUS.LEAVE_TYPE.SICK_LEAVE;
            }
            else if (tempLeaveType?.toLocaleLowerCase().includes('unpaid')) {
                leaveType = ATTENDANCE_STATUS.LEAVE_TYPE.UNPAID_LEAVE;
            }
            return leaveDate === dailyAttendance.formattedDate;
        });

        // If there's an approved leave and the current status is "Absent", mark as "Present"


        if (hasApprovedLeave && dailyAttendance.status === ATTENDANCE_STATUS.ABSENT) {

            return {
                ...dailyAttendance,
                status: leaveType,
                leaveType: leaveType,
            };
        }

        return dailyAttendance;
    });

    attendance = attendanceWithLeaves;

    const dispatch = useDispatch();
    const toggleChange = store.getState().attendanceStats.toggleChange;

    const employeeId = useSelector((state: RootState) => state.employee.currentEmployee.id);

    const [workingMethodOptions, setWorkingMethodOptions] = useState([]);
    const [lateCheckInThreshold, setLateCheckInThreshold] = useState('');
    const [earlyCheckOutThreshold, setEarlyCheckOutThreshold] = useState('');
    const [allEmployeeThresholds, setAllEmployeeThresholds] = useState<any>([]);
    const [showDateIn12HourFormat, setShowDateIn12HourFormat] = useState(false);
    const [latitudeNew, setLatitudeNew] = useState<any>()
    const [longitudeNew, setLongitudeNew] = useState<any>()

    const [loading, setLoading] = useState(false);
    const [show, setShow] = useState(false);
    const [date, setDate] = useState('');
    // ADD: Store current row data for handleSubmit
    const [currentRowData, setCurrentRowData] = useState<any>(null);
    // ADD: Request type selection state
    const [requestType, setRequestType] = useState<'checkin' | 'checkout' | null>(null);
    const [showRequestTypeSelection, setShowRequestTypeSelection] = useState(false);
    const [hasCheckInData, setHasCheckInData] = useState(false);

    useEffect(() => {
        const fetchCompanyData = async () => {
            const { data: { companyOverview } } = await fetchCompanyOverview();
            const showDateIn12HourFormatVal = companyOverview[0].showDateIn12HourFormat;
            // console.log("settingshowDateIn12HourFormatVal:: ", showDateIn12HourFormatVal)
            setShowDateIn12HourFormat(showDateIn12HourFormatVal);
        }
        fetchCompanyData();
    }, [])

    useEffect(() => {
        if (!date || !employeeId || !maxAttendanceRequestLimit) return;
        const fetchEmployeeRequestRaise = async () => {
            const startDate = dayjs(date).startOf('month').format('YYYY-MM-DD');
            const endDate = dayjs(date).endOf('month').format('YYYY-MM-DD');
            const { data: { attendanceRequests } } = await getAttendanceRequest(employeeId, startDate, endDate);
            setDisableRaiseRequest(attendanceRequests?.length >= maxAttendanceRequestLimit);
            const { data: { companyOverview } } = await fetchCompanyOverview();
            const showDateIn12HourFormatVal = companyOverview[0].showDateIn12HourFormat;
        }
        fetchEmployeeRequestRaise();
    }, [date, employeeId, maxAttendanceRequestLimit])

    const handleClose = () => {
        setShow(false);
        setCurrentRowData(null); // Clear row data on close
        setRequestType(null); // Clear request type on close
        setShowRequestTypeSelection(false); // Reset request type selection
    }

    // MODIFIED: Accept and store the entire attendance row data
    const raiseRequest = async (attendance: any) => {
        setDate(attendance.date);
        setCurrentRowData(attendance); // Store the row data

        // Check if check-in data exists for this date
        const hasCheckInData = (attendance?.attendanceRequests && attendance.attendanceRequests.checkIn) ||
            (attendance && attendance.checkIn && attendance.checkIn !== "-NA-");

        // Store check-in availability for modal logic
        setHasCheckInData(hasCheckInData);

        // Always show request type selection modal
        setShowRequestTypeSelection(true);
        setShow(true);

        if (attendance?.attendanceRequests) {
            initialState = {
                employeeId: attendance?.attendanceRequests.employeeId,
                checkIn: attendance?.attendanceRequests?.checkIn,
                checkOut: attendance?.attendanceRequests?.checkOut,
                workingMethodId: attendance?.attendanceRequests.workingMethodId,
                remarks: attendance?.attendanceRequests.remarks,
            };
        } else if (attendance?.id) {
            initialState = {
                employeeId: employeeId,
                checkIn: attendance?.checkIn,
                checkOut: attendance?.checkOut,
                workingMethodId: attendance?.workingMethodId,
                remarks: attendance?.remarks
            };
        } else {
            initialState = {
                employeeId: employeeId,
                checkIn: '',
                checkOut: '',
                workingMethodId: '',
                remarks: ''
            };
        }
    }

    // ADD: Handle request type selection
    const handleRequestTypeSelection = (type: 'checkin' | 'checkout') => {
        setRequestType(type);
        setShowRequestTypeSelection(false);
    }

    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    console.log("position:: ", position);

                    setLatitudeNew(position.coords.latitude);
                    setLongitudeNew(position.coords.longitude);
                },
                (error) => {
                    // Handle errors (e.g., user denied permission)
                },
                {
                    enableHighAccuracy: true,
                    maximumAge: 0
                }
            );
        }
    }, [])

    // MODIFIED: Use currentRowData to get latitude/longitude
    const handleSubmit = async (values: any, actions: FormikValues) => {
        // Get location data from the stored row data
        const currentId = currentRowData?.id;
        const locationEntry = Array.isArray(location) && location.find(item => item.id === currentId);
        const latitude = locationEntry?.latitude;
        const longitude = locationEntry?.longitude;

        const { data: { companyOverview } } = await fetchCompanyOverview();
        const companyId = companyOverview[0].id;

        const updatedValues = {
            ...values,
            latitude: latitude || latitudeNew,
            longitude: longitude || longitudeNew,
            status: 0,
            companyId
        }
        console.log("latitudeNew:: ", latitudeNew);
        console.log("longitudeNew:: ", longitudeNew);
        console.log("updatedValues:: ", updatedValues);

        const formattedDate = dayjs(date, "DD MMM YYYY").format("YYYY-MM-DD");

        let checkInDateTime, checkOutDateTime;
        let checkInUTC, checkOutUTC;

        // Validate based on request type
        if (requestType === 'checkin') {
            if (!values.checkIn || values.checkIn === "") {
                errorConfirmation('Check In time is required for check-in request');
                return;
            }
            if (!isValidTime(values.checkIn)) {
                errorConfirmation('Enter Check In in HH:MM(24 hr format)');
                return;
            }
            checkInDateTime = dayjs(`${formattedDate} ${values.checkIn}`, "YYYY-MM-DD HH:mm");
            const checkInDateObject = new Date(checkInDateTime.toString());
            checkInUTC = checkInDateObject.toISOString();
            updatedValues.checkIn = checkInUTC;
            // Remove checkout for checkin requests
            delete updatedValues.checkOut;
        } else if (requestType === 'checkout') {
            if (!values.checkOut || values.checkOut === "") {
                errorConfirmation('Check Out time is required for check-out request');
                return;
            }
            if (!isValidTime(values.checkOut)) {
                errorConfirmation('Enter Check Out in HH:MM(24 hr format)');
                return;
            }
            checkOutDateTime = dayjs(`${formattedDate} ${values.checkOut}`, "YYYY-MM-DD HH:mm");
            const checkOutDateObject = new Date(checkOutDateTime.toString());
            checkOutUTC = checkOutDateObject.toISOString();
            updatedValues.checkOut = checkOutUTC;
            // Remove checkin for checkout requests
            updatedValues.checkIn = undefined;
        }

        // Time conflict validation - check against existing attendance data
        const existingAttendanceData = currentRowData;
        let existingCheckInTime = null;
        let existingCheckOutTime = null;

        // Extract existing times for validation
        if (existingAttendanceData?.attendanceRequests) {
            // From attendance requests
            if (existingAttendanceData.attendanceRequests.checkIn) {
                existingCheckInTime = dayjs(existingAttendanceData.attendanceRequests.checkIn).format('HH:mm');
            }
            if (existingAttendanceData.attendanceRequests.checkOut) {
                existingCheckOutTime = dayjs(existingAttendanceData.attendanceRequests.checkOut).format('HH:mm');
            }
        } else if (existingAttendanceData) {
            // From attendance data
            if (existingAttendanceData.checkIn && existingAttendanceData.checkIn !== "-NA-") {
                // Handle time format from attendance data (might include seconds)
                const timePart = existingAttendanceData.checkIn.split(' ').pop() || existingAttendanceData.checkIn;
                if (timePart) {
                    const timeParts = timePart.split(':');
                    if (timeParts.length >= 2) {
                        existingCheckInTime = `${timeParts[0].padStart(2, '0')}:${timeParts[1].padStart(2, '0')}`;
                    }
                }
            }
            if (existingAttendanceData.checkOut && existingAttendanceData.checkOut !== "-NA-") {
                const timePart = existingAttendanceData.checkOut.split(' ').pop() || existingAttendanceData.checkOut;
                if (timePart) {
                    const timeParts = timePart.split(':');
                    if (timeParts.length >= 2) {
                        existingCheckOutTime = `${timeParts[0].padStart(2, '0')}:${timeParts[1].padStart(2, '0')}`;
                    }
                }
            }
        }

        // Validate time conflicts
        if (requestType === 'checkin') {
            // For check-in requests, check against existing check-out time
            if (existingCheckOutTime) {
                const newCheckInTime = dayjs(`${formattedDate} ${values.checkIn}`, "YYYY-MM-DD HH:mm");
                const existingCheckOutDateTime = dayjs(`${formattedDate} ${existingCheckOutTime}`, "YYYY-MM-DD HH:mm");

                if (newCheckInTime.isAfter(existingCheckOutDateTime)) {
                    errorConfirmation(`Check-in time (${values.checkIn}) cannot be after the existing check-out time (${existingCheckOutTime})`);
                    return;
                }
            }

            // Also check if form has both check-in and check-out values
            if (values.checkOut && values.checkOut.trim() !== "") {
                const checkInTime = dayjs(`${formattedDate} ${values.checkIn}`, "YYYY-MM-DD HH:mm");
                const checkOutTime = dayjs(`${formattedDate} ${values.checkOut}`, "YYYY-MM-DD HH:mm");

                if (checkInTime.isAfter(checkOutTime)) {
                    errorConfirmation(`Check-in time (${values.checkIn}) cannot be after check-out time (${values.checkOut})`);
                    return;
                }
            }
        } else if (requestType === 'checkout') {
            // For check-out requests, check against existing check-in time
            if (existingCheckInTime) {
                const newCheckOutTime = dayjs(`${formattedDate} ${values.checkOut}`, "YYYY-MM-DD HH:mm");
                const existingCheckInDateTime = dayjs(`${formattedDate} ${existingCheckInTime}`, "YYYY-MM-DD HH:mm");

                if (newCheckOutTime.isBefore(existingCheckInDateTime)) {
                    errorConfirmation(`Check-out time (${values.checkOut}) cannot be before the existing check-in time (${existingCheckInTime})`);
                    return;
                }
            }

            // Also check if form has both check-in and check-out values
            if (values.checkIn && values.checkIn.trim() !== "") {
                const checkInTime = dayjs(`${formattedDate} ${values.checkIn}`, "YYYY-MM-DD HH:mm");
                const checkOutTime = dayjs(`${formattedDate} ${values.checkOut}`, "YYYY-MM-DD HH:mm");

                if (checkOutTime.isBefore(checkInTime)) {
                    errorConfirmation(`Check-out time (${values.checkOut}) cannot be before check-in time (${values.checkIn})`);
                    return;
                }
            }
        }

        // Additional validation: If both times are present in the form, validate their relationship
        if (values.checkIn && values.checkIn.trim() !== "" && values.checkOut && values.checkOut.trim() !== "") {
            const checkInTime = dayjs(`${formattedDate} ${values.checkIn}`, "YYYY-MM-DD HH:mm");
            const checkOutTime = dayjs(`${formattedDate} ${values.checkOut}`, "YYYY-MM-DD HH:mm");

            if (checkInTime.isAfter(checkOutTime)) {
                errorConfirmation(`Check-in time (${values.checkIn}) must be before check-out time (${values.checkOut})`);
                return;
            }
        }

        console.log(updatedValues);
        try {
            setLoading(true);
            await createUpdateAttendanceRequest(updatedValues);
            setLoading(false);
            successConfirmation('Attendance Request created successfully');
            setShow(false);
            setCurrentRowData(null); // Clear row data after successful submission
            dispatch(saveToggleChange(!toggleChange));
            return;
        } catch (err) {
            setLoading(false);
            errorConfirmation('Attendance Request failed successfully. Try again later.');
            dispatch(saveToggleChange(!toggleChange));
        }
    }

    useEffect(() => {
        async function getWorkingMethods() {
            const { data: { workingMethods } } = await fetchWorkingMethods();
            const workingMethodOptions = workingMethods.map((workingMethod: any) => ({ value: workingMethod.id, label: workingMethod.type }));
            setWorkingMethodOptions(workingMethodOptions);
        }
        getWorkingMethods();
    }, []);

    // fetch grace based thresholds
    useEffect(() => {
        const initThresholds = async () => {
            const thresholds = await getGraceBasedThresholds(attendance);

            if (thresholds) {
                setAllEmployeeThresholds(thresholds.employeesWithThresholds);
                // console.log("allEmployeeThresholds:: ",allEmployeeThresholds);
                setLateCheckInThreshold(thresholds.defaultThresholds.lateCheckInThreshold);
                setEarlyCheckOutThreshold(thresholds.defaultThresholds.earlyCheckOutThreshold);
            }
        };

        initThresholds();
    }, []);

    // if employee working on weekend/holiday then no late marking and early check out marking
    // console.log("attendance:: ",attendance);

    const isWeekendOrHoliday = markWeekendOrHolidayForReportsTable(attendance, allWeekends, allHolidays);
    // console.log("isWeekendOrHoliday:: ",isWeekendOrHoliday);
    // console.log("attendanceattendance:: ",attendance);
    // console.log("allWeekends:: ",allWeekends);
    // console.log("allHolidays:: ",allHolidays);
    console.log("isWeekendOrHoliday:: ", isWeekendOrHoliday);
    console.log("attendanceattendance:: ", attendance);
    console.log("allWeekends:: ", allWeekends);
    console.log("allHolidays:: ", allHolidays);

    const columns = useMemo<MRT_ColumnDef<IAttendance>[]>(() => [
        {
            accessorKey: "date",
            header: "Date",
            size: 120,
            minSize: 100,
            maxSize: 150,
            Cell: ({ renderedCellValue }: any) => renderedCellValue ? renderedCellValue : "N/A"
        },
        {
            accessorKey: "day",
            header: "Day",
            size: 120,
            minSize: 100,
            maxSize: 150,
            Cell: ({ renderedCellValue }: any) => renderedCellValue ? renderedCellValue : "N/A"
        },
        {
            accessorKey: "checkIn",
            header: "Check-In",
            size: 120,
            minSize: 100,
            maxSize: 150,
            Cell: ({ row }: { row: any }) => {
                const employee = row.original;
                const isWeekendOrHolidays = employee.isWeekendOrHoliday;
                const checkIn = employee.checkIn;

                if (!checkIn || checkIn === '-NA-' || !allEmployeeThresholds) {
                    return <span>{checkIn || "N/A"}</span>;
                }

                try {
                    const today = dayjs().format('YYYY-MM-DD');
                    const employeeThreshold = allEmployeeThresholds.find((emp: any) => emp.id === employee.id);
                    const lateCheckInThreshold = employeeThreshold?.lateCheckInThreshold;
                    // console.log("lateCheckInThreshold::  ",lateCheckInThreshold);
                    const hasSeconds = checkIn.split(':').length === 3;
                    const checkInTime = dayjs(`${today} ${checkIn}`, hasSeconds ? 'YYYY-MM-DD HH:mm:ss' : 'YYYY-MM-DD HH:mm');

                    const thresholdHasSeconds = lateCheckInThreshold.split(':').length === 3;
                    const thresholdTime = dayjs(`${today} ${lateCheckInThreshold}`, thresholdHasSeconds ? 'YYYY-MM-DD HH:mm:ss' : 'YYYY-MM-DD HH:mm');
                    // console.log("checkInTime:: ",checkInTime.format('HH:mm:ss'));
                    // console.log("thresholdTime:: ",thresholdTime.format('HH:mm:ss'));
                    const isLateCheckIn = checkInTime.isValid() && thresholdTime.isValid() && checkInTime.isAfter(thresholdTime);
                    // console.log("isLateCheckIn:: ",isLateCheckIn);
                    // console.log(`Check-in: ${checkIn}, Threshold: ${lateCheckInThreshold}, IsLate: ${isLateCheckIn}`);
                    const finalCheckIn = convertTo12HourFormat(checkIn);
                    return (
                        <span style={{ color: isWeekendOrHolidays ? 'green' : isLateCheckIn ? 'red' : 'green' }}>
                            {finalCheckIn}
                        </span>
                    );
                } catch (error) {
                    // console.error('Error comparing times:', error);
                    return <span>{checkIn}</span>;
                }
            }
        },
        {
            accessorKey: "checkInLocation",
            header: "Check In Location",
            size: 120,
            minSize: 100,
            maxSize: 150,
            Cell: ({ row }: any) => {
                const currentId = row.original.id;
                const workingMethod = row.original.workingMethod;
                const checkInLocation = row.original.checkInLocation;

                // if ((workingMethod !== WORKING_METHOD_TYPE.ON_SITE) && (workingMethod !== WORKING_METHOD_TYPE.REMOTE)) return "-NA-";

                const locationEntry = Array.isArray(location) && location.find(item => item.id === currentId);

                const latitude = locationEntry?.latitude;
                const longitude = locationEntry?.longitude;

                const [address, setAddress] = useState("Fetching location...");

                useEffect(() => {
                    const fetchAddress = async () => {
                        if (checkInLocation.length >= 0) {
                            setAddress(checkInLocation);
                            return;
                        }

                        if (!latitude || !longitude) return;


                        try {
                            const res = await fetchAddressDetails(latitude, longitude);
                            setAddress(res.data.address || "No Address found");
                        } catch (error) {
                            console.log("error", error);
                            setAddress("Unable to fetch address");
                        }
                    };
                    fetchAddress();
                }, [latitude, longitude, checkInLocation]);

                if (latitude && longitude) {
                    const mapUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
                    return (
                        <a href={mapUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
                            <OverlayTrigger placement='top' overlay={<Tooltip id={`tooltip-${address}`}>{address}</Tooltip>}>
                                <span>
                                    {address.length > 30 ? `${address.substring(0, 30)}...` : address}
                                </span>
                            </OverlayTrigger>
                        </a>
                    );
                } else {
                    return "-NA-";
                }
            }
        },
        {
            accessorKey: "checkOut",
            header: "Check-Out",
            size: 120,
            minSize: 100,
            maxSize: 150,
            Cell: ({ row }) => {
                const employee = row.original;
                const isWeekendOrHolidays = employee.isWeekendOrHoliday;

                const checkOut = employee.checkOut;

                if (!checkOut || checkOut === '-NA-' || !earlyCheckOutThreshold) {
                    return <span>{checkOut || "N/A"}</span>;
                }

                try {
                    const today = dayjs().format('YYYY-MM-DD');

                    const checkOutHasSeconds = checkOut.split(':').length === 3;
                    const thresholdHasSeconds = earlyCheckOutThreshold.split(':').length === 3;

                    const checkOutTime = dayjs(`${today} ${checkOut}`, checkOutHasSeconds ? 'YYYY-MM-DD HH:mm:ss' : 'YYYY-MM-DD HH:mm');
                    const thresholdTime = dayjs(`${today} ${earlyCheckOutThreshold}`, thresholdHasSeconds ? 'YYYY-MM-DD HH:mm:ss' : 'YYYY-MM-DD HH:mm');

                    const isEarlyCheckOut = checkOutTime.isValid() && thresholdTime.isValid() && checkOutTime.isBefore(thresholdTime);

                    // console.log(`Check-out: ${checkOut}, Threshold: ${earlyCheckOutThreshold}, IsEarly: ${isEarlyCheckOut}`);
                    // console.log("checkoutcheckout:: ", checkOut);
                    let finalCheckOut = convertTo12HourFormat(checkOut);
                    return (
                        <span style={{ color: isWeekendOrHolidays ? 'green' : isEarlyCheckOut ? 'red' : 'green' }}>
                            {finalCheckOut}
                        </span>
                    );
                } catch (error) {
                    // console.error('Error comparing check-out times:', error);
                    return <span>{convertTo12HourFormat(checkOut)}</span>;
                }
            }
        },
        {
            accessorKey: "checkOutLocation",
            header: "Check Out Location",
            size: 120,
            minSize: 100,
            maxSize: 150,
            Cell: ({ row }: any) => {
                const currentId = row.original.id;
                const workingMethod = row.original.workingMethod;
                const checkOutLocation = row.original.checkOutLocation;

                // if ((workingMethod !== WORKING_METHOD_TYPE.ON_SITE) && (workingMethod !== WORKING_METHOD_TYPE.REMOTE)) return "-NA-";

                const locationEntry = Array.isArray(location) && location.find(item => item.id === currentId);

                const latitude = locationEntry?.checkOutLatitude;
                const longitude = locationEntry?.checkOutLongitude;

                const [address, setAddress] = useState("Fetching location...");

                useEffect(() => {
                    const fetchAddress = async () => {
                        if (checkOutLocation.length >= 0) {
                            setAddress(checkOutLocation);
                            return;
                        }

                        if (!latitude || !longitude) return;


                        try {
                            const res = await fetchAddressDetails(latitude, longitude);
                            setAddress(res.data.address || "No Address found");
                        } catch (error) {
                            console.log("error", error);
                            setAddress("Unable to fetch address");
                        }
                    };
                    fetchAddress();
                }, [latitude, longitude, checkOutLocation]);

                if (latitude && longitude) {
                    const mapUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
                    return (
                        <a href={mapUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
                            <OverlayTrigger placement='top' overlay={<Tooltip id={`tooltip-${address}`}>{address}</Tooltip>}>
                                <span>
                                    {address.length > 30 ? `${address.substring(0, 30)}...` : address}
                                </span>
                            </OverlayTrigger>
                        </a>
                    );
                } else {
                    return "-NA-";
                }
            }
        },
        {
            accessorKey: "duration",
            header: "Duration",
            size: 120,
            minSize: 100,
            maxSize: 150,
            Cell: ({ renderedCellValue }: any) => renderedCellValue
        },
        {
            accessorKey: "status",
            header: "Status",
            size: 120,
            minSize: 100,
            maxSize: 150,
            Cell: ({ renderedCellValue }: any) => {
                if (!renderedCellValue) return null;
                console.log("renderedCellValue:: ", renderedCellValue);

                const { PRESENT, ABSENT, CHECK_IN_MISSING, CHECK_OUT_MISSING, LEAVE, WEEKEND, WORKING_WEEKEND, RAISE_REQUEST, ON_LEAVE, HOLIDAY, LEAVE_TYPE } = ATTENDANCE_STATUS;
                const { ANNUAL_LEAVE, CASUAL_LEAVE, FLOATER_LEAVE, SICK_LEAVE, UNPAID_LEAVE, MATERNAL_LEAVE } = LEAVE_TYPE;
                // Define color mapping
                const statusColors: Record<string, string> = {
                    [PRESENT]: colorValuesForAttendanceCalendar?.presentColor || "#28a745", // Default Green
                    [ABSENT]: colorValuesForAttendanceCalendar?.absentColor || "#dc3545", // Default Red
                    [CHECK_IN_MISSING]: missingColor?.missingCheckoutColor || "#ffc107", // Default Yellow
                    [CHECK_OUT_MISSING]: missingColor?.missingCheckoutColor || "#ffc107", // Default Yellow
                    [WEEKEND]: colorValuesForAttendanceCalendar?.weekendColor || "#6c757d", // Default Gray
                    [WORKING_WEEKEND]: colorValuesForAttendanceCalendar?.workingWeekendColor || "#6610f2", // Default Purple
                    [RAISE_REQUEST]: colorValuesForAttendanceCalendar?.markedPresentViaRequestRaisedColor || '#6610f2',
                    [HOLIDAY]: colorValues?.holidayColor || "#17a2b8", // Default Cyan
                    [ANNUAL_LEAVE]: colorValuesForAttendanceCalendar.onLeaveColor || "#17a2b8", // Default Cyan
                    [CASUAL_LEAVE]: colorValuesForAttendanceCalendar.onLeaveColor || "#17a2b8", // Default Cyan
                    [FLOATER_LEAVE]: colorValuesForAttendanceCalendar.onLeaveColor || "#17a2b8", // Default Cyan
                    [SICK_LEAVE]: colorValuesForAttendanceCalendar.onLeaveColor || "#17a2b8", // Default Cyan
                    [UNPAID_LEAVE]: colorValuesForAttendanceCalendar.onLeaveColor || "#17a2b8", // Default Cyan
                    [MATERNAL_LEAVE]: colorValuesForAttendanceCalendar.onLeaveColor || "#17a2b8", // Default Cyan
                    [LEAVE]: colorValuesForAttendanceCalendar?.onLeaveColor || "#17a2b8", // Default Cyan
                };

                return (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span
                            style={{
                                width: "12px",
                                height: "12px",
                                borderRadius: "50%",
                                backgroundColor: statusColors[renderedCellValue] || "transparent"
                            }}
                        ></span>
                        {renderedCellValue}
                    </div>
                );
            }
        },

        {
            accessorKey: "workingMethod",
            header: "Work",
            size: 120,
            minSize: 100,
            maxSize: 150,
            Cell: ({ row }: any) => {
                const renderedCellValue = row.original.workingMethod;
                const { OFFICE, ON_SITE, REMOTE } = WORKING_METHOD_TYPE;

                const colorMap: Record<string, string> = {
                    [OFFICE]: worktypeColorValues?.officeColor || "#3498db",
                    [ON_SITE]: worktypeColorValues?.onSiteColor || "#e74c3c",
                    [REMOTE]: worktypeColorValues?.remoteColor || "#2ecc71",
                };

                return (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span
                            style={{
                                width: "12px",
                                height: "12px",
                                borderRadius: "50%",
                                backgroundColor: colorMap[renderedCellValue] || "#000",
                            }}
                        ></span>
                        {renderedCellValue}
                    </div>
                );
            }
        },

        // {
        //     accessorKey: "location",
        //     header: "Location",
        //     size: 120,
        //     minSize: 100,
        //     maxSize: 150,
        //     Cell: ({ row }: any) => {
        //         const currentId = row.original.id;
        //         const workingMethod = row.original.workingMethod;
        //         if (workingMethod !== WORKING_METHOD_TYPE.ON_SITE) return "-";

        //         const locationEntry = Array.isArray(location) && location.find(item => item.id === currentId);
        //         const checkInLocation = locationEntry?.checkInLocation;

        //         const latitude = locationEntry?.latitude;
        //         const longitude = locationEntry?.longitude;

        //         const [address, setAddress] = useState("Fetching location...");

        //         useEffect(() => {
        //             const fetchAddress = async () => {
        //                 if (!latitude || !longitude) return;

        //                 if(checkInLocation.length >= 0){
        //                     setAddress(checkInLocation);
        //                     return;
        //                 }

        //                 try {
        //                     const res = await fetchAddressDetails(latitude, longitude);
        //                     setAddress(res.data.address || "No Address found");
        //                 } catch (error) {
        //                     console.log("error", error);
        //                     setAddress("Unable to fetch address");
        //                 }
        //             };
        //             fetchAddress();
        //         }, [latitude, longitude, checkInLocation]);

        //         if (latitude && longitude) {
        //             const mapUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
        //             return (
        //                 <a href={mapUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
        //                     <OverlayTrigger placement='top' overlay={<Tooltip id={`tooltip-${address}`}>{address}</Tooltip>}>
        //                         <span>
        //                             {address.length > 30 ? `${address.substring(0, 30)}...` : address}
        //                         </span>
        //                     </OverlayTrigger>
        //                 </a>
        //             );
        //         } else {
        //             return "-NA-";
        //         }
        //     }
        // },        

        ...(!fromAdmin ? [{
            accessorKey: "actions",
            header: "Actions",
            size: 120,
            minSize: 100,
            maxSize: 150,
            Cell: ({ row }: any) => {
                const res = hasPermission(resourceNameMapWithCamelCase.attendanceRequest, permissionConstToUseWithHasPermission.create);
                const hasAttendanceResquest = row?.original?.attendanceRequests?.id;
                const isPastDate = dayjs(row?.original?.date).isBefore(dayjs(), 'day');
                // if(hasAttendanceResquest) return 'Request Already Raised'
                return !(row?.original?.id == "-") && res && !isPastDate ?
                    < button className='btn btn-icon btn-bg-light btn-active-color-primary btn-sm' onClick={() => raiseRequest(row?.original)} >
                        <KTIcon iconName='pencil' className='fs-3' />
                    </button > : 'Not Allowed'
            },
        }] : []),
    ], [location, lateCheckInThreshold, earlyCheckOutThreshold]);

    console.log("isWeekendOrHolidayFinaL::", isWeekendOrHoliday);

    return (
        <>
            <MaterialTable
                columns={columns}
                data={isWeekendOrHoliday}
                employeeId={stableEmployeeId}
                tableName="Report" resource={resource} viewOwn={viewOwn} viewOthers={viewOthers} checkOwnWithOthers={checkOwnWithOthers}
                muiTableProps={{
                    muiTableBodyRowProps: ({ row }) => {
                        const status = row.original?.status ?? "";
                        const { ANNUAL_LEAVE, CASUAL_LEAVE, FLOATER_LEAVE, MATERNAL_LEAVE, SICK_LEAVE, UNPAID_LEAVE } = ATTENDANCE_STATUS.LEAVE_TYPE;
                        const statusColors: Record<string, string> = {
                            [ATTENDANCE_STATUS.PRESENT]: colorValuesForAttendanceCalendar?.presentColor || "#28a745",
                            [ATTENDANCE_STATUS.ABSENT]: colorValuesForAttendanceCalendar?.absentColor || "#dc3545",
                            [ATTENDANCE_STATUS.WEEKEND]: colorValuesForAttendanceCalendar?.weekendColor || "#6c757d",
                            [ATTENDANCE_STATUS.WORKING_WEEKEND]: colorValuesForAttendanceCalendar?.workingWeekendColor || "#6610f2",
                            [ATTENDANCE_STATUS.CHECK_OUT_MISSING]: missingColor?.missingCheckoutColor || '#ffff',
                            [ATTENDANCE_STATUS.RAISE_REQUEST]: colorValuesForAttendanceCalendar?.markedPresentViaRequestRaisedColor || '#6610f2',
                            [ATTENDANCE_STATUS.LEAVE]: colorValuesForAttendanceCalendar?.onLeaveColor || '#6610f2',
                            [ATTENDANCE_STATUS.CHECK_IN_MISSING]: missingColor?.missingCheckoutColor || '#6610f2',
                            [ANNUAL_LEAVE]: colorValuesForAttendanceCalendar.onLeaveColor || "#17a2b8", // Default Cyan
                            [CASUAL_LEAVE]: colorValuesForAttendanceCalendar.onLeaveColor || "#17a2b8", // Default Cyan
                            [FLOATER_LEAVE]: colorValuesForAttendanceCalendar.onLeaveColor || "#17a2b8", // Default Cyan
                            [SICK_LEAVE]: colorValuesForAttendanceCalendar.onLeaveColor || "#17a2b8", // Default Cyan
                            [UNPAID_LEAVE]: colorValuesForAttendanceCalendar.onLeaveColor || "#17a2b8", // Default Cyan
                            [MATERNAL_LEAVE]: colorValuesForAttendanceCalendar.onLeaveColor || "#17a2b8", // Default Cyan
                            [ATTENDANCE_STATUS.ON_LEAVE]: colorValuesForAttendanceCalendar.onLeaveColor || "#dc3545",
                            [ATTENDANCE_STATUS.HOLIDAY]: colorValues?.holidayColor || "#28a745",
                        };

                        return {
                            sx: {
                                backgroundColor: `${statusColors[status] ?? "#ffffff"}25`,
                                color: "#333",
                            }
                        };
                    }
                }}
            />

            <Modal show={show} onHide={handleClose} centered>
                <Modal.Header closeButton>
                    <Modal.Title>
                        {showRequestTypeSelection ?
                            `Select Request Type for ${date}` :
                            `Raise ${requestType === 'checkin' ? 'Check-In' : 'Check-Out'} Request for ${date} (24 hr HH:MM)`
                        }
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {showRequestTypeSelection ? (
                        <div className='d-flex flex-column align-items-center'>
                            <h5 className='mb-4'>What type of request would you like to raise?</h5>
                            <div className='d-flex gap-3'>
                                <button
                                    type='button'
                                    className='btn btn-outline-primary px-4 py-2'
                                    style={{ border: "1px solid rgb(175, 16, 16)" }}
                                    onClick={() => handleRequestTypeSelection('checkin')}
                                >
                                    {/* <i className='bi bi-box-arrow-in-right me-2'></i> */}
                                    Check-In Request
                                </button>
                                <button
                                    type='button'
                                    className={`btn px-4 py-2 ${hasCheckInData ? 'btn-outline-primary' : 'btn-outline-primary disabled'}`}
                                    style={hasCheckInData ? { border: "1px solid rgb(175, 16, 16)" } : { border: "1px solid rgb(175, 16, 16)", backgroundColor: "rgb(246, 217, 217)" }}
                                    onClick={() => hasCheckInData && handleRequestTypeSelection('checkout')}
                                    disabled={!hasCheckInData}
                                >
                                    {/* <i className='bi bi-box-arrow-right me-2'></i> */}
                                    Check-Out Request
                                </button>
                            </div>
                            {!hasCheckInData && (
                                <div className='mt-3 text-center'>
                                    <small className='text-muted'>
                                        <i className='bi bi-info-circle me-1'></i>
                                        Since check-in is not present, please create a check-in request first
                                    </small>
                                </div>
                            )}
                        </div>
                    ) : (
                        <Formik initialValues={initialState} onSubmit={handleSubmit} validationSchema={faqSchema}>
                            {(formikProps) => {
                                return (
                                    <Form className='d-flex flex-column' noValidate id='employee_onboarding_form' placeholder={undefined}>
                                        {requestType === 'checkin' && (
                                            <div className="col-lg">
                                                <TimePickerInput
                                                    isRequired={true}
                                                    label="Check In"
                                                    margin="mb-7"
                                                    formikField="checkIn"
                                                    placeholder="HH MM" />
                                            </div>
                                        )}

                                        {requestType === 'checkout' && (
                                            <div className="col-lg">
                                                <TimePickerInput
                                                    isRequired={true}
                                                    label="Check Out"
                                                    margin="mb-7"
                                                    formikField="checkOut"
                                                    placeholder='HH MM' />
                                            </div>
                                        )}

                                        <div className="col-lg">
                                            <TextInput
                                                isRequired={true}
                                                label="Remarks"
                                                margin="mb-7"
                                                formikField="remarks" />
                                        </div>

                                        <div className="col-lg">
                                            <DropDownInput
                                                isRequired={true}
                                                formikField="workingMethodId"
                                                inputLabel="Working Method"
                                                options={workingMethodOptions} />
                                        </div>

                                        {disableRaiseRequest && <div className="alert mt-8" role="alert" style={{ backgroundColor: "#FCEDDF", color: '#DD700C', borderColor: '#DD700C' }}>
                                            {REQUEST_RAISE_DISABLE_MESSAGE}
                                        </div>}

                                        <div className='d-flex justify-content-between mt-8'>
                                            <button
                                                type='button'
                                                className='btn btn-primary text-white'
                                                style={{ backgroundColor: '#9D4141', borderColor: '#9D4141' }}
                                                onClick={() => {
                                                    setShowRequestTypeSelection(true);
                                                    setRequestType(null);
                                                }}
                                            >
                                                <i className='bi bi-arrow-left me-2 text-white'></i>
                                                Back to Selection
                                            </button>

                                            <div className='d-flex gap-2'>
                                                {disableRaiseRequest && <button type='button' className='btn btn-primary' style={{ backgroundColor: '#9D4141', borderColor: '#9D4141' }} disabled={requestLimitResetLoading} onClick={async () => await handleSendEmailForResetAttendanceRequestLimit(employeeId, setRequestLimitResetLoading, reportsToId || undefined)}>{requestLimitResetLoading ? "Please Wait..." : "Request To Reset Attendance Raise Limit"}</button>}
                                                <button type='submit' className='btn btn-primary' style={{ backgroundColor: '#9D4141', borderColor: '#9D4141' }} disabled={loading || !formikProps.isValid || disableRaiseRequest}>
                                                    {!loading && 'Save Changes'}
                                                    {loading && (
                                                        <span className='indicator-progress' style={{ display: 'block' }}>
                                                            Please wait...{' '}
                                                            <span className='spinner-border spinner-border-sm align-middle ms-2'></span>
                                                        </span>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </Form>
                                )
                            }}
                        </Formik>
                    )}
                </Modal.Body>
            </Modal >
        </>
    );
}

const ReportsTable = ({ attendanceRequests, fromAdmin = false, resource = "", viewOwn = false, viewOthers = false, checkOwnWithOthers = false }: { attendanceRequests: IAttendanceRequests[], fromAdmin?: boolean, resource?: string, viewOwn?: boolean, viewOthers?: boolean, checkOwnWithOthers?: boolean }) => {

    const dispatch = useDispatch();
    const [loading, setLoading] = useState(false);
    const [show, setShow] = useState(false);
    const [lateCheckInThreshold, setLateCheckInThreshold] = useState('');
    const [earlyCheckOutThreshold, setEarlyCheckOutThreshold] = useState('');
    const [employeeThresholds, setEmployeeThresholds] = useState<any>([]);
    const [disableRaiseRequest, setDisableRaiseRequest] = useState(false);
    const maxAttendanceRequestLimit = useSelector((state: RootState) => state.employee.currentEmployee.attendanceRequestRaiseLimit);

    const toggleChange = store.getState().attendanceStats.toggleChange;

    const employeeId = useSelector((state: RootState) => state.employee.currentEmployee.id);
    const { longitude, latitude } = useSelector((state: RootState) => state.attendance.position);

    const [workingMethodOptions, setWorkingMethodOptions] = useState([]);
    const [currentRowData, setCurrentRowData] = useState<any>(null);
    const [requestLimitResetLoading, setRequestLimitResetLoading] = useState(false)

    useEffect(() => {
        async function getWorkingMethods() {
            const { data: { workingMethods } } = await fetchWorkingMethods();
            const workingMethodOptions = workingMethods.map((workingMethod: any) => ({ value: workingMethod.id, label: workingMethod.type }));
            setWorkingMethodOptions(workingMethodOptions);
        }
        getWorkingMethods();
    }, []);
    const worktypeColorValues = useSelector((state: RootState) => state?.customColors?.workingLocation);
    const deleteRequest = async (values: any) => {

        try {
            const confirm = await deleteConfirmation('Attendance Request deleted successfully');
            if (!confirm) return;
            await deleteAttendanceRequestById(values.id);
            // successConfirmation('Attendance Request deleted successfully');
            dispatch(saveToggleChange(!toggleChange));
            return;
        } catch (e) {
            errorConfirmation('Error Occured');
            dispatch(saveToggleChange(!toggleChange));
            // console.log(e);
        }
    }

    const [date, setDate] = useState('');
    const employeeDeatils = fromAdmin ? useSelector((state: RootState) => state.employee.selectedEmployee) : useSelector((state: RootState) => state.employee.currentEmployee);

    const reportsToId = employeeDeatils.reportsToId;

    useEffect(() => {
        if (!date || !employeeId || !maxAttendanceRequestLimit) return;
        const fetchEmployeeRequestRaise = async () => {
            const startDate = dayjs(date).startOf('month').format('YYYY-MM-DD');
            const endDate = dayjs(date).endOf('month').format('YYYY-MM-DD');
            const { data: { attendanceRequests } } = await getAttendanceRequest(employeeId, startDate, endDate);
            setDisableRaiseRequest(attendanceRequests?.length >= maxAttendanceRequestLimit);
        }
        fetchEmployeeRequestRaise();
    }, [date, employeeId, maxAttendanceRequestLimit])

    useEffect(() => {
        dispatch(fetchRolesAndPermissions() as any);
    }, [toggleChange]);


    // fetch grace based thresholds
    useEffect(() => {
        const initThresholds = async () => {
            const thresholds = await getGraceBasedThresholds(attendanceRequests);

            if (thresholds) {
                setEmployeeThresholds(thresholds.employeesWithThresholds);
                setLateCheckInThreshold(thresholds.defaultThresholds.lateCheckInThreshold);
                setEarlyCheckOutThreshold(thresholds.defaultThresholds.earlyCheckOutThreshold);
            }
        };

        initThresholds();
    }, []);


    const columns = [
        {
            accessorKey: "date",
            header: "Date",
            size: 120,
            minSize: 100,
            maxSize: 150,
            Cell: ({ renderedCellValue }: any) => renderedCellValue
        },
        {
            accessorKey: "day",
            header: "Day",
            size: 120,
            minSize: 100,
            maxSize: 150,
            Cell: ({ renderedCellValue }: any) => renderedCellValue
        },
        {
            accessorKey: "remarks",
            header: "Remarks ",
            size: 120,
            minSize: 100,
            maxSize: 150,
            Cell: ({ renderedCellValue }: any) => renderedCellValue
        },
        {
            accessorKey: "status",
            header: "Status ",
            size: 120,
            minSize: 100,
            maxSize: 150,
            Cell: ({ renderedCellValue }: any) => {
                switch (renderedCellValue) {
                    case LeaveStatus.ApprovalPending:
                        return LEAVE_STATUS[0]
                    case LeaveStatus.Approved:
                        return LEAVE_STATUS[1]
                    case LeaveStatus.Rejected:
                        return LEAVE_STATUS[2]
                    default:
                        return renderedCellValue;
                }
            }
        },
        {
            accessorKey: "checkIn",
            header: "Check-In",
            size: 120,
            minSize: 100,
            maxSize: 150,
            Cell: ({ row }: { row: any }) => {
                const employee = row.original
                const checkIn = employee.checkIn;
                console.log("checkIn", checkIn);

                if (!checkIn || checkIn === '-NA-' || !employeeThresholds) {
                    return <span>{checkIn || "N/A"}</span>;
                }

                try {
                    const today = dayjs().format('YYYY-MM-DD');

                    const employeeData = employeeThresholds.find(
                        (emp: any) => emp.id === employee.id
                    );

                    const lateCheckInThreshold = employeeData?.lateCheckInThreshold;
                    // console.log("lateCheckInThreshold", lateCheckInThreshold);


                    const hasSeconds = checkIn.split(':').length === 3;
                    const checkInTime = dayjs(`${today} ${checkIn}`, hasSeconds ? 'YYYY-MM-DD HH:mm:ss' : 'YYYY-MM-DD HH:mm');

                    const thresholdHasSeconds = lateCheckInThreshold.split(':').length === 3;
                    const thresholdTime = dayjs(`${today} ${lateCheckInThreshold}`, thresholdHasSeconds ? 'YYYY-MM-DD HH:mm:ss' : 'YYYY-MM-DD HH:mm');

                    const isLateCheckIn = checkInTime.isValid() && thresholdTime.isValid() && checkInTime.isAfter(thresholdTime);

                    // console.log(`Check-in: ${checkIn}, Threshold: ${lateCheckInThreshold}, IsLate: ${isLateCheckIn}`);

                    return (
                        <span style={{ color: isLateCheckIn ? 'red' : 'green' }}>
                            {checkIn}
                        </span>
                    );
                } catch (error) {
                    console.error('Error comparing times:', error);
                    return <span>{checkIn}</span>;
                }
            }
        },
        {
            accessorKey: "checkOut",
            header: "Check-Out",
            size: 120,
            minSize: 100,
            maxSize: 150,
            Cell: ({ row }: { row: any }) => {
                const checkOut = row.original.checkOut;
                console.log("checkOut", checkOut);

                if (!checkOut || checkOut === '-NA-' || !earlyCheckOutThreshold) {
                    return <span>{checkOut || "N/A"}</span>;
                }

                try {
                    const today = dayjs().format('YYYY-MM-DD');

                    const checkOutHasSeconds = checkOut.split(':').length === 3;
                    const thresholdHasSeconds = earlyCheckOutThreshold.split(':').length === 3;

                    const checkOutTime = dayjs(`${today} ${checkOut}`, checkOutHasSeconds ? 'YYYY-MM-DD HH:mm:ss' : 'YYYY-MM-DD HH:mm');
                    const thresholdTime = dayjs(`${today} ${earlyCheckOutThreshold}`, thresholdHasSeconds ? 'YYYY-MM-DD HH:mm:ss' : 'YYYY-MM-DD HH:mm');

                    const isEarlyCheckOut = checkOutTime.isValid() && thresholdTime.isValid() && checkOutTime.isBefore(thresholdTime);

                    // console.log(`Check-out: ${checkOut}, Threshold: ${earlyCheckOutThreshold}, IsEarly: ${isEarlyCheckOut}`);

                    return (
                        <span style={{ color: isEarlyCheckOut ? 'red' : 'green' }}>
                            {checkOut}
                        </span>
                    );
                } catch (error) {
                    console.error('Error comparing check-out times:', error);
                    return <span>{checkOut}</span>;
                }
            }
        },
        {
            accessorKey: "workingMethod",
            header: "Work",
            size: 120,
            minSize: 100,
            maxSize: 150,
            Cell: ({ row }: any) => {
                const renderedCellValue = row.original.workingMethod;
                const { OFFICE, ON_SITE, REMOTE } = WORKING_METHOD_TYPE;

                const colorMap: Record<string, string> = {
                    [OFFICE]: worktypeColorValues?.officeColor || "#3498db",
                    [ON_SITE]: worktypeColorValues?.onSiteColor || "#e74c3c",
                    [REMOTE]: worktypeColorValues?.remoteColor || "#2ecc71",
                };

                const getIdentifier = (text: string, color: string) => (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span
                            style={{
                                width: "12px",
                                height: "12px",
                                borderRadius: "50%",
                                backgroundColor: colorMap[renderedCellValue] || "#000"
                            }}
                        ></span>
                        {renderedCellValue}
                    </div>
                );

                switch (renderedCellValue) {
                    case OFFICE:
                        return getIdentifier('OFFICE', 'working-method-office');
                    case ON_SITE:
                        return getIdentifier('ON-SITE', 'working-method-on-site')
                    case REMOTE:
                        return getIdentifier('REMOTE', 'working-method-remote');
                    default:
                        return renderedCellValue;
                }
            }
        },
        ...(!fromAdmin ? [{
            accessorKey: "actions",
            header: "Actions",
            size: 120,
            minSize: 100,
            maxSize: 150,
            Cell: ({ row }: any) => {
                const deleteRes = hasPermission(resourceNameMapWithCamelCase.attendanceRequest, permissionConstToUseWithHasPermission.deleteOwn, row?.original);
                const isApproved = row.original.status === Status.Approved || row.original.statusNumber === Status.Approved;
                const editRes = hasPermission(resourceNameMapWithCamelCase.attendanceRequest, permissionConstToUseWithHasPermission.editOwn, row?.original);
                return (
                    <>
                        {editRes && !isApproved && <button
                            className='btn btn-icon btn-bg-light btn-active-color-primary btn-sm'
                            onClick={() => raiseRequest(row?.original)}
                        >
                            <KTIcon iconName='pencil' className='fs-3' />
                        </button>}
                        {deleteRes && !isApproved && <button
                            className='ms-2 btn btn-icon btn-bg-light btn-active-color-primary btn-sm'
                            onClick={() => deleteRequest(row?.original)}
                        >
                            <KTIcon iconName='trash' className='fs-3' />
                        </button>}
                        {((!editRes && !deleteRes) || isApproved) && "Not Allowed"}
                    </>
                );
            },
        }] : []),
    ];

    const handleClose = () => {
        setShow(false);
        setCurrentRowData(null);
    }

    const raiseRequest = async (attendance: any) => {
        setShow(true);
        setDate(attendance.date);
        // console.log("attendanceattendance", attendance);
        setCurrentRowData(attendance);
        if (attendance?.attendanceRequests) {
            initialState = {
                employeeId: attendance?.attendanceRequests.employeeId,
                checkIn: attendance?.attendanceRequests?.checkIn,
                checkOut: attendance?.attendanceRequests?.checkOut,
                workingMethodId: attendance?.attendanceRequests.workingMethodId,
                remarks: attendance?.attendanceRequests.remarks,
            };
        } else if (attendance?.id) {
            initialState = {
                employeeId: employeeId,
                checkIn: attendance?.checkIn,
                checkOut: attendance?.checkOut,
                workingMethodId: attendance?.workingMethodId,
                remarks: attendance?.remarks
            };
        } else {
            initialState = {
                employeeId: employeeId,
                checkIn: '',
                checkOut: '',
                workingMethodId: '',
                remarks: ''
            };
        }
    }


    const handleSubmit = async (values: any, actions: FormikValues) => {
        const currentId = currentRowData?.id;
        const locationEntry = Array.isArray(location) && location.find(item => item.id === currentId);
        const latitude = locationEntry?.latitude;
        const longitude = locationEntry?.longitude;


        const { data: { companyOverview } } = await fetchCompanyOverview();
        const companyId = companyOverview[0].id;
        console.log("latitude:: ", latitude);
        console.log("longitude:: ", longitude);

        const updatedValues = {
            ...values,
            latitude: latitude,
            longitude: longitude,
            // status: 0,
            // companyId
        }

        console.log("updatedValues:: ", updatedValues);


        const formattedDate = dayjs(date, "DD MMM YYYY").format("YYYY-MM-DD");

        if (values.checkIn !== "") {
            if (!isValidTime(values.checkIn)) {
                errorConfirmation('Enter Check In in HH:MM(24 hr format)');
                return;
            }
            const checkInDateTime = dayjs(`${formattedDate} ${updatedValues.checkIn}`, "YYYY-MM-DD HH:mm").toString();
            const checkInDateObject = new Date(checkInDateTime);
            const checkInUTC = checkInDateObject.toISOString();
            updatedValues.checkIn = checkInUTC;
        }

        if (values.checkOut !== '-NA-') {
            if (!isValidTime(values.checkOut)) {
                errorConfirmation('Enter Check Out in HH:MM(24 hr format)');
                return;
            }
            const checkOutDateTime = dayjs(`${formattedDate} ${updatedValues.checkOut}`, "YYYY-MM-DD HH:mm").toString();
            const checkOutDateObject = new Date(checkOutDateTime);
            const checkOutUTC = checkOutDateObject.toISOString();
            updatedValues.checkOut = checkOutUTC;
        } else {
            delete updatedValues.checkOut;
        }

        try {
            setLoading(true);
            await createUpdateAttendanceRequest(updatedValues);
            setLoading(false);
            successConfirmation('Attendance Request created successfully');
            setShow(false);
            setCurrentRowData(null);
            dispatch(saveToggleChange(!toggleChange));
            return;
        } catch (err) {
            setLoading(false);
            errorConfirmation('Attendance Request failed successfully. Try again later.');
            dispatch(saveToggleChange(!toggleChange));
        }
    }

    return (
        <>

            <MaterialTable resource={resource} viewOwn={viewOwn} viewOthers={viewOthers} columns={columns} data={attendanceRequests} tableName="Request" employeeId={employeeId} checkOwnWithOthers={checkOwnWithOthers} />

            <Modal show={show} onHide={handleClose} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Raise Request for {date} (24 hr HH:MM)</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Formik initialValues={initialState} onSubmit={handleSubmit} validationSchema={faqSchema}>
                        {(formikProps) => {
                            return (
                                <Form className='d-flex flex-column' noValidate id='employee_onboarding_form' placeholder={undefined}>
                                    <div className="col-lg">
                                        <TimePickerInput
                                            isRequired={true}
                                            label="Check In"
                                            margin="mb-7"
                                            formikField="checkIn"
                                            placeholder="HH MM" />
                                    </div>

                                    <div className="col-lg">
                                        <TimePickerInput
                                            isRequired={false}
                                            label="Check Out"
                                            margin="mb-7"
                                            formikField="checkOut"
                                            placeholder="HH MM" />
                                    </div>

                                    <div className="col-lg">
                                        <TextInput
                                            isRequired={true}
                                            label="Remarks"
                                            margin="mb-7"
                                            formikField="remarks" />
                                    </div>

                                    <div className="col-lg">
                                        <DropDownInput
                                            isRequired={true}
                                            formikField="workingMethodId"
                                            inputLabel="Working Method"
                                            options={workingMethodOptions} />
                                    </div>
                                    {disableRaiseRequest && <div className="alert mt-8" role="alert" style={{ backgroundColor: "#FCEDDF", color: '#DD700C', borderColor: '#DD700C' }}>
                                        {REQUEST_RAISE_DISABLE_MESSAGE}
                                    </div>}
                                    <div className='d-flex justify-content-center mt-8'>
                                        {disableRaiseRequest && <button type='button' className='btn btn-primary' style={{ backgroundColor: '#9D4141', borderColor: '#9D4141' }} disabled={requestLimitResetLoading} onClick={async () => await handleSendEmailForResetAttendanceRequestLimit(employeeId, setRequestLimitResetLoading, reportsToId || undefined)}>{requestLimitResetLoading ? "Please Wait..." : "Request To Reset Attendance Raise Limit"}</button>}
                                        <button type='submit' className='btn btn-primary' style={{ backgroundColor: '#9D4141', borderColor: '#9D4141' }} disabled={loading || !formikProps.isValid}>
                                            {!loading && 'Save Changes'}
                                            {loading && (
                                                <span className='indicator-progress' style={{ display: 'block' }}>
                                                    Please wait...{' '}
                                                    <span className='spinner-border spinner-border-sm align-middle ms-2'></span>
                                                </span>
                                            )}
                                        </button>
                                    </div>
                                </Form>
                            )
                        }}
                    </Formik>
                </Modal.Body>
            </Modal >
        </>
    );
}