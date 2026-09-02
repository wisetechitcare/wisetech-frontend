import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Checkbox, FormControlLabel, Stack, TextField, Typography } from "@mui/material";
import {
  ConfigPageLayout, ConfigSectionCard, ConfigColorChip, ConfigChipGrid,
} from "@app/modules/configuration";
import {
  GlassDialog, GlassHeader, WtButton, WtColorPicker, isHexColor,
  type ColorSwatch, type SemanticTone,
} from "@app/modules/common/components/ui";
import { confirmDialog, toast } from "@app/modules/common/components/ui/feedback";
import { tonePair } from "@app/theme/tokens";
import {
  getBillingStatusLabels, saveBillingStatusLabels, resetBillingStatusLabel,
  type BillingLabelEntry, type BillingTone, type BillingStatusColour,
} from "@services/billingConfig";
import { BILLING_LABELS_KEY } from "../components/useBillingLabels";

/**
 * Billing → Configure.
 *
 * Renames and recolours the module's statuses, stages and bill payment statuses.
 * Every Billing chip renders through `BillingStatusBadge`, which reads the same
 * config, so a change here lands on every Billing screen at once.
 *
 * Presented as `ConfigColorChip` rows — the same compact shape as Leads/Contacts
 * Configure — because these are a scannable LIST of configured values, not a form.
 * Editing happens in a dialog on one entry, which is also why there is no batch
 * "Save N changes": one edit, one save, no dirty state to lose.
 *
 * WHAT IS NOT HERE, deliberately: adding or removing a code, hence no "New Status"
 * button that its sibling Configure screens have. The operation status list is a
 * state machine whose legal transitions live in `workflow.ts`, so an invented
 * status would be a state nothing can enter or leave; the bill payment status is
 * derived from collected-vs-total. Both are facts about the system, not lists to
 * pick from — only their presentation is ours to choose.
 *
 * The editor is the kit's `WtColorPicker` with the seven semantic tones as its
 * palette AND the custom swatch on — the same choice Leads Configure offers, so
 * the two Configure dialogs behave identically.
 *
 * A tone and a hex are not the same promise. A TONE resolves to a shade per
 * light/dark mode, so the chip stays readable in both; a HEX is that exact
 * colour in both, which is the trade whoever picks it is making. `colourOf()`
 * is the one place either resolves to something a chip can paint.
 */

/** A stored colour (tone name or hex) as a renderable hex. */
const colourOf = (value: BillingStatusColour): string =>
  isHexColor(value) ? value : tonePair(value as SemanticTone).fg;

const TONE_LABEL: Record<BillingTone, string> = {
  brand: "Brand",
  success: "Green",
  danger: "Red",
  warning: "Amber",
  indigo: "Indigo",
  cyan: "Cyan",
  neutral: "Grey",
};

