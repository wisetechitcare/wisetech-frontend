import { useCallback, useEffect, useState } from "react";
import { useEventBus } from "@hooks/useEventBus";
import { EVENT_KEYS } from "@constants/eventKeys";
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
import { downloadEmployeePeriodBillPdf } from "@services/employee";
import { generateFiscalYearFromGivenYear } from "@utils/file";
import { errorConfirmation } from "@utils/modal";

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
  const [statsRefreshKey, setStatsRefreshKey] = useState(0);
  const [showEditDeleteOption] = useState(true);
  const [currentPeriod, setCurrentPeriod] = useState<{ alignment: PeriodAlignment; date: Dayjs }>({
    alignment: 'monthly',
    date: dayjs(),
  });
  const [reimbursementData, setReimbursementData] = useState<IReimbursementsFetch[]>([]);
  const [downloadingBill, setDownloadingBill] = useState(false);

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
    fetchPromise.then((data) => {
      applyStats(data);
      setReimbursementData(data);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPeriod, selectedEmployeeId, statsRefreshKey]);

  // Refresh stats when any reimbursement changes on any connected client (WebSocket)
  useEventBus(EVENT_KEYS.reimbursementChanged, () => { setStatsRefreshKey((k) => k + 1); });

  const handlePeriodChange = useCallback((alignment: PeriodAlignment, date: Dayjs) => {
    setOverviewLoading(true);
    setCurrentPeriod({ alignment, date });
  }, []);

  const handleDownloadBill = async () => {
    if (!selectedEmployeeId) {
      errorConfirmation('Please select an employee first.');
      return;
    }

    const hasApproved = reimbursementData.some((r) => r.status === 'Approved');
    if (!hasApproved) {
      errorConfirmation('No approved reimbursements found for the selected period.');
      return;
    }

    setDownloadingBill(true);
    try {
      const { alignment, date } = currentPeriod;

      let from: string | undefined;
      let to: string | undefined;
      let label = 'All Time';

      if (alignment === 'monthly') {
        from = date.startOf('month').format('YYYY-MM-DD');
        to = date.endOf('month').format('YYYY-MM-DD');
        label = date.format('MMM YYYY');
      } else if (alignment === 'yearly') {
        try {
          const fy = await generateFiscalYearFromGivenYear(date);
          from = fy.startDate ? dayjs(fy.startDate).format('YYYY-MM-DD') : date.startOf('year').format('YYYY-MM-DD');
          to = fy.endDate ? dayjs(fy.endDate).format('YYYY-MM-DD') : date.endOf('year').format('YYYY-MM-DD');
        } catch {
          from = date.startOf('year').format('YYYY-MM-DD');
          to = date.endOf('year').format('YYYY-MM-DD');
        }
        label = `FY ${date.format('YYYY')}`;
      }

      const blob = await downloadEmployeePeriodBillPdf(selectedEmployeeId, { from, to, label });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Reimbursement_Bill_${employeeCode || selectedEmployeeId}_${label.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('❌ PDF Download Error:', error);
      errorConfirmation('Failed to download reimbursement bill. Please try again.');
    } finally {
      setDownloadingBill(false);
    }
  };

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
        actionSlot={
          <button
            className="btn d-flex align-items-center gap-2 px-3"
            style={{
              height: '35px',
              background: '#1E3A8A',
              color: '#ffffff',
              border: 'none',
              fontSize: '13px',
              fontWeight: 500,
              cursor: downloadingBill ? 'not-allowed' : 'pointer',
              pointerEvents: 'auto',
            }}
            onClick={handleDownloadBill}
            disabled={downloadingBill}
            title="Download Reimbursement Slip"
          >
            {downloadingBill ? (
              <>
                <span className="spinner-border spinner-border-sm" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <polyline points="7 10 12 15 17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <span>Download Reimbursement Slip</span>
              </>
            )}
          </button>
        }
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
