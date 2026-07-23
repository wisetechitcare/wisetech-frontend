import { RootState } from "@redux/store";
import { useSelector } from "react-redux";
import { fetchAddressDetails } from "@services/location";
import { fetchEmpAttendanceStatistics } from "@services/employee";
import { useEffect, useState } from "react";
import { useAttendanceRealtime } from "@hooks/useAttendanceRealtime";
import dayjs from "dayjs";
import { KTIcon } from "@metronic/helpers";


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

  // Realtime: refresh this user's today attendance when it changes (e.g. their biometric punch).
  useAttendanceRealtime(() => fetchAttendanceData());


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
  
  const formattedAddress = (address: string) => {
    return address.length > 20 ? `${address.substring(0, 20)}...` : address;
  };
  

  return (
    <div className="attendance-overview-container mt-2">
      {/* Dynamic Status Badge */}
      <div className="mb-4">
        {data.checkOutTime && data.checkOutTime !== "-NA-" && data.checkOutTime !== '' ? (
          <div className="d-flex align-items-center gap-2 px-3 py-2 rounded-3" style={{ backgroundColor: '#EBF9F1', width: 'fit-content' }}>
            <span className="bullet bullet-dot bg-success h-8px w-8px"></span>
            <span className="text-success fs-7 fw-semibold">Session Completed</span>
          </div>
        ) : (
          data.checkInTime && data.checkInTime !== "-NA-" && (
            <div className="d-flex align-items-center gap-2 px-3 py-2 rounded-3" style={{ backgroundColor: '#EBF5FF', width: 'fit-content' }}>
              <span className="bullet bullet-dot bg-primary h-8px w-8px animate-blink"></span>
              <span className="text-primary fs-7 fw-semibold">
                {checkInTimeParsed && dayjs().isBefore(checkInTimeParsed.add(30, "second"))
                  ? "Checked In"
                  : "You are working now.."}
              </span>
            </div>
          )
        )}
      </div>

      {/* Grid of times */}
      <div className="row g-3 mb-3">
        {/* Check-In Card */}
        <div className={dashboard ? "col-sm-6" : "col-6"}>
          <div className="p-3 rounded-3 bg-light d-flex align-items-center gap-3 border border-gray-100 h-100">
            <div 
              className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
              style={{
                width: '36px',
                height: '36px',
                backgroundColor: data.checkInTime && data.checkInTime !== "-NA-" ? '#EBF9F1' : '#F5F8FA',
                color: data.checkInTime && data.checkInTime !== "-NA-" ? '#50CD89' : '#A1A5B7'
              }}
            >
              <KTIcon iconName="time" className="fs-3" />
            </div>
            <div className="overflow-hidden">
              <span className="text-muted d-block fs-8 fw-bold text-uppercase" style={{ letterSpacing: '0.5px' }}>Check In</span>
              <span className="fw-bolder fs-7 text-gray-800 text-truncate">
                {data.checkInTime && data.checkInTime !== "-NA-" ? dayjs(data.checkInTime).format("hh:mm:ss A") : "—"}
              </span>
            </div>
          </div>
        </div>

        {/* Check-Out Card */}
        <div className={dashboard ? "col-sm-6" : "col-6"}>
          <div className="p-3 rounded-3 bg-light d-flex align-items-center gap-3 border border-gray-100 h-100">
            <div 
              className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
              style={{
                width: '36px',
                height: '36px',
                backgroundColor: data.checkOutTime && data.checkOutTime !== "-NA-" && data.checkOutTime !== '' ? '#FFF5F8' : '#F5F8FA',
                color: data.checkOutTime && data.checkOutTime !== "-NA-" && data.checkOutTime !== '' ? '#F1416C' : '#A1A5B7'
              }}
            >
              <KTIcon iconName="time" className="fs-3" />
            </div>
            <div className="overflow-hidden">
              <span className="text-muted d-block fs-8 fw-bold text-uppercase" style={{ letterSpacing: '0.5px' }}>Check Out</span>
              <span className="fw-bolder fs-7 text-gray-800 text-truncate">
                {data.checkOutTime && data.checkOutTime !== "-NA-" && data.checkOutTime !== '' ? dayjs(data.checkOutTime).format("hh:mm:ss A") : "—"}
              </span>
            </div>
          </div>
        </div>

        {/* Working Method Card */}
        {dashboard && (
          <div className="col-sm-6">
            <div className="p-3 rounded-3 bg-light d-flex align-items-center gap-3 border border-gray-100 h-100">
              <div 
                className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                style={{
                  width: '36px',
                  height: '36px',
                  backgroundColor: data.workingMethod && data.workingMethod !== "-NA-" ? '#FFF8F2' : '#F5F8FA',
                  color: data.workingMethod && data.workingMethod !== "-NA-" ? '#FFC700' : '#A1A5B7'
                }}
              >
                <KTIcon iconName="document" className="fs-3" />
              </div>
              <div className="overflow-hidden">
                <span className="text-muted d-block fs-8 fw-bold text-uppercase" style={{ letterSpacing: '0.5px' }}>Method</span>
                <span className="fw-bolder fs-7 text-gray-800 text-truncate">
                  {data.workingMethod && data.workingMethod !== "-NA-" ? data.workingMethod : "—"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Location Card */}
        {dashboard && (
          <div className="col-sm-6">
            <div className="p-3 rounded-3 bg-light d-flex align-items-center gap-3 border border-gray-100 h-100">
              <div 
                className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                style={{
                  width: '36px',
                  height: '36px',
                  backgroundColor: data.location ? '#E8FFF3' : '#F5F8FA',
                  color: data.location ? '#50CD89' : '#A1A5B7'
                }}
              >
                <KTIcon iconName="geolocation" className="fs-3" />
              </div>
              <div className="overflow-hidden flex-grow-1">
                <span className="text-muted d-block fs-8 fw-bold text-uppercase" style={{ letterSpacing: '0.5px' }}>Location</span>
                {data.location ? (
                  <span title={data.location} className="fw-bolder fs-7 text-gray-800 text-truncate d-block cursor-pointer">
                    {formattedAddress(data.location)}
                  </span>
                ) : (
                  <span className="fw-bolder fs-7 text-gray-800">—</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        .animate-blink {
          animation: blink 1.8s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
}