import { useEffect, useState, useMemo } from 'react';
import { KTIcon } from '@metronic/helpers';
import { createNewConfiguration, fetchConfiguration, updateConfigurationById } from '@services/company';
import { successConfirmation, errorConfirmation } from '@utils/modal';
import { LEAVE_POLICY_KEY } from '@constants/configurations-key';
import {
  WtButton, WtIconButton, GlassSurface, GlassDialog, GlassHeader,
  TRIO, IconBox, StatTile, Spinner, BRAND, cn,
} from '@app/modules/common/components/ui/tw';

interface LeavePolicyModalProps {
  open: boolean;
  onClose: () => void;
  readOnly?: boolean;
}

const DEFAULT_PRIORITY = ['Casual Leaves', 'Sick Leaves', 'Floater Leaves', 'Annual Leaves'];

interface PolicyState {
  probationEnabled: boolean;
  probationDurationDays: number;
  allowUnpaidDuringProbation: boolean;
  allocationPriority: string[];
  cumulativeOverflow: 'spillToUnpaid' | 'block';
  penaltyEnabled: boolean;
  penaltyCutoffTime: string;
  penaltyType: 'halfDaySalaryDeduction' | 'halfPaidLeave' | 'fixedAmountDeduction';
  penaltyFixedAmount: number;
  penaltyDays: 0.5 | 1;
}

const DEFAULTS: PolicyState = {
  probationEnabled: false,
  probationDurationDays: 90,
  allowUnpaidDuringProbation: true,
  allocationPriority: DEFAULT_PRIORITY,
  cumulativeOverflow: 'spillToUnpaid',
  penaltyEnabled: false,
  penaltyCutoffTime: '12:00',
  penaltyType: 'halfDaySalaryDeduction',
  penaltyFixedAmount: 0,
  penaltyDays: 0.5,
};

const INPUT_CLS =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#1E3A8A] focus:ring-2 focus:ring-[#1E3A8A]/15';

