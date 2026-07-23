import { useEffect, useState, useMemo, useRef, type ReactNode } from 'react';
import { KTIcon } from '@metronic/helpers';
import { Box, ButtonBase, CircularProgress, Grid, MenuItem, Popover, Stack, Switch, TextField, Typography } from '@mui/material';
import { createNewConfiguration, fetchConfiguration, updateConfigurationById } from '@services/company';
import { successConfirmation, errorConfirmation } from '@utils/modal';
import { LEAVE_POLICY_KEY } from '@constants/configurations-key';
// Same MUI glass kit as the Sandwich Leave benchmark — single source of truth for the look.
import {
  WtButton, WtIconButton, GlassSurface, GlassDialog, GlassHeader,
  TRIO, IconBox, StatTile, T,
} from '@app/modules/common/components/ui';

interface LeavePolicyModalProps {
  open: boolean;
  onClose: () => void;
  readOnly?: boolean;
}

const DEFAULT_PRIORITY = ['Casual Leaves', 'Sick Leaves', 'Floater Leaves', 'Annual Leaves'];

type Tone = { c: string; bg: string; bd: string };

// ── Scroll-wheel time picker ────────────────────────────────────────────────
// Two snap-scrolling columns (hours / minutes) in a popover — big touch targets,
// no clock-face fiddling, works the same on phone and desktop.
const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
const ITEM_H = 40;

function WheelColumn({ items, selected, onSelect, tone }: {
  items: string[]; selected: string; onSelect: (v: string) => void; tone: Tone;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  // Center the selected value once, when the popover mounts.
  useEffect(() => {
    const idx = items.indexOf(selected);
    const el = boxRef.current;
    if (el && idx >= 0) el.scrollTop = idx * ITEM_H - (el.clientHeight / 2 - ITEM_H / 2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <Box
      ref={boxRef}
      sx={{
        height: ITEM_H * 5,
        overflowY: 'auto',
        scrollSnapType: 'y proximity',
        px: 0.75,
        py: `${ITEM_H * 2}px`, // padding so first/last items can center
        '&::-webkit-scrollbar': { width: 6 },
        '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(15,23,42,0.15)', borderRadius: 3 },
        maskImage: 'linear-gradient(to bottom, transparent, #000 22%, #000 78%, transparent)',
      }}
    >
      {items.map((it) => {
        const on = it === selected;
        return (
          <ButtonBase
            key={it}
            onClick={() => onSelect(it)}
            sx={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '100%', height: ITEM_H, my: 0.25, borderRadius: 2,
              scrollSnapAlign: 'center',
              fontWeight: on ? 800 : 600,
              fontSize: on ? 21 : 16.5,
              letterSpacing: 0.5,
              color: on ? '#fff' : 'text.secondary',
              bgcolor: on ? tone.c : 'transparent',
              boxShadow: on ? `0 6px 14px -4px ${tone.c}66` : 'none',
              transition: 'background-color .14s, color .14s, font-size .14s',
              '&:hover': { bgcolor: on ? tone.c : tone.bg },
            }}
          >
            {it}
          </ButtonBase>
        );
      })}
    </Box>
  );
}

function TimeWheelField({ value, onChange, disabled, tone }: {
  value: string; onChange: (v: string) => void; disabled?: boolean; tone: Tone;
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const open = Boolean(anchor);
  const m = /^(\d{2}):(\d{2})$/.exec(value || '');
  const hh = m ? m[1] : '12';
  const mm = m ? m[2] : '00';

  return (
    <>
      <ButtonBase
        disabled={disabled}
        onClick={(e) => setAnchor(e.currentTarget)}
        sx={{
          width: '100%', height: 40, px: 1.5, borderRadius: '8px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          border: `1px solid ${open ? tone.c : '#d9dee6'}`,
          bgcolor: disabled ? '#f4f6f9' : '#fff',
          boxShadow: open ? `0 0 0 3px ${tone.c}26` : 'none',
          transition: 'border-color .15s, box-shadow .15s',
          '&:hover': { borderColor: disabled ? '#d9dee6' : tone.c },
        }}
      >
        <Typography component="span" sx={{ fontSize: 16.5, fontWeight: 700, color: 'text.primary', fontVariantNumeric: 'tabular-nums' }}>
          {hh}<Box component="span" sx={{ color: tone.c, mx: 0.5 }}>:</Box>{mm}
        </Typography>
        <KTIcon iconName="time" className="fs-3" />
      </ButtonBase>

      <Popover
        open={open}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{ paper: { sx: { mt: 1, borderRadius: 3, overflow: 'hidden', boxShadow: '0 24px 64px -12px rgba(16,24,40,0.28)', border: '1px solid #eceff3' } } }}
      >
        <Box sx={{ width: 220 }}>
          <Box sx={{ px: 2, py: 1.25, borderBottom: '1px solid #eef1f5', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: 'text.secondary' }}>
              Cutoff Time
            </Typography>
            <Typography sx={{ fontSize: 17, fontWeight: 800, color: tone.c, fontVariantNumeric: 'tabular-nums' }}>{hh}:{mm}</Typography>
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'stretch' }}>
            <WheelColumn items={HOURS} selected={hh} tone={tone} onSelect={(h) => onChange(`${h}:${mm}`)} />
            <Box sx={{ display: 'grid', placeItems: 'center', fontSize: 20, fontWeight: 800, color: 'text.disabled' }}>:</Box>
            <WheelColumn items={MINUTES} selected={mm} tone={tone} onSelect={(mi) => onChange(`${hh}:${mi}`)} />
          </Box>
          <Box sx={{ px: 1.25, pb: 1.25, pt: 0.5 }}>
            <ButtonBase
              onClick={() => setAnchor(null)}
              sx={{ width: '100%', height: 38, borderRadius: 2, fontSize: 14.5, fontWeight: 700, color: '#fff', bgcolor: tone.c,
                boxShadow: `0 8px 18px -6px ${tone.c}80`, transition: 'filter .15s', '&:hover': { filter: 'brightness(1.06)' } }}
            >
              Done
            </ButtonBase>
          </Box>
        </Box>
      </Popover>
    </>
  );
}

