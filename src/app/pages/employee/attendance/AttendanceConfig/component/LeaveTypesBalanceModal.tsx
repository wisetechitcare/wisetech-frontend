import { useEffect, useState, useMemo } from 'react';
import { KTIcon } from '@metronic/helpers';
import { Box, CircularProgress, Grid, Stack, TextField, Typography, useMediaQuery } from '@mui/material';
import { fetchLeaveOptions, updateLeaveOptionsById } from '@services/company';
import { errorConfirmation, successConfirmation } from '@utils/modal';
import eventBus from '@utils/EventBus';
import { EVENT_KEYS } from '@constants/eventKeys';
// Same MUI glass kit as the Sandwich Leave benchmark — single source of truth for the look.
import {
  WtButton, GlassSurface, GlassDialog, GlassHeader, WtIconButton,
  TRIO, IconBox, StatusBadge, StatTile, T, MRD_EASE, EASE_200, SHADOW_REST, SHADOW_HOVER, type Trio,
} from '@app/modules/common/components/ui';

interface LeaveTypesBalanceModalProps {
  open: boolean;
  onClose: () => void;
  readOnly?: boolean;
}

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

  const reduce = useMediaQuery('(prefers-reduced-motion: reduce)');
  // Staggered entrance identical to the Sandwich benchmark (swFadeUp), reduced-motion safe.
  const riseSx = (i: number) => (reduce ? {} : {
    animation: 'wtFadeUp .3s cubic-bezier(0.4, 0, 0.2, 1) both',
    animationDelay: `${Math.min(i, 8) * 45}ms`,
    '@keyframes wtFadeUp': { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
  });

  // Segmented switcher chip style (selected = navy fill).
  const segSx = (active: boolean) => ({
    px: { xs: 1.5, sm: 2 }, py: 0.75, borderRadius: 999, fontSize: { xs: 11.5, sm: 12 }, fontWeight: 700, cursor: 'pointer',
    userSelect: 'none', border: 'none', whiteSpace: 'nowrap', flexShrink: 0, lineHeight: 1.2,
    transition: `background-color .15s, color .15s, transform .16s ${MRD_EASE}, box-shadow .2s`,
    '&:focus-visible': { outline: `2px solid ${T.color.brand}`, outlineOffset: 2 },
    '&:active': { transform: 'scale(.96)' },
    ...(active
      ? { color: '#fff', backgroundColor: T.color.brand, boxShadow: '0 2px 6px rgba(30,58,138,0.25)' }
      : { color: 'text.secondary', backgroundColor: 'transparent', '&:hover': { backgroundColor: 'rgba(0,0,0,0.05)', color: 'text.primary' } }),
  } as const);

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
      <Box sx={{ p: { xs: 2, sm: 3 }, overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: { xs: 2, sm: 2.5 } }}>
        {/* Metric Summary Bar */}
        <Grid container spacing={{ xs: 1, sm: 1.5, md: 2 }}>
          <Grid item xs={6} md={3}>
            <StatTile label="Configured Branches" value={`${stats.totalBranches} ${stats.totalBranches === 1 ? 'Branch' : 'Branches'}`} trio={TRIO.blue} icon="geolocation" />
          </Grid>
          <Grid item xs={6} md={3}>
            <StatTile label="Total Paid Allowance" value={`${stats.avgPaidPerBranch} Days/yr`} trio={TRIO.green} icon="calendar-tick" />
          </Grid>
          <Grid item xs={6} md={3}>
            <StatTile label="Derived Unpaid Remainder" value={`${stats.unpaidDays} Days/yr`} trio={TRIO.rose} icon="calendar-remove" />
          </Grid>
          <Grid item xs={6} md={3}>
            <GlassSurface variant="thin" radius={14} sx={{
              p: 1.5, height: '100%', display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0,
              boxShadow: SHADOW_REST, transition: EASE_200,
              '&:hover': { transform: 'translateY(-2px)', boxShadow: SHADOW_HOVER, borderColor: TRIO.amber.bd },
              '@media (prefers-reduced-motion: reduce)': { transition: 'none', '&:hover': { transform: 'none' } },
            }}>
              <IconBox icon="calculator" trio={TRIO.amber} size={40} />
              <Box sx={{ minWidth: 0 }}>
                <Typography noWrap sx={{ fontSize: 10.5, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700 }}>Engine Mode</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
                  <Box className="sw-dot-pulse" sx={{ width: 7, height: 7, borderRadius: 999, bgcolor: TRIO.amber.c, flexShrink: 0 }} />
                  <Typography noWrap sx={{ fontSize: { xs: 16, sm: 19 }, fontWeight: 800, lineHeight: 1.2, color: 'text.primary' }}>365-Day</Typography>
                </Box>
              </Box>
            </GlassSurface>
          </Grid>
        </Grid>

        {/* Segmented Branch Switcher Bar */}
        {branchKeys.length > 1 && (
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 0.75, sm: 1 }, minWidth: 0 }}>
            <Typography sx={{ fontSize: { xs: 11, sm: 12 }, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.04em', mr: 0.5, flexShrink: 0 }}>
              Select Scope:
            </Typography>

            <GlassSurface
              variant="thin"
              radius={999}
              role="tablist"
              aria-label="Select branch scope"
              sx={{
                p: 0.5, display: 'flex', flexWrap: 'nowrap', gap: 0.5,
                width: { xs: '100%', sm: 'auto' }, maxWidth: '100%', minWidth: 0, overflowX: 'auto',
                scrollSnapType: 'x proximity', WebkitOverflowScrolling: 'touch',
                // Hide the scrollbar chrome while keeping swipe/scroll on mobile.
                scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' },
                // Fade the trailing edge to hint that the strip scrolls.
                maskImage: { xs: 'linear-gradient(to right, #000 92%, transparent)', sm: 'none' },
                WebkitMaskImage: { xs: 'linear-gradient(to right, #000 92%, transparent)', sm: 'none' },
              }}
            >
              <Box component="button" type="button" role="tab" aria-selected={selectedBranchId === 'ALL'} onClick={() => setSelectedBranchId('ALL')} sx={{ ...segSx(selectedBranchId === 'ALL'), scrollSnapAlign: 'start' }}>
                All Branches ({branchKeys.length})
              </Box>

              {branchKeys.map((bId) => {
                const bName = groupedByBranch[bId].branchName;
                return (
                  <Box component="button" key={bId} type="button" role="tab" aria-selected={selectedBranchId === bId} onClick={() => setSelectedBranchId(bId)} sx={{ ...segSx(selectedBranchId === bId), scrollSnapAlign: 'start' }}>
                    Branch: {bName}
                  </Box>
                );
              })}
            </GlassSurface>
          </Box>
        )}

        {/* Loading State */}
        {loading ? (
          <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 220, gap: 1.5 }}>
            <CircularProgress size={36} sx={{ color: T.color.brand }} />
            <Typography sx={{ fontSize: 12.5, color: 'text.secondary', fontWeight: 500 }}>Loading leave configuration…</Typography>
          </Box>
        ) : branchKeys.length === 0 ? (
          <GlassSurface variant="thin" radius={20} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 1.25, py: { xs: 5, sm: 7 }, px: 3 }}>
            <IconBox icon="calendar-remove" trio={TRIO.slate} size={52} fs="fs-1" />
            <Typography sx={{ fontSize: 15.5, fontWeight: 800, color: 'text.primary' }}>No leave types configured</Typography>
            <Typography sx={{ fontSize: 12.5, color: 'text.secondary', fontWeight: 500, maxWidth: 360, lineHeight: 1.5 }}>
              There are no branch leave balances to display yet. Add leave options to a branch to configure paid allowances here.
            </Typography>
          </GlassSurface>
        ) : (
          <Stack spacing={{ xs: 2, sm: 3 }}>
            {branchKeys
              .filter((bId) => selectedBranchId === 'ALL' || selectedBranchId === bId)
              .map((bId, bIdx) => {
                const group = groupedByBranch[bId];
                const paidOptions = group.options.filter((lo) => !lo.leaveType.toLowerCase().includes('unpaid'));

                // Calculate branch total paid days live from form values
                const branchTotalPaid = paidOptions.reduce(
                  (acc, lo) => acc + (Number(formValues[lo.id]) || 0),
                  0
                );
                const branchUnpaidDays = Math.max(0, 365 - branchTotalPaid);

                return (
                  <GlassSurface key={bId} variant="thin" radius={20} sx={{ p: { xs: 2, sm: '22px' }, display: 'flex', flexDirection: 'column', gap: { xs: '14px', sm: '18px' }, ...riseSx(bIdx) }}>
                    {/* Branch Header Bar */}
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5, pb: { xs: 1.5, sm: 1.75 }, borderBottom: `1px solid ${T.color.line}` }}>
                      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0, flex: { xs: '1 1 100%', md: '1 1 auto' } }}>
                        <IconBox icon="bank" trio={TRIO.blue} size={42} fs="fs-2" />
                        <Box sx={{ minWidth: 0 }}>
                          <Typography noWrap sx={{ fontSize: { xs: 10, sm: 11 }, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: TRIO.blue.c }}>
                            Branch Specific Configuration
                          </Typography>
                          <Typography sx={{ fontSize: { xs: 15, sm: 17 }, fontWeight: 800, color: 'text.primary', letterSpacing: '-0.01em', lineHeight: 1.25, wordBreak: 'break-word' }}>
                            BRANCH: {group.branchName.toUpperCase()}
                          </Typography>
                        </Box>
                      </Stack>

                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ flexShrink: 0 }}>
                        <Box sx={{ px: { xs: 1.25, sm: 1.75 }, py: 0.75, borderRadius: 999, display: 'flex', alignItems: 'center', gap: 0.75, border: `1px solid ${TRIO.green.bd}`, backgroundColor: TRIO.green.bg }}>
                          <Box sx={{ width: 7, height: 7, borderRadius: 999, backgroundColor: TRIO.green.c, flexShrink: 0 }} />
                          <Box component="span" sx={{ fontSize: { xs: 11.5, sm: 12.5 }, fontWeight: 800, color: TRIO.green.c, whiteSpace: 'nowrap' }}>PAID: {branchTotalPaid} DAYS</Box>
                        </Box>
                        <Box sx={{ px: { xs: 1.25, sm: 1.75 }, py: 0.75, borderRadius: 999, display: 'flex', alignItems: 'center', gap: 0.75, border: `1px solid ${TRIO.rose.bd}`, backgroundColor: TRIO.rose.bg }}>
                          <Box sx={{ width: 7, height: 7, borderRadius: 999, backgroundColor: TRIO.rose.c, flexShrink: 0 }} />
                          <Box component="span" sx={{ fontSize: { xs: 11.5, sm: 12.5 }, fontWeight: 800, color: TRIO.rose.c, whiteSpace: 'nowrap' }}>UNPAID: {branchUnpaidDays} DAYS</Box>
                        </Box>
                      </Stack>
                    </Box>

                    {/* Paid Leave Types Grid with Relative Icons */}
                    <Grid container spacing={{ xs: 1.5, sm: 2, md: 2.25 }}>
                      {paidOptions.map((lo, loIdx) => {
                        const val = formValues[lo.id] ?? 0;
                        const meta = getLeaveTypeMeta(lo.leaveType);

                        return (
                          <Grid item xs={12} sm={6} md={4} key={lo.id}>
                            <GlassSurface
                              variant="thin"
                              sx={{
                                p: { xs: 1.75, sm: 2 }, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 1.75,
                                border: `1px solid ${meta.trio.bd}`, borderTop: `3.5px solid ${meta.trio.c}`,
                                transition: 'transform .2s, box-shadow .2s, border-color .2s',
                                '&:hover': { transform: 'translateY(-3px)', boxShadow: T.shadow.cardHover, borderColor: meta.trio.c },
                                '&:hover .lt-icon': { transform: 'scale(1.06)' },
                                '@media (prefers-reduced-motion: reduce)': { transition: 'none', '&:hover': { transform: 'none' }, '&:hover .lt-icon': { transform: 'none' } },
                                ...riseSx(loIdx),
                              }}
                            >
                              {/* Header with relative icon & badge */}
                              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
                                <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
                                  <Box className="lt-icon" sx={{ transition: `transform .2s ${MRD_EASE}`, flexShrink: 0 }}>
                                    <IconBox icon={meta.icon} trio={meta.trio} size={40} fs="fs-2" />
                                  </Box>
                                  <Box sx={{ minWidth: 0 }}>
                                    <Typography noWrap title={lo.leaveType} sx={{ fontSize: { xs: 14.5, sm: 15 }, fontWeight: 800, color: 'text.primary', lineHeight: 1.3 }}>{lo.leaveType}</Typography>
                                    <Typography noWrap title={meta.desc} sx={{ fontSize: 12.5, color: 'text.secondary', fontWeight: 500 }}>{meta.desc}</Typography>
                                  </Box>
                                </Stack>
                                <StatusBadge trio={meta.trio} label={`${val} Days`} />
                              </Box>

                              {/* Interactive Stepper Control */}
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pt: 0.5 }}>
                                <WtIconButton disabled={readOnly || val <= 0} color={meta.trio.c} onClick={() => handleInputChange(lo.id, Math.max(0, val - 1))} title="Decrease by one day" sx={{ width: { xs: 42, sm: 38 }, height: { xs: 42, sm: 38 }, flexShrink: 0 }}>
                                  <KTIcon iconName="minus" className="fs-2" />
                                </WtIconButton>

                                <TextField
                                  type="number" size="small" fullWidth disabled={readOnly}
                                  value={val}
                                  onChange={(e) => handleInputChange(lo.id, parseInt(e.target.value, 10))}
                                  onFocus={(e) => e.target.select()}
                                  inputProps={{ min: 0, max: 365, 'aria-label': `${lo.leaveType} days`, style: { textAlign: 'center', fontWeight: 800, fontSize: 16 } }}
                                  sx={{
                                    '& .MuiOutlinedInput-root': { borderRadius: '10px', transition: 'box-shadow .15s' },
                                    '& .MuiOutlinedInput-notchedOutline': { borderColor: meta.trio.bd },
                                    '& .Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: `${meta.trio.c} !important`, borderWidth: '1.5px' },
                                    '& .MuiOutlinedInput-root.Mui-focused': { boxShadow: `0 0 0 3px ${meta.trio.bg}` },
                                  }}
                                />

                                <WtIconButton disabled={readOnly || val >= 365} color={meta.trio.c} onClick={() => handleInputChange(lo.id, Math.min(365, val + 1))} title="Increase by one day" sx={{ width: { xs: 42, sm: 38 }, height: { xs: 42, sm: 38 }, flexShrink: 0 }}>
                                  <KTIcon iconName="plus" className="fs-2" />
                                </WtIconButton>
                              </Box>
                            </GlassSurface>
                          </Grid>
                        );
                      })}
                    </Grid>

                    {/* Derived Unpaid Remainder Engine Formula Banner */}
                    <GlassSurface variant="thin" radius={14} sx={{ p: { xs: 1.75, sm: 2.25 }, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between', gap: { xs: 1.5, sm: 2 }, backgroundColor: TRIO.rose.bg, border: `1px solid ${TRIO.rose.bd}` }}>
                      <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ minWidth: 0, flex: 1 }}>
                        <IconBox icon="calculator" trio={TRIO.rose} size={40} fs="fs-2" />
                        <Box sx={{ minWidth: 0 }}>
                          <Typography sx={{ fontSize: 13.5, fontWeight: 800, color: TRIO.rose.c, letterSpacing: '-0.01em', lineHeight: 1.3, mb: 0.5 }}>
                            Unpaid Leave Remainder Engine
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
                            <Box component="span" sx={{ fontSize: 12, fontWeight: 700, color: 'text.primary' }}>365 Calendar Days</Box>
                            <Box component="span" sx={{ fontSize: 13, fontWeight: 800, color: TRIO.rose.c, lineHeight: 1 }}>−</Box>
                            <Box component="span" sx={{ fontSize: 12, fontWeight: 700, color: 'text.primary' }}>{branchTotalPaid} Paid Days</Box>
                            <Box component="span" sx={{ fontSize: 13, fontWeight: 800, color: TRIO.rose.c, lineHeight: 1 }}>=</Box>
                            <Box component="span" sx={{ fontSize: 12, fontWeight: 800, color: TRIO.rose.c }}>{branchUnpaidDays} Unpaid Days</Box>
                          </Box>
                          <Typography sx={{ fontSize: 11.5, color: 'text.secondary', fontWeight: 500, lineHeight: 1.5 }}>
                            Automatically derived to maintain full-year attendance pacing — cannot be edited directly.
                          </Typography>
                        </Box>
                      </Stack>

                      <Box sx={{ flexShrink: 0, alignSelf: { xs: 'flex-end', sm: 'center' } }}>
                        <StatusBadge trio={TRIO.rose} label={`${branchUnpaidDays} Unpaid Days`} pulse title="Derived 365-day remainder" />
                      </Box>
                    </GlassSurface>
                  </GlassSurface>
                );
              })}
          </Stack>
        )}
      </Box>

      {/* Footer Actions */}
      <Box sx={{
        px: { xs: 2, sm: 3 }, py: 2, display: 'flex', flexDirection: { xs: 'column-reverse', sm: 'row' }, alignItems: 'center', justifyContent: 'space-between', gap: 1.25,
        flexShrink: 0, borderTop: `1px solid ${T.color.line}`, backgroundColor: 'rgba(255,255,255,0.4)',
      }}>
        {!readOnly && (
          <Stack direction="row" spacing={0.75} alignItems="center" sx={{ display: { xs: 'none', sm: 'flex' }, minWidth: 0, color: '#94a3b8' }}>
            <KTIcon iconName="information-5" className="fs-4" />
            <Typography noWrap sx={{ fontSize: 12, color: 'text.secondary', fontWeight: 500 }}>
              Unpaid days recalculate automatically from paid allowances.
            </Typography>
          </Stack>
        )}
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column-reverse', sm: 'row' }, alignItems: 'center', gap: 1.25, width: { xs: '100%', sm: 'auto' }, ml: { sm: 'auto' } }}>
        <WtButton ghost onClick={onClose} disabled={saving} sx={{ width: { xs: '100%', sm: 'auto' } }}>
          Cancel
        </WtButton>
        {!readOnly && (
          <WtButton tone="primary" onClick={handleSave} disabled={saving}
            startIcon={saving ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <KTIcon iconName="check-circle" className="fs-2" />}
            sx={{ width: { xs: '100%', sm: 'auto' } }}>
            {saving ? 'Saving Settings...' : 'Save Branch Balances'}
          </WtButton>
        )}
        </Box>
      </Box>
    </GlassDialog>
  );
}

export default LeaveTypesBalanceModal;
