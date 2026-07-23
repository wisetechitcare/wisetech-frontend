import { useEffect, useState, useMemo } from 'react';
import { KTIcon } from '@metronic/helpers';
import { fetchLeaveOptions, updateLeaveOptionsById } from '@services/company';
import { errorConfirmation, successConfirmation } from '@utils/modal';
import eventBus from '@utils/EventBus';
import { EVENT_KEYS } from '@constants/eventKeys';
import {
  WtButton, GlassSurface, GlassDialog, GlassHeader, WtIconButton,
  TRIO, IconBox, StatusBadge, StatTile, Spinner, BRAND, cn, type Trio,
} from '@app/modules/common/components/ui/tw';

interface LeaveTypesBalanceModalProps {
  open: boolean;
  onClose: () => void;
  readOnly?: boolean;
}

// TRIO, IconBox, StatusBadge, StatTile now come from the shared app-wide Tailwind
// UI kit (@app/modules/common/components/ui/tw) — single source of truth, no duplication.

/** Config map for leave type specific icons, color trios, and UI/UX descriptive hints. */
function getLeaveTypeMeta(leaveType: string): { icon: string; trio: Trio; desc: string } {
  const name = (leaveType || '').toLowerCase();
  if (name.includes('annual')) {
    return { icon: 'calendar-tick', trio: TRIO.blue, desc: 'Accrued annual vacation allowance' };
  }
  if (name.includes('casual')) {
    return { icon: 'profile-circle', trio: TRIO.green, desc: 'Short-notice personal leave days' };
  }
  if (name.includes('floater')) {
    return { icon: 'compass', trio: TRIO.purple, desc: 'Flexible optional holiday credits' };
  }
  if (name.includes('maternal') || name.includes('paternal') || name.includes('parental')) {
    return { icon: 'heart', trio: TRIO.rose, desc: 'Family care & parental leave cap' };
  }
  if (name.includes('sick') || name.includes('medical')) {
    return { icon: 'shield-cross', trio: TRIO.amber, desc: 'Health recovery & medical allowance' };
  }
  if (name.includes('unpaid')) {
    return { icon: 'information-5', trio: TRIO.rose, desc: 'Derived non-remunerated days' };
  }
  return { icon: 'element-equal', trio: TRIO.cyan, desc: 'Custom organizational leave balance' };
}

interface LeaveOptionItem {
  id: string;
  leaveType: string;
  numberOfDays: number;
  branchId: string;
  branch?: { id: string; name: string };
  carryForwardLimit?: number | null;
}

