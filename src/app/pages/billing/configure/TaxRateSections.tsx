import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Box, Checkbox, FormControlLabel, Stack, TextField, Typography } from "@mui/material";
import {
  ConfigSectionCard, ConfigColorChip,
} from "@app/modules/configuration";
import { GlassDialog, GlassHeader, WtButton } from "@app/modules/common/components/ui";
import { confirmDialog, toast } from "@app/modules/common/components/ui/feedback";
import {
  getBillingTaxRates, saveGstSlab, deleteGstSlab, saveTdsSection, deleteTdsSection,
  type TaxRateRow, type BillingTaxConfig,
} from "@services/billingConfig";

/**
 * Billing → Configure: the GST and TDS rate lists.
 *
 * Sits beside the status-label sections because it is the same question — how
 * does this module behave — asked of numbers instead of wording. It behaves
 * differently in one way that matters, and the copy says so on screen: these ARE
 * rows, so they can be added and deleted, unlike the status codes above.
 *
 * TWO LISTS, because they are two taxes moving in opposite directions:
 *   GST — we add it to the bill and collect it from the client.
 *   TDS — the client subtracts it from what it pays us and deposits it for us.
 *
 * Nothing here is retroactive. Every bill snapshots the rate it was raised with,
 * so editing a slab changes the next bill and never restates an issued one. That
 * is also why a rate with bills against it refuses to delete: the number is safe
 * either way, but "which slab was this raised under" is a question an audit asks,
 * and retiring keeps the answer.
 */

export const TAX_RATES_KEY = ["billing-tax-rates"];

type Kind = "GST" | "TDS";

interface Draft {
  kind: Kind;
  id?: string;
  name: string;
  rate: string;
  section: string;
  isDefault: boolean;
  isActive: boolean;
}

const emptyDraft = (kind: Kind): Draft => ({
  kind, name: "", rate: "", section: "", isDefault: false, isActive: true,
});

const toDraft = (kind: Kind, row: TaxRateRow): Draft => ({
  kind,
  id: row.id,
  name: row.name,
  rate: String(row.rate),
  section: row.section ?? "",
  isDefault: row.isDefault,
  isActive: row.isActive,
});

/**
 * "Sec. 393", or nothing when the row carries no real section.
 *
 * "No TDS deducted" has no section to cite — it is the absence of a deduction —
 * and the seed stores a dash there rather than an empty string, because the
 * field is required. Printing "— · 0%" would read as a missing value rather than
 * as the deliberate "no deduction" it is.
 */
export const sectionLabel = (section?: string | null): string | null => {
  const clean = (section ?? "").trim();
  if (!clean || clean === "—" || clean === "-") return null;
  return /^\d/.test(clean) ? `Sec. ${clean}` : clean;
};

/** The line under a rate's name: its section and its percentage. */
const rateCaption = (kind: Kind, row: TaxRateRow): string => {
  const rate = `${row.rate}%`;
  if (kind !== "TDS") return rate;
  const section = sectionLabel(row.section);
  return section ? `${section} · ${rate}` : rate;
};

/**
 * Wider columns than the shared `ChipGrid`, which is fixed at 200px.
 *
 * A tax rate's name is a sentence — "Contract work — individual / HUF payee" —
 * not a one-word status, and at 200px every one of them wrapped to three lines.
 * Growing the column instead of the row keeps the list scannable: same number of
 * rows, each a single glance tall.
 */
const RateGrid: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Box
    sx={{
      display: "grid",
      gridTemplateColumns: {
        xs: "1fr",
        sm: "repeat(auto-fill, minmax(260px, 1fr))",
        lg: "repeat(auto-fill, minmax(300px, 1fr))",
      },
      gap: 1.25,
      mt: 2,
    }}
  >
    {children}
  </Box>
);

/** A retired rate reads as muted; a live one carries its section's colour. */
const GST_COLOUR = "#2563eb";
const TDS_COLOUR = "#d97706";
const RETIRED_COLOUR = "#cbd5e1";

