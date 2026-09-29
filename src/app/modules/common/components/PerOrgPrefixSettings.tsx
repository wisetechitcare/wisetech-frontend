import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
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
import Flatpickr from 'react-flatpickr';
import {
  fetchAllPrefixSettings,
  createPrefixSetting,
  updatePrefixSetting,
  setPrefixSequenceLink,
  fetchLeadNumberPreview,
  fetchProjectNumberPreview,
  fetchDocumentNumberPreview,
} from '@services/options';
import { fetchCompanyOverview } from '@services/company';
import { useOrgScope } from '@hooks/useOrgScope';
import { successConfirmation, errorConfirmation } from '@utils/modal';
import { ToneChip } from '@app/modules/common/components/ui/chips';
import {
  convertFiscalYearToDates,
  toISODateString,
  getDefaultFiscalYear,
  type PrefixSetting,
} from './PrefixSettingsForm';
import {
  FISCAL_YEAR_FORMAT_OPTIONS,
  SEQUENCE_PAD_OPTIONS,
  asFiscalYearFormat,
  formatFiscalYearSegment,
  formatSequence,
  resolveSequencePad,
  type FiscalYearFormat,
} from '@utils/fiscalYearSegment';

interface PerOrgPrefixSettingsProps {
  /** Human label, e.g. 'Lead'. */
  typeLabel: string;
  /** Enum value, e.g. 'LEAD'. */
  typeValue: string;
  /**
   * The series is ONE continuous company-wide counter rather than one per
   * organization. Each organization still sets its own prefix TEXT; the number
   * runs across all of them and never resets on a fiscal-year rollover.
   *
   * PROJECT is the only such series today: 772 is the 772nd project the company
   * has ever taken on, and the next is 773 whatever the date and whoever takes
   * it on. The per-organization linking controls are hidden here because there
   * is nothing to link — every organization is already on the one counter.
   */
  singleSeries?: boolean;
}

/**
 * One corner radius for every control on this screen.
 *
 * The row carried three different values — 12px on the prefix box and the format
 * selects, 10px on the sample chip and the series buttons, 6px on the year box —
 * which on 28-30px tall controls reads as "some of these are pills and some are
 * not" rather than as a deliberate hierarchy. 8px is the kit's field radius, so
 * these now match the inputs on every other configuration screen.
 *
 * Surfaces (cards, the info dialog's panels) stay rounder on purpose: a container
 * should read as a container. This is for the things you click and type into.
 */
const CONTROL_RADIUS = 1;

interface RowState {
  organizationId: string;
  organizationName: string;
  settingId?: string;
  savedPrefix: string;
  prefix: string;
  sequenceSourceOrganizationId: string | null;
  /**
   * This organization's OWN year shape and number width.
   *
   * `prefix_settings` has always stored both per row — the toolbar simply wrote
   * one value to every row, which is why one organization could not differ. The
   * toolbar is now a bulk "apply to all"; these are the values that actually save.
   *
   * Held resolved rather than nullable: a row that has never been configured shows
   * what it would print today, which is what an admin is choosing against.
   */
  yearFormat: FiscalYearFormat;
  numberPad: number;
  savedYearFormat: FiscalYearFormat;
  savedNumberPad: number;
}

interface Series {
  leader: RowState;
  followers: RowState[];
}

