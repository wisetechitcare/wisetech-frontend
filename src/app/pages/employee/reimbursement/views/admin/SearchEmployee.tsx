import { useSelector } from "react-redux";
import { RootState } from "@redux/store";
import { EmployeeDetailsSection } from "../../PendingReimbursementsPage";
import AllEmployeesSearchDropdown from "@app/modules/common/components/AllEmployeesSearchDropdown";
import ReimbursementWorkspace, { kpiProps } from "../ReimbursementWorkspace";

/**
 * Admin view of one employee's reimbursements. Identical to the employee's own screen below the
 * header — same period, charts and tables — because both render ReimbursementWorkspace.
 */
function SearchEmployee() {
  const selectedEmployee = useSelector((state: RootState) => state.employee.selectedEmployee);
  const selectedEmployeeId = selectedEmployee?.id;

  const employeeCode = (selectedEmployee as any)?.employeeCode || '';
  const employeeName = (selectedEmployee as any)?.users
    ? `${(selectedEmployee as any).users.firstName ?? ''} ${(selectedEmployee as any).users.lastName ?? ''}`.trim()
    : '';

  return (
    <ReimbursementWorkspace
      employeeId={selectedEmployeeId}
      employeeCode={employeeCode}
      employeeName={employeeName}
      viewOthers={true}
      checkOwnWithOthers={true}
      renderHeader={({ summary, loading, periodBar }) => (
        <>
          <div className="mb-6">
            <AllEmployeesSearchDropdown />
          </div>
          <EmployeeDetailsSection
            {...kpiProps(summary)}
            overviewLoading={loading}
            employee={selectedEmployee?.id ? selectedEmployee : null}
          />
          {selectedEmployeeId && periodBar}
        </>
      )}
    />
  );
}

export default SearchEmployee;
