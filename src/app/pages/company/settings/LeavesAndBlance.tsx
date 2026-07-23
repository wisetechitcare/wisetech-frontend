import { useEffect, useState, useCallback, useMemo } from "react";
import { useSelector } from "react-redux";
import { createLeaveOption, updateLeaveOptionById } from "@services/employee";
import { KTIcon } from "@metronic/helpers";
// Shared glass UI kit — single source of truth for the leave-management look.
import { GlassCard, WtButton, WtIconButton, TRIO } from "@app/modules/common/components/ui/tw";
import { LeaveTypes } from "@constants/attendance";
import { RootState } from "@redux/store";
import { fetchLeaveOptions } from "@services/company";

function LeavesAndBalance() {
  const employeeId = useSelector((state: RootState) => state?.employee.currentEmployee?.id);
  const branchId = useSelector((state: RootState) => state?.employee.currentEmployee?.branchId);
  const canApprove = ["HR", "Manager", "Director"];

  const [leavesOptions, setLeaveOptions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const filteredLeaveOptions = useMemo(() => {
    return leavesOptions.filter((leave) => leave.leaveType !== LeaveTypes.UNPAID_LEAVE);
  }, [leavesOptions]);

  const fetchOptions = useCallback(async () => {
    if (!employeeId || !branchId) return;
    
    setIsLoading(true);
    try {
      const { data: { leaveOptions } } = await fetchLeaveOptions();
      const enriched = leaveOptions.map((item: any) => ({
        ...item,
        isEditing: false,
        isNew: false,
      }));
      setLeaveOptions(enriched);
    } catch (error) {
      console.error("Error fetching leave options:", error);
    } finally {
      setIsLoading(false);
    }
  }, [employeeId, branchId]);

  useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);

  const handleEditToggle = useCallback((index: number) => {
    setLeaveOptions((prevOptions) => {
      const updated = [...prevOptions];
      updated[index].isEditing = !updated[index].isEditing;
      return updated;
    });
  }, []);

  const handleChange = useCallback((index: number, field: string, value: string) => {
    setLeaveOptions((prevOptions) => {
      const updated = [...prevOptions];
      if (field === "numberOfDays") {
        updated[index][field] = parseInt(value);
      } else if (field === "carryForwardLimit") {
        // Empty = no cap (unlimited carry-forward).
        updated[index][field] = value === "" ? null : parseInt(value);
      } else {
        updated[index][field] = value;
      }
      return updated;
    });
  }, []);

  const handleAdd = useCallback(() => {
    const tempId = `temp-${Date.now()}`;
    setLeaveOptions((prevOptions) => [
      ...prevOptions,
      {
        id: tempId,
        leaveType: "",
        numberOfDays: 0,
        isEditing: true,
        isNew: true,
      },
    ]);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!branchId) return;
    
    setIsSubmitting(true);
    
    try {
      const updatePromises = leavesOptions.map(async (leave) => {
        if (!leave.leaveType || leave.numberOfDays <= 0) {
          console.warn("Invalid leave entry skipped:", leave);
          return null;
        }

        try {
          if (leave.isNew) {
            return await createLeaveOption({
              leaveType: leave.leaveType,
              numberOfDays: leave.numberOfDays,
              carryForwardLimit: leave.carryForwardLimit ?? null,
              branchId,
              canApprove,
            });
          } else {
            return await updateLeaveOptionById(leave.id, {
              branchId,
              leaveType: leave.leaveType,
              numberOfDays: leave.numberOfDays,
              carryForwardLimit: leave.carryForwardLimit ?? null,
            });
          }
        } catch (error) {
          console.error("Error saving leave:", error);
          return null;
        }
      });

      // Wait for all promises to resolve
      await Promise.all(updatePromises);
      
      // Fetch fresh data only once after all updates
      await fetchOptions();
    } catch (error) {
      console.error("Error during submit:", error);
    } finally {
      setIsSubmitting(false);
    }
  }, [leavesOptions, branchId, canApprove, fetchOptions]);


  const COLS = "grid grid-cols-1 md:grid-cols-[4fr_3fr_3fr_1.4fr] gap-3 items-center";

  return (
    <GlassCard preset="section" className="sm:p-6 mt-3">
      {isLoading ? (
        <div className="text-center my-4 text-slate-500">Loading…</div>
      ) : (
        <div className="mt-2">
          <div className={`${COLS} mb-2 hidden md:grid`}>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.04em] m-0">Leave Type</p>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.04em] m-0">Days / year</p>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.04em] m-0">Carry-forward cap</p>
            <div />
          </div>
          {filteredLeaveOptions.map((leave) => {
            const index = leavesOptions.findIndex((l) => l.id === leave.id);

            return (
              <div key={leave.id || index} className={`${COLS} mb-2.5 py-2 md:py-0 border-b md:border-b-0`} style={{ borderBottomColor: TRIO.slate.bd }}>
                {leave.isEditing ? (
                  <>
                    <input type="text" placeholder="Leave Type" value={leave.leaveType} disabled
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#1E3A8A] focus:ring-2 focus:ring-[#1E3A8A]/15 disabled:bg-slate-50 disabled:text-slate-400" />
                    <input type="number" placeholder="Days / year" value={leave.numberOfDays}
                      onChange={(e) => handleChange(index, "numberOfDays", e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#1E3A8A] focus:ring-2 focus:ring-[#1E3A8A]/15" />
                    <input type="number" placeholder="Carry-fwd cap"
                      title="Max days carried to next year. Leave blank for no cap."
                      value={leave.carryForwardLimit ?? ""}
                      onChange={(e) => handleChange(index, "carryForwardLimit", e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#1E3A8A] focus:ring-2 focus:ring-[#1E3A8A]/15" />
                  </>
                ) : (
                  <>
                    <p className="font-bold text-slate-900 m-0">{leave.leaveType}</p>
                    <p className="text-slate-900 m-0">{leave.numberOfDays}</p>
                    <p className="text-slate-900 m-0">
                      {leave.carryForwardLimit ?? <span className="text-slate-500">No cap</span>}
                    </p>
                  </>
                )}
                <div className="flex justify-start md:justify-end">
                  <WtIconButton title={leave.isEditing ? "Done editing" : "Edit"} color={TRIO.blue.c} size={34}
                    onClick={() => handleEditToggle(index)}>
                    <KTIcon iconName={leave.isEditing ? "check" : "pencil"} className="fs-4" />
                  </WtIconButton>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <WtButton className="mt-4 w-full sm:w-auto" onClick={handleSubmit} disabled={isSubmitting}>
        {isSubmitting ? "Submitting…" : "Submit"}
      </WtButton>
    </GlassCard>
  );
}

export default LeavesAndBalance;