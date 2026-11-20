import React, { useMemo, useState } from "react";
import { Flag, ListOrdered, RefreshCw } from "lucide-react";
import { canDelete } from "@utils/can";
import { withDeleteSection } from "@app/modules/common/components/ui/DeleteSection";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ConfigPageLayout, ConfigSectionCard,
} from "@app/modules/configuration";
import {
  GlassDialog, GlassHeader, WtButton, WtColorPicker, WtField, isHexColor,
  ConfigColorChip, ConfigChipGrid, SegmentedControl,
  type ColorSwatch, type SemanticTone,
} from "@app/modules/common/components/ui";
import { confirmDialog, toast } from "@app/modules/common/components/ui/feedback";
import { tonePair } from "@app/theme/tokens";
import {
  getBillingStatusLabels, saveBillingStatusLabels, resetBillingStatusLabel,
  type BillingLabelEntry, type BillingTone, type BillingStatusColour,
} from "@services/billingConfig";
import PerOrgPrefixSettings from "@app/modules/common/components/PerOrgPrefixSettings";

/**
 * Bill Stage is long enough to need sub-heads: the proforma's stages, the tax invoice's, and the rest. Read off the
 * code, so a new PROFORMA_… / INVOICE_… code lands in the right place. Every other group is one untitled grid.
 */
const NUMBERING_SERIES = [
  { value: "PROFORMA", label: "Proforma" },
  { value: "INVOICE", label: "Tax Invoice" },
] as const;

