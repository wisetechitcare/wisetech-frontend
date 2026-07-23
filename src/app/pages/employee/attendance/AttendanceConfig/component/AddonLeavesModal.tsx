import { useEffect, useState, useMemo } from 'react';
import { KTIcon } from '@metronic/helpers';
import {
  fetchAllAddonLeavesAllowances,
  upsertAddonLeavesAllowances,
  IAddonLeavesAllowance,
  IAddonLeavesAllowanceCreate,
} from '@services/addonLeavesAllowance';
import { successConfirmation, errorConfirmation } from '@utils/modal';
import eventBus from '@utils/EventBus';
import { EVENT_KEYS } from '@constants/eventKeys';
import {
  WtButton, WtIconButton, GlassSurface, GlassDialog, GlassHeader,
  TRIO, IconBox, StatusBadge, StatTile, Spinner, BRAND,
} from '@app/modules/common/components/ui/tw';

interface AddonLeavesModalProps {
  open: boolean;
  onClose: () => void;
  readOnly?: boolean;
}

// TRIO, IconBox, StatusBadge, StatTile now come from the shared app-wide Tailwind
// UI kit (@app/modules/common/components/ui/tw) — single source of truth, no duplication.

// 1..10 experience years, 11 = 10+ years
const EXP_TIERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

