import React from "react";
import { Box, Stack, TextField } from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import { WtDateField, WtButton, GlassCard } from "@app/modules/common/components/ui";

/**
 * The filter row every report shares: search, a date range, and an amount
 * range. Reports add their own status/stage selects alongside this via
 * `extra`, so one control renders consistently everywhere instead of each
 * report page hand-rolling its own row.
 */
export interface ReportFilterValues {
  search: string;
  dateFrom: string;
  dateTo: string;
  minAmount: string;
  maxAmount: string;
}

export const EMPTY_REPORT_FILTERS: ReportFilterValues = {
  search: "", dateFrom: "", dateTo: "", minAmount: "", maxAmount: "",
};

const ReportFilterBar: React.FC<{
  values: ReportFilterValues;
  onChange: (next: ReportFilterValues) => void;
  searchPlaceholder?: string;
  extra?: React.ReactNode;
  onReset?: () => void;
}> = ({ values, onChange, searchPlaceholder = "Search…", extra, onReset }) => {
  const set = (patch: Partial<ReportFilterValues>) => onChange({ ...values, ...patch });
  const isDirty = Object.entries(values).some(([k, v]) => v !== (EMPTY_REPORT_FILTERS as any)[k]);

  return (
    <GlassCard preset="section" sx={{ p: 1.5, mb: 1.5, position: "sticky", top: 8, zIndex: 2 }}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} flexWrap="wrap" useFlexGap alignItems={{ sm: "center" }}>
        <TextField
          size="small"
          value={values.search}
          onChange={(e) => set({ search: e.target.value })}
          placeholder={searchPlaceholder}
          InputProps={{ startAdornment: <KTIcon iconName="magnifier" className="fs-5 me-2" /> }}
          sx={{ flex: 1, minWidth: 200 }}
        />
        <WtDateField
          label="From" value={values.dateFrom || undefined}
          onChange={(v) => set({ dateFrom: v })}
          maxDate={values.dateTo || undefined}
        />
        <WtDateField
          label="To" value={values.dateTo || undefined}
          onChange={(v) => set({ dateTo: v })}
          minDate={values.dateFrom || undefined}
        />
        <TextField
          size="small" label="Min amount" type="number" value={values.minAmount}
          onChange={(e) => set({ minAmount: e.target.value })}
          InputLabelProps={{ shrink: true }} sx={{ maxWidth: 130 }}
        />
        <TextField
          size="small" label="Max amount" type="number" value={values.maxAmount}
          onChange={(e) => set({ maxAmount: e.target.value })}
          InputLabelProps={{ shrink: true }} sx={{ maxWidth: 130 }}
        />
        {extra}
        {onReset && (
          <WtButton ghost size="small" onClick={onReset} disabled={!isDirty} sx={{ minHeight: 36 }}>
            Reset
          </WtButton>
        )}
      </Stack>
    </GlassCard>
  );
};

export default ReportFilterBar;
