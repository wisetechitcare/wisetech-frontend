import { useEffect, useState, useMemo, useRef, type ReactNode } from 'react';
import { KTIcon } from '@metronic/helpers';
import { Box, ButtonBase, CircularProgress, Grid, MenuItem, Popover, Stack, TextField, Typography, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { createNewConfiguration, fetchConfiguration, updateConfigurationById } from '@services/company';
import { successConfirmation, errorConfirmation } from '@utils/modal';
import { LEAVE_POLICY_KEY } from '@constants/configurations-key';
// Same MUI glass kit as the Sandwich Leave benchmark — single source of truth for the look.
import {
  WtButton, WtIconButton, WtSwitch, GlassSurface, GlassDialog, GlassHeader,
  TRIO, IconBox, StatTile, T,
} from '@app/modules/common/components/ui';
import { TimeWheelField } from '@app/modules/common/components/TimeWheelField';

interface LeavePolicyModalProps {
  open: boolean;
  onClose: () => void;
  readOnly?: boolean;
  /** Inheritance scope (group → org → branch) this policy is read from and written to. */
  scope?: { companyId?: string; branchId?: string };
}

const DEFAULT_PRIORITY = ['Casual Leaves', 'Sick Leaves', 'Floater Leaves', 'Annual Leaves'];

type Tone = { c: string; bg: string; bd: string };

interface PolicyState {
  probationEnabled: boolean;
  probationDurationDays: number;
  allowUnpaidDuringProbation: boolean;
  exemptProbationFromSandwich: boolean;
  allocationPriority: string[];
  cumulativeOverflow: 'spillToUnpaid' | 'block';
  penaltyEnabled: boolean;
  penaltyCutoffTime: string;
  penaltyType: 'halfDaySalaryDeduction' | 'halfPaidLeave' | 'fixedAmountDeduction';
  penaltyFixedAmount: number;
  penaltyDays: 0.5 | 1;
  conversionEnabled: boolean;
  maxEncashDaysPerYear: number;
  maxTransferDaysPerYear: number;
  minBalanceToRetain: number;
  /** Fiscal months conversion is allowed in — 1 = April … 12 = March. Empty = any month. */
  allowedFiscalMonths: number[];
  onBehalfEnabled: boolean;
  onBehalfMaxDays: number;
  settlementWindowDays: number;
}

/** Fiscal calendar: index 0 is month 1 = April, matching the backend's toFiscalMonth. */
const FISCAL_MONTHS = ['April', 'May', 'June', 'July', 'August', 'September',
  'October', 'November', 'December', 'January', 'February', 'March'];

const DEFAULTS: PolicyState = {
  probationEnabled: false,
  probationDurationDays: 90,
  allowUnpaidDuringProbation: true,
  exemptProbationFromSandwich: false,
  allocationPriority: DEFAULT_PRIORITY,
  cumulativeOverflow: 'spillToUnpaid',
  penaltyEnabled: false,
  penaltyCutoffTime: '12:00',
  penaltyType: 'halfDaySalaryDeduction',
  penaltyFixedAmount: 0,
  penaltyDays: 0.5,
  // Conversion defaults mirror the backend's DEFAULT_LEAVE_POLICY exactly: on, no ceilings, any
  // month — so opening this screen and saving cannot silently start rejecting requests that work
  // today. on-behalf is the one thing that starts OFF.
  conversionEnabled: true,
  maxEncashDaysPerYear: 0,
  maxTransferDaysPerYear: 0,
  minBalanceToRetain: 0,
  allowedFiscalMonths: [],
  onBehalfEnabled: false,
  onBehalfMaxDays: 0,
  settlementWindowDays: 0,
};

export function LeavePolicyModal({ open, onClose, readOnly, scope }: LeavePolicyModalProps) {
  const theme = useTheme();
  const divider = theme.palette.divider;
  const [configId, setConfigId] = useState<string | null>(null);
  /**
   * The configuration exactly as it was read.
   *
   * handleSave rebuilds the payload from `state`, and the policy JSON holds blocks this screen does
   * not edit (leaveInLieu, and leaveConversion.eligibleTypes). Rebuilt from state alone, a save here
   * silently DELETED them and the backend fell back to defaults — turning Leave-in-Lieu off for the
   * whole scope because someone changed a probation setting.
   */
  const rawCfgRef = useRef<Record<string, any>>({});
  const [state, setState] = useState<PolicyState>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        setLoading(true);
        const { data: { configuration } } = await fetchConfiguration(LEAVE_POLICY_KEY, undefined, undefined, scope);
        if (configuration?.id) setConfigId(configuration.id);
        const raw = configuration?.configuration;
        const cfg = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : {};
        rawCfgRef.current = cfg && typeof cfg === 'object' ? cfg : {};
        const p = cfg.probation ?? {};
        const sp = cfg.sameDayPenalty ?? {};
        const lc = cfg.leaveConversion ?? {};
        const ob = lc.onBehalf ?? {};
        const nonNeg = (v: unknown) => (Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : 0);
        setState({
          probationEnabled: !!p.enabled,
          probationDurationDays: Number(p.durationDays) > 0 ? Number(p.durationDays) : 90,
          allowUnpaidDuringProbation: p.allowUnpaidDuringProbation !== false,
          exemptProbationFromSandwich: !!p.exemptFromSandwich,
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
          // `enabled !== false` — an absent block means conversion is ON, same as the backend reads it.
          conversionEnabled: lc.enabled !== false,
          maxEncashDaysPerYear: nonNeg(lc.maxEncashDaysPerYear),
          maxTransferDaysPerYear: nonNeg(lc.maxTransferDaysPerYear),
          minBalanceToRetain: nonNeg(lc.minBalanceToRetain),
          allowedFiscalMonths: Array.isArray(lc.allowedFiscalMonths)
            ? lc.allowedFiscalMonths.map(Number).filter((m: number) => m >= 1 && m <= 12)
            : [],
          onBehalfEnabled: !!ob.enabled,
          onBehalfMaxDays: nonNeg(ob.maxDays),
          settlementWindowDays: nonNeg(ob.settlementWindowDays),
        });
      } catch {
        // No config yet — defaults stay
      } finally {
        setLoading(false);
      }
    })();
  }, [open, scope?.companyId, scope?.branchId]);

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
        // Spread first so blocks this screen does not edit survive; every key below overwrites it.
        ...rawCfgRef.current,
        probation: {
          enabled: state.probationEnabled,
          durationDays: Number(state.probationDurationDays) || 90,
          allowUnpaidDuringProbation: state.allowUnpaidDuringProbation,
          exemptFromSandwich: state.exemptProbationFromSandwich,
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
        leaveConversion: {
          // eligibleTypes has no editor here (it is a leave-type list, not a policy switch), so it
          // is carried through untouched rather than reset to "all paid types".
          ...(rawCfgRef.current.leaveConversion ?? {}),
          enabled: state.conversionEnabled,
          maxEncashDaysPerYear: Number(state.maxEncashDaysPerYear) || 0,
          maxTransferDaysPerYear: Number(state.maxTransferDaysPerYear) || 0,
          minBalanceToRetain: Number(state.minBalanceToRetain) || 0,
          allowedFiscalMonths: [...state.allowedFiscalMonths].sort((a, b) => a - b),
          onBehalf: {
            enabled: state.onBehalfEnabled,
            maxDays: Number(state.onBehalfMaxDays) || 0,
            settlementWindowDays: Number(state.settlementWindowDays) || 0,
          },
        },
      };

      // Scoped → upsert for THIS scope. Never PUT by id when scoped: `configId` came from a
      // resolved read and may be an inherited org/global row, so updating it would rewrite the
      // policy for every sibling. The payload is rebuilt whole from state (which was seeded
      // from the resolved read), so a new branch override inherits every field.
      if (scope?.companyId || scope?.branchId) {
        await createNewConfiguration({
          module: LEAVE_POLICY_KEY,
          configuration,
          companyId: scope.companyId,
          branchId: scope.branchId,
        });
      } else if (configId) {
        await updateConfigurationById(configId, { module: LEAVE_POLICY_KEY, configuration });
      } else {
        await createNewConfiguration({ module: LEAVE_POLICY_KEY, configuration });
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
    const probationText = state.probationEnabled ? `${state.probationDurationDays} Days` : 'Off';
    const priorityCount = `${state.allocationPriority.length} Types`;
    const overflowText = state.cumulativeOverflow === 'spillToUnpaid' ? 'Spillover' : 'Block';
    const penaltyText = state.penaltyEnabled ? state.penaltyCutoffTime : 'Off';
    const conversionText = !state.conversionEnabled
      ? 'Off'
      : state.onBehalfEnabled ? 'On + behalf' : 'On';
    return { probationText, priorityCount, overflowText, penaltyText, conversionText };
  }, [state]);

  // Type scale mirrors the Sandwich Leave benchmark, nudged up for readability: 16 titles,
  // 13.5 body with a darker secondary for stronger contrast, 14.5 input text.
  const titleSx = { fontSize: 16, fontWeight: 800, color: 'text.primary', lineHeight: 1.3, letterSpacing: '-0.01em' } as const;
  const descSx = { fontSize: 13.5, color: theme.palette.mode === 'dark' ? 'text.secondary' : '#55606F', mt: 0.5, lineHeight: 1.6 } as const;
  // Shared input sizing — nudges MUI's small inputs/menu items to a comfortable reading size.
  // The select value wraps instead of truncating so long option text stays fully readable.
  const inputSx = {
    '& .MuiInputBase-input': { fontSize: 14.5, fontWeight: 500 },
    '& .MuiSelect-select': {
      fontSize: 14.5,
      fontWeight: 500,
      whiteSpace: 'normal !important',
      lineHeight: 1.4,
      minHeight: 'unset',
      py: 1,
    },
  } as const;
  // Give the dropdown menu breathing room so options are never clipped mid-word.
  const selectMenuProps = {
    MenuProps: { PaperProps: { sx: { maxWidth: 'min(92vw, 460px)', '& .MuiMenuItem-root': { whiteSpace: 'normal' } } } },
  };

  // Field label with a leading tinted glyph — keeps every input visually anchored to its meaning.
  // Icon box + fs-5 glyph follows the benchmark's IconBox sizing so both duotone layers render.
  const FieldLabel = ({ icon, tone, children }: { icon: string; tone: Tone; children: ReactNode }) => (
    <Stack direction="row" spacing={0.85} alignItems="center" sx={{ mb: 0.85 }}>
      <Box sx={{ display: 'grid', placeItems: 'center', width: 24, height: 24, borderRadius: '7px',
        bgcolor: tone.bg, border: `1px solid ${tone.bd}`, color: tone.c, flexShrink: 0, lineHeight: 0 }}>
        <KTIcon iconName={icon} className="fs-5" />
      </Box>
      <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: 'text.primary', letterSpacing: '0.01em' }}>{children}</Typography>
    </Stack>
  );

  return (
    <GlassDialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      header={(
        <GlassHeader
          title="Auto-Allocation Policy"
          subtitle="Configure new-joiner probation restrictions, paid consumption priority, cumulative overflow, late penalty rules, and leave conversion limits"
          icon={<KTIcon iconName="route" className="fs-1 text-white" />}
          onClose={onClose}
        />
      )}
    >
      <Box sx={{ p: { xs: 1.75, sm: 2.5 }, overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Metric Summary Bar — 2-across on phones so it isn't a tall stack, 5-across on desktop */}
        <Grid container spacing={{ xs: 1.25, sm: 2 }}>
          <Grid item xs={6} md={2.4}>
            <StatTile label="Probation" value={stats.probationText} trio={state.probationEnabled ? TRIO.purple : TRIO.slate} icon="security-user" />
          </Grid>
          <Grid item xs={6} md={2.4}>
            <StatTile label="Priority" value={stats.priorityCount} trio={TRIO.blue} icon="ranking" />
          </Grid>
          <Grid item xs={6} md={2.4}>
            <StatTile label="Overflow" value={stats.overflowText} trio={state.cumulativeOverflow === 'spillToUnpaid' ? TRIO.cyan : TRIO.rose} icon="filter-search" />
          </Grid>
          <Grid item xs={6} md={2.4}>
            <StatTile label="Penalty" value={stats.penaltyText} trio={state.penaltyEnabled ? TRIO.amber : TRIO.slate} icon="time" />
          </Grid>
          <Grid item xs={12} md={2.4}>
            <StatTile label="Conversion" value={stats.conversionText} trio={state.conversionEnabled ? TRIO.green : TRIO.slate} icon="dollar" />
          </Grid>
        </Grid>

        {loading ? (
          <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 220 }}>
            <CircularProgress size={36} sx={{ color: T.color.brand }} />
          </Box>
        ) : (
          <Stack spacing={2}>
            {/* Section 1: New-Joiner Probation */}
            <GlassSurface variant="thin" sx={{ p: { xs: 1.75, sm: 2.25 }, display: 'flex', flexDirection: 'column', gap: 1.75, borderTop: `3.5px solid ${TRIO.purple.c}` }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5 }}>
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
                  <IconBox icon="security-user" trio={TRIO.purple} size={36} fs="fs-3" />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={titleSx}>New-Joiner Probation Restriction</Typography>
                    <Typography sx={descSx}>During probation, paid leave is blocked — new joiners can only request Unpaid leave.</Typography>
                  </Box>
                </Stack>
                <WtSwitch tone={TRIO.purple.c} checked={state.probationEnabled} disabled={readOnly}
                  onChange={(e) => setState((s) => ({ ...s, probationEnabled: e.target.checked }))} />
              </Box>

              {state.probationEnabled && (
                <Grid container spacing={2} sx={{ pt: 1, borderTop: `1px solid ${divider}` }}>
                  <Grid item xs={12} sm={5}>
                    <FieldLabel icon="calendar-8" tone={TRIO.purple}>Probation Duration (days from joining)</FieldLabel>
                    <TextField type="number" size="small" fullWidth disabled={readOnly} sx={inputSx}
                      value={state.probationDurationDays}
                      onChange={(e) => setState((s) => ({ ...s, probationDurationDays: parseInt(e.target.value, 10) || 0 }))}
                      inputProps={{ min: 1, max: 365 }} />
                  </Grid>
                  <Grid item xs={12} sm={7} sx={{ display: 'flex', alignItems: 'center' }}>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <WtSwitch tone={TRIO.purple.c} checked={state.allowUnpaidDuringProbation} disabled={readOnly}
                        onChange={(e) => setState((s) => ({ ...s, allowUnpaidDuringProbation: e.target.checked }))} />
                      <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'text.primary', lineHeight: 1.5 }}>
                        Allow Unpaid leave requests during probation window
                      </Typography>
                    </Stack>
                  </Grid>

                  {/* Sandwich-rule exemption — fairness for new joiners with no accrued paid balance */}
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.75,
                      p: 1.75, borderRadius: '12px', bgcolor: TRIO.purple.bg, border: `1px solid ${TRIO.purple.bd}` }}>
                      <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ minWidth: 0 }}>
                        <Box sx={{ display: 'grid', placeItems: 'center', width: 30, height: 30, borderRadius: '9px',
                          bgcolor: '#fff', border: `1px solid ${TRIO.purple.bd}`, color: TRIO.purple.c, flexShrink: 0, mt: 0.2, lineHeight: 0 }}>
                          <KTIcon iconName="shield-tick" className="fs-4" />
                        </Box>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography sx={{ fontSize: 14.5, fontWeight: 700, color: 'text.primary', lineHeight: 1.4, letterSpacing: '-0.01em' }}>
                            Exempt probation joiners from the sandwich rule
                          </Typography>
                          <Typography sx={{ fontSize: 13.5, color: '#55606F', mt: 0.5, lineHeight: 1.6 }}>
                            While in probation, an employee's leave never triggers a sandwich salary deduction for the
                            bridging weekend/holiday — fair for new joiners who have not yet accrued paid leave.
                          </Typography>
                        </Box>
                      </Stack>
                      <WtSwitch tone={TRIO.purple.c} checked={state.exemptProbationFromSandwich} disabled={readOnly}
                        onChange={(e) => setState((s) => ({ ...s, exemptProbationFromSandwich: e.target.checked }))} />
                    </Box>
                  </Grid>
                </Grid>
              )}
            </GlassSurface>

            {/* Section 2: Paid Leave Consumption Priority */}
            <GlassSurface variant="thin" sx={{ p: { xs: 1.75, sm: 2.25 }, display: 'flex', flexDirection: 'column', gap: 1.75, borderTop: `3.5px solid ${TRIO.blue.c}` }}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <IconBox icon="ranking" trio={TRIO.blue} size={36} fs="fs-3" />
                <Box>
                  <Typography sx={titleSx}>Paid Leave Consumption Priority Order</Typography>
                  <Typography sx={descSx}>When a leave request spans multiple days, paid balances are consumed top-to-bottom; Unpaid is always used last.</Typography>
                </Box>
              </Stack>

              <Stack spacing={1.25} sx={{ pt: 1 }}>
                {state.allocationPriority.map((type, idx) => (
                  <GlassSurface key={type} variant="thin" radius={12}
                    sx={{
                      py: 1.5, px: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      transition: 'transform .15s, box-shadow .15s',
                      '&:hover': { transform: 'translateY(-1px)', boxShadow: T.shadow.cardHover },
                    }}>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Box sx={{ display: 'grid', placeItems: 'center', borderRadius: '50%', width: 30, height: 30,
                        border: `1px solid ${TRIO.blue.bd}`, bgcolor: TRIO.blue.bg, color: TRIO.blue.c, fontWeight: 800, fontSize: 14, flexShrink: 0 }}>
                        {idx + 1}
                      </Box>
                      <Typography sx={{ fontSize: 15, fontWeight: 700, color: 'text.primary', letterSpacing: '-0.01em' }}>{type}</Typography>
                    </Stack>

                    {!readOnly && (
                      <Stack direction="row" spacing={0.5}>
                        <WtIconButton disabled={idx === 0} onClick={() => movePriority(idx, -1)} title="Move Up">
                          <KTIcon iconName="arrow-up" className="fs-3" />
                        </WtIconButton>
                        <WtIconButton disabled={idx === state.allocationPriority.length - 1} onClick={() => movePriority(idx, 1)} title="Move Down">
                          <KTIcon iconName="arrow-down" className="fs-3" />
                        </WtIconButton>
                      </Stack>
                    )}
                  </GlassSurface>
                ))}
              </Stack>
            </GlassSurface>

            {/* Section 3: Cumulative Limit Overflow */}
            <GlassSurface variant="thin" sx={{ p: { xs: 1.75, sm: 2.25 }, display: 'flex', flexDirection: 'column', gap: 1.75, borderTop: `3.5px solid ${TRIO.cyan.c}` }}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <IconBox icon="filter-search" trio={TRIO.cyan} size={36} fs="fs-3" />
                <Box>
                  <Typography sx={titleSx}>Cumulative Limit Overflow Strategy</Typography>
                  <Typography sx={descSx}>Action taken by the Leave Allocation Engine when paid days exceed the cumulative monthly pacing limit.</Typography>
                </Box>
              </Stack>

              <TextField select size="small" fullWidth disabled={readOnly} sx={inputSx} SelectProps={selectMenuProps}
                value={state.cumulativeOverflow}
                onChange={(e) => setState((s) => ({ ...s, cumulativeOverflow: e.target.value as any }))}>
                <MenuItem value="spillToUnpaid" sx={{ fontSize: 14.5, whiteSpace: 'normal', lineHeight: 1.4, py: 1 }}>Book the excess days automatically as Unpaid leave (Spillover)</MenuItem>
                <MenuItem value="block" sx={{ fontSize: 14.5, whiteSpace: 'normal', lineHeight: 1.4, py: 1 }}>Block the request completely and require manager override</MenuItem>
              </TextField>
            </GlassSurface>

            {/* Section 4: Late Leave Apply Penalty */}
            <GlassSurface variant="thin" sx={{ p: { xs: 1.75, sm: 2.25 }, display: 'flex', flexDirection: 'column', gap: 1.75, borderTop: `3.5px solid ${TRIO.amber.c}` }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5 }}>
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
                  <IconBox icon="time" trio={TRIO.amber} size={36} fs="fs-3" />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={titleSx}>Same-Day / Late Leave Application Penalty</Typography>
                    <Typography sx={descSx}>Applies a penalty when an employee submits same-day leave after the configured daily cutoff time.</Typography>
                  </Box>
                </Stack>
                <WtSwitch tone={TRIO.amber.c} checked={state.penaltyEnabled} disabled={readOnly}
                  onChange={(e) => setState((s) => ({ ...s, penaltyEnabled: e.target.checked }))} />
              </Box>

              {state.penaltyEnabled && (
                <Grid container spacing={2} sx={{ pt: 1, borderTop: `1px solid ${divider}` }}>
                  <Grid item xs={12} sm={6} md={4}>
                    <FieldLabel icon="time" tone={TRIO.amber}>Cutoff Time (24h, IST)</FieldLabel>
                    <TimeWheelField
                      value={state.penaltyCutoffTime}
                      disabled={readOnly}
                      tone={TRIO.amber}
                      onChange={(v) => setState((s) => ({ ...s, penaltyCutoffTime: v }))}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6} md={4}>
                    <FieldLabel icon="wrench" tone={TRIO.amber}>Penalty Structure</FieldLabel>
                    <TextField select size="small" fullWidth disabled={readOnly} sx={inputSx} SelectProps={selectMenuProps}
                      value={state.penaltyType}
                      onChange={(e) => setState((s) => ({ ...s, penaltyType: e.target.value as any }))}>
                      <MenuItem value="halfDaySalaryDeduction" sx={{ fontSize: 14.5, whiteSpace: 'normal', lineHeight: 1.4, py: 1 }}>Salary deduction (LOP)</MenuItem>
                      <MenuItem value="halfPaidLeave" sx={{ fontSize: 14.5, whiteSpace: 'normal', lineHeight: 1.4, py: 1 }}>Paid leave deduction</MenuItem>
                      <MenuItem value="fixedAmountDeduction" sx={{ fontSize: 14.5, whiteSpace: 'normal', lineHeight: 1.4, py: 1 }}>Fixed Amount (₹)</MenuItem>
                    </TextField>
                  </Grid>

                  <Grid item xs={12} sm={6} md={4}>
                    {state.penaltyType === 'fixedAmountDeduction' ? (
                      <>
                        <FieldLabel icon="dollar" tone={TRIO.amber}>Deduction Amount (₹)</FieldLabel>
                        <TextField type="number" size="small" fullWidth disabled={readOnly} sx={inputSx}
                          value={state.penaltyFixedAmount}
                          onChange={(e) => setState((s) => ({ ...s, penaltyFixedAmount: parseFloat(e.target.value) || 0 }))} />
                      </>
                    ) : (
                      <>
                        <FieldLabel icon="calculator" tone={TRIO.amber}>Penalty Days Magnitude</FieldLabel>
                        <TextField select size="small" fullWidth disabled={readOnly} sx={inputSx} SelectProps={selectMenuProps}
                          value={state.penaltyDays}
                          onChange={(e) => setState((s) => ({ ...s, penaltyDays: Number(e.target.value) as any }))}>
                          <MenuItem value={0.5} sx={{ fontSize: 14.5, whiteSpace: 'normal', lineHeight: 1.4, py: 1 }}>0.5 Days (Half-day penalty)</MenuItem>
                          <MenuItem value={1} sx={{ fontSize: 14.5, whiteSpace: 'normal', lineHeight: 1.4, py: 1 }}>1.0 Day (Full-day penalty)</MenuItem>
                        </TextField>
                      </>
                    )}
                  </Grid>
                </Grid>
              )}
            </GlassSurface>

            {/* Section 5: Leave Conversion (encashment & transfer) */}
            <GlassSurface variant="thin" sx={{ p: { xs: 1.75, sm: 2.25 }, display: 'flex', flexDirection: 'column', gap: 1.75, borderTop: `3.5px solid ${TRIO.green.c}` }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5 }}>
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
                  <IconBox icon="dollar" trio={TRIO.green} size={36} fs="fs-3" />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={titleSx}>Leave Conversion (Encashment &amp; Transfer)</Typography>
                    <Typography sx={descSx}>
                      Whether employees may cash out or transfer unused paid leave, and the ceilings that apply.
                      Every limit here is enforced server-side on each request, not just in the modal.
                    </Typography>
                  </Box>
                </Stack>
                <WtSwitch tone={TRIO.green.c} checked={state.conversionEnabled} disabled={readOnly}
                  onChange={(e) => setState((s) => ({ ...s, conversionEnabled: e.target.checked }))} />
              </Box>

              {state.conversionEnabled && (
                <Grid container spacing={2} sx={{ pt: 1, borderTop: `1px solid ${divider}` }}>
                  <Grid item xs={12} sm={6} md={4}>
                    <FieldLabel icon="dollar" tone={TRIO.green}>Max Encashable Days / Year</FieldLabel>
                    <TextField type="number" size="small" fullWidth disabled={readOnly} sx={inputSx}
                      value={state.maxEncashDaysPerYear}
                      onChange={(e) => setState((s) => ({ ...s, maxEncashDaysPerYear: Math.max(0, parseFloat(e.target.value) || 0) }))}
                      inputProps={{ min: 0, step: 0.5 }}
                      helperText="0 = no limit" FormHelperTextProps={{ sx: { fontSize: 12 } }} />
                  </Grid>

                  <Grid item xs={12} sm={6} md={4}>
                    <FieldLabel icon="arrows-circle" tone={TRIO.green}>Max Transferable Days / Year</FieldLabel>
                    <TextField type="number" size="small" fullWidth disabled={readOnly} sx={inputSx}
                      value={state.maxTransferDaysPerYear}
                      onChange={(e) => setState((s) => ({ ...s, maxTransferDaysPerYear: Math.max(0, parseFloat(e.target.value) || 0) }))}
                      inputProps={{ min: 0, step: 0.5 }}
                      helperText="0 = no limit" FormHelperTextProps={{ sx: { fontSize: 12 } }} />
                  </Grid>

                  <Grid item xs={12} sm={6} md={4}>
                    <FieldLabel icon="shield-tick" tone={TRIO.green}>Minimum Balance To Retain</FieldLabel>
                    <TextField type="number" size="small" fullWidth disabled={readOnly} sx={inputSx}
                      value={state.minBalanceToRetain}
                      onChange={(e) => setState((s) => ({ ...s, minBalanceToRetain: Math.max(0, parseFloat(e.target.value) || 0) }))}
                      inputProps={{ min: 0, step: 0.5 }}
                      helperText="Days the employee must keep after converting" FormHelperTextProps={{ sx: { fontSize: 12 } }} />
                  </Grid>

                  <Grid item xs={12}>
                    <FieldLabel icon="calendar-8" tone={TRIO.green}>Allowed Months (fiscal year, April → March)</FieldLabel>
                    <Stack direction="row" flexWrap="wrap" sx={{ gap: 0.75 }}>
                      {FISCAL_MONTHS.map((label, idx) => {
                        const month = idx + 1;
                        const on = state.allowedFiscalMonths.includes(month);
                        return (
                          <ButtonBase key={label} disabled={readOnly}
                            onClick={() => setState((s) => ({
                              ...s,
                              allowedFiscalMonths: on
                                ? s.allowedFiscalMonths.filter((m) => m !== month)
                                : [...s.allowedFiscalMonths, month],
                            }))}
                            sx={{
                              px: 1.5, py: 0.75, borderRadius: '10px', fontSize: 13, fontWeight: 700,
                              border: `1px solid ${on ? TRIO.green.bd : divider}`,
                              bgcolor: on ? TRIO.green.bg : 'transparent',
                              color: on ? TRIO.green.c : 'text.secondary',
                              transition: 'all .15s',
                              '&:hover': { borderColor: TRIO.green.bd },
                            }}>
                            {label}
                          </ButtonBase>
                        );
                      })}
                    </Stack>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.75 }}>
                      Select none to allow conversion in any month. Encashment is conventionally a year-end action.
                      This window never applies to an Admin/HR on-behalf settlement — a leaver does not wait for March.
                    </Typography>
                  </Grid>

                  {/* Admin/HR converting for someone else — the leaver-settlement path */}
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.75,
                      p: 1.75, borderRadius: '12px', bgcolor: TRIO.green.bg, border: `1px solid ${TRIO.green.bd}` }}>
                      <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ minWidth: 0 }}>
                        <Box sx={{ display: 'grid', placeItems: 'center', width: 30, height: 30, borderRadius: '9px',
                          bgcolor: '#fff', border: `1px solid ${TRIO.green.bd}`, color: TRIO.green.c, flexShrink: 0, mt: 0.2, lineHeight: 0 }}>
                          <KTIcon iconName="people" className="fs-4" />
                        </Box>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography sx={{ fontSize: 14.5, fontWeight: 700, color: 'text.primary', lineHeight: 1.4, letterSpacing: '-0.01em' }}>
                            Allow Admin/HR to convert on an employee&apos;s behalf
                          </Typography>
                          <Typography sx={{ fontSize: 13.5, color: '#55606F', mt: 0.5, lineHeight: 1.6 }}>
                            Required to settle a leaver&apos;s unused balance: conversion is otherwise employee-initiated,
                            so someone who has already exited can never cash out what they are owed. This switch is what
                            enables the Unsettled Leavers panel on the admin Leave Management screen.
                          </Typography>
                        </Box>
                      </Stack>
                      <WtSwitch tone={TRIO.green.c} checked={state.onBehalfEnabled} disabled={readOnly}
                        onChange={(e) => setState((s) => ({ ...s, onBehalfEnabled: e.target.checked }))} />
                    </Box>
                  </Grid>

                  {state.onBehalfEnabled && (
                    <>
                      <Grid item xs={12} sm={6}>
                        <FieldLabel icon="dollar" tone={TRIO.green}>On-Behalf Ceiling (days)</FieldLabel>
                        <TextField type="number" size="small" fullWidth disabled={readOnly} sx={inputSx}
                          value={state.onBehalfMaxDays}
                          onChange={(e) => setState((s) => ({ ...s, onBehalfMaxDays: Math.max(0, parseFloat(e.target.value) || 0) }))}
                          inputProps={{ min: 0, step: 0.5 }}
                          helperText="0 = fall back to the employee ceiling above" FormHelperTextProps={{ sx: { fontSize: 12 } }} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FieldLabel icon="calendar-8" tone={TRIO.green}>Settlement Window (days after exit)</FieldLabel>
                        <TextField type="number" size="small" fullWidth disabled={readOnly} sx={inputSx}
                          value={state.settlementWindowDays}
                          onChange={(e) => setState((s) => ({ ...s, settlementWindowDays: Math.max(0, parseInt(e.target.value, 10) || 0) }))}
                          inputProps={{ min: 0 }}
                          helperText="0 = no deadline. Past the window a leaver is still listed, never hidden." FormHelperTextProps={{ sx: { fontSize: 12 } }} />
                      </Grid>
                    </>
                  )}
                </Grid>
              )}
            </GlassSurface>
          </Stack>
        )}
      </Box>


      {/* Footer Actions — benchmark spacing (px 2.5 / py 1.5) and button physics */}
      <Box sx={{
        px: { xs: 2, sm: 2.5 }, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1.25,
        flexShrink: 0, borderTop: `1px solid ${divider}`, backgroundColor: alpha(theme.palette.background.paper, 0.4),
        flexDirection: { xs: 'column-reverse', sm: 'row' },
      }}>
        <WtButton ghost onClick={onClose} disabled={saving} sx={{ width: { xs: '100%', sm: 'auto' } }}>
          Cancel
        </WtButton>
        {!readOnly && (
          <WtButton tone="primary" onClick={handleSave} disabled={saving}
            startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <KTIcon iconName="check-circle" className="fs-4" />}
            sx={{
              px: { xs: 3, sm: 3.5 }, py: 1.3, minHeight: 48, borderRadius: '12px',
              fontSize: 15, fontWeight: 700, letterSpacing: 0.2,
              width: { xs: '100%', sm: 'auto' },
            }}>
            {saving ? 'Saving Policy…' : 'Save Auto-Allocation Policy'}
          </WtButton>
        )}
      </Box>
    </GlassDialog>
  );
}

export default LeavePolicyModal;
