import { useCallback, useEffect, useState } from "react";
import dayjs, { Dayjs } from "dayjs";
import { useSelector } from "react-redux";
import { RootState } from "@redux/store";
import { IReimbursementsFetch } from "@models/employee";
import {
  fetchEmpAlltimeReimbursements,
  fetchEmpMonthlyReimbursements,
  fetchEmpYearlyReimbursements,
} from "@utils/statistics";
import MaterialToggleReimbursement, {
  PeriodAlignment,
  ToggleItemsCallBackFunctions,
} from "../../MaterialToggleReimbursement";
import { EmployeeDetailsSection } from "../../PendingReimbursementsPage";
import AllEmployeesSearchDropdown from "@app/modules/common/components/AllEmployeesSearchDropdown";
import { resourceNameMapWithCamelCase } from "@constants/statistics";
import ReimbursementPaymentHistoryTable from "../../components/ReimbursementPaymentHistoryTable";

function SearchEmployee() {
  const [totalRequestedAmount, setTotalRequestedAmount] = useState(0);
  const [totalRequests, setTotalRequests] = useState(0);
  const [approvedRequests, setApprovedRequests] = useState(0);
  const [rejectedRequests, setRejectedRequests] = useState(0);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [approvedAmount, setApprovedAmount] = useState(0);
  const [pendingAmount, setPendingAmount] = useState(0);
  const [rejectedAmount, setRejectedAmount] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [remainingAmount, setRemainingAmount] = useState(0);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [showEditDeleteOption] = useState(true);
  const [currentPeriod, setCurrentPeriod] = useState<{ alignment: PeriodAlignment; date: Dayjs }>({
    alignment: 'monthly',
    date: dayjs(),
  });

  const selectedEmployee = useSelector(
    (state: RootState) => state.employee.selectedEmployee
  );
  const selectedEmployeeId = selectedEmployee?.id;

  const employeeCode = (selectedEmployee as any)?.employeeCode || '';
  const employeeName = (selectedEmployee as any)?.users
    ? `${(selectedEmployee as any).users.firstName ?? ''} ${(selectedEmployee as any).users.lastName ?? ''}`.trim()
    : '';

  const toggleItemsActions: ToggleItemsCallBackFunctions = {
    monthly: function (): void { /* handled by onPeriodChange */ },
    yearly: function (): void { /* handled by onPeriodChange */ },
    allTime: function (): void { /* handled by onPeriodChange */ },
  };

  const applyStats = (data: IReimbursementsFetch[]) => {
    let totalAmount = 0, totalRequest = 0, approvedCount = 0, rejectedCount = 0, pendingCount = 0;
    let approvedAmt = 0, pendingAmt = 0, rejectedAmt = 0, paidAmt = 0, remainingAmt = 0;
    data.forEach((ele) => {
      if (ele.id) {
        const amt = parseInt(ele.amount ?? "0");
        totalAmount += amt;
        totalRequest++;
        if (ele.status === "Pending") {
          pendingCount++;
          pendingAmt += amt;
        } else if (ele.status === "Rejected") {
          rejectedCount++;
          rejectedAmt += amt;
        } else {
          approvedCount++;
          approvedAmt += amt;
          if (ele.paymentStatus === 'PAID') {
            paidAmt += amt;
          } else {
            remainingAmt += amt;
          }
        }
      }
    });
    setTotalRequestedAmount(totalAmount);
    setTotalRequests(totalRequest);
    setApprovedRequests(approvedCount);
    setRejectedRequests(rejectedCount);
    setPendingRequests(pendingCount);
    setApprovedAmount(approvedAmt);
    setPendingAmount(pendingAmt);
    setRejectedAmount(rejectedAmt);
    setPaidAmount(paidAmt);
    setRemainingAmount(remainingAmt);
    setOverviewLoading(false);
  };

  useEffect(() => {
    setOverviewLoading(true);
    const { alignment, date } = currentPeriod;
    const fetchPromise =
      alignment === 'monthly' ? fetchEmpMonthlyReimbursements(date, selectedEmployeeId) :
        alignment === 'yearly' ? fetchEmpYearlyReimbursements(date, selectedEmployeeId) :
          fetchEmpAlltimeReimbursements(selectedEmployeeId);
    fetchPromise.then(applyStats);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPeriod, selectedEmployeeId]);

  const handlePeriodChange = useCallback((alignment: PeriodAlignment, date: Dayjs) => {
    setOverviewLoading(true);
    setCurrentPeriod({ alignment, date });
  }, []);

  return (
    <>
      <div className="mb-6">
        <AllEmployeesSearchDropdown />
      </div>
      <EmployeeDetailsSection
        totalRequests={totalRequests}
        totalRequestedAmount={totalRequestedAmount}
        approvedRequests={approvedRequests}
        rejectedRequests={rejectedRequests}
        pendingRequests={pendingRequests}
        approvedAmount={approvedAmount}
        pendingAmount={pendingAmount}
        rejectedAmount={rejectedAmount}
        paidAmount={paidAmount}
        remainingAmount={remainingAmount}
        overviewLoading={overviewLoading}
        employee={selectedEmployee?.id ? selectedEmployee : null}
      />

      <div className="my-6">
        <h2 className="mb-0">Reimbursement Records</h2>
      </div>

      <MaterialToggleReimbursement
        toggleItemsActions={toggleItemsActions}
        onPeriodChange={handlePeriodChange}
        showEditDeleteOption={showEditDeleteOption}
        selectedEmployeeId={selectedEmployeeId}
        resource={resourceNameMapWithCamelCase.reimbursement}
        viewOthers={true}
        viewOwn={true}
        checkOwnWithOthers={true}
        viewMode="submissions"
      />

      {selectedEmployeeId && (
        <ReimbursementPaymentHistoryTable
          employeeId={selectedEmployeeId}
          employeeCode={employeeCode}
          employeeName={employeeName}
        />
      )}
    </>
  );
}

export default SearchEmployee;
