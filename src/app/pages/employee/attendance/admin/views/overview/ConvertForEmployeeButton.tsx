import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@redux/store';
import { fetchUnsettledLeavers, fetchEmployeeLeaveBalance } from '@services/employee';
import { EmployeeSelectionDialog } from '@app/modules/common/components/EmployeeSelectionDialog';
import { WtButton, Spinner } from '@app/modules/common/components/ui/tw';
import { KTIcon } from '@metronic/helpers';
import { getAvatar } from '@utils/avatar';
import { activeEmployeeIdSet } from '@utils/activeEmployee';
import { errorConfirmation } from '@utils/modal';
import {
    ANNUAL_LEAVES, CASUAL_LEAVES, FLOATER_LEAVES, MATERNAL_LEAVES, SICK_LEAVES,
} from '@constants/statistics';
import ConvertLeavesModal from '@pages/employee/attendance/personal/views/my-leaves/ConvertLeavesModal';

/**
 * Convert (encash / transfer) leave for an ACTIVE employee, on their behalf.
 *
 * The Unsettled Leavers panel next to this covers people who have already exited — the case that
 * cannot wait, since their balance never rolls over or expires. But conversion is otherwise
 * employee-initiated, so anyone still employed who cannot or will not raise their own request had no
 * route at all: the API has always allowed an Admin/HR settlement for any employee they have access
 * to, and only the leavers list ever offered a way to reach it.
 *
 * Deliberately the SAME modal the employee uses, targeted at them — a parallel admin encashment
 * screen would drift from the employee one, exactly as the two leave calendars this codebase already
 * deleted did.
 */
export default function ConvertForEmployeeButton() {
    const [allowed, setAllowed] = useState(false);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [loadingBalance, setLoadingBalance] = useState(false);
    const [target, setTarget] = useState<{
        employeeId: string;
        branchId?: string | null;
        employeeName?: string;
        balances: {
            totalLeaves: number; casualLeaves: number; sickLeaves: number;
            floaterLeaves: number; annualLeaves: number; maternalLeaves: number;
        };
    } | null>(null);

    const allEmployees = useSelector((state: RootState) => state.allEmployees.list);

    /**
     * One call answers both questions this button needs: whether on-behalf conversion is switched on
     * in the leave policy, and whether the viewer is Admin/HR at all (the endpoint answers 403 if
     * not). Same source the leavers panel reads, so the two can never disagree about the policy.
     */
    useEffect(() => {
        (async () => {
            try {
                const res = await fetchUnsettledLeavers();
                setAllowed(!!res.data.onBehalfEnabled);
            } catch {
                setAllowed(false);
            }
        })();
    }, []);

    const employees = useMemo(() => {
        const activeIds = activeEmployeeIdSet((allEmployees || []) as any);
        return (allEmployees || [])
            .filter((e: any) => !activeIds.size || activeIds.has(e.id))
            .map((e: any) => ({
                id: e.id,
                name: e.users ? `${e.users.firstName ?? ''} ${e.users.lastName ?? ''}`.trim() : 'Unknown',
                designation: e.designations?.role || e.designation || '',
                avatar: getAvatar(e.avatar ?? e.users?.avatar ?? null, e.gender ?? 0),
            }));
    }, [allEmployees]);

    const pick = useCallback(async (employeeId: string) => {
        const emp: any = (allEmployees || []).find((e: any) => e.id === employeeId);
        setLoadingBalance(true);
        try {
            // The modal caps each type at what is actually held, so it needs the employee's OWN
            // balance — availableBalance from the same summary the balance card reads, never a
            // figure derived here.
            const { data: { leavesSummary } } = await fetchEmployeeLeaveBalance(employeeId);
            const byType: Record<string, number> = {};
            (leavesSummary ?? []).forEach((s: any) => {
                byType[s.leaveType] = Number(s.availableBalance) || 0;
            });
            const balances = {
                casualLeaves: byType[CASUAL_LEAVES] ?? 0,
                sickLeaves: byType[SICK_LEAVES] ?? 0,
                floaterLeaves: byType[FLOATER_LEAVES] ?? 0,
                annualLeaves: byType[ANNUAL_LEAVES] ?? 0,
                maternalLeaves: byType[MATERNAL_LEAVES] ?? 0,
                totalLeaves: 0,
            };
            balances.totalLeaves =
                balances.casualLeaves + balances.sickLeaves + balances.floaterLeaves +
                balances.annualLeaves + balances.maternalLeaves;

            if (balances.totalLeaves <= 0) {
                await errorConfirmation('This employee has no paid leave balance left to convert.');
                return;
            }

            setPickerOpen(false);
            setTarget({
                employeeId,
                branchId: emp?.branchId ?? null,
                employeeName: emp?.users ? `${emp.users.firstName ?? ''} ${emp.users.lastName ?? ''}`.trim() : undefined,
                balances,
            });
        } catch (err: any) {
            await errorConfirmation(
                err?.response?.data?.detail || err?.response?.data?.message || 'Could not read that employee’s leave balance.',
            );
        } finally {
            setLoadingBalance(false);
        }
    }, [allEmployees]);

    // Not Admin/HR, or on-behalf conversion is switched off in the leave policy: the action would be
    // refused server-side, so it is not offered. Turn it on in Leave Policy → Conversion → On behalf.
    if (!allowed) return null;

    return (
        <>
            <WtButton
                inverted
                onClick={() => setPickerOpen(true)}
                startIcon={loadingBalance ? <Spinner size={16} /> : <KTIcon iconName="arrow-two-diagonals" className="fs-5" />}
                className="whitespace-nowrap"
            >
                Convert for an Employee
            </WtButton>

            <EmployeeSelectionDialog
                open={pickerOpen}
                onClose={() => setPickerOpen(false)}
                title="Convert leave for an employee"
                subtitle="Encash or transfer unused paid leave on an employee's behalf"
                icon="dollar"
                tone="green"
                employees={employees}
                selectedIds={[]}
                // Single-pick: choosing an employee IS the action, so it opens the conversion modal
                // rather than accumulating a selection nobody would then have to confirm twice.
                onToggle={(id) => { void pick(id); }}
                onSave={() => setPickerOpen(false)}
                footerNote="Pick one employee — their balance opens in the conversion screen."
            />

            {target && (
                <ConvertLeavesModal
                    show
                    onHide={() => setTarget(null)}
                    target={{
                        employeeId: target.employeeId,
                        branchId: target.branchId,
                        employeeName: target.employeeName,
                    }}
                    leaveBalances={target.balances}
                    onSuccess={() => setTarget(null)}
                />
            )}
        </>
    );
}