export function LeaveTypesBalanceModal({ open, onClose, readOnly }: LeaveTypesBalanceModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [leaveOptions, setLeaveOptions] = useState<LeaveOptionItem[]>([]);
  const [formValues, setFormValues] = useState<Record<string, number>>({});
  const [selectedBranchId, setSelectedBranchId] = useState<string>('ALL');

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetchLeaveOptions();
      const rawOptions: LeaveOptionItem[] = res.data?.leaveOptions || [];
      setLeaveOptions(rawOptions);
      const initial: Record<string, number> = {};
      rawOptions.forEach((opt) => {
        initial[opt.id] = Number(opt.numberOfDays) || 0;
      });
      setFormValues(initial);
    } catch (err) {
      console.error('Error fetching leave options:', err);
      errorConfirmation('Failed to load leave options');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  // Group leave options by branch
  const groupedByBranch = useMemo(() => {
    const map: Record<string, { branchName: string; options: LeaveOptionItem[] }> = {};
    leaveOptions.forEach((lo) => {
      const bId = lo.branchId || 'default';
      const bName = lo.branch?.name || 'Default Branch';
      if (!map[bId]) {
        map[bId] = { branchName: bName, options: [] };
      }
      map[bId].options.push(lo);
    });
    // Sort options alphabetically inside each branch
    Object.values(map).forEach((group) => {
      group.options.sort((a, b) => (a.leaveType || '').localeCompare(b.leaveType || ''));
    });
    return map;
  }, [leaveOptions]);

  const branchKeys = useMemo(() => Object.keys(groupedByBranch), [groupedByBranch]);

  // Compute stats across all branches
  const stats = useMemo(() => {
    const totalBranches = branchKeys.length;
    let totalPaid = 0;
    Object.entries(formValues).forEach(([id, val]) => {
      const option = leaveOptions.find((o) => o.id === id);
      if (option && !option.leaveType.toLowerCase().includes('unpaid')) {
        totalPaid += Number(val) || 0;
      }
    });
    const avgPaidPerBranch = totalBranches > 0 ? (totalPaid / totalBranches).toFixed(0) : 0;
    const unpaidDays = Math.max(0, 365 - Number(avgPaidPerBranch));

    return { totalBranches, totalPaid, avgPaidPerBranch, unpaidDays };
  }, [formValues, leaveOptions, branchKeys]);

  const handleInputChange = (id: string, value: number) => {
    const safeVal = Math.max(0, Math.min(365, isNaN(value) ? 0 : value));
    setFormValues((prev) => ({ ...prev, [id]: safeVal }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updatePromises = Object.entries(formValues).map(([id, days]) => {
        const item = leaveOptions.find((l) => l.id === id);
        if (!item) return Promise.resolve(null);
        const payload = {
          leaveType: item.leaveType,
          numberOfDays: days,
          branchId: item.branchId,
          carryForwardLimit: item.carryForwardLimit ?? null,
        };
        return updateLeaveOptionsById(id, payload);
      });

      const results = await Promise.all(updatePromises);
      const hasErr = results.some((r: any) => r?.hasError);
      if (hasErr) {
        throw new Error('Failed to update some leave settings');
      }

      await successConfirmation('Leave settings updated successfully!');
      eventBus.emit(EVENT_KEYS.leaveOptionsUpdated, {});
      onClose();
    } catch (err: any) {
      console.error('Error saving leave settings:', err);
      await errorConfirmation(err?.message || 'Failed to update leave settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <GlassDialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      header={(
        <GlassHeader
          title="Leave Types & Balance"
          subtitle="Configure branch-specific paid leave limits and derived unpaid balance calculations"
          icon={<KTIcon iconName="calendar-tick" className="fs-1 text-white" />}
          onClose={onClose}
        />
      )}
    >
      <div className="p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col gap-5">
        {/* Metric Summary Bar */}
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 sm:col-span-6 md:col-span-3">
            <StatTile
              label="Configured Branches"
              value={`${stats.totalBranches} ${stats.totalBranches === 1 ? 'Branch' : 'Branches'}`}
              trio={TRIO.blue}
              icon="geolocation"
            />
          </div>
          <div className="col-span-12 sm:col-span-6 md:col-span-3">
            <StatTile
              label="Total Paid Allowance"
              value={`${stats.avgPaidPerBranch} Days / Yr`}
              trio={TRIO.green}
              icon="calendar-tick"
            />
          </div>
          <div className="col-span-12 sm:col-span-6 md:col-span-3">
            <StatTile
              label="Derived Unpaid Remainder"
              value={`${stats.unpaidDays} Days / Yr`}
              trio={TRIO.rose}
              icon="calendar-remove"
            />
          </div>
          <div className="col-span-12 sm:col-span-6 md:col-span-3">
            <GlassSurface variant="thin" radius={14} className="p-3 h-full flex items-center justify-between">
              <div>
                <p className="text-[10.5px] text-slate-500 uppercase tracking-[0.04em] font-bold m-0">Engine Mode</p>
                <StatusBadge trio={TRIO.amber} label="365-Day Pacing" pulse />
              </div>
              <IconBox icon="calculator" trio={TRIO.amber} size={40} />
            </GlassSurface>
          </div>
        </div>

        {/* Segmented Branch Switcher Bar */}
        {branchKeys.length > 1 && (
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[12px] font-bold text-slate-500 uppercase tracking-[0.04em] mr-1 m-0">
              Select Scope:
            </p>

            <GlassSurface variant="thin" radius={999} className="p-1 inline-flex gap-1 flex-wrap">
              <button
                type="button"
                onClick={() => setSelectedBranchId('ALL')}
                className={cn(
                  'px-4 py-1.5 rounded-full text-[12px] font-bold cursor-pointer select-none transition-colors',
                  selectedBranchId === 'ALL'
                    ? 'text-white shadow-[0_2px_6px_rgba(30,58,138,0.25)]'
                    : 'text-slate-500 hover:bg-black/5 hover:text-slate-900',
                )}
                style={selectedBranchId === 'ALL' ? { backgroundColor: BRAND.navy } : undefined}
              >
                All Branches ({branchKeys.length})
              </button>

              {branchKeys.map((bId) => {
                const bName = groupedByBranch[bId].branchName;
                const isSelected = selectedBranchId === bId;
                return (
                  <button
                    key={bId}
                    type="button"
                    onClick={() => setSelectedBranchId(bId)}
                    className={cn(
                      'px-4 py-1.5 rounded-full text-[12px] font-bold cursor-pointer select-none transition-colors',
                      isSelected
                        ? 'text-white shadow-[0_2px_6px_rgba(30,58,138,0.25)]'
                        : 'text-slate-500 hover:bg-black/5 hover:text-slate-900',
                    )}
                    style={isSelected ? { backgroundColor: BRAND.navy } : undefined}
                  >
                    Branch: {bName}
                  </button>
                );
              })}
            </GlassSurface>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="grid place-items-center min-h-[220px]">
            <Spinner size={36} color={BRAND.navy} />
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {branchKeys
              .filter((bId) => selectedBranchId === 'ALL' || selectedBranchId === bId)
              .map((bId) => {
                const group = groupedByBranch[bId];
                const paidOptions = group.options.filter((lo) => !lo.leaveType.toLowerCase().includes('unpaid'));

                // Calculate branch total paid days live from form values
                const branchTotalPaid = paidOptions.reduce(
                  (acc, lo) => acc + (Number(formValues[lo.id]) || 0),
                  0
                );
                const branchUnpaidDays = Math.max(0, 365 - branchTotalPaid);

                return (
                  <GlassSurface
                    key={bId}
                    variant="thin"
                    radius={20}
                    className="p-4 sm:p-[22px] flex flex-col gap-[18px]"
                  >
                    {/* Branch Header Bar */}
                    <div className="flex items-center justify-between flex-wrap gap-3 pb-3.5" style={{ borderBottom: `1px solid ${BRAND.line}` }}>
                      <div className="flex flex-row gap-3 items-center">
                        <IconBox icon="bank" trio={TRIO.blue} size={42} fs="fs-2" />
                        <div>
                          <p className="text-[11px] font-extrabold uppercase tracking-[0.06em] m-0" style={{ color: TRIO.blue.c }}>
                            Branch Specific Configuration
                          </p>
                          <p className="text-[17px] font-extrabold text-slate-900 tracking-[-0.01em] m-0">
                            BRANCH: {group.branchName.toUpperCase()}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-row gap-2.5 items-center">
                        <div className="px-3.5 py-1.5 rounded-full flex items-center gap-2 border" style={{ backgroundColor: TRIO.green.bg, borderColor: TRIO.green.bd }}>
                          <span className="w-[7px] h-[7px] rounded-full" style={{ backgroundColor: TRIO.green.c }} />
                          <span className="text-[12.5px] font-extrabold" style={{ color: TRIO.green.c }}>
                            PAID LEAVES: {branchTotalPaid} DAYS
                          </span>
                        </div>
                        <div className="px-3.5 py-1.5 rounded-full flex items-center gap-2 border" style={{ backgroundColor: TRIO.rose.bg, borderColor: TRIO.rose.bd }}>
                          <span className="w-[7px] h-[7px] rounded-full" style={{ backgroundColor: TRIO.rose.c }} />
                          <span className="text-[12.5px] font-extrabold" style={{ color: TRIO.rose.c }}>
                            UNPAID: {branchUnpaidDays} DAYS
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Paid Leave Types Grid with Relative Icons */}
                    <div className="grid grid-cols-12 gap-[18px]">
                      {paidOptions.map((lo) => {
                        const val = formValues[lo.id] ?? 0;
                        const meta = getLeaveTypeMeta(lo.leaveType);

                        return (
                          <div className="col-span-12 sm:col-span-6 md:col-span-4" key={lo.id}>
                            <GlassSurface
                              variant="thin"
                              className="p-4 flex flex-col justify-between gap-3.5 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_2px_4px_rgba(15,23,42,0.04),0_14px_22px_rgba(15,23,42,0.055)]"
                              style={{ border: `1px solid ${meta.trio.bd}`, borderTop: `3.5px solid ${meta.trio.c}` }}
                            >
                              {/* Header with relative icon & badge */}
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex flex-row gap-2.5 items-center min-w-0">
                                  <IconBox icon={meta.icon} trio={meta.trio} size={38} fs="fs-3" />
                                  <div className="min-w-0">
                                    <p className="truncate text-[14px] font-extrabold text-slate-900 m-0">
                                      {lo.leaveType}
                                    </p>
                                    <p className="truncate text-[11px] text-slate-500 font-medium m-0">
                                      {meta.desc}
                                    </p>
                                  </div>
                                </div>
                                <StatusBadge trio={meta.trio} label={`${val} Days`} />
                              </div>

                              {/* Interactive Stepper Control */}
                              <div className="flex items-center gap-2 pt-1">
                                <WtIconButton
                                  size={36}
                                  disabled={readOnly || val <= 0}
                                  onClick={() => handleInputChange(lo.id, val - 1)}
                                  title="Decrease"
                                >
                                  <KTIcon iconName="minus" className="fs-2" />
                                </WtIconButton>

                                <div className="flex-1 relative">
                                  <input
                                    type="number"
                                    className="w-full rounded-lg border px-3 py-2 text-base text-center font-extrabold bg-white/70 outline-none focus:ring-2 focus:ring-[#1E3A8A]/15"
                                    style={{ borderColor: meta.trio.bd }}
                                    value={val}
                                    disabled={readOnly}
                                    onChange={(e) => handleInputChange(lo.id, parseInt(e.target.value, 10))}
                                    min={0}
                                    max={365}
                                  />
                                </div>

                                <WtIconButton
                                  size={36}
                                  disabled={readOnly || val >= 365}
                                  onClick={() => handleInputChange(lo.id, val + 1)}
                                  title="Increase"
                                >
                                  <KTIcon iconName="plus" className="fs-2" />
                                </WtIconButton>
                              </div>
                            </GlassSurface>
                          </div>
                        );
                      })}
                    </div>

                    {/* Derived Unpaid Remainder Engine Formula Banner */}
                    <GlassSurface
                      variant="thin"
                      radius={14}
                      className="p-4 flex items-center justify-between flex-wrap gap-3"
                      style={{ backgroundColor: TRIO.rose.bg, border: `1px solid ${TRIO.rose.bd}` }}
                    >
                      <div className="flex flex-row gap-3 items-center min-w-0 flex-1">
                        <IconBox icon="calculator" trio={TRIO.rose} size={40} fs="fs-2" />
                        <div className="min-w-0">
                          <p className="text-[13px] font-extrabold m-0" style={{ color: TRIO.rose.c }}>
                            Unpaid Leave Remainder Engine
                          </p>
                          <p className="text-[12px] text-slate-500 font-medium leading-[1.4] m-0">
                            Formula: <strong>365 Calendar Days</strong> − <strong>{branchTotalPaid} Paid Days</strong> = <strong style={{ color: TRIO.rose.c }}>{branchUnpaidDays} Unpaid Days</strong>. Unpaid days are automatically derived to maintain full-year attendance pacing and cannot be directly edited.
                          </p>
                        </div>
                      </div>

                      <StatusBadge trio={TRIO.rose} label={`${branchUnpaidDays} Unpaid Days`} pulse title="Derived 365-day remainder" />
                    </GlassSurface>
                  </GlassSurface>
                );
              })}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div
        className="px-4 sm:px-6 py-4 flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 shrink-0"
        style={{ borderTop: `1px solid ${BRAND.line}`, backgroundColor: 'rgba(255,255,255,0.4)' }}
      >
        <WtButton ghost onClick={onClose} disabled={saving} className="w-full sm:w-auto">
          Cancel
        </WtButton>
        {!readOnly && (
          <WtButton
            tone="primary"
            onClick={handleSave}
            disabled={saving}
            startIcon={saving ? <Spinner size={16} color="#fff" /> : <KTIcon iconName="check-circle" className="fs-2" />}
            className="w-full sm:w-auto"
          >
            {saving ? 'Saving Settings...' : 'Save Branch Balances'}
          </WtButton>
        )}
      </div>
    </GlassDialog>
  );
}

export default LeaveTypesBalanceModal;
