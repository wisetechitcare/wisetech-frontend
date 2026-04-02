import { FC, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import AllEmployeesSearchDropdown from "@app/modules/common/components/AllEmployeesSearchDropdown";
import { RootState } from "@redux/store";
import MyKpi from "./MyKpiView";

interface SearchEmployeeProps {
  fromAdmin?: boolean;
}

const SearchEmployee: FC<SearchEmployeeProps> = ({ fromAdmin = true }) => {
 
  const employeeId = useSelector(
    (state: RootState) => state.employee.selectedEmployee.id
  );
  const [id, setId] = useState("");
  useEffect(() => {
    setId(employeeId);
  }, [employeeId]);
  return (
    <div>
      <AllEmployeesSearchDropdown />
      <div className="mt-8" />
      <MyKpi fromAdmin={true}/>
    </div>
  );
};

export default SearchEmployee;