const BillingConfigurePage: React.FC = () => {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: BILLING_LABELS_KEY,
    queryFn: getBillingStatusLabels,
    staleTime: Infinity,
  });

  /** The entry being edited, plus its in-dialog draft. Null when closed. */
  const [editing, setEditing] = useState<BillingLabelEntry | null>(null);
  const [label, setLabel] = useState("");
  const [tone, setTone] = useState<BillingStatusColour>("neutral");
  const [isDefault, setIsDefault] = useState(false);
  /** The group the entry was opened from — the default is scoped to it. */
  const [editingGroup, setEditingGroup] = useState("");

  const openEditor = (entry: BillingLabelEntry, groupTitle: string) => {
    setEditing(entry);
    setLabel(entry.label);
    setTone(entry.tone);
    setIsDefault(entry.isDefault);
    setEditingGroup(groupTitle);
  };

  const onSaved = (message: string) => (fresh: Awaited<ReturnType<typeof getBillingStatusLabels>>) => {
    queryClient.setQueryData(BILLING_LABELS_KEY, fresh);
    setEditing(null);
    toast({ icon: "success", title: message });
  };

  const save = useMutation({
    mutationFn: () => saveBillingStatusLabels([{ code: editing!.code, label, tone, isDefault }]),
    onSuccess: onSaved("Billing label updated"),
    onError: () => toast({ icon: "error", title: "Could not save the billing label" }),
  });

  const reset = useMutation({
    mutationFn: (code: string) => resetBillingStatusLabel(code),
    onSuccess: onSaved("Restored to the default"),
    onError: () => toast({ icon: "error", title: "Could not restore the default" }),
  });

  /**
   * The chip's action wears a red bin to match Leads, but nothing here can be
   * deleted — so the copy carries the whole burden of saying what will happen.
   * A status already at its default has nothing to restore and never reaches the
   * confirm; it says so instead of opening a dialog with no consequence.
   */
  const confirmReset = async (entry: BillingLabelEntry) => {
    if (!entry.isCustomised) {
      toast({ icon: "info", title: `${entry.label} is already at its default` });
      return;
    }
    const confirmed = await confirmDialog({
      icon: "warning",
      title: "Restore the default?",
      text: `"${entry.label}" goes back to the label and colour Billing shipped with. The status stays — it is part of the workflow and cannot be removed.`,
      confirmText: "Restore Default",
    });
    if (confirmed) reset.mutate(entry.code);
  };

  const busy = save.isPending || reset.isPending;
  // An empty label would render a nameless chip on every Billing screen.
  const canSave = label.trim().length > 0 && !busy;

  /** The seven tones as picker swatches. `value` stays the tone name, which is what
   *  saves — anything picked off the custom swatch saves as its hex instead. */
  const swatches: ColorSwatch[] = useMemo(
    () => (data?.tones ?? []).map((t) => ({
      value: t,
      hex: tonePair(t).fg,
      label: TONE_LABEL[t as BillingTone] ?? t,
    })),
    [data?.tones],
  );

  return (
    <ConfigPageLayout
      title="Billing Configuration"
      subtitle="How Billing statuses, stages and bill payment states are named and coloured across the module."
      icon="bi-gear"
    >
      <Stack spacing={2}>
        {(data?.groups ?? []).map((group) => (
          <ConfigSectionCard
            key={group.key}
            title={group.title}
            description={group.description}
            icon="bi-tag"
            iconColor="blue"
            loading={isLoading}
            badge={{ label: `${group.entries.length}` }}
          >
            <ConfigChipGrid>
              {group.entries.map((entry) => (
                <ConfigColorChip
                  key={entry.code}
                  name={entry.label}
                  color={colourOf(entry.tone)}
                  // The code is the tooltip, not a second line — a one-line chip is
                  // what Leads Configure shows, and the code is never edited here.
                  title={entry.code}
                  badge={entry.isDefault ? "Default" : undefined}
                  disabled={busy}
                  onEdit={() => openEditor(entry, group.title)}
                  // The bin the Leads chip shows, in the same slot and the same red —
                  // but the code is an enum member, so there is nothing to delete and
                  // this RESTORES the shipped label and colour. The tooltip says so,
                  // and the confirm below names the outcome before anything is written.
                  action={{
                    icon: "bi-trash",
                    title: `Restore ${entry.code} to its default`,
                    danger: true,
                    onClick: () => confirmReset(entry),
                  }}
                />
              ))}
            </ConfigChipGrid>
          </ConfigSectionCard>
        ))}
      </Stack>

      <GlassDialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        maxWidth="sm"
        disableBlur
        PaperProps={{
          sx: {
            // Flat white at the Leads dialog's 500px, instead of the kit's frosted
            // gradient — the single biggest reason the two looked unrelated.
            maxWidth: 500,
            bgcolor: "background.paper",
            backgroundImage: "none",
            backdropFilter: "none",
          },
        }}
        header={
          // Plain: title + bare close, no band and no icon tile — the same header
          // Leads Configure shows, so the two editors read as one dialog.
          <GlassHeader
            variant="plain"
            title="Edit Status"
            onClose={() => setEditing(null)}
          />
        }
      >
        <Stack spacing={3} sx={{ px: 3, pt: 1, pb: 3 }}>
          <Stack spacing={1}>
            <Typography sx={{ fontSize: 14, fontWeight: 500, color: "text.primary" }}>
              Status Name <Typography component="span" sx={{ color: "error.main" }}>*</Typography>
            </Typography>
            <TextField
              value={label}
              autoFocus
              placeholder="Enter status name"
              inputProps={{ maxLength: 80 }}
              onChange={(e) => setLabel(e.target.value)}
              sx={{
                "& .MuiOutlinedInput-root": {
                  bgcolor: "action.hover",
                  borderRadius: "8px",
                  fontSize: 14,
                  "& fieldset": { borderColor: "divider" },
                },
                "& .MuiOutlinedInput-input": { py: 1.5, px: 2 },
              }}
            />
          </Stack>

          {/* A checkbox on the left, not a toggle on the right — the shape Leads
              Configure uses for exactly this setting. Offered on every group: each
              list nominates its own default independently. */}
          <Stack spacing={0.5}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={isDefault}
                  disabled={busy}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  // No padding: the stock 9px gutter pushes the box out of the
                  // column every other label in this dialog starts in.
                  sx={{ p: 0 }}
                />
              }
              label="Set as Default Status"
              sx={{ m: 0, gap: 1, "& .MuiFormControlLabel-label": { fontSize: 14, fontWeight: 500 } }}
            />
            <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
              Work that reaches the end settles here. Only one entry in
              {" "}{editingGroup || "this list"} can hold it — turning it on takes it
              off whichever has it now.
            </Typography>
          </Stack>

          <Stack spacing={1}>
            <Typography sx={{ fontSize: 14, fontWeight: 500, color: "text.primary" }}>
              Choose Status Colour
            </Typography>
            <WtColorPicker
              variant="row"
              label="Status colour"
              value={tone}
              palette={swatches}
              disabled={busy}
              onChange={setTone}
            />
          </Stack>

          <Stack direction="row" justifyContent="flex-end">
            <WtButton
              tone="primary"
              disabled={!canSave}
              onClick={() => save.mutate()}
              sx={{ minHeight: 40, fontSize: 14, px: 3 }}
            >
              {save.isPending ? "Updating…" : "Update"}
            </WtButton>
          </Stack>
        </Stack>
      </GlassDialog>
    </ConfigPageLayout>
  );
};

export default BillingConfigurePage;
