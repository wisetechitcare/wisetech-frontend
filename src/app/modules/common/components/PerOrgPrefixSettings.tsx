import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Select,
  TextField,
  Tooltip,
  Typography,
  alpha,
} from '@mui/material';
import LinkRoundedIcon from '@mui/icons-material/LinkRounded';
import LinkOffRoundedIcon from '@mui/icons-material/LinkOffRounded';
import SubdirectoryArrowRightRoundedIcon from '@mui/icons-material/SubdirectoryArrowRightRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import HubRoundedIcon from '@mui/icons-material/HubRounded';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import Flatpickr from 'react-flatpickr';
import {
  fetchAllPrefixSettings,
  createPrefixSetting,
  updatePrefixSetting,
  setPrefixSequenceLink,
  fetchLeadNumberPreview,
} from '@services/options';
import { fetchCompanyOverview } from '@services/company';
import { useOrgScope } from '@hooks/useOrgScope';
import { successConfirmation, errorConfirmation } from '@utils/modal';
import { ToneChip } from '@app/modules/common/components/ui/chips';
import {
  convertFiscalYearToYearFormat,
  convertFiscalYearToDates,
  toISODateString,
  getDefaultFiscalYear,
  type PrefixSetting,
} from './PrefixSettingsForm';

interface PerOrgPrefixSettingsProps {
  /** Human label, e.g. 'Lead'. */
  typeLabel: string;
  /** Enum value, e.g. 'LEAD'. */
  typeValue: string;
}

interface RowState {
  organizationId: string;
  organizationName: string;
  settingId?: string;
  savedPrefix: string;
  prefix: string;
  sequenceSourceOrganizationId: string | null;
}

interface Series {
  leader: RowState;
  followers: RowState[];
}

