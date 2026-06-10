import React, { useCallback, useEffect, useState } from "react";
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
import ReimbursementOverview from "../common/ReimbursementOverview";
import AllEmployeesSearchDropdown from "@app/modules/common/components/AllEmployeesSearchDropdown";
import { resourceNameMapWithCamelCase } from "@constants/statistics";

function SearchEmployee() {
  const [totalRequestedAmount, setTotalRequestedAmount] = useState(0);
  const [totalRequests, setTotalRequests] = useState(0);
  const [approvedRequests, setApprovedRequests] = useState(0);
  const [rejectedRequests, setRejectedRequests] = useState(0);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [approvedAmount, setApprovedAmount] = useState(0);
  const [pendingAmount, setPendingAmount] = useState(0);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [showEditDeleteOption] = useState(false);
  const [currentPeriod, setCurrentPeriod] = useState<{ alignment: PeriodAlignment; date: Dayjs }>({
    alignment: 'monthly',
    date: dayjs(),
  });

  const selectedEmployeeId = useSelector(
    (state: RootState) => state.employee.selectedEmployee?.id
  );

  const toggleItemsActions: ToggleItemsCallBackFunctions = {
    monthly: function (): void { /* handled by onPeriodChange */ },
    yearly: function (): void { /* handled by onPeriodChange */ },
    allTime: function (): void { /* handled by onPeriodChange */ },
  };

  // ── Stats calculator ───────────────────────────────────────────────────────
  const applyStats = (data: IReimbursementsFetch[]) => {
    let totalAmount = 0, totalRequest = 0, approvedCount = 0, rejectedCount = 0, pendingCount = 0;
    let approvedAmt = 0, pendingAmt = 0;
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
        } else {
          approvedCount++;
          approvedAmt += amt;
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
    setOverviewLoading(false);
  };

  // ── Re-fetch stats when period or selected employee changes ───────────────
  useEffect(() => {
    setOverviewLoading(true);
    const { alignment, date } = currentPeriod;
    const fetchPromise =
      alignment === 'monthly' ? fetchEmpMonthlyReimbursements(date, selectedEmployeeId) :
      alignment === 'yearly'  ? fetchEmpYearlyReimbursements(date, selectedEmployeeId)  :
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
      <ReimbursementOverview
        totalRequestedAmount={totalRequestedAmount}
        totalRequests={totalRequests}
        approvedRequests={approvedRequests}
        rejectedRequests={rejectedRequests}
        pendingRequests={pendingRequests}
        approvedAmount={approvedAmount}
        pendingAmount={pendingAmount}
        isLoading={overviewLoading}
      />

      <div className="my-6">
        <h2>Reimbursement Records</h2>
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
      />
    </>
  );
}

export default SearchEmployee;