/** Native toggle styled to match the kit; preserves checked/onChange/disabled semantics. */
function Toggle({
  checked, onChange, disabled, color = BRAND.navy,
}: {
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  color?: string;
}) {
  return (
    <label className={cn('relative inline-flex items-center shrink-0', disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer')}>
      <input type="checkbox" className="peer sr-only" checked={checked} disabled={disabled} onChange={onChange} />
      <span
        className="h-6 w-11 rounded-full bg-slate-300 transition-colors peer-checked:bg-[color:var(--tg)]"
        style={{ ['--tg' as any]: color }}
      />
      <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
    </label>
  );
}

// TRIO, IconBox, StatusBadge, StatTile now come from the shared app-wide Tailwind
// UI kit (@app/modules/common/components/ui/tw) — single source of truth, no duplication.

export function LeavePolicyModal({ open, onClose, readOnly }: LeavePolicyModalProps) {
  const [configId, setConfigId] = useState<string | null>(null);
  const [state, setState] = useState<PolicyState>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        setLoading(true);
        const { data: { configuration } } = await fetchConfiguration(LEAVE_POLICY_KEY);
        if (configuration?.id) setConfigId(configuration.id);
        const raw = configuration?.configuration;
        const cfg = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : {};
        const p = cfg.probation ?? {};
        const sp = cfg.sameDayPenalty ?? {};
        setState({
          probationEnabled: !!p.enabled,
          probationDurationDays: Number(p.durationDays) > 0 ? Number(p.durationDays) : 90,
          allowUnpaidDuringProbation: p.allowUnpaidDuringProbation !== false,
          allocationPriority:
            Array.isArray(cfg.allocationPriority) && cfg.allocationPriority.length > 0
              ? cfg.allocationPriority.map(String)
              : DEFAULT_PRIORITY,
          cumulativeOverflow: cfg.cumulativeOverflow === 'block' ? 'block' : 'spillToUnpaid',
          penaltyEnabled: !!sp.enabled,
          penaltyCutoffTime: (typeof sp.cutoffTime === 'string' && /^\d{2}:\d{2}$/.test(sp.cutoffTime)) ? sp.cutoffTime : '12:00',
          penaltyType: sp.penaltyType === 'halfPaidLeave' ? 'halfPaidLeave'
            : sp.penaltyType === 'fixedAmountDeduction' ? 'fixedAmountDeduction'
            : 'halfDaySalaryDeduction',
          penaltyFixedAmount: Number(sp.fixedDeductionAmount) || 0,
          penaltyDays: Number(sp.penaltyDays) === 1 ? 1 : 0.5,
        });
      } catch {
        // No config yet — defaults stay
      } finally {
        setLoading(false);
      }
    })();
  }, [open]);

  const movePriority = (index: number, dir: -1 | 1) => {
    setState((s) => {
      const next = [...s.allocationPriority];
      const target = index + dir;
      if (target < 0 || target >= next.length) return s;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...s, allocationPriority: next };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const configuration = {
        probation: {
          enabled: state.probationEnabled,
          durationDays: Number(state.probationDurationDays) || 90,
          allowUnpaidDuringProbation: state.allowUnpaidDuringProbation,
        },
        allocationPriority: state.allocationPriority,
        cumulativeOverflow: state.cumulativeOverflow,
        sameDayPenalty: {
          enabled: state.penaltyEnabled,
          cutoffTime: state.penaltyCutoffTime || '12:00',
          penaltyType: state.penaltyType,
          fixedDeductionAmount: state.penaltyFixedAmount || 0,
          penaltyDays: state.penaltyDays,
        },
      };

      if (configId) {
        await updateConfigurationById(configId, { module: LEAVE_POLICY_KEY, configuration } as any);
      } else {
        await createNewConfiguration({ module: LEAVE_POLICY_KEY, configuration } as any);
      }
      await successConfirmation('Auto-allocation policy saved successfully');
      onClose();
    } catch (err) {
      console.error('Error saving auto-allocation policy:', err);
      await errorConfirmation('Failed to save auto-allocation policy');
    } finally {
      setSaving(false);
    }
  };

  const stats = useMemo(() => {
    const probationText = state.probationEnabled ? `${state.probationDurationDays} Days` : 'Disabled';
    const priorityCount = `${state.allocationPriority.length} Paid Types`;
    const overflowText = state.cumulativeOverflow === 'spillToUnpaid' ? 'Spill Unpaid' : 'Block Request';
    const penaltyText = state.penaltyEnabled ? `Active (${state.penaltyCutoffTime})` : 'Disabled';
    return { probationText, priorityCount, overflowText, penaltyText };
  }, [state]);

  return (
    <GlassDialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      header={(
        <GlassHeader
          title="Auto-Allocation Policy"
          subtitle="Configure new-joiner probation restrictions, paid consumption priority, cumulative overflow, and late penalty rules"
          icon={<KTIcon iconName="shuffle" className="fs-1 text-white" />}
          onClose={onClose}
        />
      )}
    >
      <div className="p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col gap-5">
        {/* Metric Summary Bar */}
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 sm:col-span-6 md:col-span-3">
            <StatTile
              label="Probation Guard"
              value={stats.probationText}
              trio={state.probationEnabled ? TRIO.purple : TRIO.slate}
              icon="security-user"
            />
          </div>
          <div className="col-span-12 sm:col-span-6 md:col-span-3">
            <StatTile
              label="Priority Chain"
              value={stats.priorityCount}
              trio={TRIO.blue}
              icon="sort-2"
            />
          </div>
          <div className="col-span-12 sm:col-span-6 md:col-span-3">
            <StatTile
              label="Overflow Handling"
              value={stats.overflowText}
              trio={state.cumulativeOverflow === 'spillToUnpaid' ? TRIO.cyan : TRIO.rose}
              icon="filter-search"
            />
          </div>
          <div className="col-span-12 sm:col-span-6 md:col-span-3">
            <StatTile
              label="Late Penalty"
              value={stats.penaltyText}
              trio={state.penaltyEnabled ? TRIO.amber : TRIO.slate}
              icon="time"
            />
          </div>
        </div>

        {loading ? (
          <div className="grid place-items-center min-h-[220px]">
            <Spinner size={36} color={BRAND.navy} />
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {/* Section 1: New-Joiner Probation */}
            <GlassSurface variant="thin" className="p-5 flex flex-col gap-4" style={{ borderTop: `3.5px solid ${TRIO.purple.c}` }}>
              <div className="flex items-center justify-between">
                <div className="flex flex-row gap-3 items-center">
                  <IconBox icon="security-user" trio={TRIO.purple} size={36} fs="fs-3" />
                  <div>
                    <p className="text-[15px] font-extrabold text-slate-900 m-0">
                      New-Joiner Probation Restriction
                    </p>
                    <p className="text-[12px] text-slate-500 m-0">
                      During probation, paid leave is blocked — new joiners can only request Unpaid leave.
                    </p>
                  </div>
                </div>
                <Toggle
                  checked={state.probationEnabled}
                  disabled={readOnly}
                  onChange={(e) => setState((s) => ({ ...s, probationEnabled: e.target.checked }))}
                  color={TRIO.purple.c}
                />
              </div>

              {state.probationEnabled && (
                <div className="grid grid-cols-12 gap-4 pt-2" style={{ borderTop: `1px solid ${BRAND.line}` }}>
                  <div className="col-span-12 sm:col-span-5">
                    <p className="text-[12px] font-bold text-slate-900 mb-1.5">
                      Probation Duration (days from joining)
                    </p>
                    <input
                      type="number"
                      className={INPUT_CLS}
                      disabled={readOnly}
                      value={state.probationDurationDays}
                      onChange={(e) => setState((s) => ({ ...s, probationDurationDays: parseInt(e.target.value, 10) || 0 }))}
                      min={1}
                      max={365}
                    />
                  </div>
                  <div className="col-span-12 sm:col-span-7 flex items-center">
                    <div className="flex items-center gap-3">
                      <Toggle
                        checked={state.allowUnpaidDuringProbation}
                        disabled={readOnly}
                        onChange={(e) => setState((s) => ({ ...s, allowUnpaidDuringProbation: e.target.checked }))}
                      />
                      <p className="text-[13px] font-semibold text-slate-900 m-0">
                        Allow Unpaid leave requests during probation window
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </GlassSurface>

            {/* Section 2: Paid Leave Consumption Priority */}
            <GlassSurface variant="thin" className="p-5 flex flex-col gap-4" style={{ borderTop: `3.5px solid ${TRIO.blue.c}` }}>
              <div className="flex flex-row gap-3 items-center">
                <IconBox icon="sort-2" trio={TRIO.blue} size={36} fs="fs-3" />
                <div>
                  <p className="text-[15px] font-extrabold text-slate-900 m-0">
                    Paid Leave Consumption Priority Order
                  </p>
                  <p className="text-[12px] text-slate-500 m-0">
                    When a leave request spans multiple days, paid balances are consumed top-to-bottom; Unpaid is always used last.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2.5 pt-2">
                {state.allocationPriority.map((type, idx) => (
                  <GlassSurface
                    key={type}
                    variant="thin"
                    radius={12}
                    className="py-3 px-4 flex items-center justify-between transition-[transform,box-shadow] duration-150 hover:-translate-y-px hover:shadow-[0_2px_4px_rgba(15,23,42,0.04),0_14px_22px_rgba(15,23,42,0.055)]"
                  >
                    <div className="flex flex-row gap-3 items-center">
                      <div
                        className="grid place-items-center rounded-full w-7 h-7 border font-extrabold text-[12px]"
                        style={{ backgroundColor: TRIO.blue.bg, color: TRIO.blue.c, borderColor: TRIO.blue.bd }}
                      >
                        {idx + 1}
                      </div>
                      <p className="text-[14px] font-bold text-slate-900 m-0">
                        {type}
                      </p>
                    </div>

                    {!readOnly && (
                      <div className="flex flex-row gap-1">
                        <WtIconButton
                          disabled={idx === 0}
                          onClick={() => movePriority(idx, -1)}
                          title="Move Up"
                        >
                          <KTIcon iconName="arrow-up" className="fs-3" />
                        </WtIconButton>
                        <WtIconButton
                          disabled={idx === state.allocationPriority.length - 1}
                          onClick={() => movePriority(idx, 1)}
                          title="Move Down"
                        >
                          <KTIcon iconName="arrow-down" className="fs-3" />
                        </WtIconButton>
                      </div>
                    )}
                  </GlassSurface>
                ))}
              </div>
            </GlassSurface>

            {/* Section 3: Cumulative Limit Overflow */}
            <GlassSurface variant="thin" className="p-5 flex flex-col gap-4" style={{ borderTop: `3.5px solid ${TRIO.cyan.c}` }}>
              <div className="flex flex-row gap-3 items-center">
                <IconBox icon="filter-search" trio={TRIO.cyan} size={36} fs="fs-3" />
                <div>
                  <p className="text-[15px] font-extrabold text-slate-900 m-0">
                    Cumulative Limit Overflow Strategy
                  </p>
                  <p className="text-[12px] text-slate-500 m-0">
                    Action taken by the Leave Allocation Engine when paid days exceed the cumulative monthly pacing limit.
                  </p>
                </div>
              </div>

              <select
                className={INPUT_CLS}
                disabled={readOnly}
                value={state.cumulativeOverflow}
                onChange={(e) => setState((s) => ({ ...s, cumulativeOverflow: e.target.value as any }))}
              >
                <option value="spillToUnpaid">
                  Book the excess days automatically as Unpaid leave (Spillover)
                </option>
                <option value="block">
                  Block the request completely and require manager override
                </option>
              </select>
            </GlassSurface>

            {/* Section 4: Late Leave Apply Penalty */}
            <GlassSurface variant="thin" className="p-5 flex flex-col gap-4" style={{ borderTop: `3.5px solid ${TRIO.amber.c}` }}>
              <div className="flex items-center justify-between">
                <div className="flex flex-row gap-3 items-center">
                  <IconBox icon="time" trio={TRIO.amber} size={36} fs="fs-3" />
                  <div>
                    <p className="text-[15px] font-extrabold text-slate-900 m-0">
                      Same-Day / Late Leave Application Penalty
                    </p>
                    <p className="text-[12px] text-slate-500 m-0">
                      Applies a penalty when an employee submits same-day leave after the configured daily cutoff time.
                    </p>
                  </div>
                </div>
                <Toggle
                  checked={state.penaltyEnabled}
                  disabled={readOnly}
                  onChange={(e) => setState((s) => ({ ...s, penaltyEnabled: e.target.checked }))}
                  color={TRIO.amber.c}
                />
              </div>

              {state.penaltyEnabled && (
                <div className="grid grid-cols-12 gap-4 pt-2" style={{ borderTop: `1px solid ${BRAND.line}` }}>
                  <div className="col-span-12 sm:col-span-4">
                    <p className="text-[12px] font-bold text-slate-900 mb-1.5">
                      Cutoff Time (24h, IST)
                    </p>
                    <input
                      type="time"
                      className={INPUT_CLS}
                      disabled={readOnly}
                      value={state.penaltyCutoffTime}
                      onChange={(e) => setState((s) => ({ ...s, penaltyCutoffTime: e.target.value }))}
                    />
                  </div>

                  <div className="col-span-12 sm:col-span-4">
                    <p className="text-[12px] font-bold text-slate-900 mb-1.5">
                      Penalty Structure
                    </p>
                    <select
                      className={INPUT_CLS}
                      disabled={readOnly}
                      value={state.penaltyType}
                      onChange={(e) => setState((s) => ({ ...s, penaltyType: e.target.value as any }))}
                    >
                      <option value="halfDaySalaryDeduction">Salary deduction (LOP)</option>
                      <option value="halfPaidLeave">Paid leave deduction</option>
                      <option value="fixedAmountDeduction">Fixed Amount (₹)</option>
                    </select>
                  </div>

                  <div className="col-span-12 sm:col-span-4">
                    {state.penaltyType === 'fixedAmountDeduction' ? (
                      <>
                        <p className="text-[12px] font-bold text-slate-900 mb-1.5">
                          Deduction Amount (₹)
                        </p>
                        <input
                          type="number"
                          className={INPUT_CLS}
                          disabled={readOnly}
                          value={state.penaltyFixedAmount}
                          onChange={(e) => setState((s) => ({ ...s, penaltyFixedAmount: parseFloat(e.target.value) || 0 }))}
                        />
                      </>
                    ) : (
                      <>
                        <p className="text-[12px] font-bold text-slate-900 mb-1.5">
                          Penalty Days Magnitude
                        </p>
                        <select
                          className={INPUT_CLS}
                          disabled={readOnly}
                          value={state.penaltyDays}
                          onChange={(e) => setState((s) => ({ ...s, penaltyDays: Number(e.target.value) as any }))}
                        >
                          <option value={0.5}>0.5 Days (Half-day penalty)</option>
                          <option value={1}>1.0 Day (Full-day penalty)</option>
                        </select>
                      </>
                    )}
                  </div>
                </div>
              )}
            </GlassSurface>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div
        className="px-6 py-4 flex items-center justify-end gap-3 shrink-0"
        style={{ borderTop: `1px solid ${BRAND.line}`, backgroundColor: 'rgba(255,255,255,0.4)' }}
      >
        <WtButton ghost onClick={onClose} disabled={saving}>
          Cancel
        </WtButton>
        {!readOnly && (
          <WtButton
            tone="primary"
            onClick={handleSave}
            disabled={saving}
            startIcon={saving ? <Spinner size={16} color="#fff" /> : <KTIcon iconName="check-circle" className="fs-2" />}
          >
            {saving ? 'Saving Policy...' : 'Save Auto-Allocation Policy'}
          </WtButton>
        )}
      </div>
    </GlassDialog>
  );
}

export default LeavePolicyModal;
