import { FC, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import AllEmployeesSearchDropdown from "@app/modules/common/components/AllEmployeesSearchDropdown";
import EmployeeDetailsCard from "@pages/employee/salary/personal/views/my-salary/EmployeeDetailsCard";
import { RootState } from "@redux/store";
import PersonalLoan from "../../personal/views/PersonalLoan";
import { resourceNameMapWithCamelCase } from "@constants/statistics";

interface SearchEmployeeProps {
  fromAdmin?: boolean;
}

const SearchEmployee: FC<SearchEmployeeProps> = ({ fromAdmin = true }) => {
  const stats = useSelector((state: RootState) => state.attendanceStats.monthly);
  const employeeId = useSelector((state: RootState)=> state.employee.selectedEmployee.id);
  const [id, setId] = useState("")
  useEffect(() => {
    setId(employeeId)
  }, [employeeId])
  return (
    <div>
      <AllEmployeesSearchDropdown />
      <div className="mt-8" />
      {/* <EmployeeDetailsCard fromAdmin={fromAdmin} stats={stats} /> */}
      <PersonalLoan resource={resourceNameMapWithCamelCase.loan} viewOthers={true} viewOwn={true} isSelecteEmployee = {true}/>
    </div>
  );
};

export default SearchEmployee;

