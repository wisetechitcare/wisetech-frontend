import { useState, useEffect, useCallback } from "react";
import dayjs from 'dayjs';
import isLeapYear from 'dayjs/plugin/isLeapYear';
import { useSelector } from "react-redux";
import { RootState } from "@redux/store";
import { fetchBranchById } from "@services/company";
import { IBranchWorkingAndOffDays } from "@models/company";
import MeetingList from "./MeetingList";
import { fetchAllColors } from "@services/options";

import { hasPermission } from "@utils/authAbac";
import { permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase } from "@constants/statistics";
dayjs.extend(isLeapYear);

interface PublicHoliday {
  title: string;
  date: string;
  color: string;
  fixed: boolean;
}

interface EmployeeUser {
  firstName: string;
  lastName: string;
}

interface Employee {
  id: string;
  users: EmployeeUser;
}

function PublicHolidaysListNew({selectedStartDate, selectedEndDate, holidaysToShow, selectedView, selectedYear}:{ selectedStartDate?: string, selectedEndDate?: string, holidaysToShow: any, selectedView: string, selectedYear: string }) {
    const currentEmployee = useSelector((state: RootState) => state.employee.currentEmployee);

    const branchId = currentEmployee?.branchId;    
    
    const [holidays, setHolidays] = useState<PublicHoliday[]>(holidaysToShow || []);
    const [loading, setLoading] = useState(false);
    const [daysInYear, setDaysInYear] = useState(0);
    const [totalWorkingDays, setTotalWorkingDays] = useState(0);
    const [weeklyWorkingAndOffDays, setWeeklyWorkingAndOffDays] = useState<IBranchWorkingAndOffDays>();
    const [publicHolidays, setPublicHolidays] = useState(0);
    const [totalSaturdays, setTotalSaturdays] = useState(0);
    const [totalSundays, setTotalSundays] = useState(0);
    const [totalHolidays, setTotalHolidays] = useState(0);
    const [weekendColors, setWeekendColors] = useState();

    function countSaturdaysAndSundays(year:any) {
        let saturdayCount = 0, sundayCount = 0;
        let date = dayjs(`${year}-01-01`);
        while (date.year() === year) {
            if (date.day() === 6) { 
                saturdayCount++;
            }else if (date.day() === 0) { 
                sundayCount++;
            }
            date = date.add(1, 'day');
        }

        return {saturdayCount, sundayCount};
    }
    useEffect(() => {
    if (!branchId) return;
    
    async function fetchWorkingAndOffDaysForBranch() {
        try {
            const [branchRes, colorsRes] = await Promise.all([
                fetchBranchById(branchId),
                fetchAllColors()
            ]);
            const colors = colorsRes?.data?.colors;
            if (colors?.length) {
                try {
                    const attendanceCalendar = JSON.parse(colors[0].attendanceCalendar || '{}');
                    setWeekendColors(attendanceCalendar.weekendColor)
                } catch (e) {
                    console.error("Error parsing attendanceCalendar colors:", e);
                }
            }
            const workingAndOffDays = JSON.parse(branchRes?.data?.branch?.workingAndOffDays || '{}');
            setWeeklyWorkingAndOffDays(workingAndOffDays);
        } catch (error) {
            console.error("Error fetching data:", error);
        }
    }
    
    fetchWorkingAndOffDaysForBranch();
}, [branchId]);

    useEffect(() => {

        if(selectedStartDate && selectedEndDate){
            let newWeekendHolidays=[];
            let startDate = selectedStartDate;
            let endDate = selectedEndDate;
            if(selectedView === 'dayGridMonth'){
                let middle='';
                for(let i = new Date(startDate); i <= new Date(endDate); i.setDate(i.getDate() + 1)){
                    const day = i.getDate();
                    if(day === 15){
                        middle = i.toDateString();
                        break;
                    }
                }
                startDate = dayjs(middle).startOf('month').format('YYYY-MM-DD')+'T00:00:00+05:30';
                endDate = dayjs(middle).endOf('month').format('YYYY-MM-DD')+'T00:00:00+05:30';
            }

            if(!weeklyWorkingAndOffDays || Object.keys(weeklyWorkingAndOffDays).length==0) return;
            
            // if(selectedView != 'multiMonthYear'){
            //     let workingAndOffDaysMapWithDay = new Map();
            //     workingAndOffDaysMapWithDay.set(0, 'sunday');
            //     workingAndOffDaysMapWithDay.set(1, 'monday');
            //     workingAndOffDaysMapWithDay.set(2, 'tuesday');
            //     workingAndOffDaysMapWithDay.set(3, 'wednesday');
            //     workingAndOffDaysMapWithDay.set(4, 'thursday');
            //     workingAndOffDaysMapWithDay.set(5, 'friday');
            //     workingAndOffDaysMapWithDay.set(6, 'saturday');

            //     for(let i = new Date(startDate); i <= new Date(endDate); i.setDate(i.getDate() + 1)){
            //     const day = i.getDate();
            //     const dayOfWeek = i.getDay();
            //     const dayName = workingAndOffDaysMapWithDay.get(dayOfWeek) as keyof IBranchWorkingAndOffDays;
            //         if (dayName && weeklyWorkingAndOffDays[dayName] === "0") {
            //             newWeekendHolidays.push({
            //                 title: `${dayName.charAt(0).toUpperCase() + dayName.slice(1)}`,
            //                 date: i.toDateString(),
            //                 color: '#FFD54F',
            //                 fixed: true
            //             });
            //         }
            //     }
            // }
            
            const finalHolidaysToShow = holidaysToShow.filter((holiday: any) => {
                const isWeekend = holiday?.title?.toLowerCase() === 'saturday' || holiday?.title?.toLowerCase() === 'sunday';
                if (isWeekend) {
                    return false;
                }
              const holidayDate = new Date(holiday.date);
              const holidayYear = holidayDate.getFullYear().toString();
              const isCurrentYear = holidayYear === selectedYear;
              const isHoliday = holiday.extendedProps?.holidayType === 'Public Holiday' ||
                holiday.type === 'Public Holiday' ||
                !holiday.extendedProps;
              return isHoliday && isCurrentYear;
            });            
            setHolidays(finalHolidaysToShow);
            setPublicHolidays(finalHolidaysToShow.length);
        }

    }, [selectedStartDate, selectedEndDate, holidaysToShow, selectedView, weeklyWorkingAndOffDays]);

    useEffect(()=>{
        if(selectedYear){
            const year = Number(selectedYear);
            const date = dayjs(`${year}-01-01`);
            setDaysInYear(date.isLeapYear() ? 366 : 365);
            let {saturdayCount, sundayCount} = countSaturdaysAndSundays(year);
            if(weeklyWorkingAndOffDays?.saturday!='0'){
              let saturdaysFromHolidays = holidaysToShow?.filter((ele:any)=>ele?.title?.toLocaleLowerCase()=="saturday")
              saturdayCount = saturdaysFromHolidays?.length
            }

            setTotalSaturdays(saturdayCount);

            if(weeklyWorkingAndOffDays?.sunday!='0'){
              let sundaysFromHolidays = holidaysToShow?.filter((ele:any)=>ele?.title?.toLocaleLowerCase()=="sunday")
              sundayCount = sundaysFromHolidays?.length
            }
           
            setTotalSundays(sundayCount);

            setTotalHolidays(publicHolidays + sundayCount + saturdayCount);
            setTotalWorkingDays(daysInYear - (publicHolidays + sundayCount + saturdayCount));
        }
    },[selectedYear, holidaysToShow, publicHolidays, weeklyWorkingAndOffDays]);

  return (
    <>
      {/* Meeting component */}
      {hasPermission(resourceNameMapWithCamelCase.meeting, permissionConstToUseWithHasPermission.readOthers)} {<div className="mb-4">
        <MeetingList></MeetingList>
      </div>}
      <div className="row">
        {/* Yearly Stats Card */}
        <div className="col-12 col-md-6 mt-3 mb-3">
          <div className="card shadow-sm p-5 h-100">
            <div className="d-flex align-items-center mb-3">
              <div
                className="rounded-circle bg-success me-2"
                style={{ width: "12px", height: "12px" }}
              ></div>
              <h3 className="m-0">Yearly Stats: {selectedYear}</h3>
            </div>
            <div className="table-responsive">
              <table className="table mt-4">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th className="text-end">Count</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Public Holidays</td>
                    <td className="text-end">
                      <span className="text-white bg-danger px-2 py-1 rounded d-inline-block">
                        {publicHolidays}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td>Saturdays</td>
                    <td className="text-end">
                      <span
                        className="text-dark px-2 py-1 rounded d-inline-block"
                        style={{ backgroundColor: "#FFD54F" }}
                      >
                        {totalSaturdays}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td>Sundays</td>
                    <td className="text-end">
                      <span
                        className="px-2 py-1 rounded d-inline-block"
                        style={{ backgroundColor: "#E0E0E0", color: "#F44236" }}
                      >
                        {totalSundays}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td>Total Holiday</td>
                    <td className="text-end">
                      <span
                        className="text-white px-2 py-1 rounded d-inline-block"
                        style={{ backgroundColor: "#5188C8" }}
                      >
                        {totalHolidays}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td>Total Working Days</td>
                    <td className="text-end">
                      <span
                        className="text-white px-2 py-1 rounded d-inline-block"
                        style={{ backgroundColor: "#5188C8" }}
                      >
                        {totalWorkingDays}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td>Days In Year</td>
                    <td className="text-end">
                      <span
                        className="text-white px-2 py-1 rounded d-inline-block"
                        style={{ backgroundColor: "#5188C8" }}
                      >
                        {daysInYear}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

       {/* Holiday List Card */}
  <div className="col-12 col-md-6 mt-3 mb-3">
  <div className="card shadow-sm p-5 h-100" style={{ height: "400px", overflow: "hidden" }}>
    {/* Card Header */}
    <div
      className="d-flex align-items-center mb-3">
      <div
        className="rounded-circle me-2"
        style={{
          width: "12px",
          height: "12px",
          backgroundColor: "#AA393D",
        }}
      ></div>
      <h3 className="m-0">Holidays List</h3>
    </div>

    {/* Scrollable Table Container */}
    <div
      className="table-responsive"
      style={{
        maxHeight: "300px",
        overflowY: "auto",
        scrollbarWidth: "thin",
      }}
    >
      <table className="table mt-4">
        <thead>
          <tr>
            <th>Date</th>
            <th className="text-center">Day</th>
            <th className="text-end">Type</th>
          </tr>
        </thead>
        <tbody>
          {hasPermission(resourceNameMapWithCamelCase.holiday, permissionConstToUseWithHasPermission.readOthers) && holidays.length > 0 ? (
            holidays.map((holiday, index) => (
              <tr key={index}>
                <td>{dayjs(holiday.date).format("DD MMM, YYYY")}</td>
                <td className="text-center">{dayjs(holiday.date).format("ddd")}</td>
                <td className="text-end">
                  <span
                    className="badge text-white rounded"
                    style={{
                      backgroundColor: weekendColors || "#AA393D",
                      display: "inline-block",
                    }}
                  >
                    {holiday.title}
                  </span>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={3} className="text-center">
                No holidays found for the selected date range
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
</div>
      </div>
    </>
  );
}

export default PublicHolidaysListNew;
