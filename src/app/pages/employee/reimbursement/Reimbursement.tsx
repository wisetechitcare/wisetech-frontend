import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "@redux/store";
import { KTIcon } from "@metronic/helpers";
import { useState } from "react";
import PendingReimbursementsPage, { PendingReimbursementsPageHandle } from "./PendingReimbursementsPage";
import ReimbursementWorkspace, { kpiProps } from "./views/ReimbursementWorkspace";
import { outlineToolbarButton } from "./utils/toolbarButton";
import { permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase } from "@constants/statistics";
import { hasPermission } from "@utils/authAbac";

/**
 * The employee's own reimbursement screen. Everything below the drafts inbox lives in
 * ReimbursementWorkspace, which the admin Search Employee tab renders too.
 */
function Reimbursement() {
  const [pendingDraftsCount, setPendingDraftsCount] = useState(0);
  const pendingPageRef = useRef<PendingReimbursementsPageHandle>(null);
  const location = useLocation();
  const navigate = useNavigate();

  const employeeId = useSelector((state: RootState) => state.employee.currentEmployee.id);
  const employeeCode = useSelector((state: RootState) => state.employee.currentEmployee.employeeCode);
  const authUser = useSelector((state: RootState) => state.auth.currentUser);
  const employeeName = `${authUser.firstName ?? ''} ${authUser.lastName ?? ''}`.trim();

  // Landed here from the mobile bottom-nav "+" quick-actions sheet — open the New Reimbursement
  // modal immediately. Clears the nav state after so back/forward doesn't re-trigger it.
  useEffect(() => {
    if ((location.state as any)?.quickAction === 'newExpense') {
      pendingPageRef.current?.openAddModal();
      navigate(location.pathname, { replace: true, state: {} });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ReimbursementWorkspace
      employeeId={employeeId}
      employeeCode={employeeCode}
      employeeName={employeeName}
      recordsTitle="My Reimbursement Records"
      extraActions={
        pendingDraftsCount === 0 && hasPermission(
          resourceNameMapWithCamelCase.reimbursement,
          permissionConstToUseWithHasPermission.create
        ) ? (
          <button
            onClick={() => pendingPageRef.current?.openAddModal()}
            style={outlineToolbarButton()}
          >
            <KTIcon iconName='plus' className='fs-6' />
            <span>Add Reimbursement Request</span>
          </button>
        ) : null
      }
      renderHeader={({ summary, loading, periodBar }) => (
        <PendingReimbursementsPage
          ref={pendingPageRef}
          onDraftsChange={setPendingDraftsCount}
          {...kpiProps(summary)}
          overviewLoading={loading}
          periodSlot={periodBar}
        />
      )}
    />
  );
}

export default Reimbursement;
