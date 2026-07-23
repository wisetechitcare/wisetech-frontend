import { useEffect, useState, useMemo } from 'react';
import { KTIcon } from '@metronic/helpers';
import { Box, CircularProgress, Grid, Stack, TextField, Tooltip, Typography, useMediaQuery } from '@mui/material';
import {
  fetchAllAddonLeavesAllowances,
  upsertAddonLeavesAllowances,
  IAddonLeavesAllowance,
  IAddonLeavesAllowanceCreate,
} from '@services/addonLeavesAllowance';
import { successConfirmation, errorConfirmation } from '@utils/modal';
import eventBus from '@utils/EventBus';
import { EVENT_KEYS } from '@constants/eventKeys';
// Same MUI glass kit as the Sandwich Leave benchmark — single source of truth for the look.
import {
  WtButton, WtIconButton, GlassSurface, GlassDialog, GlassHeader,
  TRIO, IconBox, StatTile, T,
} from '@app/modules/common/components/ui';

interface AddonLeavesModalProps {
  open: boolean;
  onClose: () => void;
  readOnly?: boolean;
}

// 1..10 experience years, 11 = 10+ years
const EXP_TIERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

const PRESETS: Array<{ key: 'standard' | 'linear' | 'clear'; label: string; icon: string; hint: string }> = [
  { key: 'standard', label: 'Standard', icon: 'text-align-left', hint: 'Graduated tiers: 2, 4, 6, 8, then 10+ days' },
  { key: 'linear', label: 'Linear', icon: 'chart-line-up', hint: 'Add +1 day per completed year (capped at 10)' },
  { key: 'clear', label: 'Clear', icon: 'trash', hint: 'Reset every tier back to 0 days' },
];

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

  const reduce = useMediaQuery('(prefers-reduced-motion: reduce)');
  // Staggered entrance identical to the Sandwich benchmark (swFadeUp), reduced-motion safe.
  const riseSx = (i: number) => (reduce ? {} : {
    animation: 'wtFadeUp .32s cubic-bezier(0.16, 1, 0.3, 1) both',
    animationDelay: `${Math.min(i, 10) * 40}ms`,
    '@keyframes wtFadeUp': { from: { opacity: 0, transform: 'translateY(10px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
  });

  // Live "breathing" halo for the engine-status dot — self-contained (the shared `.sw-dot-pulse`
  // keyframe lives only in SandwhichLeave's local <style>, so we drive it here via sx instead).
  const g = TRIO.green;
  const liveDotSx = {
    width: 9, height: 9, borderRadius: 999, bgcolor: g.c, flexShrink: 0, position: 'relative',
    ...(reduce ? {} : {
      '&::after': {
        content: '""', position: 'absolute', inset: 0, borderRadius: 999,
        boxShadow: `0 0 0 0 ${g.c}66`, animation: 'wtLivePing 2.1s cubic-bezier(0, 0, 0.2, 1) infinite',
      },
      '@keyframes wtLivePing': {
        '0%': { boxShadow: `0 0 0 0 ${g.c}59` },
        '70%': { boxShadow: `0 0 0 7px ${g.c}00` },
        '100%': { boxShadow: `0 0 0 0 ${g.c}00` },
      },
    }),
  } as const;

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
      <Box sx={{ p: { xs: 1.75, sm: 3 }, overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: { xs: 2, sm: 2.5 } }}>
        {/* Metric Summary Bar — 2-up on phones, 4-up on desktop */}
        <Grid container spacing={{ xs: 1.5, sm: 2 }}>
          <Grid item xs={6} md={3} sx={riseSx(0)}>
            <StatTile label="Configured Tiers" value={`${stats.configuredCount} / ${EXP_TIERS.length}`} trio={TRIO.purple} icon="element-11" />
          </Grid>
          <Grid item xs={6} md={3} sx={riseSx(1)}>
            <StatTile label="Max Addon Days" value={`+${stats.maxDays} Days`} trio={TRIO.green} icon="calendar-add" />
          </Grid>
          <Grid item xs={6} md={3} sx={riseSx(2)}>
            <StatTile label="Avg Addon / Tier" value={`${stats.avgDays} Days`} trio={TRIO.blue} icon="graph-up" />
          </Grid>
          <Grid item xs={6} md={3} sx={riseSx(3)}>
            <GlassSurface variant="thin" sx={{
              minWidth: 0, p: 1.5, height: '100%', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: 1.25,
              boxShadow: T.shadow.card, transition: 'transform .2s cubic-bezier(0.4,0,0.2,1), box-shadow .2s',
              '&:hover': { transform: 'translateY(-2px)', boxShadow: T.shadow.cardHover, borderColor: g.bd },
            }}>
              <IconBox icon="shield-tick" trio={TRIO.green} size={40} fs="fs-2" />
              <Box sx={{ minWidth: 0 }}>
                <Typography noWrap sx={{ fontSize: 11, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700 }}>
                  Engine Status
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.25 }}>
                  <Box sx={liveDotSx} />
                  <Typography sx={{ fontSize: { xs: 12.5, sm: 13.5 }, fontWeight: 800, lineHeight: 1.2, color: g.c }}>
                    Active &amp; Enforced
                  </Typography>
                </Box>
              </Box>
            </GlassSurface>
          </Grid>
        </Grid>

        {/* Guidance Callout */}
        <GlassSurface variant="thin" radius={14} sx={{ p: { xs: 1.75, sm: 2 }, display: 'flex', alignItems: 'flex-start', gap: { xs: 1.5, sm: 1.75 }, border: `1px solid ${TRIO.blue.bd}`, ...riseSx(4) }}>
          <IconBox icon="information-5" trio={TRIO.blue} size={40} fs="fs-2" />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: { xs: 14, sm: 14.5 }, fontWeight: 800, color: 'text.primary', mb: 0.4 }}>How Addon Leaves Work</Typography>
            <Typography sx={{ fontSize: { xs: 12.5, sm: 13 }, color: 'text.secondary', lineHeight: 1.6 }}>
              Employees receive additional leave days based on their completed years of experience in the company. These addon leave days are calculated automatically by the backend Leave Allocation Engine and added directly onto their base annual allowance.
            </Typography>
          </Box>
        </GlassSurface>

        {/* Preset Toolbar */}
        {!readOnly && (
          <GlassSurface variant="thin" radius={14} sx={{
            p: 1.5, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'stretch', sm: 'center' },
            justifyContent: 'space-between', gap: 1.5, ...riseSx(5),
          }}>
            <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.75, flexShrink: 0 }}>
              <KTIcon iconName="magic-star" className="fs-3 text-primary" />
              Quick Presets
            </Typography>
            <Stack direction="row" spacing={1} useFlexGap sx={{ width: { xs: '100%', sm: 'auto' } }}>
              {PRESETS.map((p) => (
                <Tooltip key={p.key} title={p.hint} arrow>
                  <WtButton
                    ghost
                    onClick={() => applyPreset(p.key)}
                    startIcon={<KTIcon iconName={p.icon} className="fs-4" />}
                    sx={{ flex: { xs: 1, sm: 'initial' }, minWidth: 0, px: { xs: 1, sm: 1.5 } }}
                  >
                    {p.label}
                  </WtButton>
                </Tooltip>
              ))}
            </Stack>
          </GlassSurface>
        )}

        {/* Tiers Grid */}
        {loading ? (
          <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 260, gap: 1.5 }}>
            <CircularProgress size={38} sx={{ color: T.color.brand }} />
            <Typography sx={{ fontSize: 12.5, color: 'text.secondary', fontWeight: 600 }}>Loading tier configuration…</Typography>
          </Box>
        ) : (
          <Grid container spacing={{ xs: 1.5, sm: 2 }}>
            {EXP_TIERS.map((exp, tIdx) => {
              const val = values[exp] ?? 0;
              const isConfigured = val > 0;
              const isPlus = exp === 11;
              const labelText = isPlus ? '10+ Years' : `${exp} Year${exp > 1 ? 's' : ''}`;
              const expBadge = isPlus ? '10+' : `${exp}`;
              const trio = isConfigured ? (isPlus ? TRIO.purple : TRIO.green) : TRIO.slate;

              return (
                <Grid item xs={6} sm={4} md={3} lg={2.4} key={exp}>
                  <GlassSurface
                    variant="thin"
                    sx={{
                      p: { xs: 1.5, sm: 2 }, height: '100%', display: 'flex', flexDirection: 'column', gap: { xs: 1.25, sm: 1.5 },
                      border: `1px solid ${trio.bd}`, borderTop: `3.5px solid ${trio.c}`,
                      transition: 'transform .18s cubic-bezier(0.16,1,0.3,1), box-shadow .18s, border-color .18s',
                      '&:hover': { transform: 'translateY(-3px)', boxShadow: T.shadow.cardHover, borderColor: trio.c },
                      ...riseSx(6 + tIdx),
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 0.75 }}>
                      <Box sx={{ display: 'grid', placeItems: 'center', width: 36, height: 36, borderRadius: '11px', border: `1px solid ${trio.bd}`, backgroundColor: trio.bg, color: trio.c, fontWeight: 800, fontSize: 13.5, flexShrink: 0 }}>
                        {expBadge}
                      </Box>
                      <Box sx={{
                        display: 'inline-flex', alignItems: 'center', gap: '5px', px: '8px', py: '3px', borderRadius: 999,
                        bgcolor: trio.bg, border: `1px solid ${trio.bd}`,
                      }}>
                        <Box sx={{ width: 6, height: 6, borderRadius: 999, bgcolor: trio.c }} />
                        <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: trio.c, lineHeight: 1, whiteSpace: 'nowrap' }}>
                          {isConfigured ? 'Set' : 'Off'}
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ minWidth: 0 }}>
                      <Typography noWrap sx={{ fontSize: { xs: 13.5, sm: 14.5 }, fontWeight: 700, color: 'text.primary', lineHeight: 1.3 }}>{labelText}</Typography>
                      <Typography noWrap sx={{ fontSize: 11.5, color: 'text.secondary' }}>Addon leave days</Typography>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 'auto' }}>
                      <WtIconButton
                        color={trio.c}
                        disabled={readOnly || val <= 0}
                        onClick={() => handleChange(exp, val - 1)}
                        title="Decrease"
                        sx={{ width: 34, height: 34, flexShrink: 0 }}
                      >
                        <KTIcon iconName="minus" className="fs-5" />
                      </WtIconButton>
                      <TextField
                        type="number" size="small" fullWidth disabled={readOnly}
                        value={val}
                        onChange={(e) => handleChange(exp, parseInt(e.target.value, 10))}
                        inputProps={{ min: 0, max: 50, 'aria-label': `${labelText} addon days`, style: { textAlign: 'center', fontWeight: 800, fontSize: 15, padding: '6px 4px' } }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: '10px',
                            transition: 'box-shadow .15s',
                            '&.Mui-focused': { boxShadow: `0 0 0 3px ${trio.c}26` },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: trio.c },
                          },
                        }}
                      />
                      <WtIconButton
                        color={trio.c}
                        disabled={readOnly || val >= 50}
                        onClick={() => handleChange(exp, val + 1)}
                        title="Increase"
                        sx={{ width: 34, height: 34, flexShrink: 0 }}
                      >
                        <KTIcon iconName="plus" className="fs-5" />
                      </WtIconButton>
                    </Box>
                  </GlassSurface>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Box>

      {/* Footer Actions */}
      <Box sx={{
        px: { xs: 1.75, sm: 3 }, py: { xs: 1.5, sm: 2 }, display: 'flex', flexDirection: { xs: 'column-reverse', sm: 'row' },
        alignItems: 'center', justifyContent: 'space-between', gap: 1.5,
        flexShrink: 0, borderTop: `1px solid ${T.color.line}`, backgroundColor: 'rgba(255,255,255,0.55)',
      }}>
        <Typography sx={{ fontSize: 12.5, color: 'text.secondary', fontWeight: 600, textAlign: { xs: 'center', sm: 'left' }, display: { xs: 'none', sm: 'block' } }}>
          <Box component="span" sx={{ color: T.color.brand, fontWeight: 800 }}>{stats.configuredCount}</Box> of {EXP_TIERS.length} tiers configured
        </Typography>
        <Stack direction={{ xs: 'column-reverse', sm: 'row' }} spacing={1.5} sx={{ width: { xs: '100%', sm: 'auto' } }}>
          <WtButton ghost onClick={onClose} disabled={saving} sx={{ width: { xs: '100%', sm: 'auto' } }}>
            Cancel
          </WtButton>
          {!readOnly && (
            <WtButton tone="primary" onClick={handleSave} disabled={saving}
              startIcon={saving ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <KTIcon iconName="check-circle" className="fs-2" />}
              sx={{ width: { xs: '100%', sm: 'auto' } }}>
              {saving ? 'Saving Changes…' : 'Save Allowance Policy'}
            </WtButton>
          )}
        </Stack>
      </Box>
    </GlassDialog>
  );
}

export default AddonLeavesModal;