const PerOrgPrefixSettings: React.FC<PerOrgPrefixSettingsProps> = ({ typeLabel, typeValue }) => {
  const { organizations: allOrganizations, isLoading: orgsLoading } = useOrgScope({
    includeAll: false,
    initialScopeId: '',
  });

  const organizations = useMemo(
    () => allOrganizations.filter((org) => !org.isRoot),
    [allOrganizations],
  );

  const [rows, setRows] = useState<RowState[]>([]);
  const [fiscalYear, setFiscalYear] = useState('');
  const [savedFiscalYear, setSavedFiscalYear] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [linkingOrgId, setLinkingOrgId] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [infoOpen, setInfoOpen] = useState(false);

  useEffect(() => {
    if (!organizations.length) return;
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        const [prefixResponse, companyResponse] = await Promise.all([
          fetchAllPrefixSettings(),
          fetchCompanyOverview(),
        ]);
        if (cancelled) return;

        const settings: PrefixSetting[] = (prefixResponse?.data?.prefixSettings ?? []).filter(
          (s: PrefixSetting) => s.identifier === typeValue,
        );

        const newRows = organizations.map((org) => {
          const saved = settings.find((s) => s.organizationId === org.id);
          return {
            organizationId: org.id,
            organizationName: org.name,
            settingId: saved?.id,
            savedPrefix: saved?.prefix ?? '',
            prefix: saved?.prefix ?? '',
            sequenceSourceOrganizationId: saved?.sequenceSourceOrganizationId ?? null,
          };
        });
        setRows(newRows);

        const existingYear = settings.find((s) => s.year)?.year;
        const resolvedYear =
          existingYear ||
          companyResponse?.data?.companyOverview?.fiscalYear ||
          getDefaultFiscalYear();
        setFiscalYear(resolvedYear);
        setSavedFiscalYear(existingYear || '');
      } catch {
        if (!cancelled) errorConfirmation(`Could not load ${typeLabel.toLowerCase()} prefix settings.`);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [organizations, typeValue, typeLabel, reloadToken]);

  useEffect(() => {
    if (typeValue !== 'LEAD') return;
    const configured = rows.filter((r) => r.settingId);
    if (!configured.length) return;
    let cancelled = false;

    (async () => {
      const entries = await Promise.all(
        configured.map(async (row) => {
          try {
            const res = await fetchLeadNumberPreview(row.organizationId);
            return [row.organizationId, String(res?.data?.preview ?? '')] as const;
          } catch {
            return [row.organizationId, ''] as const;
          }
        }),
      );
      if (cancelled) return;
      setPreviews(Object.fromEntries(entries.filter(([, v]) => v)));
    })();

    return () => { cancelled = true; };
  }, [rows, typeValue]);

  const setPrefix = (organizationId: string, value: string) =>
    setRows((prev) =>
      prev.map((row) => (row.organizationId === organizationId ? { ...row, prefix: value } : row)),
    );

  const shortYear = convertFiscalYearToYearFormat(fiscalYear);
  const dirtyRows = rows.filter((row) => row.prefix.trim() !== row.savedPrefix);
  const yearDirty = !!fiscalYear && fiscalYear !== savedFiscalYear;
  const hasChanges = dirtyRows.length > 0 || yearDirty;
  const dirtyCount = dirtyRows.length + (yearDirty ? 1 : 0);

  const rowsToSave = yearDirty
    ? rows.filter((row) => row.prefix.trim() || row.settingId)
    : dirtyRows;
  const rowFor = (organizationId: string | null | undefined) =>
    organizationId ? rows.find((r) => r.organizationId === organizationId) : undefined;

  // ── Series grouping ─────────────────────────────────────────────────────────
  const series: Series[] = useMemo(() => {
    const leaderIds = new Set(
      rows.filter((r) => !r.sequenceSourceOrganizationId).map((r) => r.organizationId),
    );
    const isLeader = (r: RowState) =>
      !r.sequenceSourceOrganizationId || !leaderIds.has(r.sequenceSourceOrganizationId);

    return rows.filter(isLeader).map((leader) => ({
      leader,
      followers: rows.filter(
        (r) => r.sequenceSourceOrganizationId === leader.organizationId && r.organizationId !== leader.organizationId,
      ),
    }));
  }, [rows]);

  const seriesIdOf = (row: RowState) => row.sequenceSourceOrganizationId || row.organizationId;

  const duplicatePrefixes = useMemo(() => {
    const seriesByPrefix = new Map<string, Set<string>>();
    for (const row of rows) {
      const key = row.prefix.trim().toLowerCase();
      if (!key) continue;
      if (!seriesByPrefix.has(key)) seriesByPrefix.set(key, new Set());
      seriesByPrefix.get(key)!.add(seriesIdOf(row));
    }
    return new Set(
      [...seriesByPrefix.entries()].filter(([, ids]) => ids.size > 1).map(([key]) => key),
    );
  }, [rows]);

  const isDuplicate = (row: RowState) =>
    !!row.prefix.trim() && duplicatePrefixes.has(row.prefix.trim().toLowerCase());

  const canLink = (row: RowState) =>
    !!row.settingId && !rows.some((r) => r.sequenceSourceOrganizationId === row.organizationId);

  const linkTargets = (row: RowState) =>
    rows.filter(
      (candidate) =>
        candidate.organizationId !== row.organizationId &&
        !!candidate.settingId &&
        !candidate.sequenceSourceOrganizationId,
    );

  const changeLink = async (row: RowState, targetId: string | null) => {
    if (!row.settingId) return;
    setLinkingOrgId(row.organizationId);
    try {
      await setPrefixSequenceLink(row.settingId, targetId);
      successConfirmation(
        targetId
          ? `${row.organizationName} now shares numbers with ${rowFor(targetId)?.organizationName ?? 'the selected organization'}.`
          : `${row.organizationName} now numbers independently.`,
      );
      setReloadToken((n) => n + 1);
    } catch (err: any) {
      errorConfirmation(err?.response?.data?.message || 'Could not change the numbering link.');
    } finally {
      setLinkingOrgId(null);
    }
  };

  const handleSave = async () => {
    if (!fiscalYear) {
      errorConfirmation('Set the fiscal year first.');
      return;
    }
    if (duplicatePrefixes.size) {
      errorConfirmation(
        'Two organizations on separate number series cannot share a prefix — their numbers would collide.',
      );
      return;
    }

    setSaving(true);
    try {
      for (const row of rowsToSave) {
        const prefix = row.prefix.trim();
        if (!prefix) continue;
        if (row.settingId) {
          await updatePrefixSetting(row.settingId, { prefix, year: fiscalYear });
        } else {
          await createPrefixSetting({
            identifier: typeValue,
            year: fiscalYear,
            prefix,
            organizationId: row.organizationId,
          });
        }
      }
      successConfirmation('Prefix settings saved successfully.');
      setReloadToken((n) => n + 1);
    } catch {
      errorConfirmation('Could not save prefix settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || orgsLoading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4, gap: 1.5 }}>
        <CircularProgress size={24} thickness={4} />
        <Typography sx={{ fontSize: 13, color: 'text.secondary', fontWeight: 500 }}>
          Loading {typeLabel.toLowerCase()} prefix settings...
        </Typography>
      </Box>
    );
  }

  const getNextNumberDisplay = (row: RowState) => {
    const preview = previews[row.organizationId] || '';
    let tail = '';
    if (preview && row.savedPrefix && preview.startsWith(row.savedPrefix)) {
      tail = preview.slice(row.savedPrefix.length);
    } else if (shortYear) {
      tail = `/${shortYear}/001`;
    } else {
      tail = '/26-27/001';
    }

    const currentPrefixText = row.prefix.trim();
    return {
      fullText: currentPrefixText ? `${currentPrefixText}${tail}` : `[PREFIX]${tail}`,
      hasCustomPrefix: Boolean(currentPrefixText),
    };
  };

  return (
    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {/* ── Sleek Compact Toolbar ── */}
      <Box
        sx={{
          p: { xs: 1.25, sm: 1.5 },
          backgroundColor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : '#f8fafc'),
          border: '1px solid',
          borderColor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0'),
          borderRadius: 2,
        }}
      >
        {/* Desktop single row / Mobile 2 clean rows */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'stretch', sm: 'center' },
            justifyContent: 'space-between',
            gap: 1.25,
          }}
        >
          {/* Section 1: Label & Meta */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'text.primary', whiteSpace: 'nowrap' }}>
                Fiscal Year:
              </Typography>
              {shortYear && (
                <ToneChip
                  tone="brand"
                  label={`/${shortYear}/...`}
                  dense
                />
              )}
              <Tooltip title="How numbering series work">
                <IconButton
                  size="small"
                  onClick={() => setInfoOpen(true)}
                  sx={{ color: 'primary.main', p: 0.25 }}
                >
                  <InfoOutlinedIcon sx={{ fontSize: 17 }} />
                </IconButton>
              </Tooltip>
            </Box>

            {/* Status chip on mobile (hidden on desktop sm up) */}
            <Box sx={{ display: { xs: 'block', sm: 'none' } }}>
              {hasChanges ? (
                <ToneChip tone="warning" label={`${dirtyCount} unsaved`} dense />
              ) : (
                <ToneChip tone="success" label="All saved" dense />
              )}
            </Box>
          </Box>

          {/* Section 2: Input & Actions */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: { sm: 1 }, justifyContent: { sm: 'flex-end' } }}>
            <Box
              sx={{
                flex: { xs: 1, sm: 'unset' },
                width: { sm: 195 },
                '& input': {
                  width: '100%',
                  height: 32,
                  padding: '0 10px',
                  borderRadius: '6px',
                  border: '1px solid',
                  borderColor: yearDirty ? 'warning.main' : '#cbd5e1',
                  backgroundColor: 'background.paper',
                  color: 'text.primary',
                  fontSize: 12.5,
                  fontWeight: 600,
                  fontFamily: 'inherit',
                  outline: 'none',
                  transition: 'all 0.15s ease',
                  '&:focus': { borderColor: 'primary.main' },
                },
              }}
            >
              <Flatpickr
                value={fiscalYear ? convertFiscalYearToDates(fiscalYear) : []}
                placeholder="Select Fiscal Year"
                onChange={(dates: Date[]) => {
                  if (dates.length === 2) {
                    setFiscalYear(`${toISODateString(dates[0])} to ${toISODateString(dates[1])}`);
                  }
                }}
                options={{ dateFormat: 'Y-m-d', altInput: true, altFormat: 'd/m/Y', mode: 'range' }}
              />
            </Box>

            {/* Status chip on desktop */}
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              {hasChanges ? (
                <ToneChip tone="warning" label={`${dirtyCount} unsaved`} dense />
              ) : (
                <ToneChip tone="success" label="All saved" dense />
              )}
            </Box>

            <Button
              variant="contained"
              color="primary"
              size="small"
              onClick={handleSave}
              disabled={saving || !hasChanges || !!duplicatePrefixes.size}
              startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <SaveRoundedIcon sx={{ fontSize: 16 }} />}
              sx={{
                height: 32,
                px: 2,
                textTransform: 'none',
                fontWeight: 600,
                fontSize: 12.5,
                borderRadius: 1.5,
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </Box>
        </Box>
      </Box>

      {/* ── Duplicate Prefix Warning Banner ── */}
      {duplicatePrefixes.size > 0 && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            py: 1,
            px: 1.5,
            backgroundColor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(239, 68, 68, 0.15)' : '#fff1f2'),
            border: '1px solid',
            borderColor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(239, 68, 68, 0.3)' : '#fecdd3'),
            borderRadius: 1.5,
            color: 'error.main',
          }}
        >
          <WarningAmberRoundedIcon sx={{ color: 'error.main', fontSize: 18, flexShrink: 0 }} />
          <Typography sx={{ fontSize: 12, fontWeight: 500 }}>
            Duplicate Prefix: Multiple independent series share the same prefix. Please link them or use unique prefixes.
          </Typography>
        </Box>
      )}

      {/* ── Organization Configuration Container ── */}
      <Box
        sx={{
          border: '1px solid',
          borderColor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0'),
          borderRadius: 2,
          backgroundColor: 'background.paper',
          overflow: 'hidden',
        }}
      >
        {/* Desktop Table Column Header (Hidden on Mobile) */}
        <Box
          sx={{
            display: { xs: 'none', md: 'grid' },
            gridTemplateColumns: 'minmax(220px, 1.3fr) 130px 180px 140px',
            alignItems: 'center',
            gap: 1.5,
            px: 2,
            py: 1,
            backgroundColor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : '#f8fafc'),
            borderBottom: '1px solid',
            borderColor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0'),
          }}
        >
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', letterSpacing: 0.5, textTransform: 'uppercase' }}>
            Organization
          </Typography>
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', letterSpacing: 0.5, textTransform: 'uppercase' }}>
            Prefix Code
          </Typography>
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', letterSpacing: 0.5, textTransform: 'uppercase' }}>
            Next Lead ID Sample
          </Typography>
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', letterSpacing: 0.5, textTransform: 'uppercase', textAlign: 'right' }}>
            Series & Actions
          </Typography>
        </Box>

        {/* Series Rows */}
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          {series.map(({ leader, followers }, index) => {
            const isSharedSeries = followers.length > 0;

            return (
              <Box
                key={leader.organizationId}
                sx={{
                  borderBottom: index < series.length - 1 ? '1px solid' : 'none',
                  borderColor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#f1f5f9'),
                  backgroundColor: isSharedSeries
                    ? (theme) => (theme.palette.mode === 'dark' ? 'rgba(37, 99, 235, 0.06)' : 'rgba(37, 99, 235, 0.02)')
                    : 'transparent',
                }}
              >
                {/* Leader Row */}
                <OrgRowItem
                  row={leader}
                  role="leader"
                  isSharedSeries={isSharedSeries}
                  followerCount={followers.length}
                  leaderName={leader.organizationName}
                  isDuplicate={isDuplicate(leader)}
                  busy={linkingOrgId === leader.organizationId}
                  canLink={canLink(leader)}
                  linkTargets={linkTargets(leader)}
                  onPrefixChange={(val) => setPrefix(leader.organizationId, val)}
                  onChangeLink={(targetId) => changeLink(leader, targetId)}
                  displayData={getNextNumberDisplay(leader)}
                />

                {/* Follower Rows */}
                {followers.map((follower) => (
                  <OrgRowItem
                    key={follower.organizationId}
                    row={follower}
                    role="follower"
                    isSharedSeries={true}
                    followerCount={0}
                    leaderName={leader.organizationName}
                    isDuplicate={isDuplicate(follower)}
                    busy={linkingOrgId === follower.organizationId}
                    canLink={false}
                    linkTargets={[]}
                    onPrefixChange={(val) => setPrefix(follower.organizationId, val)}
                    onChangeLink={(targetId) => changeLink(follower, targetId)}
                    displayData={getNextNumberDisplay(follower)}
                  />
                ))}
              </Box>
            );
          })}

          {!series.length && (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
                No organizations found.
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      {/* ── Info Dialog Modal (Opened via i button) ── */}
      <Dialog
        open={infoOpen}
        onClose={() => setInfoOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2.5,
            p: 1,
            backgroundColor: 'background.paper',
          },
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <InfoOutlinedIcon sx={{ color: 'primary.main', fontSize: 22 }} />
            <Typography sx={{ fontSize: 16, fontWeight: 700, color: 'text.primary' }}>
              How Lead Auto-Numbering Works
            </Typography>
          </Box>
          <IconButton size="small" onClick={() => setInfoOpen(false)}>
            <CloseRoundedIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 1 }}>
          <Box sx={{ p: 1.5, borderRadius: 2, backgroundColor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : '#f8fafc'), border: '1px solid', borderColor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0') }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'text.primary', mb: 0.5, display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Box component="span" sx={{ color: 'primary.main', fontWeight: 700 }}>#</Box> Prefix Code
            </Typography>
            <Typography sx={{ fontSize: 12, color: 'text.secondary', lineHeight: 1.5 }}>
              Each company configures its own alphanumeric prefix (e.g. <code>WT/OFFER</code>). New leads generated in that company prepend this code.
            </Typography>
          </Box>

          <Box sx={{ p: 1.5, borderRadius: 2, backgroundColor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : '#f8fafc'), border: '1px solid', borderColor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0') }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'text.primary', mb: 0.5, display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <HubRoundedIcon sx={{ fontSize: 16, color: 'success.main' }} /> Shared Numbering Series
            </Typography>
            <Typography sx={{ fontSize: 12, color: 'text.secondary', lineHeight: 1.5 }}>
              Linking sister organizations enables them to draw from the <strong>same sequential number counter</strong> while retaining their distinct prefix codes, preventing duplicated lead numbers.
            </Typography>
          </Box>

          <Box sx={{ p: 1.5, borderRadius: 2, backgroundColor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : '#f8fafc'), border: '1px solid', borderColor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0') }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'text.primary', mb: 0.5, display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <CalendarMonthRoundedIcon sx={{ fontSize: 16, color: 'warning.main' }} /> Fiscal Year Suffix
            </Typography>
            <Typography sx={{ fontSize: 12, color: 'text.secondary', lineHeight: 1.5 }}>
              When the active fiscal year changes, all organizations automatically synchronize their year suffix code (e.g. <code>/26-27/</code>).
            </Typography>
          </Box>

          <Box sx={{ p: 1.5, borderRadius: 2, backgroundColor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(37, 99, 235, 0.1)' : '#eff6ff'), border: '1px solid', borderColor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(37, 99, 235, 0.25)' : '#bfdbfe') }}>
            <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: 'primary.main', mb: 0.5 }}>
              Sample Lead ID Breakdown:
            </Typography>
            <Typography sx={{ fontFamily: 'monospace', fontSize: 12.5, fontWeight: 700, color: 'text.primary' }}>
              WT/OFFER <span style={{ opacity: 0.5 }}>+</span> /26-27/ <span style={{ opacity: 0.5 }}>+</span> 129 <span style={{ opacity: 0.5 }}>→</span> WT/OFFER/26-27/129
            </Typography>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

// ── Responsive Organization Row (Table Row on Desktop, Native Card on Mobile) ──
interface OrgRowItemProps {
  row: RowState;
  role: 'leader' | 'follower';
  isSharedSeries: boolean;
  followerCount: number;
  leaderName: string;
  isDuplicate: boolean;
  busy: boolean;
  canLink: boolean;
  linkTargets: RowState[];
  onPrefixChange: (val: string) => void;
  onChangeLink: (targetId: string | null) => void;
  displayData: {
    fullText: string;
    hasCustomPrefix: boolean;
  };
}

const OrgRowItem: React.FC<OrgRowItemProps> = ({
  row,
  role,
  isSharedSeries,
  followerCount,
  leaderName,
  isDuplicate,
  busy,
  canLink,
  linkTargets,
  onPrefixChange,
  onChangeLink,
  displayData,
}) => {
  const isDirty = row.prefix.trim() !== row.savedPrefix;

  return (
    <Box
      sx={{
        px: { xs: 1.5, md: 2 },
        py: { xs: 1.25, md: 1.25 },
        transition: 'background-color 0.12s ease',
        '&:hover': {
          backgroundColor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : '#f8fafc'),
        },
        borderLeft: isSharedSeries ? '3px solid' : '3px solid transparent',
        borderLeftColor: isSharedSeries ? 'primary.main' : 'transparent',
      }}
    >
      {/* ── DESKTOP VIEW (md and up, >= 900px): Clean 4-Column Table Grid ── */}
      <Box
        sx={{
          display: { xs: 'none', md: 'grid' },
          gridTemplateColumns: 'minmax(220px, 1.3fr) 130px 180px 140px',
          alignItems: 'center',
          gap: 1.5,
          width: '100%',
        }}
      >
        {/* 1. Organization Column */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            pl: role === 'follower' ? 2 : 0,
            minWidth: 0,
          }}
        >
          {role === 'follower' ? (
            <SubdirectoryArrowRightRoundedIcon
              sx={{ fontSize: 16, color: 'primary.main', flexShrink: 0 }}
            />
          ) : (
            <Box
              sx={{
                width: 26,
                height: 26,
                borderRadius: 1.25,
                backgroundColor: isSharedSeries
                  ? (theme) => (theme.palette.mode === 'dark' ? 'rgba(37, 99, 235, 0.2)' : '#eff6ff')
                  : (theme) => (theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : '#f1f5f9'),
                color: isSharedSeries ? 'primary.main' : 'text.secondary',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: 10.5,
                flexShrink: 0,
              }}
            >
              {row.organizationName.substring(0, 2).toUpperCase()}
            </Box>
          )}

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0, flexWrap: 'wrap' }}>
            <Typography
              sx={{
                fontSize: 13,
                fontWeight: role === 'leader' ? 600 : 500,
                color: 'text.primary',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={role === 'follower' ? `${row.organizationName} (shares with ${leaderName})` : row.organizationName}
            >
              {row.organizationName}
            </Typography>

            {role === 'leader' && isSharedSeries && (
              <ToneChip
                tone="brand"
                label={`Series Owner (${followerCount + 1})`}
                dense
              />
            )}

            {role === 'follower' && (
              <ToneChip
                tone="cyan"
                label="Linked"
                dense
              />
            )}
          </Box>
        </Box>

        {/* 2. Prefix Input Column */}
        <Box sx={{ width: '100%', maxWidth: 120, display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Tooltip title={isDuplicate ? 'Duplicate prefix in separate series.' : ''}>
            <TextField
              size="small"
              value={row.prefix}
              onChange={(e) => onPrefixChange(e.target.value)}
              placeholder="WT/OFFER"
              inputProps={{ maxLength: 20, 'aria-label': `${row.organizationName} prefix` }}
              error={isDuplicate}
              fullWidth
              sx={{
                '& .MuiOutlinedInput-root': {
                  height: 30,
                  fontSize: 12,
                  fontWeight: 600,
                  backgroundColor: 'background.paper',
                  borderRadius: 1.5,
                  borderColor: isDirty ? 'warning.main' : '#cbd5e1',
                  '& fieldset': {
                    borderColor: isDirty ? 'warning.main' : '#cbd5e1',
                  },
                },
                '& .MuiOutlinedInput-input': {
                  fontFamily: 'monospace',
                  fontSize: 12,
                  fontWeight: 600,
                  py: 0,
                  px: 1,
                },
              }}
            />
          </Tooltip>
          {isDirty && (
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'warning.main', flexShrink: 0 }} />
          )}
        </Box>

        {/* 3. Next Lead ID Sample Column */}
        <Box sx={{ width: '100%', display: 'flex', alignItems: 'center' }}>
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              px: 1,
              py: 0.35,
              borderRadius: 1.25,
              backgroundColor: displayData.hasCustomPrefix
                ? (theme) => (theme.palette.mode === 'dark' ? 'rgba(37, 99, 235, 0.12)' : '#f1f5f9')
                : (theme) => (theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : '#f8fafc'),
              border: '1px solid',
              borderColor: displayData.hasCustomPrefix
                ? (theme) => (theme.palette.mode === 'dark' ? 'rgba(37, 99, 235, 0.3)' : '#e2e8f0')
                : (theme) => (theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#f1f5f9'),
              maxWidth: '100%',
            }}
          >
            <Typography
              sx={{
                fontFamily: 'monospace',
                fontSize: 12,
                fontWeight: 700,
                color: displayData.hasCustomPrefix ? 'text.primary' : 'text.disabled',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {displayData.fullText}
            </Typography>
          </Box>
        </Box>

        {/* 4. Numbering Series & Linking Actions Column */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 1,
            width: '100%',
          }}
        >
          {busy ? (
            <CircularProgress size={16} />
          ) : role === 'follower' ? (
            <Tooltip title={`Give ${row.organizationName} its own independent number series.`}>
              <Button
                size="small"
                variant="outlined"
                color="error"
                startIcon={<LinkOffRoundedIcon sx={{ fontSize: 14 }} />}
                onClick={() => onChangeLink(null)}
                sx={{
                  fontSize: 11.5,
                  fontWeight: 600,
                  textTransform: 'none',
                  height: 28,
                  borderRadius: 1.25,
                  px: 1.25,
                  py: 0,
                  whiteSpace: 'nowrap',
                  backgroundColor: 'background.paper',
                  borderColor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(239, 68, 68, 0.4)' : '#fecaca'),
                  '&:hover': {
                    borderColor: 'error.main',
                    backgroundColor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(239, 68, 68, 0.12)' : '#fef2f2'),
                  },
                }}
              >
                Stop sharing
              </Button>
            </Tooltip>
          ) : !isSharedSeries && canLink && linkTargets.length > 0 ? (
            <Select
              size="small"
              displayEmpty
              value=""
              disabled={!row.settingId}
              onChange={(e) => onChangeLink(String(e.target.value) || null)}
              renderValue={() => (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: 11.5, fontWeight: 600, color: 'primary.main' }}>
                  <LinkRoundedIcon sx={{ fontSize: 14 }} />
                  Share with...
                </Box>
              )}
              sx={{
                height: 28,
                borderRadius: 1.25,
                backgroundColor: 'background.paper',
                fontSize: 11.5,
                fontWeight: 600,
                color: 'primary.main',
                borderColor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(37, 99, 235, 0.4)' : '#bfdbfe'),
                '& .MuiSelect-select': { py: '4px', px: '8px' },
              }}
            >
              {linkTargets.map((target) => (
                <MenuItem key={target.organizationId} value={target.organizationId} sx={{ fontSize: 12 }}>
                  Link to {target.organizationName}
                </MenuItem>
              ))}
            </Select>
          ) : (
            <Typography sx={{ fontSize: 11.5, color: 'text.secondary', fontStyle: 'italic' }}>
              {isSharedSeries ? 'Master counter' : 'Independent'}
            </Typography>
          )}
        </Box>
      </Box>

      {/* ── MOBILE VIEW (< md, < 900px): Clean, High-End Compact Card ── */}
      <Box
        sx={{
          display: { xs: 'flex', md: 'none' },
          flexDirection: 'column',
          gap: 1.25,
          width: '100%',
          pl: role === 'follower' ? 1.5 : 0,
        }}
      >
        {/* Mobile Header: Org Name + Role Badge */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0, flex: 1 }}>
            {role === 'follower' ? (
              <SubdirectoryArrowRightRoundedIcon sx={{ fontSize: 16, color: 'primary.main', flexShrink: 0 }} />
            ) : (
              <Box
                sx={{
                  width: 24,
                  height: 24,
                  borderRadius: 1,
                  backgroundColor: isSharedSeries ? '#eff6ff' : '#f1f5f9',
                  color: isSharedSeries ? 'primary.main' : 'text.secondary',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: 10,
                  flexShrink: 0,
                }}
              >
                {row.organizationName.substring(0, 2).toUpperCase()}
              </Box>
            )}
            <Typography
              sx={{
                fontSize: 13,
                fontWeight: 700,
                color: 'text.primary',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={row.organizationName}
            >
              {row.organizationName}
            </Typography>
          </Box>

          <Box sx={{ flexShrink: 0 }}>
            {role === 'leader' && isSharedSeries && (
              <ToneChip tone="brand" label={`Series Owner (${followerCount + 1})`} dense />
            )}
            {role === 'follower' && (
              <ToneChip tone="cyan" label="Linked" dense />
            )}
          </Box>
        </Box>

        {/* Mobile Middle: Unified Prefix & Live Preview Bar */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            p: 1,
            borderRadius: 1.5,
            backgroundColor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : '#f8fafc'),
            border: '1px solid',
            borderColor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : '#e2e8f0'),
          }}
        >
          {/* Prefix Input */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: 'text.secondary', mb: 0.25, textTransform: 'uppercase' }}>
              Prefix Code
            </Typography>
            <TextField
              size="small"
              value={row.prefix}
              onChange={(e) => onPrefixChange(e.target.value)}
              placeholder="e.g. WT/OFFER"
              inputProps={{ maxLength: 20 }}
              error={isDuplicate}
              fullWidth
              sx={{
                '& .MuiOutlinedInput-root': {
                  height: 30,
                  fontSize: 12,
                  fontWeight: 600,
                  backgroundColor: 'background.paper',
                  borderRadius: 1.25,
                  borderColor: isDirty ? 'warning.main' : '#cbd5e1',
                },
                '& .MuiOutlinedInput-input': {
                  fontFamily: 'monospace',
                  fontSize: 12,
                  fontWeight: 600,
                  py: 0,
                  px: 1,
                },
              }}
            />
          </Box>

          <ArrowForwardRoundedIcon sx={{ fontSize: 14, color: 'text.disabled', mt: 2, flexShrink: 0 }} />

          {/* Live Preview Sample */}
          <Box sx={{ flex: 1.3, minWidth: 0 }}>
            <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: 'text.secondary', mb: 0.25, textTransform: 'uppercase' }}>
              Next Lead ID
            </Typography>
            <Box
              sx={{
                height: 30,
                px: 1,
                borderRadius: 1.25,
                backgroundColor: displayData.hasCustomPrefix ? '#f1f5f9' : '#ffffff',
                border: '1px solid',
                borderColor: displayData.hasCustomPrefix ? '#cbd5e1' : '#e2e8f0',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Typography
                sx={{
                  fontFamily: 'monospace',
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: displayData.hasCustomPrefix ? 'text.primary' : 'text.disabled',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {displayData.fullText}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Mobile Footer: Sequence Context & Action Button */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <Typography sx={{ fontSize: 11, color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {role === 'follower'
              ? `Draws from ${leaderName}`
              : isSharedSeries
                ? 'Master numbering counter'
                : 'Independent sequence counter'}
          </Typography>

          <Box sx={{ flexShrink: 0 }}>
            {busy ? (
              <CircularProgress size={16} />
            ) : role === 'follower' ? (
              <Button
                size="small"
                variant="outlined"
                color="error"
                startIcon={<LinkOffRoundedIcon sx={{ fontSize: 13 }} />}
                onClick={() => onChangeLink(null)}
                sx={{
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: 'none',
                  height: 26,
                  borderRadius: 1.25,
                  px: 1.25,
                  py: 0,
                  whiteSpace: 'nowrap',
                  backgroundColor: 'background.paper',
                  // Derived from the palette rather than the light-mode red these
                  // were picked from (#fecaca / #fef2f2), which stayed pale on a
                  // dark surface and washed the button out.
                  borderColor: 'error.light',
                  '&:hover': {
                    backgroundColor: (t) => alpha(t.palette.error.main, t.palette.mode === 'dark' ? 0.18 : 0.07),
                    borderColor: 'error.main',
                  },
                }}
              >
                Stop sharing
              </Button>
            ) : !isSharedSeries && canLink && linkTargets.length > 0 ? (
              <Select
                size="small"
                displayEmpty
                value=""
                disabled={!row.settingId}
                onChange={(e) => onChangeLink(String(e.target.value) || null)}
                renderValue={() => (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: 11, fontWeight: 600, color: 'primary.main', whiteSpace: 'nowrap' }}>
                    <LinkRoundedIcon sx={{ fontSize: 13 }} />
                    Share with...
                  </Box>
                )}
                sx={{
                  height: 26,
                  borderRadius: 1.25,
                  backgroundColor: 'background.paper',
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'primary.main',
                  '& .MuiSelect-select': { py: '2px', px: '6px' },
                }}
              >
                {linkTargets.map((target) => (
                  <MenuItem key={target.organizationId} value={target.organizationId} sx={{ fontSize: 12 }}>
                    Link to {target.organizationName}
                  </MenuItem>
                ))}
              </Select>
            ) : null}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default PerOrgPrefixSettings;