export function AddonLeavesModal({ open, onClose, readOnly }: AddonLeavesModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState<Record<number, number>>({
    1: 2, 2: 4, 3: 6, 4: 8, 5: 10, 6: 10, 7: 10, 8: 10, 9: 10, 10: 10, 11: 10,
  });

  const loadAllowances = async () => {
    try {
      setLoading(true);
      const res = await fetchAllAddonLeavesAllowances();
      if (!res?.hasError && res?.data?.addonLeavesAllowances) {
        const list: IAddonLeavesAllowance[] = res.data.addonLeavesAllowances;
        const mapped: Record<number, number> = {};
        EXP_TIERS.forEach((exp) => {
          const match = list.find((a) => a.experienceInCompany === exp);
          mapped[exp] = match ? match.addonLeavesCount : 0;
        });
        setValues(mapped);
      }
    } catch (err) {
      console.error('Error loading addon leaves allowances:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadAllowances();
    }
  }, [open]);

  const stats = useMemo(() => {
    const configuredCount = Object.values(values).filter((v) => v > 0).length;
    const maxDays = Math.max(0, ...Object.values(values));
    const avgDays = (Object.values(values).reduce((a, b) => a + b, 0) / EXP_TIERS.length).toFixed(1);
    return { configuredCount, maxDays, avgDays };
  }, [values]);

  const handleChange = (exp: number, val: number) => {
    const safeVal = Math.max(0, Math.min(50, isNaN(val) ? 0 : val));
    setValues((prev) => ({ ...prev, [exp]: safeVal }));
  };

  const applyPreset = (preset: 'linear' | 'standard' | 'clear') => {
    if (preset === 'linear') {
      const next: Record<number, number> = {};
      EXP_TIERS.forEach((exp) => { next[exp] = Math.min(10, exp); });
      setValues(next);
    } else if (preset === 'standard') {
      setValues({
        1: 2, 2: 4, 3: 6, 4: 8, 5: 10, 6: 10, 7: 10, 8: 10, 9: 10, 10: 10, 11: 12,
      });
    } else if (preset === 'clear') {
      const next: Record<number, number> = {};
      EXP_TIERS.forEach((exp) => { next[exp] = 0; });
      setValues(next);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: IAddonLeavesAllowanceCreate[] = EXP_TIERS.map((exp) => ({
        experienceInCompany: exp,
        addonLeavesCount: values[exp] ?? 0,
      }));

      const res = await upsertAddonLeavesAllowances(payload);
      if (res.success) {
        await successConfirmation('Addon leaves allowance saved successfully!');
        eventBus.emit(EVENT_KEYS.addonLeavesAllowanceUpdated, {});
        onClose();
      } else {
        throw new Error('Failed to save addon leaves allowance');
      }
    } catch (err: any) {
      console.error('Error saving addon leaves:', err);
      await errorConfirmation(err?.message || 'Failed to save addon leaves allowance');
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
          title="Addon Leaves Allowance"
          subtitle="Configure additional leave days based on employee tenure and experience"
          icon={<KTIcon iconName="plus-square" className="fs-1 text-white" />}
          onClose={onClose}
        />
      )}
    >
      <div className="p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col gap-5">
        {/* Metric Summary Bar */}
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 sm:col-span-6 md:col-span-3">
            <StatTile
              label="Configured Tiers"
              value={`${stats.configuredCount} / ${EXP_TIERS.length}`}
              trio={TRIO.purple}
              icon="element-11"
            />
          </div>
          <div className="col-span-12 sm:col-span-6 md:col-span-3">
            <StatTile
              label="Max Addon Days"
              value={`+${stats.maxDays} Days`}
              trio={TRIO.green}
              icon="calendar-add"
            />
          </div>
          <div className="col-span-12 sm:col-span-6 md:col-span-3">
            <StatTile
              label="Avg Addon / Tier"
              value={`${stats.avgDays} Days`}
              trio={TRIO.blue}
              icon="graph-up"
            />
          </div>
          <div className="col-span-12 sm:col-span-6 md:col-span-3">
            <GlassSurface variant="thin" radius={14} className="p-3 h-full flex items-center justify-between">
              <div>
                <p className="text-[10.5px] text-slate-500 uppercase tracking-[0.04em] font-bold m-0">Engine Status</p>
                <StatusBadge trio={TRIO.green} label="Active & Enforced" pulse />
              </div>
              <IconBox icon="shield-tick" trio={TRIO.green} size={40} />
            </GlassSurface>
          </div>
        </div>

        {/* Guidance Callout */}
        <GlassSurface
          variant="thin"
          radius={14}
          className="p-4 flex items-start gap-3.5"
          style={{ border: `1px solid ${TRIO.blue.bd}` }}
        >
          <IconBox icon="information-5" trio={TRIO.blue} size={36} fs="fs-3" />
          <div className="flex-1">
            <p className="text-[13px] font-bold text-slate-900 mb-0.5">
              How Addon Leaves Work
            </p>
            <p className="text-[12px] text-slate-500 leading-normal m-0">
              Employees receive additional leave days based on their completed years of experience in the company. These addon leave days are calculated automatically by the backend Leave Allocation Engine and added directly onto their base annual allowance.
            </p>
          </div>
        </GlassSurface>

        {/* Preset Toolbar */}
        {!readOnly && (
          <GlassSurface variant="thin" radius={14} className="p-3 flex items-center justify-between flex-wrap gap-3">
            <p className="text-[12.5px] font-semibold text-slate-500 flex items-center gap-2 m-0">
              <KTIcon iconName="magic-star" className="fs-3 text-primary" />
              Quick Presets:
            </p>
            <div className="flex flex-row gap-2 flex-wrap">
              <WtButton
                ghost
                onClick={() => applyPreset('standard')}
                startIcon={<KTIcon iconName="text-align-left" className="fs-3" />}
              >
                Standard Tier Preset
              </WtButton>
              <WtButton
                ghost
                onClick={() => applyPreset('linear')}
                startIcon={<KTIcon iconName="chart-line-up" className="fs-3" />}
              >
                Linear (+1/yr)
              </WtButton>
              <WtButton
                ghost
                onClick={() => applyPreset('clear')}
                startIcon={<KTIcon iconName="trash" className="fs-3" />}
              >
                Clear All
              </WtButton>
            </div>
          </GlassSurface>
        )}

        {/* Tiers Grid */}
        {loading ? (
          <div className="grid place-items-center min-h-[220px]">
            <Spinner size={36} color={BRAND.navy} />
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-4">
            {EXP_TIERS.map((exp) => {
              const val = values[exp] ?? 0;
              const isConfigured = val > 0;
              const isPlus = exp === 11;
              const labelText = isPlus ? '10+ Years Experience' : `${exp} Year${exp > 1 ? 's' : ''} Experience`;
              const expBadge = isPlus ? '10+' : `${exp}`;
              const trio = isConfigured ? (isPlus ? TRIO.purple : TRIO.green) : TRIO.slate;

              return (
                <div className="col-span-12 sm:col-span-6 md:col-span-4 lg:col-span-3" key={exp}>
                  <GlassSurface
                    variant="thin"
                    className="p-4 flex flex-col gap-3 transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-[0_2px_4px_rgba(15,23,42,0.04),0_14px_22px_rgba(15,23,42,0.055)]"
                    style={{ border: `1px solid ${trio.bd}`, borderTop: `3.5px solid ${trio.c}` }}
                  >
                    <div className="flex items-center justify-between">
                      <div
                        className="grid place-items-center w-9 h-9 rounded-[10px] border font-extrabold text-[13px]"
                        style={{ backgroundColor: trio.bg, color: trio.c, borderColor: trio.bd }}
                      >
                        {expBadge}
                      </div>
                      <StatusBadge
                        trio={trio}
                        label={isConfigured ? 'Configured' : 'Default'}
                      />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-bold text-slate-900 m-0">
                        {labelText}
                      </p>
                      <p className="text-[11px] text-slate-500 m-0">
                        Addon leave days added
                      </p>
                    </div>

                    <div className="flex flex-row gap-2 items-center">
                      <WtIconButton
                        disabled={readOnly || val <= 0}
                        onClick={() => handleChange(exp, val - 1)}
                        title="Decrease"
                      >
                        <KTIcon iconName="minus" className="fs-3" />
                      </WtIconButton>
                      <input
                        type="number"
                        className="flex-1 min-w-0 rounded-lg border border-slate-300 px-3 py-2 text-[15px] text-center font-extrabold outline-none focus:border-[#1E3A8A] focus:ring-2 focus:ring-[#1E3A8A]/15"
                        value={val}
                        disabled={readOnly}
                        onChange={(e) => handleChange(exp, parseInt(e.target.value, 10))}
                        min={0}
                        max={50}
                      />
                      <WtIconButton
                        disabled={readOnly || val >= 50}
                        onClick={() => handleChange(exp, val + 1)}
                        title="Increase"
                      >
                        <KTIcon iconName="plus" className="fs-3" />
                      </WtIconButton>
                    </div>
                  </GlassSurface>
                </div>
              );
            })}
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
            {saving ? 'Saving Changes...' : 'Save Allowance Policy'}
          </WtButton>
        )}
      </div>
    </GlassDialog>
  );
}

export default AddonLeavesModal;
