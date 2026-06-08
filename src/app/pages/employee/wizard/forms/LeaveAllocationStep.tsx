import { useEffect, useMemo, useState } from "react";
import { useFormikContext } from "formik";
import { fetchLeaveOptions } from "@services/company";
import { fetchLeaveAllocations } from "@services/employee";

interface LeaveOption {
    id: string;
    leaveType: string;
    numberOfDays: number;
    isPaid: boolean;
}

interface AllocationRow {
    leaveTypeId: string;
    leaveType: string;
    defaultDays: number;
    allocatedDays: number;
    note: string;
}

/**
 * LeaveAllocationStep — shown during employee onboarding / edit.
 *
 * Only shows PAID leave types (isPaid = true). Unpaid leave is derived:
 *   unpaidDays = 365 − sum(all paid allocations)
 * and shown as a read-only info badge — it is never stored or sent to the backend.
 *
 * Only rows where allocatedDays differs from defaultDays are written into
 * Formik's `leaveAllocations` field so the backend can save overrides.
 */
const LeaveAllocationStep = () => {
    const { setFieldValue, values } = useFormikContext<any>();
    const branchId: string | undefined = values?.branchId || undefined;
    const [rows, setRows] = useState<AllocationRow[]>([]);
    const [loading, setLoading] = useState(true);

    // employeeId is present in edit mode. The wizard stores it as values.employeeId
    // (fetchWizardData returns { employeeId: id, ... }, never a plain `id` key).
    const employeeId: string | undefined = values?.employeeId || values?.id;

    // Track which branchId the current rows were loaded for.
    // Used to distinguish a genuine branch change (must reset) from a remount of the
    // same step (must restore from Formik so the user doesn't lose typed values).
    const [loadedForBranch, setLoadedForBranch] = useState<string | undefined>(undefined);

    useEffect(() => {
        if (!branchId) {
            setRows([]);
            setLoading(false);
            return;
        }

        setLoading(true);

        async function loadLeaveOptions() {
            try {
                // Fetch branch leave options (defaults) and existing per-employee overrides in parallel.
                // In create mode employeeId is undefined → allocations response is an empty fallback.
                const [leaveOptionsRes, allocationsRes] = await Promise.all([
                    fetchLeaveOptions(branchId),
                    employeeId
                        ? fetchLeaveAllocations(employeeId).catch(() => null)
                        : Promise.resolve(null),
                ]);

                // FC6 FIX: Only show paid leave types — unpaid is a computed remainder
                const leaveOptions = leaveOptionsRes?.data?.leaveOptions ?? [];
                const paidOptions = leaveOptions.filter((opt: LeaveOption) => opt.isPaid);

                // Build a map of existing per-employee overrides (DB) so edit mode pre-populates
                // the correct custom values instead of reverting to branch defaults.
                const existingOverrides: Record<string, number> = {};
                const existingNotes: Record<string, string> = {};
                if (allocationsRes && !allocationsRes?.hasError) {
                    (allocationsRes.data?.allocations ?? []).forEach((a: any) => {
                        existingOverrides[a.leaveTypeId] = Number(a.allocatedDays);
                        if (a.note) existingNotes[a.leaveTypeId] = a.note;
                    });
                }

                // FIX: Restore in-session values from Formik on remount (step navigation).
                // If the branch hasn't changed, the user's typed values are still in
                // values.leaveAllocations — use them as the highest-priority source so
                // navigating away and back doesn't wipe out unsaved inputs.
                const isBranchChange = loadedForBranch !== undefined && loadedForBranch !== branchId;
                const formikAllocations: any[] =
                    !isBranchChange && Array.isArray(values?.leaveAllocations)
                        ? values.leaveAllocations
                        : [];

                const formikOverrides: Record<string, number> = {};
                const formikNotes: Record<string, string> = {};
                formikAllocations.forEach((a: any) => {
                    formikOverrides[a.leaveTypeId] = Number(a.allocatedDays);
                    if (a.note) formikNotes[a.leaveTypeId] = a.note;
                });

                const initialRows: AllocationRow[] = paidOptions.map((opt: LeaveOption) => ({
                    leaveTypeId:   opt.id,
                    leaveType:     opt.leaveType,
                    defaultDays:   opt.numberOfDays ?? 0,
                    // Priority: 1. Formik in-session state (remount restore)
                    //           2. DB override (edit mode first load)
                    //           3. Branch default (create mode first load)
                    allocatedDays: formikOverrides[opt.id] !== undefined
                        ? formikOverrides[opt.id]
                        : (existingOverrides[opt.id] ?? (opt.numberOfDays ?? 0)),
                    note: formikNotes[opt.id] ?? existingNotes[opt.id] ?? "",
                }));
                setRows(initialRows);
                setLoadedForBranch(branchId);

                // Only write Formik if it had nothing yet (first load or branch change).
                // Avoids overwriting the user's in-session edits with DB/default values.
                // Write the complete set of rows so the backend can replace-all.
                if (formikAllocations.length === 0) {
                    setFieldValue("leaveAllocations", initialRows.map(r => ({
                        leaveTypeId:   r.leaveTypeId,
                        allocatedDays: Number(r.allocatedDays),
                        ...(r.note && { note: r.note }),
                    })));
                }
            } catch (err) {
                console.error("Failed to load leave options:", err);
            } finally {
                setLoading(false);
            }
        }
        loadLeaveOptions();
    }, [branchId, employeeId]); // re-run when branch OR employee changes

    const handleChange = (index: number, field: "allocatedDays" | "note", value: string | number) => {
        const updated = rows.map((row, i) =>
            i === index ? { ...row, [field]: value } : row
        );
        setRows(updated);

        // Always send the complete set of rows so the backend can replace-all.
        // This allows resetting a value back to the branch default (which would
        // be silently dropped if we only sent overrides).
        setFieldValue("leaveAllocations", updated.map(r => ({
            leaveTypeId:   r.leaveTypeId,
            allocatedDays: Number(r.allocatedDays),
            ...(r.note && { note: r.note }),
        })));
    };

    // Derived: unpaidDays = 365 − sum of all paid allocations
    const totalPaidAllocated = useMemo(
        () => rows.reduce((sum, r) => sum + Number(r.allocatedDays), 0),
        [rows]
    );
    const unpaidDays = Math.max(0, 365 - totalPaidAllocated);

    if (loading) {
        return (
            <div className="d-flex align-items-center gap-2 text-muted" style={{ fontSize: 14 }}>
                <span className="spinner-border spinner-border-sm" />
                Loading leave types…
            </div>
        );
    }

    if (!branchId) {
        return (
            <div className="text-muted" style={{ fontSize: 14 }}>
                Select a branch in the Hiring Information section above to configure leave allocation.
            </div>
        );
    }

    if (rows.length === 0) {
        return (
            <div className="text-muted" style={{ fontSize: 14 }}>
                No paid leave types configured for this branch. Leave allocation will use global policy defaults.
            </div>
        );
    }

    return (
        <div>
            <p style={{ fontSize: 13, color: "#6c757d", marginBottom: 12 }}>
                Configure paid leave days per employee. Leave blank to use branch policy defaults.
                Unpaid leave days are automatically calculated as the remainder of the year.
            </p>
            <div style={{ overflowX: "auto" }}>
                <table className="table table-bordered align-middle" style={{ fontSize: 13, minWidth: 480 }}>
                    <thead style={{ backgroundColor: "#f8f9fa" }}>
                        <tr>
                            <th style={{ width: "35%" }}>Leave Type</th>
                            <th style={{ width: "20%", textAlign: "center" }}>Branch Default</th>
                            <th style={{ width: "20%", textAlign: "center" }}>Custom Days</th>
                            <th style={{ width: "25%" }}>Note</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, idx) => {
                            const isOverridden = Number(row.allocatedDays) !== row.defaultDays;
                            return (
                                <tr
                                    key={row.leaveTypeId}
                                    style={{
                                        backgroundColor: isOverridden ? "#fff9db" : undefined,
                                        transition: "background-color 0.15s",
                                    }}
                                >
                                    <td>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                            <span style={{ fontWeight: 500 }}>{row.leaveType}</span>
                                            <span style={{
                                                padding: "1px 7px",
                                                borderRadius: 10,
                                                fontSize: 10,
                                                fontWeight: 600,
                                                backgroundColor: "#e6f9f0",
                                                color: "#17a855",
                                            }}>
                                                Paid
                                            </span>
                                        </div>
                                    </td>
                                    <td style={{ textAlign: "center", color: "#6c757d" }}>
                                        {row.defaultDays} days
                                    </td>
                                    <td style={{ textAlign: "center" }}>
                                        <input
                                            type="number"
                                            min={0}
                                            max={365}
                                            className="form-control form-control-sm text-center"
                                            value={row.allocatedDays}
                                            onChange={e => handleChange(idx, "allocatedDays", e.target.value)}
                                            style={{
                                                borderColor: isOverridden ? "#f59f00" : undefined,
                                                fontWeight: isOverridden ? 600 : undefined,
                                            }}
                                        />
                                    </td>
                                    <td>
                                        <input
                                            type="text"
                                            className="form-control form-control-sm"
                                            placeholder="Reason (optional)"
                                            value={row.note}
                                            onChange={e => handleChange(idx, "note", e.target.value)}
                                            disabled={!isOverridden}
                                        />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Derived unpaid days — read-only, always = 365 − totalPaid */}
            <div style={{
                marginTop: 8,
                padding: "10px 14px",
                backgroundColor: "#f8f9fa",
                borderRadius: 8,
                border: "1px solid #dee2e6",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
            }}>
                <div>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>Unpaid Leave (derived)</span>
                    <span style={{ fontSize: 12, color: "#6c757d", marginLeft: 8 }}>
                        = 365 − {totalPaidAllocated} paid days
                    </span>
                </div>
                <span style={{
                    padding: "3px 12px",
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 700,
                    backgroundColor: "#fff0f0",
                    color: "#e03131",
                }}>
                    {unpaidDays} days
                </span>
            </div>

            {rows.some(r => Number(r.allocatedDays) !== r.defaultDays) && (
                <div style={{
                    marginTop: 8,
                    padding: "8px 12px",
                    backgroundColor: "#fff9db",
                    borderRadius: 6,
                    fontSize: 12,
                    color: "#856404",
                    border: "1px solid #ffe08a",
                }}>
                    <strong>Note:</strong> Highlighted rows will override the branch policy for this employee only.
                    These overrides apply to the current fiscal year.
                </div>
            )}
        </div>
    );
};

export default LeaveAllocationStep;