const TaxRateSections: React.FC = () => {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: TAX_RATES_KEY,
    queryFn: getBillingTaxRates,
    staleTime: 5 * 60 * 1000,
  });

  const [draft, setDraft] = useState<Draft | null>(null);

  const patch = (next: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...next } : d));

  /** Writes return the whole list, because a save can move the default off another row. */
  const applyList = (kind: Kind, rows: TaxRateRow[]) => {
    queryClient.setQueryData<BillingTaxConfig>(TAX_RATES_KEY, (prev) => ({
      gstSlabs: kind === "GST" ? rows : prev?.gstSlabs ?? [],
      tdsSections: kind === "TDS" ? rows : prev?.tdsSections ?? [],
    }));
  };

  const save = useMutation({
    mutationFn: async (d: Draft) => {
      const input = {
        id: d.id,
        name: d.name.trim(),
        rate: Number(d.rate),
        isDefault: d.isDefault,
        isActive: d.isActive,
        ...(d.kind === "TDS" ? { section: d.section.trim() } : {}),
      };
      return { kind: d.kind, rows: d.kind === "GST" ? await saveGstSlab(input) : await saveTdsSection(input) };
    },
    onSuccess: ({ kind, rows }) => {
      applyList(kind, rows);
      setDraft(null);
      toast({ icon: "success", title: kind === "GST" ? "GST slab saved" : "TDS section saved" });
    },
    onError: (err: any) =>
      toast({ icon: "error", title: err?.response?.data?.message ?? "Could not save that rate" }),
  });

  const remove = useMutation({
    mutationFn: async ({ kind, id }: { kind: Kind; id: string }) => ({
      kind,
      rows: kind === "GST" ? await deleteGstSlab(id) : await deleteTdsSection(id),
    }),
    onSuccess: ({ kind, rows }) => {
      applyList(kind, rows);
      toast({ icon: "success", title: "Deleted" });
    },
    onError: (err: any) =>
      toast({ icon: "error", title: err?.response?.data?.message ?? "Could not delete that rate" }),
  });

  /**
   * A rate with bills against it is never offered deletion — the confirm explains
   * why and offers the thing that does work, rather than letting the user click
   * through to a server error.
   */
  const confirmDelete = async (kind: Kind, row: TaxRateRow) => {
    if (row.billCount > 0) {
      const retire = await confirmDialog({
        icon: "warning",
        title: "Retire this rate instead?",
        text: `${row.billCount} bill${row.billCount === 1 ? " was" : "s were"} raised on "${row.name}", so it cannot be deleted without losing what they were raised under. Retiring takes it off the bill form and keeps the history.`,
        confirmText: "Retire",
      });
      if (retire) save.mutate({ ...toDraft(kind, row), isActive: false, isDefault: false });
      return;
    }
    const confirmed = await confirmDialog({
      icon: "warning",
      title: `Delete "${row.name}"?`,
      text: "No bills were raised on this rate, so nothing in the history depends on it.",
      confirmText: "Delete",
      danger: true,
    });
    if (confirmed) remove.mutate({ kind, id: row.id });
  };

  const busy = save.isPending || remove.isPending;

  const section = (
    kind: Kind,
    title: string,
    description: string,
    rows: TaxRateRow[],
    colour: string,
    icon: string,
    iconColor: "blue" | "amber",
  ) => (
    <ConfigSectionCard
      title={title}
      description={description}
      icon={icon}
      iconColor={iconColor}
      loading={isLoading}
      badge={{ label: `${rows.length}` }}
      primaryAction={{
        label: kind === "GST" ? "New Slab" : "New Section",
        icon: "bi-plus-lg",
        onClick: () => setDraft(emptyDraft(kind)),
        disabled: busy,
      }}
    >
      <RateGrid>
        {rows.map((row) => (
          <ConfigColorChip
            key={row.id}
            name={row.name}
            color={row.isActive ? colour : RETIRED_COLOUR}
            // The section and the rate are the whole point of the row, so they go
            // under the name rather than hiding in a tooltip.
            caption={rateCaption(kind, row)}
            // The rate and its section ARE the row — a 10px monospace whisper
            // makes the list unreadable at a glance.
            captionStrong
            title={
              (kind === "TDS" && sectionLabel(row.section)
                ? `${sectionLabel(row.section)} — ${row.rate}%`
                : `${row.rate}%`)
              + (row.isActive ? "" : " (retired)")
            }
            badge={row.isDefault ? "Default" : row.isActive ? undefined : "Retired"}
            disabled={busy}
            onEdit={() => setDraft(toDraft(kind, row))}
            action={{
              icon: "bi-trash",
              title: row.billCount > 0
                ? `${row.billCount} bill(s) use this — retire it instead`
                : `Delete ${row.name}`,
              danger: true,
              onClick: () => confirmDelete(kind, row),
            }}
          />
        ))}
      </RateGrid>
    </ConfigSectionCard>
  );

  const rate = Number(draft?.rate);
  const rateValid = draft ? Number.isFinite(rate) && rate >= 0 && rate <= 100 : false;
  const canSave =
    !!draft
    && draft.name.trim().length > 0
    && rateValid
    && (draft.kind === "GST" || draft.section.trim().length > 0)
    && !busy;

  return (
    <>
      {section(
        "GST", "GST Slabs",
        "The rate charged on top of a bill and paid over to the government. A bill picks one; the default is what a new bill starts on.",
        data?.gstSlabs ?? [], GST_COLOUR, "bi-percent", "blue",
      )}

      {section(
        "TDS", "TDS Sections",
        "Tax the client withholds from your bill under the Income Tax Act. It lowers what actually reaches the bank, and each bill tracks whether the client deposited it.",
        data?.tdsSections ?? [], TDS_COLOUR, "bi-scissors", "amber",
      )}

      <GlassDialog
        open={draft !== null}
        onClose={() => setDraft(null)}
        maxWidth="sm"
        disableBlur
        PaperProps={{
          sx: {
            maxWidth: 500,
            bgcolor: "background.paper",
            backgroundImage: "none",
            backdropFilter: "none",
          },
        }}
        header={
          <GlassHeader
            variant="plain"
            title={
              draft?.id
                ? draft.kind === "GST" ? "Edit GST Slab" : "Edit TDS Section"
                : draft?.kind === "GST" ? "New GST Slab" : "New TDS Section"
            }
            onClose={() => setDraft(null)}
          />
        }
      >
        {draft && (
          <Stack spacing={3} sx={{ px: 3, pt: 1, pb: 3 }}>
            <Stack spacing={1}>
              <Typography sx={{ fontSize: 14, fontWeight: 500 }}>
                Name <Typography component="span" sx={{ color: "error.main" }}>*</Typography>
              </Typography>
              <TextField
                value={draft.name}
                autoFocus
                placeholder={
                  draft.kind === "GST"
                    ? "GST 18% — Professional services"
                    : "194J — Professional / technical fees"
                }
                inputProps={{ maxLength: 120 }}
                onChange={(e) => patch({ name: e.target.value })}
                sx={fieldSx}
              />
            </Stack>

            {draft.kind === "TDS" && (
              <Stack spacing={1}>
                <Typography sx={{ fontSize: 14, fontWeight: 500 }}>
                  Section <Typography component="span" sx={{ color: "error.main" }}>*</Typography>
                </Typography>
                <TextField
                  value={draft.section}
                  placeholder="194J"
                  inputProps={{ maxLength: 20 }}
                  onChange={(e) => patch({ section: e.target.value })}
                  sx={fieldSx}
                />
                <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                  Printed on the TDS certificate you chase from the client.
                </Typography>
              </Stack>
            )}

            <Stack spacing={1}>
              <Typography sx={{ fontSize: 14, fontWeight: 500 }}>
                Rate (%) <Typography component="span" sx={{ color: "error.main" }}>*</Typography>
              </Typography>
              <TextField
                type="number"
                value={draft.rate}
                placeholder={draft.kind === "GST" ? "18" : "10"}
                onChange={(e) => patch({ rate: e.target.value })}
                error={draft.rate !== "" && !rateValid}
                helperText={
                  draft.rate !== "" && !rateValid ? "Enter a percentage between 0 and 100." : undefined
                }
                sx={fieldSx}
              />
              <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                {draft.kind === "GST"
                  ? "Added to the deliverable value. The CGST/SGST or IGST split is decided per bill from the two GST numbers."
                  : "Calculated on the taxable value, not on the GST — that is what the law requires."}
              </Typography>
            </Stack>

            <Stack spacing={1.5}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={draft.isDefault}
                    disabled={busy || !draft.isActive}
                    onChange={(e) => patch({ isDefault: e.target.checked })}
                    sx={{ p: 0 }}
                  />
                }
                label={draft.kind === "GST" ? "Set as Default Slab" : "Set as Default Section"}
                sx={{ m: 0, gap: 1, "& .MuiFormControlLabel-label": { fontSize: 14, fontWeight: 500 } }}
              />
              <Typography sx={{ fontSize: 12, color: "text.secondary", mt: -0.75 }}>
                What a new bill starts on. Only one can hold it — turning it on takes it
                off whichever has it now. A retired rate cannot be the default.
              </Typography>

              <FormControlLabel
                control={
                  <Checkbox
                    checked={draft.isActive}
                    disabled={busy}
                    onChange={(e) =>
                      patch({ isActive: e.target.checked, isDefault: e.target.checked && draft.isDefault })
                    }
                    sx={{ p: 0 }}
                  />
                }
                label="Available on the bill form"
                sx={{ m: 0, gap: 1, "& .MuiFormControlLabel-label": { fontSize: 14, fontWeight: 500 } }}
              />
              <Typography sx={{ fontSize: 12, color: "text.secondary", mt: -0.75 }}>
                Turn this off to retire a rate. Bills already raised on it keep their
                figures — nothing here is retroactive.
              </Typography>
            </Stack>

            <Stack direction="row" justifyContent="flex-end">
              <WtButton
                tone="primary"
                disabled={!canSave}
                onClick={() => save.mutate(draft)}
                sx={{ minHeight: 40, fontSize: 14, px: 3 }}
              >
                {save.isPending ? "Saving…" : draft.id ? "Update" : "Create"}
              </WtButton>
            </Stack>
          </Stack>
        )}
      </GlassDialog>
    </>
  );
};

/** The flat, filled input the sibling Configure dialog uses, so the two match. */
const fieldSx = {
  "& .MuiOutlinedInput-root": {
    bgcolor: "action.hover",
    borderRadius: "8px",
    fontSize: 14,
    "& fieldset": { borderColor: "divider" },
  },
  "& .MuiOutlinedInput-input": { py: 1.5, px: 2 },
};

export default TaxRateSections;
