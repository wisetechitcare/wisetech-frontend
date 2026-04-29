import { RootState } from "@redux/store";
import { useSelector } from "react-redux";
import { fetchAddressDetails } from "@services/location";
import { fetchEmpAttendanceStatistics } from "@services/employee";
import { useEffect, useState } from "react";
import dayjs from "dayjs";
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';

interface AttendanceData {
  checkInTime: string;
  checkOutTime: string;
  workingMethod: string;
  location: string;
}

interface AttendanceRecord {
  checkIn: string;
  checkOut: string;
  workingMethod: {
    type: string;
  };
  latitude: number;
  longitude: number;
}

export default function AttendanceOverview({ notificationToggle,dashboard=true }: { notificationToggle: boolean,dashboard?:boolean }) {

  const employeeId = useSelector((state: RootState) => state?.employee?.currentEmployee?.id);

  const [dailyAttendance, setDailyAttendance] = useState<AttendanceRecord[]>([]);
  const [dailyLatitude, setDailyLatitude] = useState<number | null>(null);
  const [dailyLongitude, setDailyLongitude] = useState<number | null>(null);

  const [data, setData] = useState<AttendanceData>({
    checkInTime: "",
    checkOutTime: "",
    workingMethod: "",
    location: "",
  });

  // Fetch attendance statistics when component mounts or employeeId changes
  const fetchAttendanceData = async () => {
    if (!employeeId) return;
    try {
      const startDate = dayjs().startOf("day").format("YYYY-MM-DD");
      const endDate = dayjs().endOf("day").format("YYYY-MM-DD");
      const { data: { empAttendanceStatistics } } = await fetchEmpAttendanceStatistics(employeeId, startDate, endDate);
     
      // debugger;
      if (empAttendanceStatistics?.length > 0) {
        setDailyAttendance(empAttendanceStatistics);
        setDailyLatitude(empAttendanceStatistics[0]?.latitude || null);
        setDailyLongitude(empAttendanceStatistics[0]?.longitude || null);
      }
    } catch (err) {
      console.error("Failed to fetch attendance statistics:", err);
    }
  };
  
  useEffect(() => {
    fetchAttendanceData();
  }, [employeeId]);
  
  useEffect(() => {
    fetchAttendanceData();
  }, [notificationToggle]);
  

  // Update attendance data when dailyAttendance changes
  useEffect(() => {
    const today = dayjs();
    const todayAttendance = dailyAttendance.filter((record) =>
      dayjs(record.checkIn).isSame(today, "day")
    );

    if (todayAttendance.length > 0) {
      const currentRecord = todayAttendance[0];
      setData({
        checkInTime: currentRecord.checkIn || "",
        checkOutTime: currentRecord.checkOut || "",
        workingMethod: currentRecord.workingMethod?.type || "",
        location: data.location, // Preserve existing location
      });
    }
  }, [dailyAttendance]);

  // Fetch location details when coordinates change
  useEffect(() => {
    async function fetchLocation() {
      if (!dailyLatitude || !dailyLongitude) return;
      
      try {
        const { data: { address } } = await fetchAddressDetails(dailyLatitude, dailyLongitude);
        setData((prev) => ({
          ...prev,
          location: address || ""
        }));
      } catch (err) {
        console.error("Failed to fetch location:", err);
      }
    }
    
    fetchLocation();
  }, [dailyLatitude, dailyLongitude]);

  

  const checkInTimeParsed = data.checkInTime ? dayjs(data.checkInTime) : null;
  const showWorkingNow = checkInTimeParsed && data.checkInTime !== "-NA-" && dayjs().isAfter(checkInTimeParsed.add(30, "second"));
  
  const formattedAddress = (address: string) => {
    return address.length > 20 ? `${address.substring(0, 20)}...` : address;
  };
  

  return (
    <div>
      {data.checkOutTime && data.checkOutTime !== "-NA-" || data.checkOutTime !== '' ? (
        <div className="text-success pb-6">You have checked out.</div>
      ) : (
        data.checkInTime && data.checkInTime !== "-NA-" && (
          <div className="text-success pb-6">
            {checkInTimeParsed && dayjs().isBefore(checkInTimeParsed.add(30, "second"))
              ? "You have checked in."
              : "You are working now.."}
          </div>
        )
      )}

      <div className="d-flex align-content-center justify-content-between mb-1">
        <div className="text-body">Check In Time</div>
        <div className="mx-2">
          {data.checkInTime && data.checkInTime !== "-NA-" ? dayjs(data.checkInTime).format("hh:mm:ss A") : "-"}
        </div>
      </div>

      <div className="d-flex align-content-center justify-content-between mb-1">
        <div className="text-body">Check Out Time</div>
        
        <div className="mx-2">
          {data.checkOutTime && data.checkOutTime !== "-NA-" ? dayjs(data.checkOutTime).format("hh:mm:ss A") : "-"}
        </div>
      </div>

      {
        dashboard ? 
      <div className="d-flex align-content-center justify-content-between mb-1">
        <div className="text-body">Working Method</div>
        <div className="mx-2">
          {data.workingMethod && data.workingMethod !== "-NA-" ? data.workingMethod : "-"}
        </div>
      </div>
      : null
      }

      {
        dashboard ?
      <div className="d-flex align-content-center justify-content-between mb-1">
        <div className="text-body">Location</div>
        <div className="mx-2 text-end">
          {data.location ? (
            <OverlayTrigger
              placement="top"
              overlay={<Tooltip id="tooltip-top">{data.location}</Tooltip>}
            >
              <div className="cursor-pointer">
                {formattedAddress(data.location)}
              </div>
            </OverlayTrigger>
          ) : (
            "-"
          )}
        </div>
      </div>
        : null 
      }
      
      
    </div>
  );
}