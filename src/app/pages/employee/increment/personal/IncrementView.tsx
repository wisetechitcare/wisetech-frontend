import { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@redux/store";
import { useEffect, useState } from "react";
import EmployeeDetailsCard from "../../salary/personal/views/my-salary/EmployeeDetailsCard";
import IncrementReportToggle from "./views/my-increment/Toggle/IncrementReportToggle";

export type IncrementToggleItemsCallBackFunctions = {
  yearly: (date: Dayjs) => void;
  alltime: () => void;
};

function IncrementView({ fromAdmin = false }: { fromAdmin?: boolean }) {
  const dispatch = useDispatch();
  const stats = useSelector((state: RootState) => state.attendanceStats.monthly);
  const employee = useSelector((state: RootState) => 
    fromAdmin ? state.employee?.selectedEmployee : state.employee.currentEmployee
  );
  
  const [showSensitiveData, setShowSensitiveData] = useState(false);
  const [currentYear, setCurrentYear] = useState(dayjs());
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const toggleSensitiveData = () => {
    setShowSensitiveData(!showSensitiveData);
  };

  const toggleItemsActions: IncrementToggleItemsCallBackFunctions = {
    yearly: function (year: Dayjs): void {
      setCurrentYear(year);
      // Fetch yearly increment stats if API exists
    },
    alltime: function (): void {
      // Fetch all time increment stats if API exists
    }
  };

  const toggleChange = useSelector((state: RootState) => state.attendanceStats.toggleChange);

  useEffect(() => {
    if (employee?.id) {
      // initial fetch for current year
    }
  }, [employee?.id, toggleChange]);

  return (
    <>
      <EmployeeDetailsCard 
        fromAdmin={fromAdmin} 
        stats={stats} 
        showSensitiveData={showSensitiveData}
        onToggleSensitiveData={toggleSensitiveData}
      />
      <IncrementReportToggle 
        toggleItemsActions={toggleItemsActions} 
        fromAdmin={fromAdmin} 
        showSensitiveData={showSensitiveData}
      />
    </>
  );
}

export default IncrementView;
