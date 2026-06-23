import { useCallback, useEffect, useState } from "react";
import dayjs, { Dayjs } from "dayjs";
import { useSelector } from "react-redux";
import { RootState } from "@redux/store";
import { IReimbursementPayment, IReimbursementsFetch } from "@models/employee";
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
import ReimbursementPaymentModal from "../../components/ReimbursementPaymentModal";
import AdvancePaymentModal from "../../components/AdvancePaymentModal";
import ReimbursementPaymentHistoryTable from "../../components/ReimbursementPaymentHistoryTable";
import {
  fetchUnpaidApprovedReimbursements,
  createReimbursementPayment,
  updateReimbursementPaymentById,
  createAdvanceReimbursementPayment,
} from "@services/employee";
import Swal from "sweetalert2";

function SearchEmployee() {
  const [totalRequestedAmount, setTotalRequestedAmount] = useState(0);
  const [totalRequests, setTotalRequests] = useState(0);
  const [approvedRequests, setApprovedRequests] = useState(0);
  const [rejectedRequests, setRejectedRequests] = useState(0);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [approvedAmount, setApprovedAmount] = useState(0);
  const [pendingAmount, setPendingAmount] = useState(0);
  const [rejectedAmount, setRejectedAmount] = useState(0);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [showEditDeleteOption] = useState(true);
  const [currentPeriod, setCurrentPeriod] = useState<{ alignment: PeriodAlignment; date: Dayjs }>({
    alignment: 'monthly',
    date: dayjs(),
  });

  // Payout modal state
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [unpaidReimbursements, setUnpaidReimbursements] = useState<IReimbursementsFetch[]>([]);

  // Edit payment state
  const [editPayment, setEditPayment] = useState<IReimbursementPayment | null>(null);

  // Advance payment modal state
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [advanceLoading, setAdvanceLoading] = useState(false);
  const [editAdvancePayment, setEditAdvancePayment] = useState<IReimbursementPayment | null>(null);

  // History refresh key
  const [historyKey, setHistoryKey] = useState(0);


  const selectedEmployee = useSelector(
    (state: RootState) => state.employee.selectedEmployee
  );
  const selectedEmployeeId = selectedEmployee?.id;
  const selectedEmployeeName = selectedEmployee
    ? `${(selectedEmployee as any)?.users?.firstName ?? ''} ${(selectedEmployee as any)?.users?.lastName ?? ''}`.trim()
    : undefined;

  const toggleItemsActions: ToggleItemsCallBackFunctions = {
    monthly: function (): void { /* handled by onPeriodChange */ },
    yearly: function (): void { /* handled by onPeriodChange */ },
    allTime: function (): void { /* handled by onPeriodChange */ },
  };

  const applyStats = (data: IReimbursementsFetch[]) => {
    let totalAmount = 0, totalRequest = 0, approvedCount = 0, rejectedCount = 0, pendingCount = 0;
    let approvedAmt = 0, pendingAmt = 0, rejectedAmt = 0;
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

  const refreshStats = useCallback(() => {
    setOverviewLoading(true);
    const { alignment, date } = currentPeriod;
    const fetchPromise =
      alignment === 'monthly' ? fetchEmpMonthlyReimbursements(date, selectedEmployeeId) :
        alignment === 'yearly' ? fetchEmpYearlyReimbursements(date, selectedEmployeeId) :
          fetchEmpAlltimeReimbursements(selectedEmployeeId);
    fetchPromise.then(applyStats);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPeriod, selectedEmployeeId]);

  // Open new payout modal
  const handleOpenPayoutModal = async () => {
    if (!selectedEmployeeId) {
      Swal.fire('No Employee Selected', 'Please select an employee first.', 'warning');
      return;
    }
    try {
      const data = await fetchUnpaidApprovedReimbursements(selectedEmployeeId);
      setUnpaidReimbursements(data);
      setEditPayment(null);
      setShowPayoutModal(true);
    } catch {
      Swal.fire('Error', 'Could not load unpaid reimbursements.', 'error');
    }
  };

  // Open edit payout modal — routes advance payments to the advance modal
  const handleEditPayment = (payment: IReimbursementPayment) => {
    if (payment.status === 'ADVANCE') {
      setEditAdvancePayment(payment);
      setShowAdvanceModal(true);
    } else {
      setEditPayment(payment);
      setUnpaidReimbursements([]);
      setShowPayoutModal(true);
    }
  };

  const handlePayoutSubmit = async (values: any) => {
    if (!selectedEmployeeId) return;
    setPayoutLoading(true);
    try {
      if (editPayment) {
        // Edit mode
        await updateReimbursementPaymentById(editPayment.id, {
          amountPaid: parseFloat(values.amountPaid),
          paymentDate: values.paidAt,
          paymentMethod: values.paymentMethod,
          transactionId: values.transactionId || undefined,
          remarks: values.remarks || undefined,
        });
        setShowPayoutModal(false);
        setEditPayment(null);
        setHistoryKey((k) => k + 1);
        Swal.fire({
          title: 'Payment Updated!',
          text: 'Reimbursement payout has been updated successfully.',
          icon: 'success',
          confirmButtonColor: '#AA393D',
        });
      } else {
        // Create mode
        const reimbursementIds = (values.selectedReimbursementIds as string[] | undefined)?.filter(Boolean)
          ?? unpaidReimbursements.map((r) => r.id as string).filter(Boolean);
        await createReimbursementPayment({
          employeeId: selectedEmployeeId,
          amountPaid: parseFloat(values.amountPaid),
          paymentDate: values.paidAt,
          paymentMethod: values.paymentMethod,
          transactionId: values.transactionId || undefined,
          remarks: values.remarks || values.installmentLabel || undefined,
          reimbursementIds,
        });
        setShowPayoutModal(false);
        setHistoryKey((k) => k + 1);
        Swal.fire({
          title: 'Payment Recorded!',
          text: 'Reimbursement payout has been recorded successfully.',
          icon: 'success',
          confirmButtonColor: '#AA393D',
        });
        refreshStats();
      }
    } catch {
      Swal.fire('Error', 'Failed to save reimbursement payment.', 'error');
    } finally {
      setPayoutLoading(false);
    }
  };

  const handleOpenAdvanceModal = () => {
    if (!selectedEmployeeId) {
      Swal.fire('No Employee Selected', 'Please select an employee first.', 'warning');
      return;
    }
    setEditAdvancePayment(null);
    setShowAdvanceModal(true);
  };

  const handleAdvancePaymentSubmit = async (values: any) => {
    if (!selectedEmployeeId) return;
    setAdvanceLoading(true);
    try {
      if (editAdvancePayment) {
        await updateReimbursementPaymentById(editAdvancePayment.id, {
          amountPaid: parseFloat(values.amountPaid),
          paymentDate: values.paidAt,
          paymentMethod: values.paymentMethod,
          remarks: values.remarks || undefined,
        });
        setShowAdvanceModal(false);
        setEditAdvancePayment(null);
        setHistoryKey((k) => k + 1);
        Swal.fire({
          title: 'Advance Payment Updated!',
          text: 'Advance payment has been updated successfully.',
          icon: 'success',
          confirmButtonColor: '#AA393D',
        });
      } else {
        await createAdvanceReimbursementPayment({
          employeeId: selectedEmployeeId,
          amountPaid: parseFloat(values.amountPaid),
          paymentDate: values.paidAt,
          paymentMethod: values.paymentMethod,
          remarks: values.remarks || undefined,
        });
        setShowAdvanceModal(false);
        setHistoryKey((k) => k + 1);
        Swal.fire({
          title: 'Advance Payment Recorded!',
          text: 'Advance reimbursement payment has been recorded successfully.',
          icon: 'success',
          confirmButtonColor: '#AA393D',
        });
      }
    } catch {
      Swal.fire('Error', 'Failed to save advance payment.', 'error');
    } finally {
      setAdvanceLoading(false);
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

      {/* Permanent inline payment history section with payout button inline in its heading */}
      {selectedEmployeeId && (
        <ReimbursementPaymentHistoryTable
          employeeId={selectedEmployeeId}
          onPaymentDeleted={() => {
            setHistoryKey((k) => k + 1);
            refreshStats();
          }}
          onEditPayment={handleEditPayment}
          onRecordPayout={handleOpenPayoutModal}
          onAdvancePayment={handleOpenAdvanceModal}
          refreshKey={historyKey}
        />
      )}

      {/* Payout Modal (new + edit) */}
      <ReimbursementPaymentModal
        show={showPayoutModal}
        onHide={() => { setShowPayoutModal(false); setEditPayment(null); }}
        loading={payoutLoading}
        employeeName={selectedEmployeeName}
        unpaidReimbursements={unpaidReimbursements}
        onSubmit={handlePayoutSubmit}
        editPayment={editPayment}
      />

      {/* Advance Payment Modal (new + edit) */}
      <AdvancePaymentModal
        show={showAdvanceModal}
        onHide={() => { setShowAdvanceModal(false); setEditAdvancePayment(null); }}
        loading={advanceLoading}
        employeeName={selectedEmployeeName}
        onSubmit={handleAdvancePaymentSubmit}
        editPayment={editAdvancePayment}
      />

    </>
  );
}

export default SearchEmployee;