const PerOrgPrefixSettings: React.FC<PerOrgPrefixSettingsProps> = ({
  typeLabel,
  typeValue,
  singleSeries = false,
}) => {
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
          const rowFormat = asFiscalYearFormat(saved?.yearFormat);
          const rowPad = resolveSequencePad(saved?.numberPad, typeValue);
          return {
            organizationId: org.id,
            organizationName: org.name,
            settingId: saved?.id,
            savedPrefix: saved?.prefix ?? '',
            prefix: saved?.prefix ?? '',
            sequenceSourceOrganizationId: saved?.sequenceSourceOrganizationId ?? null,
            yearFormat: rowFormat,
            numberPad: rowPad,
            savedYearFormat: rowFormat,
            savedNumberPad: rowPad,
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

  // The sample in the "Next ... No." column, straight from the series that will
  // actually issue it. Each identifier has its own preview endpoint because each
  // answers differently when nothing is configured — the lead one refuses, the
  // others fall back — and none of them consume a number.
  useEffect(() => {
    const configured = rows.filter((r) => r.settingId);
    if (!configured.length) return;
    let cancelled = false;

    const previewFor = (organizationId: string) => {
      if (typeValue === 'LEAD') return fetchLeadNumberPreview(organizationId);
      if (typeValue === 'PROJECT') return fetchProjectNumberPreview(organizationId);
      if (typeValue === 'PROFORMA' || typeValue === 'INVOICE') {
        return fetchDocumentNumberPreview(typeValue, organizationId);
      }
      return null;
    };

    (async () => {
      const entries = await Promise.all(
        configured.map(async (row) => {
          try {
            const res = await previewFor(row.organizationId);
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

  const patchRow = (organizationId: string, patch: Partial<RowState>) =>
    setRows((prev) =>
      prev.map((row) => (row.organizationId === organizationId ? { ...row, ...patch } : row)),
    );

  const setPrefix = (organizationId: string, value: string) =>
    patchRow(organizationId, { prefix: value });

  /** The toolbar's bulk action: stamp one shape onto every organization. */
  const applyToAllRows = (patch: Partial<RowState>) =>
    setRows((prev) => prev.map((row) => ({ ...row, ...patch })));

  /**
   * What the toolbar shows: the shared value, or null when organizations differ.
   *
   * A blank control is how "these are not all the same" reads without inventing a
   * fake value — picking something then applies it to every row.
   */
  const commonOf = <T,>(pick: (row: RowState) => T): T | null => {
    if (!rows.length) return null;
    const first = pick(rows[0]);
    return rows.every((row) => pick(row) === first) ? first : null;
  };
  /**
   * The shape a row actually prints in.
   *
   * A row linked to another organization's counter INHERITS that organization's
   * year shape and digit width. Only the counter merges — each organization keeps
   * its own prefix TEXT — but the shape is a property of the series, not of the
   * organization: one counter rendering `…/2026-27/01` and then `…/26-27/0002`
   * makes consecutive numbers stop looking consecutive.
   *
   * Falls back to the row's own values when the link points at something no longer
   * on screen, so a stale link degrades to "independent" rather than blank.
   */
  const effectiveShape = (row: RowState): { yearFormat: FiscalYearFormat; numberPad: number } => {
    const source = row.sequenceSourceOrganizationId
      ? rows.find((r) => r.organizationId === row.sequenceSourceOrganizationId)
      : undefined;
    return {
      yearFormat: source?.yearFormat ?? row.yearFormat,
      numberPad: source?.numberPad ?? row.numberPad,
    };
  };

  const commonFormat = commonOf((row) => effectiveShape(row).yearFormat);
  const commonPad = commonOf((row) => effectiveShape(row).numberPad);

  // Same labels as the "Apply to all" Year menu: the real segment ("26-27"), token as the hint.
  const yearOptions = FISCAL_YEAR_FORMAT_OPTIONS.map((o) => ({
    value: o.value,
    label: formatFiscalYearSegment(fiscalYear, o.value) || o.sample,
    hint: o.label,
  }));

  /**
   * The `/year/number` tail for one organization, in ITS shape and at a given
   * sequence value.
   *
   * Rendered locally rather than taken from the server so an unsaved change to the
   * year shape or the digit width shows up immediately — the server preview was
   * fetched against the SAVED row and cannot know about an edit in progress.
   */
  const rowSampleTail = (row: RowState, sequence: number) => {
    const shape = effectiveShape(row);
    const segment = formatFiscalYearSegment(fiscalYear, shape.yearFormat);
    const n = formatSequence(sequence, shape.numberPad);
    return segment ? `/${segment}/${n}` : `/${n}`;
  };

  /**
   * The real next sequence value, read back out of the server's preview string.
   *
   * The COUNTER is the server's to know — it is the nth number this series will
   * actually issue, and no amount of local state can guess it. Only its
   * PRESENTATION is local, which is exactly the split the backend makes: the
   * counter stores an integer, the shape is applied when the string is built.
   *
   * Falls back to 1 for a series that has never been configured or previewed.
   */
  const previewSequence = (row: RowState): number => {
    const preview = previews[row.organizationId] || '';
    if (!preview) return 1;
    const tail = preview.split('/').pop() ?? '';
    const parsed = parseInt(tail, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  };

  // Compared against the EFFECTIVE shape, so changing a master's format marks its
  // followers dirty too — they are about to be written with the inherited value.
  const dirtyRows = rows.filter((row) => {
    const shape = effectiveShape(row);
    return (
      row.prefix.trim() !== row.savedPrefix
      || shape.yearFormat !== row.savedYearFormat
      || shape.numberPad !== row.savedNumberPad
    );
  });
  const yearDirty = !!fiscalYear && fiscalYear !== savedFiscalYear;
  const hasChanges = dirtyRows.length > 0 || yearDirty;

  // The fiscal YEAR is still one value for the series, so changing it widens the
  // save to every configured row — otherwise half the organizations would keep
  // numbering under the old year. The SHAPE is per row and saves only where edited.
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

  // Nothing to link on a single company-wide series — every organization already
  // draws from the one counter, so offering to "share" it would be a no-op button.
  const canLink = (row: RowState) =>
    !singleSeries
    && !!row.settingId
    && !rows.some((r) => r.sequenceSourceOrganizationId === row.organizationId);

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
          const shape = effectiveShape(row);
          await updatePrefixSetting(row.settingId, {
            prefix,
            year: fiscalYear,
            yearFormat: shape.yearFormat,
            numberPad: shape.numberPad,
          });
        } else {
          await createPrefixSetting({
            identifier: typeValue,
            year: fiscalYear,
            prefix,
            organizationId: row.organizationId,
            ...effectiveShape(row),
          });
        }
      }
      successConfirmation('Prefix settings saved successfully.');
      setReloadToken((n) => n + 1);
    } catch (err: any) {
      // The server explains a refused save (e.g. a prefix that would duplicate
      // another organization's numbers) — show that, not a generic failure.
      errorConfirmation(err?.response?.data?.message || 'Could not save prefix settings.');
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
    // The NUMBER comes from the server (it owns the counter); the PREFIX, YEAR
    // SHAPE and WIDTH are read from the row as it currently stands, so every edit
    // is visible before it is saved. Taking the server's string wholesale is what
    // made a changed format look like it had done nothing.
    const tail = rowSampleTail(row, previewSequence(row));

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
          {/* Section 1: the fiscal year itself — label and picker read as one field. */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'text.primary', whiteSpace: 'nowrap' }}>
                Fiscal Year
              </Typography>
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
            <Box
              sx={{
                // Its own full line on mobile: "01/04/2026 to 31/03/2027" needs
                // roughly 190px and there is no shorter honest way to write it.
                flexBasis: { xs: '100%', sm: 'auto' },
                width: { sm: 195 },
                '& input': {
                  width: '100%',
                  height: 32,
                  padding: '0 10px',
                  borderRadius: '8px',
                  border: '1px solid',
                  borderColor: yearDirty ? 'warning.main' : 'var(--mui-palette-divider, #cbd5e1)',
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
          </Box>

          {/*
            Section 2: bulk "apply to all" selectors + Save. Labelled as global so
            nobody mistakes them for a setting of their own — each row below holds
            the values that actually save; these just stamp one onto every row.
          */}
          <Box
            sx={{
              display: 'flex',
              flexWrap: { xs: 'wrap', sm: 'nowrap' },
              alignItems: 'center',
              gap: 1,
              justifyContent: { sm: 'flex-end' },
            }}
          >
            <Typography
              sx={{
                fontSize: 11,
                fontWeight: 700,
                color: 'text.secondary',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                whiteSpace: 'nowrap',
                flexBasis: { xs: '100%', sm: 'auto' },
              }}
            >
              Apply to all
            </Typography>

            {/*
              How that fiscal year is PRINTED in the number. The range above says
              WHICH year; this says what it looks like. Each option is labelled with
              the segment it actually produces for the selected range, so the choice
              is read rather than decoded.
            */}
            <Select
              size="small"
              displayEmpty
              value={commonFormat ?? ''}
              startAdornment={<InlineLabel>Year</InlineLabel>}
              onChange={(event) => applyToAllRows({ yearFormat: event.target.value as FiscalYearFormat })}
              renderValue={(value) =>
                value
                  ? formatFiscalYearSegment(fiscalYear, value as FiscalYearFormat) || String(value)
                  : 'Mixed'
              }
              sx={{
                height: 32,
                minWidth: 136,
                fontSize: 12.5,
                fontWeight: 600,
                backgroundColor: 'background.paper',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: rows.some((r) => r.yearFormat !== r.savedYearFormat)
                    ? 'warning.main'
                    : '#cbd5e1',
                },
              }}
              inputProps={{ 'aria-label': 'Year format for all organizations' }}
            >
              {FISCAL_YEAR_FORMAT_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value} sx={{ fontSize: 12.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                    <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>
                      {formatFiscalYearSegment(fiscalYear, option.value) || option.sample}
                    </Typography>
                    <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                      {option.label}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>

            {/*
              How wide the running number is padded. Separate from the year shape
              because the two answer different questions, and the series genuinely
              disagree: leads read better as 001, a bill number as 1.
            */}
            <Select
              size="small"
              displayEmpty
              value={commonPad ?? ''}
              startAdornment={<InlineLabel>Number</InlineLabel>}
              onChange={(event) => applyToAllRows({ numberPad: Number(event.target.value) })}
              renderValue={(value) => (value ? formatSequence(1, Number(value)) : 'Mixed')}
              sx={{
                height: 32,
                minWidth: 132,
                fontSize: 12.5,
                fontWeight: 600,
                backgroundColor: 'background.paper',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: rows.some((r) => r.numberPad !== r.savedNumberPad)
                    ? 'warning.main'
                    : '#cbd5e1',
                },
              }}
              inputProps={{ 'aria-label': 'Number width for all organizations' }}
            >
              {SEQUENCE_PAD_OPTIONS.map((pad) => (
                <MenuItem key={pad} value={pad} sx={{ fontSize: 12.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                    <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>
                      {formatSequence(1, pad)}
                    </Typography>
                    <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                      {pad === 1 ? 'no padding' : `${pad} digits`}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>


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
                borderRadius: CONTROL_RADIUS,
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
            borderRadius: CONTROL_RADIUS,
            color: 'error.main',
          }}
        >
          <WarningAmberRoundedIcon sx={{ color: 'error.main', fontSize: 18, flexShrink: 0 }} />
          <Typography sx={{ fontSize: 12, fontWeight: 500 }}>
            Duplicate Prefix: Multiple independent series share the same prefix. Please link them or use unique prefixes.
          </Typography>
        </Box>
      )}

      {/*
        ── Organization Configuration Container ──

        The desktop grid's columns add up to roughly 870px. Between the md
        breakpoint and that width the table has to SCROLL, not squash — squashing
        is what truncated every value to an ellipsis. Below md the rows render as
        stacked cards instead and this never applies.
      */}
      <Box
        sx={{
          border: '1px solid',
          borderColor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0'),
          borderRadius: 2,
          backgroundColor: 'background.paper',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            // Scrolls only where the grid applies. `minWidth` is what makes the
            // header and the rows scroll as ONE unit — without it they scroll
            // independently and the columns stop lining up.
            overflowX: { xs: 'visible', md: 'auto' },
            '& > *': { minWidth: { md: 880 } },
          }}
        >
        {/* Desktop Table Column Header (Hidden on Mobile) */}
        <Box
          sx={{
            display: { xs: 'none', md: 'grid' },
            // Organization | Prefix | Number format | Sample | Series.
            // The sample sits AFTER the parts that build it, so the row reads
            // left-to-right as "these pieces produce this number".
            // Only the ORGANIZATION column flexes; everything after it is a fixed
            // width. That keeps the four config columns packed together on the
            // right and vertically aligned row to row, instead of a second `fr`
            // stretching the sample column and opening a gap before the actions.
            gridTemplateColumns: 'minmax(180px, 1fr) 132px 178px 210px 150px',
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
          {/* Split to sit over each select below: Year | / | Number. */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Typography sx={{ flex: 1, fontSize: 11, fontWeight: 700, color: 'text.secondary', letterSpacing: 0.5, textTransform: 'uppercase' }}>
              Year
            </Typography>
            <Box sx={{ width: 7, flexShrink: 0 }} />
            <Typography sx={{ flex: 1, fontSize: 11, fontWeight: 700, color: 'text.secondary', letterSpacing: 0.5, textTransform: 'uppercase' }}>
              Number
            </Typography>
          </Box>
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', letterSpacing: 0.5, textTransform: 'uppercase' }}>
            Next {typeLabel} No.
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
                  typeLabel={typeLabel}
                  singleSeries={singleSeries}
                  shape={effectiveShape(leader)}
                  yearOptions={yearOptions}
                  role="leader"
                  isSharedSeries={isSharedSeries}
                  followerCount={followers.length}
                  leaderName={leader.organizationName}
                  isDuplicate={isDuplicate(leader)}
                  busy={linkingOrgId === leader.organizationId}
                  canLink={canLink(leader)}
                  linkTargets={linkTargets(leader)}
                  onPrefixChange={(val) => setPrefix(leader.organizationId, val)}
                  onShapeChange={(patch) => patchRow(leader.organizationId, patch)}
                  onChangeLink={(targetId) => changeLink(leader, targetId)}
                  displayData={getNextNumberDisplay(leader)}
                />

                {/* Follower Rows */}
                {followers.map((follower) => (
                  <OrgRowItem
                    key={follower.organizationId}
                    row={follower}
                    typeLabel={typeLabel}
                    singleSeries={singleSeries}
                    shape={effectiveShape(follower)}
                    yearOptions={yearOptions}
                    role="follower"
                    isSharedSeries={true}
                    followerCount={0}
                    leaderName={leader.organizationName}
                    isDuplicate={isDuplicate(follower)}
                    busy={linkingOrgId === follower.organizationId}
                    canLink={false}
                    linkTargets={[]}
                    onPrefixChange={(val) => setPrefix(follower.organizationId, val)}
                    onShapeChange={(patch) => patchRow(follower.organizationId, patch)}
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
              Sample {typeLabel} No. Breakdown:
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

/** A muted label inside a toolbar select, so "Year 26-27" names itself. */
const InlineLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <InputAdornment position="start" sx={{ mr: 0.5 }}>
    <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: 'text.secondary' }}>{children}</Typography>
  </InputAdornment>
);

/**
 * One dropdown in a table row — the year shape or the digit width.
 *
 * Deliberately wears the SAME frame as the prefix `TextField` beside it: same
 * 30px height, same radius, same border, same monospace. They are three parts of
 * one number, so three different-looking controls made the row read as unrelated
 * widgets rather than one editable value.
 *
 * `dirty` tints the border amber, matching how an edited prefix already signals
 * that it is unsaved — a row should look changed at a glance, whichever part
 * changed.
 */
const ShapeSelect: React.FC<{
  value: string | number;
  dirty: boolean;
  /** A follower inherits its master's shape, so its own control is read-only. */
  disabled?: boolean;
  ariaLabel: string;
  onChange: (value: string | number) => void;
  /** `hint` is the muted token beside the label in the menu (e.g. "YY-YY"); the field shows the label only. */
  options: { value: string | number; label: string; hint?: string }[];
}> = ({ value, dirty, disabled = false, ariaLabel, onChange, options }) => (
  <Select
    size="small"
    value={value}
    disabled={disabled}
    renderValue={(v) => options.find((o) => o.value === v)?.label ?? String(v)}
    onChange={(event) => onChange(event.target.value as string | number)}
    inputProps={{ 'aria-label': ariaLabel }}
    sx={{
      height: 30,
      minWidth: 0,
      flex: 1,
      borderRadius: CONTROL_RADIUS,
      backgroundColor: 'background.paper',
      fontFamily: 'monospace',
      fontSize: 12,
      fontWeight: 600,
      color: 'text.primary',
      '& .MuiOutlinedInput-notchedOutline': {
        borderColor: dirty ? 'warning.main' : 'divider',
      },
      '&:hover .MuiOutlinedInput-notchedOutline': {
        borderColor: dirty ? 'warning.main' : 'text.disabled',
      },
      '& .MuiSelect-select': { py: 0, pl: 1, pr: '22px !important' },
      '& .MuiSelect-icon': { fontSize: 16, color: 'text.disabled' },
      // Inherited, not unavailable — it still has to be readable, so it dims the
      // frame rather than greying the value out.
      '&.Mui-disabled': {
        backgroundColor: 'action.hover',
        '& .MuiSelect-select': { WebkitTextFillColor: 'unset', color: 'text.secondary' },
        '& .MuiOutlinedInput-notchedOutline': { borderStyle: 'dashed' },
      },
    }}
  >
    {options.map((option) => (
      <MenuItem key={option.value} value={option.value} sx={{ fontSize: 12, fontFamily: 'monospace' }}>
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
          <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>{option.label}</Typography>
          {option.hint && (
            <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{option.hint}</Typography>
          )}
        </Box>
      </MenuItem>
    ))}
  </Select>
);

// ── Responsive Organization Row (Table Row on Desktop, Native Card on Mobile) ──
interface OrgRowItemProps {
  row: RowState;
  /** Human label for the series, e.g. 'Lead' — used in the mobile card's caption. */
  typeLabel: string;
  /**
   * The whole series runs on ONE company-wide counter, so there is nothing to
   * link and nothing is "independent" of anything. Without this the row claims
   * Independent while every organization visibly shares a number.
   */
  singleSeries: boolean;
  /**
   * The shape this row PRINTS in — its own when it owns its counter, its master's
   * when it is linked. Resolved by the parent, which is the only place that can
   * see the other rows.
   */
  shape: { yearFormat: FiscalYearFormat; numberPad: number };
  /** Year choices rendered against the current fiscal year ("26-27" + its "YY-YY" hint). */
  yearOptions: { value: FiscalYearFormat; label: string; hint: string }[];
  role: 'leader' | 'follower';
  isSharedSeries: boolean;
  followerCount: number;
  leaderName: string;
  isDuplicate: boolean;
  busy: boolean;
  canLink: boolean;
  linkTargets: RowState[];
  onPrefixChange: (val: string) => void;
  /** This organization's own year shape / number width. */
  onShapeChange: (patch: { yearFormat?: FiscalYearFormat; numberPad?: number }) => void;
  onChangeLink: (targetId: string | null) => void;
  displayData: {
    fullText: string;
    hasCustomPrefix: boolean;
  };
}

const OrgRowItem: React.FC<OrgRowItemProps> = ({
  row,
  typeLabel,
  singleSeries,
  shape,
  yearOptions,
  onShapeChange,
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
          // Organization | Prefix | Number format | Sample | Series.
            // The sample sits AFTER the parts that build it, so the row reads
            // left-to-right as "these pieces produce this number".
            // Only the ORGANIZATION column flexes; everything after it is a fixed
            // width. That keeps the four config columns packed together on the
            // right and vertically aligned row to row, instead of a second `fr`
            // stretching the sample column and opening a gap before the actions.
            gridTemplateColumns: 'minmax(180px, 1fr) 132px 178px 210px 150px',
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
                borderRadius: CONTROL_RADIUS,
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
        <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', gap: 0.75 }}>
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
                  borderRadius: CONTROL_RADIUS,
                  // `divider`, not a hardcoded grey: the two selects beside this
                  // field use the same token, so the three stay identical in dark
                  // mode as well as light.
                  '& fieldset': {
                    borderColor: isDirty ? 'warning.main' : 'divider',
                  },
                  '&:hover fieldset': {
                    borderColor: isDirty ? 'warning.main' : 'text.disabled',
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
          {/* Same separator as between Year and Number — the row reads as the number it builds. */}
          <Typography sx={{ fontSize: 12, fontFamily: 'monospace', color: 'text.disabled', flexShrink: 0 }}>
            /
          </Typography>
        </Box>

        {/*
          3. Number Format — this organization's OWN year shape and digit width.
          The toolbar stamps one shape onto every row; these are what actually
          save, so one organization can differ without dragging the rest with it.
          Amber while unsaved, matching the prefix field's own dirty state.
        */}
        <Tooltip
          title={
            role === 'follower'
              ? `Follows ${leaderName} — organizations sharing one counter print the same shape, so consecutive numbers look consecutive.`
              : ''
          }
        >
          <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
            <ShapeSelect
              value={shape.yearFormat}
              dirty={shape.yearFormat !== row.savedYearFormat}
              disabled={role === 'follower'}
              ariaLabel={`${row.organizationName} year format`}
              onChange={(value) => onShapeChange({ yearFormat: value as FiscalYearFormat })}
              options={yearOptions}
            />
            <Typography sx={{ fontSize: 12, fontFamily: 'monospace', color: 'text.disabled', flexShrink: 0 }}>
              /
            </Typography>
            <ShapeSelect
              value={shape.numberPad}
              dirty={shape.numberPad !== row.savedNumberPad}
              disabled={role === 'follower'}
              ariaLabel={`${row.organizationName} number width`}
              onChange={(value) => onShapeChange({ numberPad: Number(value) })}
              options={SEQUENCE_PAD_OPTIONS.map((pad) => ({
                value: pad,
                label: formatSequence(1, pad),
                hint: pad === 1 ? 'no padding' : `${pad} digits`,
              }))}
            />
          </Box>
        </Tooltip>

        {/* 4. Next No. Sample Column */}
        <Box sx={{ width: '100%', display: 'flex', alignItems: 'center' }}>
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              px: 1,
              py: 0.35,
              borderRadius: CONTROL_RADIUS,
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

        {/* 5. Numbering Series & Linking Actions Column */}
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
                  borderRadius: CONTROL_RADIUS,
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
                borderRadius: CONTROL_RADIUS,
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
              {singleSeries
                ? 'Company-wide series'
                : isSharedSeries ? 'Master counter' : 'Independent'}
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

        {/*
          Mobile Middle: the three parts of a number, STACKED.

          On desktop these are table columns. At 360px they cannot be — a prefix
          field, two dropdowns and a sample on one line leaves every one of them
          too narrow to read, which is what "WT/PI…" / "YYY…" / "WT/PI/…" was.
          So they stack in the order they compose the number, each full width.
        */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            p: 1.25,
            borderRadius: CONTROL_RADIUS,
            backgroundColor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : '#f8fafc'),
            border: '1px solid',
            borderColor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : '#e2e8f0'),
          }}
        >
          {/* Prefix + Format share a line: both are inputs, and both fit. */}
          <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
            <Box sx={{ flex: '0 0 44%', minWidth: 0 }}>
              <Typography sx={{ fontSize: 10, fontWeight: 700, color: 'text.secondary', mb: 0.4, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                Prefix
              </Typography>
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
                    height: 32,
                    backgroundColor: 'background.paper',
                    borderRadius: CONTROL_RADIUS,
                    '& fieldset': { borderColor: isDirty ? 'warning.main' : 'divider' },
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

            <Typography sx={{ fontSize: 12, fontFamily: 'monospace', color: 'text.disabled', flexShrink: 0, lineHeight: '32px' }}>
              /
            </Typography>

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: 10, fontWeight: 700, color: 'text.secondary', mb: 0.4, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                Year / Number
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <ShapeSelect
                  value={shape.yearFormat}
                  dirty={shape.yearFormat !== row.savedYearFormat}
                  disabled={role === 'follower'}
                  ariaLabel={`${row.organizationName} year format`}
                  onChange={(value) => onShapeChange({ yearFormat: value as FiscalYearFormat })}
                  options={yearOptions}
                />
                <Typography sx={{ fontSize: 12, fontFamily: 'monospace', color: 'text.disabled', flexShrink: 0 }}>
                  /
                </Typography>
                <ShapeSelect
                  value={shape.numberPad}
                  dirty={shape.numberPad !== row.savedNumberPad}
                  disabled={role === 'follower'}
                  ariaLabel={`${row.organizationName} number width`}
                  onChange={(value) => onShapeChange({ numberPad: Number(value) })}
                  options={SEQUENCE_PAD_OPTIONS.map((pad) => ({
                    value: pad,
                    label: formatSequence(1, pad),
                    hint: pad === 1 ? 'no padding' : `${pad} digits`,
                  }))}
                />
              </Box>
            </Box>
          </Box>

          {/* The result, full width — this is the line people actually read. */}
          <Box>
            <Typography sx={{ fontSize: 10, fontWeight: 700, color: 'text.secondary', mb: 0.4, textTransform: 'uppercase', letterSpacing: 0.4 }}>
              Next {typeLabel} No.
            </Typography>
            <Box
              sx={{
                minHeight: 32,
                px: 1,
                py: 0.5,
                borderRadius: CONTROL_RADIUS,
                backgroundColor: displayData.hasCustomPrefix ? 'action.hover' : 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Typography
                sx={{
                  fontFamily: 'monospace',
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: displayData.hasCustomPrefix ? 'text.primary' : 'text.disabled',
                  // Wraps rather than truncating: a number the reader cannot see
                  // the end of is the one thing this block exists to show.
                  overflowWrap: 'anywhere',
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
            {singleSeries
              ? 'One continuous series, shared by every organization'
              : role === 'follower'
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
                  borderRadius: CONTROL_RADIUS,
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
                  borderRadius: CONTROL_RADIUS,
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
