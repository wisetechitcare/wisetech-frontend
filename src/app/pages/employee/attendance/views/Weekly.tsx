// import Identifiers from "@app/modules/common/utils/Identifiers";
// import { KTIcon } from "@metronic/helpers";
// import { IWeeklyAttendance } from "@models/employee";
// import { useMemo, useState } from "react";
// import { employeeWeeklyAttendanceData } from "../data";
// import { MRT_ColumnDef } from "material-react-table";
// import MaterialTable from "@app/modules/common/components/MaterialTable";

// interface WeekDays {
//     key: string;
//     label: string;
// }

// const weekDays: WeekDays[] = [
//     {
//         key: 'mon',
//         label: 'Mon'
//     },
//     {
//         key: 'tue',
//         label: 'Tue'
//     },
//     {
//         key: 'wed',
//         label: 'Wed'
//     },
//     {
//         key: 'thu',
//         label: 'Thu'
//     },
//     {
//         key: 'fri',
//         label: 'Fri'
//     },
//     {
//         key: 'sat',
//         label: 'Sat'
//     },
//     {
//         key: 'sun',
//         label: 'Sun'
//     }
// ]

// function constructColumns() {
//     const firstSection = [
//         {
//             accessorKey: "id",
//             header: "ID",
//             Cell: ({ renderedCellValue }: any) => renderedCellValue
//         },
//         {
//             accessorKey: "name",
//             header: "Name",
//             Cell: ({ renderedCellValue }: any) => renderedCellValue
//         }
//     ];

//     const weekdays = weekDays.map((day: WeekDays) => {
//         return {
//             accessorKey: day.key,
//             header: day.label,
//             Cell: ({ renderedCellValue }: any) => {
//                 switch (renderedCellValue) {
//                     case 'Present':
//                         return <Identifiers cssClass="present" />
//                     case 'Absent':
//                         return <Identifiers cssClass="absent" />
//                     case 'Check in missing':
//                         return <Identifiers cssClass="check-in-out" />
//                     case 'Check out missing':
//                         return <Identifiers cssClass="check-in-out" />
//                     case 'Weekend':
//                         return <Identifiers cssClass="weekend" />
//                     default:
//                         return 'Weekend';
//                 }
//             }
//         }
//     });

//     const lastSection = [
//         {
//             accessorKey: "total",
//             header: "Total",
//             Cell: ({ renderedCellValue }: any) => renderedCellValue
//         },
//         {
//             accessorKey: "present",
//             header: "Present",
//             Cell: ({ renderedCellValue }: any) => renderedCellValue
//         },
//         {
//             accessorKey: "late",
//             header: "Late",
//             Cell: ({ renderedCellValue }: any) => renderedCellValue
//         },
//         {
//             accessorKey: "extra",
//             header: "Extra",
//             Cell: ({ renderedCellValue }: any) => renderedCellValue
//         },
//         {
//             accessorKey: "actions",
//             header: "Actions",
//             Cell: ({ row }: any) =>
//                 <div>
//                     <button
//                         className='btn btn-icon btn-bg-light btn-active-color-primary btn-sm'
//                         onClick={() => console.log(row.original.id)}
//                     >
//                         <KTIcon iconName='pencil' className='fs-3' />
//                     </button>
//                 </div>
//         }
//     ];

//     return [...firstSection, ...weekdays, ...lastSection];
// }

// function Weekly() {
//     const [tableData, setTableData] = useState<IWeeklyAttendance[]>(employeeWeeklyAttendanceData);
//     const columns = useMemo<MRT_ColumnDef<IWeeklyAttendance>[]>(constructColumns, []);

//     return (
//         <>
//             <MaterialTable
//                 columns={columns}
//                 data={tableData}
//                 tableName="Weekly Attendance"/>
//         </>
//     );
// }

// export default Weekly;