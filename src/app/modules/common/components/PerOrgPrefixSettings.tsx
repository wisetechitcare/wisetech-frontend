import React, { useEffect, useMemo, useState } from 'react';
import { Box, Button, Chip, CircularProgress, MenuItem, Select, TextField, Typography } from '@mui/material';
import Flatpickr from 'react-flatpickr';
import { fetchAllPrefixSettings, createPrefixSetting, updatePrefixSetting } from '@services/options';
import { fetchCompanyOverview } from '@services/company';
import { useOrgScope } from '@hooks/useOrgScope';
import { successConfirmation, errorConfirmation } from '@utils/modal';
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
  /** Existing row's id; absent when this organization has nothing configured. */
  settingId?: string;
  /** Prefix as saved, for dirty-checking. */
  savedPrefix: string;
  /** Prefix currently in the input. */
  prefix: string;
}

const PerOrgPrefixSettings: React.FC<PerOrgPrefixSettingsProps> = ({ typeLabel, typeValue }) => {
  const { organizations: allOrganizations, isLoading: orgsLoading } = useOrgScope({
    includeAll: false,
    initialScopeId: '',
  });

  // Filter to only sub-organizations (exclude root/parent organization)
  const organizations = useMemo(
    () => allOrganizations.filter((org) => !org.isRoot),
    [allOrganizations],
  );

  const [rows, setRows] = useState<RowState[]>([]);
  const [fiscalYear, setFiscalYear] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [selectedOrgId, setSelectedOrgId] = useState('');

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
          };
        });
        setRows(newRows);
        if (newRows.length > 0 && !selectedOrgId) {
          setSelectedOrgId(newRows[0].organizationId);
        }

        // Seed the shared year from whatever is already configured, falling back
        // to the company's own fiscal year and then to the current one.
        const existingYear = settings.find((s) => s.year)?.year;
        setFiscalYear(
          existingYear ||
          companyResponse?.data?.companyOverview?.fiscalYear ||
          getDefaultFiscalYear(),
        );
      } catch {
        if (!cancelled) errorConfirmation(`Could not load ${typeLabel.toLowerCase()} prefix settings.`);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [organizations, typeValue, typeLabel, reloadToken]);

  const setPrefix = (organizationId: string, value: string) =>
    setRows((prev) =>
      prev.map((row) => (row.organizationId === organizationId ? { ...row, prefix: value } : row)),
    );

  const shortYear = convertFiscalYearToYearFormat(fiscalYear);
  const dirtyRows = rows.filter((row) => row.prefix.trim() !== row.savedPrefix);

  // Two organizations on the same prefix would share one number series, so their
  // numbers would collide. Flag it instead of letting it save.
  const duplicatePrefixes = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of rows) {
      const key = row.prefix.trim().toLowerCase();
      if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return new Set([...counts.entries()].filter(([, n]) => n > 1).map(([key]) => key));
  }, [rows]);

  const isDuplicate = (row: RowState) =>
    !!row.prefix.trim() && duplicatePrefixes.has(row.prefix.trim().toLowerCase());

  const handleSave = async () => {
    if (!fiscalYear) {
      errorConfirmation('Set the fiscal year first.');
      return;
    }
    if (duplicatePrefixes.size) {
      errorConfirmation('Two organizations cannot share the same prefix.');
      return;
    }

    setSaving(true);
    try {
      // Each row is its own record; save them together so one click settles the
      // whole screen rather than one organization at a time.
      for (const row of dirtyRows) {
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
      successConfirmation('Prefix settings saved.');
      setReloadToken((n) => n + 1);
    } catch {
      errorConfirmation('Could not save prefix settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || orgsLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  const selectedRow = rows.find((r) => r.organizationId === selectedOrgId);
  const prefix = selectedRow?.prefix.trim() || '';
  const duplicate = selectedRow ? isDuplicate(selectedRow) : false;

  return (
    <Box>
      {/* Single compact line with all controls */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
        {/* Fiscal year label & field */}
        <Box sx={{ minWidth: 160 }}>
          <Typography sx={{ mb: 0.5, fontSize: 12, fontWeight: 500, color: 'text.secondary' }}>
            Fiscal Year <Box component="span" sx={{ color: 'error.main' }}>*</Box>
          </Typography>
          <Box
            sx={{
              '& input': {
                width: '100%',
                height: 38,
                padding: '0 10px',
                borderRadius: '6px',
                border: '1px solid',
                borderColor: 'divider',
                backgroundColor: 'background.paper',
                color: 'text.primary',
                fontSize: 13,
                fontFamily: 'inherit',
                outline: 'none',
              },
            }}
          >
            <Flatpickr
              value={fiscalYear ? convertFiscalYearToDates(fiscalYear) : []}
              placeholder="Select"
              onChange={(dates: Date[]) => {
                if (dates.length === 2) {
                  setFiscalYear(`${toISODateString(dates[0])} to ${toISODateString(dates[1])}`);
                }
              }}
              options={{ dateFormat: 'Y-m-d', altInput: true, altFormat: 'd/m/Y', mode: 'range' }}
            />
          </Box>
        </Box>

        {/* Organization dropdown */}
        {rows.length > 0 && (
          <Box sx={{ minWidth: 200 }}>
            <Typography sx={{ mb: 0.5, fontSize: 12, fontWeight: 500, color: 'text.secondary' }}>
              Organization
            </Typography>
            <Select
              size="small"
              value={selectedOrgId}
              onChange={(e) => setSelectedOrgId(e.target.value)}
              sx={{ width: '100%', height: 38, '& .MuiOutlinedInput-root': { height: 38 } }}
            >
              {rows.map((row) => (
                <MenuItem key={row.organizationId} value={row.organizationId}>
                  {row.organizationName}
                </MenuItem>
              ))}
            </Select>
          </Box>
        )}

        {/* Prefix input */}
        {selectedRow && (
          <Box sx={{ minWidth: 180 }}>
            <Typography sx={{ mb: 0.5, fontSize: 12, fontWeight: 500, color: 'text.secondary' }}>
              Prefix
            </Typography>
            <TextField
              size="small"
              fullWidth
              value={selectedRow.prefix}
              onChange={(e) => setPrefix(selectedRow.organizationId, e.target.value)}
              placeholder="Prefix"
              inputProps={{ maxLength: 20 }}
              error={duplicate}
              sx={{ height: 38, '& .MuiOutlinedInput-root': { height: 38 } }}
            />
          </Box>
        )}

        {/* Preview */}
        {selectedRow && (
          <Box sx={{ minWidth: 160 }}>
            <Typography sx={{ mb: 0.5, fontSize: 12, fontWeight: 500, color: 'text.secondary' }}>
              Preview
            </Typography>
            <Box sx={{ fontSize: 13, fontWeight: 600, color: 'text.primary', height: 38, display: 'flex', alignItems: 'center', px: 1.25, border: '1px solid', borderColor: 'divider', borderRadius: '6px', bgcolor: 'action.hover' }}>
              {prefix ? (
                <>
                  {shortYear ? `${prefix}/${shortYear}/001` : `${prefix}/001`}
                  {selectedRow.prefix.trim() !== selectedRow.savedPrefix && (
                    <Box component="span" sx={{ ml: 1, fontSize: 11, color: 'warning.main', fontWeight: 400 }}>
                      (unsaved)
                    </Box>
                  )}
                </>
              ) : (
                <Box component="span" sx={{ fontSize: 12, fontStyle: 'italic', color: 'text.disabled', fontWeight: 400 }}>
                  —
                </Box>
              )}
            </Box>
          </Box>
        )}

        {/* Save button */}
        <Button
          variant="contained"
          size="small"
          onClick={handleSave}
          disabled={saving || !dirtyRows.length || !!duplicatePrefixes.size}
          sx={{ mt: 2.3 }}
        >
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </Box>

      {/* Info and errors below */}
      <Box sx={{ display: 'flex', gap: 3, mt: 1, fontSize: 12 }}>
        {shortYear && (
          <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
            Numbers will read <strong>{shortYear}</strong>
          </Typography>
        )}
        {duplicate && (
          <Typography sx={{ fontSize: 12, color: 'error.main' }}>
            Already used by another organization
          </Typography>
        )}
        {selectedRow && !selectedRow.savedPrefix && (
          <Typography sx={{ fontSize: 12, color: 'warning.dark' }}>
            Not configured yet
          </Typography>
        )}
        {!!dirtyRows.length && !saving && (
          <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
            {dirtyRows.length} unsaved
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default PerOrgPrefixSettings;