// Polished pill toggle — tinted gradient track + shadowed thumb when on, soft grey when off.
const tintedSwitch = (c: string) => ({
  width: 46,
  height: 26,
  padding: 0,
  flexShrink: 0,
  '& .MuiSwitch-switchBase': {
    padding: 0,
    margin: '3px',
    transitionDuration: '220ms',
    '&.Mui-checked': {
      transform: 'translateX(20px)',
      color: '#fff',
      '& + .MuiSwitch-track': {
        backgroundColor: c,
        backgroundImage: `linear-gradient(135deg, ${c} 0%, ${c}cc 100%)`,
        opacity: 1,
        border: 0,
      },
    },
    '&.Mui-disabled + .MuiSwitch-track': { opacity: 0.4 },
  },
  '& .MuiSwitch-thumb': {
    boxSizing: 'border-box',
    width: 20,
    height: 20,
    boxShadow: '0 2px 5px rgba(15,23,42,0.28)',
  },
  '& .MuiSwitch-track': {
    borderRadius: 13,
    backgroundColor: '#e4e8ee',
    opacity: 1,
    transition: 'background-color .3s',
  },
});

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
    const probationText = state.probationEnabled ? `${state.probationDurationDays} Days` : 'Off';
    const priorityCount = `${state.allocationPriority.length} Types`;
    const overflowText = state.cumulativeOverflow === 'spillToUnpaid' ? 'Spillover' : 'Block';
    const penaltyText = state.penaltyEnabled ? state.penaltyCutoffTime : 'Off';
    return { probationText, priorityCount, overflowText, penaltyText };
  }, [state]);

  // Type scale mirrors the Sandwich Leave benchmark: 15.5 titles, 13 body/labels, 14 input text.
  const titleSx = { fontSize: 15.5, fontWeight: 800, color: 'text.primary', lineHeight: 1.3 } as const;
  const descSx = { fontSize: 13, color: 'text.secondary', mt: 0.4, lineHeight: 1.5 } as const;
  // Shared input sizing — nudges MUI's small inputs/menu items to a comfortable reading size.
  // The select value wraps instead of truncating so long option text stays fully readable.
  const inputSx = {
    '& .MuiInputBase-input': { fontSize: 14 },
    '& .MuiSelect-select': {
      fontSize: 14,
      whiteSpace: 'normal !important',
      lineHeight: 1.35,
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
      <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'text.primary' }}>{children}</Typography>
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
          subtitle="Configure new-joiner probation restrictions, paid consumption priority, cumulative overflow, and late penalty rules"
          icon={<KTIcon iconName="route" className="fs-1 text-white" />}
          onClose={onClose}
        />
      )}
    >
      <Box sx={{ p: { xs: 1.75, sm: 2.5 }, overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Metric Summary Bar — 2×2 on phones so it isn't a tall stack, 4-across on desktop */}
        <Grid container spacing={{ xs: 1.25, sm: 2 }}>
          <Grid item xs={6} md={3}>
            <StatTile label="Probation" value={stats.probationText} trio={state.probationEnabled ? TRIO.purple : TRIO.slate} icon="security-user" />
          </Grid>
          <Grid item xs={6} md={3}>
            <StatTile label="Priority" value={stats.priorityCount} trio={TRIO.blue} icon="ranking" />
          </Grid>
          <Grid item xs={6} md={3}>
            <StatTile label="Overflow" value={stats.overflowText} trio={state.cumulativeOverflow === 'spillToUnpaid' ? TRIO.cyan : TRIO.rose} icon="filter-search" />
          </Grid>
          <Grid item xs={6} md={3}>
            <StatTile label="Penalty" value={stats.penaltyText} trio={state.penaltyEnabled ? TRIO.amber : TRIO.slate} icon="time" />
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
                <Switch checked={state.probationEnabled} disabled={readOnly}
                  onChange={(e) => setState((s) => ({ ...s, probationEnabled: e.target.checked }))}
                  sx={tintedSwitch(TRIO.purple.c)} />
              </Box>

              {state.probationEnabled && (
                <Grid container spacing={2} sx={{ pt: 1, borderTop: `1px solid ${T.color.line}` }}>
                  <Grid item xs={12} sm={5}>
                    <FieldLabel icon="calendar-8" tone={TRIO.purple}>Probation Duration (days from joining)</FieldLabel>
                    <TextField type="number" size="small" fullWidth disabled={readOnly} sx={inputSx}
                      value={state.probationDurationDays}
                      onChange={(e) => setState((s) => ({ ...s, probationDurationDays: parseInt(e.target.value, 10) || 0 }))}
                      inputProps={{ min: 1, max: 365 }} />
                  </Grid>
                  <Grid item xs={12} sm={7} sx={{ display: 'flex', alignItems: 'center' }}>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Switch checked={state.allowUnpaidDuringProbation} disabled={readOnly}
                        onChange={(e) => setState((s) => ({ ...s, allowUnpaidDuringProbation: e.target.checked }))}
                        sx={tintedSwitch(TRIO.purple.c)} />
                      <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: 'text.primary', lineHeight: 1.4 }}>
                        Allow Unpaid leave requests during probation window
                      </Typography>
                    </Stack>
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
                        border: `1px solid ${TRIO.blue.bd}`, bgcolor: TRIO.blue.bg, color: TRIO.blue.c, fontWeight: 800, fontSize: 13.5, flexShrink: 0 }}>
                        {idx + 1}
                      </Box>
                      <Typography sx={{ fontSize: 14.5, fontWeight: 700, color: 'text.primary' }}>{type}</Typography>
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
                <MenuItem value="spillToUnpaid" sx={{ fontSize: 14, whiteSpace: 'normal', lineHeight: 1.35, py: 1 }}>Book the excess days automatically as Unpaid leave (Spillover)</MenuItem>
                <MenuItem value="block" sx={{ fontSize: 14, whiteSpace: 'normal', lineHeight: 1.35, py: 1 }}>Block the request completely and require manager override</MenuItem>
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
                <Switch checked={state.penaltyEnabled} disabled={readOnly}
                  onChange={(e) => setState((s) => ({ ...s, penaltyEnabled: e.target.checked }))}
                  sx={tintedSwitch(TRIO.amber.c)} />
              </Box>

              {state.penaltyEnabled && (
                <Grid container spacing={2} sx={{ pt: 1, borderTop: `1px solid ${T.color.line}` }}>
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
                      <MenuItem value="halfDaySalaryDeduction" sx={{ fontSize: 14, whiteSpace: 'normal', lineHeight: 1.35, py: 1 }}>Salary deduction (LOP)</MenuItem>
                      <MenuItem value="halfPaidLeave" sx={{ fontSize: 14, whiteSpace: 'normal', lineHeight: 1.35, py: 1 }}>Paid leave deduction</MenuItem>
                      <MenuItem value="fixedAmountDeduction" sx={{ fontSize: 14, whiteSpace: 'normal', lineHeight: 1.35, py: 1 }}>Fixed Amount (₹)</MenuItem>
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
                          <MenuItem value={0.5} sx={{ fontSize: 14, whiteSpace: 'normal', lineHeight: 1.35, py: 1 }}>0.5 Days (Half-day penalty)</MenuItem>
                          <MenuItem value={1} sx={{ fontSize: 14, whiteSpace: 'normal', lineHeight: 1.35, py: 1 }}>1.0 Day (Full-day penalty)</MenuItem>
                        </TextField>
                      </>
                    )}
                  </Grid>
                </Grid>
              )}
            </GlassSurface>
          </Stack>
        )}
      </Box>

      {/* Footer Actions — benchmark spacing (px 2.5 / py 1.5) and button physics */}
      <Box sx={{
        px: { xs: 2, sm: 2.5 }, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1.25,
        flexShrink: 0, borderTop: `1px solid ${T.color.line}`, backgroundColor: 'rgba(255,255,255,0.4)',
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