const sectionsOf = (groupKey: string, entries: BillingLabelEntry[]) => {
  if (groupKey !== "BILL_STAGE") return [{ title: "", entries }];
  const isProforma = (c: string) => c.startsWith("PROFORMA_") || c === "READY_FOR_PROFORMA";
  const isInvoice = (c: string) => c.startsWith("INVOICE_") || c === "READY_FOR_INVOICE";
  return [
    { title: "Proforma", entries: entries.filter((e) => isProforma(e.code)) },
    { title: "Tax Invoice", entries: entries.filter((e) => isInvoice(e.code)) },
    { title: "Core", entries: entries.filter((e) => !isProforma(e.code) && !isInvoice(e.code)) },
  ].filter((s) => s.entries.length > 0);
};
import { BILLING_LABELS_KEY } from "../components/useBillingLabels";
import TaxRateSections from "./TaxRateSections";

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

  const [series, setSeries] = useState<"PROFORMA" | "INVOICE">("PROFORMA");

  /** The entry being edited, plus its in-dialog draft. Null when closed. */
  const [editing, setEditing] = useState<BillingLabelEntry | null>(null);
  const [label, setLabel] = useState("");
  const [tone, setTone] = useState<BillingStatusColour>("neutral");
  // No "default" here: every Billing code is set by the system (documents, receipts), never picked by hand.
  const openEditor = (entry: BillingLabelEntry) => {
    setEditing(entry);
    setLabel(entry.label);
    setTone(entry.tone);
  };

  const onSaved = (message: string) => (fresh: Awaited<ReturnType<typeof getBillingStatusLabels>>) => {
    queryClient.setQueryData(BILLING_LABELS_KEY, fresh);
    setEditing(null);
    toast({ icon: "success", title: message });
  };

  const save = useMutation({
    mutationFn: () => saveBillingStatusLabels([{ code: editing!.code, label, tone }]),
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
    <ConfigPageLayout>
      <div className="flex flex-col gap-4">
        {/* Document numbering.
            The same per-organization grid Leads Configure uses, pointed at the two
            billing series — so an organization's proformas and its tax invoices
            each carry its own prefix, and sister organizations can share one
            counter while keeping separate prefixes.

            The fiscal year is NOT edited here. It comes from the date on the
            document, so the series rolls over on 1 April by itself. Changing a
            prefix affects the next number only; everything already issued keeps
            the number it went out with. */}
        {/* One card, two series: the tables are identical, so a switch halves the space. */}
        <ConfigSectionCard
          title="Document Numbering"
          description="The prefix each organization's proformas and tax invoices carry. The year and the running number are added automatically — WT/PI/26-27/0001 — and the count restarts at 1 each April. The two are separate series and never share a running number."
          icon={ListOrdered}
          iconColor="blue"
          headerRight={
            <SegmentedControl
              ariaLabel="Numbering series"
              options={NUMBERING_SERIES}
              value={series}
              onChange={setSeries}
            />
          }
        >
          {/* `key` remounts on switch, so one series' unsaved edits never carry into the other. */}
          <PerOrgPrefixSettings
            key={series}
            typeLabel={series === "PROFORMA" ? "Proforma" : "Tax Invoice"}
            typeValue={series}
          />
        </ConfigSectionCard>

        {(data?.groups ?? []).map((group) => (
          <ConfigSectionCard
            key={group.key}
            title={group.title}
            description={group.description}
            icon={Flag}
            iconColor="blue"
            loading={isLoading}
            badge={{ label: `${group.entries.length}` }}
          >
            {sectionsOf(group.key, group.entries).map((section) => (
            <React.Fragment key={section.title || group.key}>
            {section.title && (
              /* An eyebrow, not a heading: `heading-case` uppercases in CSS so the
                 accessible name stays real words. */
              <p className="heading-case mt-3 text-xs font-semibold text-muted-foreground">
                {section.title}
              </p>
            )}
            <ConfigChipGrid>
              {section.entries.map((entry) => (
                <ConfigColorChip
                  key={entry.code}
                  name={entry.label}
                  color={colourOf(entry.tone)}
                  // The code is the tooltip, not a second line — a one-line chip is
                  // what Leads Configure shows, and the code is never edited here.
                  title={entry.code}
                  disabled={busy}
                  onEdit={() => openEditor(entry)}
                  /*
                   * A RESTORE, so it wears a restore icon.
                   *
                   * This slot is a red bin on Leads Configure, where it deletes a
                   * row. Here the code is an enum member: nothing can be removed,
                   * and the action puts the shipped wording and colour back. Copying
                   * the bin across made every entry on this screen look deletable
                   * and made an undo look destructive — the tooltip said otherwise,
                   * but nobody reads a tooltip to find out what an icon they already
                   * recognise does.
                   */
                  action={canDelete("billing.configure") ? {
                    icon: RefreshCw,
                    title: `Restore ${entry.code} to its default label and colour`,
                    tone: "revert",
                    onClick: () => confirmReset(entry),
                  } : undefined}
                />
              ))}
            </ConfigChipGrid>
            </React.Fragment>
            ))}
          </ConfigSectionCard>
        ))}

        {/* The rate lists. Below the labels because they are configured once and
            then left alone, while the wording above is what people come here to
            fiddle with — and unlike the codes above, these rows CAN be added and
            deleted, which their own copy explains. */}
        <TaxRateSections />
      </div>

      <GlassDialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        maxWidth="sm"
        preset="form"
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
        <div className="flex flex-col gap-6 px-6 pt-2 pb-6">
          <WtField
            label="Status Name"
            required
            fullWidth
            value={label}
            placeholder="Enter status name"
            onChange={setLabel}
          />

          <WtColorPicker
            variant="row"
            label="Status colour"
            value={tone}
            palette={swatches}
            disabled={busy}
            onChange={setTone}
          />

          <div className="flex flex-row justify-end">
            <WtButton
              disabled={!canSave}
              onClick={() => save.mutate()}
              sx={{ minHeight: 40, fontSize: 14, px: 3 }}
            >
              {save.isPending ? "Updating…" : "Update"}
            </WtButton>
          </div>
        </div>
      </GlassDialog>
    </ConfigPageLayout>
  );
};

export default withDeleteSection('billing.configure', BillingConfigurePage);
