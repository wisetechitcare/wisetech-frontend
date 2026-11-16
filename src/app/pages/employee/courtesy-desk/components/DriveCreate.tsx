import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  MenuItem,
  Stack,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import { toast } from "react-toastify";
import { apiErrorMessage } from "@utils/apiError";
import { formatCurrencyDecimal } from "@utils/currency";
import PremiumButton from "@app/modules/common/components/PremiumButton";
import {
  ConfirmDialog,
  GlassDialog,
  GlassHeader,
  WtButton,
  WtDateField,
} from "@app/modules/common/components/ui";
import type { PersonRef } from "../types";
import { driveGroupIds, groupMembersOf, uniquePeopleCount } from "../types";
import GroupsField from "./GroupsField";
import PersonPicker from "./PersonPicker";
import { menuOptionSx } from "@app/modules/common/components/ui/patterns";
import { GIFT_MANAGEMENT_BASE } from "../giftPaths";
import { useCourtesyDesk } from "../hooks/useCourtesyDesk";
import {
  bulkUpdateRecipientsToApi,
  createDriveToApi,
  listGroups,
  updateDriveMetaToApi,
} from "../store/courtesyDeskStore";
import type { ConfigOption, CourtesyDrive } from "../types";
import { GIFT_RUN_LABEL, giftSizeError, recipientQty } from "../types";
import GiftSizeFields, { type GiftSizeValue } from "./GiftSizeFields";

/** A run's own unit as a picker option — kept selectable even if since deactivated. */
function runUnitOption(drive: CourtesyDrive | null | undefined): ConfigOption | null {
  if (!drive?.sizeUnit) return null;
  return {
    id: drive.sizeUnit,
    name: drive.sizeUnitSymbol || drive.sizeUnit,
    symbol: drive.sizeUnitSymbol,
    isCountable: drive.sizeUnitCountable,
    color: "",
  };
}

/** The modal's Quantity for an existing run: kg / L → amount each; countable → the shared gift count ("" if mixed). */
function runSizeValue(drive: CourtesyDrive): GiftSizeValue {
  const unit = drive.sizeUnit ?? "";
  if (drive.sizeUnitCountable === false) return { unit, size: drive.sizePerGift ?? "1" };
  const counts = new Set(drive.recipients.map((r) => recipientQty(r.quantity)));
  return { unit, size: counts.size === 1 ? String([...counts][0]) : "" };
}

const sizeIsCountable = (units: ConfigOption[], keep: ConfigOption | null, v: GiftSizeValue) =>
  (units.find((x) => x.id === v.unit) ?? (keep?.id === v.unit ? keep : undefined))
    ?.isCountable !== false;

/**
 * Modal Quantity → API. Countable: one gift = 1 Box, Quantity = gifts each ("2 Box").
 * Measurable: one gift = Quantity kg, 1 gift each ("0.25 kg"). Cost stays cost per gift × gifts.
 */
function sizeToApi(countable: boolean, v: GiftSizeValue) {
  const q = v.size.trim();
  return countable
    ? { sizeUnit: v.unit, sizePerGift: "1", giftsEach: Number(q) || undefined }
    : { sizeUnit: v.unit, sizePerGift: q, giftsEach: undefined };
}

export function isGiftRunEditable(status: string) {
  return status !== "COMPLETED" && status !== "ARCHIVED";
}

const fieldHeightSx = {
  "& .MuiOutlinedInput-root": { minHeight: 56 },
  "& .MuiInputBase-input": { py: 1.75 },
};

const selectFieldSx = {
  "& .MuiOutlinedInput-root": { minHeight: 56 },
  "& .MuiSelect-select": { display: "flex", alignItems: "center", py: 1.75 },
};

type DriveCreateModalProps = {
  open: boolean;
  onClose: () => void;
  presetGroupId?: string;
  /** When set, recipients come from this run; group picker is hidden. */
  fromDrive?: CourtesyDrive | null;
};

export function DriveCreateModal({
  open,
  onClose,
  presetGroupId,
  fromDrive = null,
}: DriveCreateModalProps) {
  const theme = useTheme();
  const desk = useCourtesyDesk();
  const navigate = useNavigate();
  const groups = listGroups();
  const occasions = desk.config.occasions;
  const fromRun = !!fromDrive;
  const fromRunPeopleCount = fromDrive?.recipients?.length ?? 0;

  const [groupIds, setGroupIds] = useState<string[]>([]);
  // Individually picked people — the API skips anyone already in a selected group.
  const [people, setPeople] = useState<PersonRef[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [occasionType, setOccasionType] = useState("");
  const [giftItem, setGiftItem] = useState("");
  const [driveDate, setDriveDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [costPerGift, setCostPerGift] = useState("");
  const units = desk.config.units;
  const keepUnit = runUnitOption(fromDrive);
  const [size, setSize] = useState<GiftSizeValue>({ unit: "", size: "1" });
  const countable = sizeIsCountable(units, keepUnit, size);

  useEffect(() => {
    if (!open) return;
    const gs = listGroups();
    const first = presetGroupId || gs[0]?.id;
    setGroupIds(fromDrive ? driveGroupIds(fromDrive) : first ? [first] : []);
    setPeople([]);
    setTitle("");
    setOccasionType("");
    setGiftItem("");
    setDriveDate(new Date().toISOString().slice(0, 10));
    setCostPerGift("");
    const defaultUnit = units.find((u) => u.isDefault) ?? units[0];
    setSize(
      fromDrive?.sizeUnit
        ? runSizeValue(fromDrive)
        : { unit: defaultUnit?.id ?? "", size: "1" },
    );
    // Units only seed the default when the dialog opens; a later config refresh must not reset a pick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, presetGroupId, fromDrive]);

  // Gifts the server will create: people × the modal's gifts each (countable), else 1 each.
  const previewQty = useMemo(() => {
    const count = fromDrive
      ? (fromDrive.recipients?.length ?? 0)
      : uniquePeopleCount(groupMembersOf(groups, groupIds), people);
    return count * (countable ? Number(size.size) || 1 : 1);
  }, [fromDrive, groups, groupIds, people, countable, size]);

  const previewCost = Number(costPerGift);
  const previewTotal =
    Number.isFinite(previewCost) && previewCost >= 0
      ? previewCost * previewQty
      : 0;

  const canSubmit = fromRun
    ? fromRunPeopleCount > 0
    : groups.length > 0;

  const onCreate = (e: FormEvent) => {
    e.preventDefault();
    try {
      if (fromRun) {
        if (!fromDrive?.id) throw new Error("Source Gift Run is required.");
        if (!fromRunPeopleCount)
          throw new Error("Source Gift Run has no people.");
      } else {
        if (!groups.length) throw new Error("Create a People Group first.");
        if (!groupIds.length) throw new Error("Choose at least one People Group.");
      }
      if (!title.trim())
        throw new Error(`${GIFT_RUN_LABEL} title is required.`);
      if (!giftItem.trim()) throw new Error("Gift item is required.");
      if (!occasionType)
        throw new Error("Choose an occasion (add new ones under Configure).");
      const cost =
        costPerGift.trim() === ""
          ? null
          : Number(costPerGift);
      if (cost !== null && (!Number.isFinite(cost) || cost < 0)) {
        throw new Error("Cost per gift must be a valid number.");
      }
      const sizeError = giftSizeError(countable, size.size);
      if (sizeError) throw new Error(sizeError);
      const { giftsEach, ...unitFields } = sizeToApi(countable, size);
      void createDriveToApi({
        title,
        occasionType,
        giftItem,
        driveDate,
        ...(fromRun && fromDrive
          ? { fromRunId: fromDrive.id }
          : { sourceGroupIds: groupIds, members: people }),
        costPerGift: cost,
        defaultQuantity: giftsEach,
        ...(size.unit ? unitFields : {}),
      })
        .then((drive) => {
          toast.success(`${GIFT_RUN_LABEL} created`);
          onClose();
          navigate(`${GIFT_MANAGEMENT_BASE}/drives/${drive.id}`);
        })
        .catch((err: unknown) => {
          toast.error(apiErrorMessage(err, "Something went wrong"));
        });
    } catch (err: unknown) {
      toast.error(apiErrorMessage(err, "Something went wrong"));
    }
  };

  const close = () => onClose();

  return (
    <GlassDialog open={open} onClose={close} maxWidth="sm" fullWidth>
      <GlassHeader
        icon={<KTIcon iconName="gift" className="fs-1" />}
        title={`New ${GIFT_RUN_LABEL}`}
        subtitle={
          fromRun
            ? `Recipients come from “${fromDrive?.title ?? "this Gift Run"}” (${fromRunPeopleCount}). Everything else starts fresh.`
            : "Recipients come from the groups — each person once. Occasions are managed under Configure."
        }
        onClose={close}
      />
      <Box
        component="form"
        onSubmit={onCreate}
        sx={{ px: { xs: 2, md: 3 }, pb: 3, pt: 2.5 }}
      >
        {!fromRun && !groups.length ? (
          <Alert severity="info" sx={{ mb: 2 }}>
            Create a People Group first, then start a {GIFT_RUN_LABEL}.
            <Box sx={{ mt: 1 }}>
              <PremiumButton
                onClick={() => {
                  close();
                  navigate(`${GIFT_MANAGEMENT_BASE}/groups/new`);
                }}
              >
                New People Group
              </PremiumButton>
            </Box>
          </Alert>
        ) : fromRun && !fromRunPeopleCount ? (
          <Alert severity="warning" sx={{ mb: 2 }}>
            This {GIFT_RUN_LABEL} has no people to copy.
          </Alert>
        ) : (
          <Stack spacing={2.5}>
            {fromRun ? (
              <Alert severity="info">
                {fromRunPeopleCount} people from “{fromDrive?.title}”
                {fromDrive?.sourceGroupName
                  ? ` · Group: ${fromDrive.sourceGroupName}`
                  : ""}
              </Alert>
            ) : (
              <>
                <GroupsField
                  groups={groups}
                  value={groupIds}
                  onChange={setGroupIds}
                  helperText={`${uniquePeopleCount(groupMembersOf(groups, groupIds), people)} people — anyone in more than one group is added once`}
                />
                <WtButton ghost type="button" onClick={() => setPickerOpen(true)}>
                  {people.length
                    ? `Individual people (${people.length})`
                    : "Add individual people"}
                </WtButton>
              </>
            )}
            <TextField
              label={`${GIFT_RUN_LABEL} title`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Perfume for Reza Peoples"
              fullWidth
              required
              sx={fieldHeightSx}
            />
            <TextField
              label="Gift item"
              value={giftItem}
              onChange={(e) => setGiftItem(e.target.value)}
              placeholder="Perfume / Khajur / Sweets"
              fullWidth
              required
              sx={fieldHeightSx}
            />
            <TextField
              select
              label="Occasion"
              value={occasionType}
              onChange={(e) => setOccasionType(e.target.value)}
              fullWidth
              required
              sx={selectFieldSx}
              InputLabelProps={{ shrink: true }}
              SelectProps={{
                displayEmpty: true,
                MenuProps: { PaperProps: { sx: menuOptionSx(theme) } },
                renderValue: (selected) => {
                  if (!selected) {
                    return (
                      <Typography variant="body2" color="text.secondary">
                        Select occasion
                      </Typography>
                    );
                  }
                  const name = occasions.find((o) => o.id === selected)?.name;
                  return name ?? String(selected);
                },
              }}
            >
              <MenuItem disabled value="">
                Select occasion
              </MenuItem>
              {occasions.map((o: ConfigOption) => (
                <MenuItem key={o.id} value={o.id}>
                  {o.name}
                </MenuItem>
              ))}
            </TextField>
            <WtDateField
              label="Date"
              value={driveDate}
              onChange={(v) => setDriveDate(v || "")}
              fullWidth
              sx={fieldHeightSx}
            />
            <GiftSizeFields
              units={units}
              value={size}
              onChange={setSize}
              keep={keepUnit}
            />
            <TextField
              type="number"
              label="Cost per gift"
              value={costPerGift}
              onChange={(e) => setCostPerGift(e.target.value)}
              placeholder="e.g. 250"
              inputProps={{ min: 0, step: "0.01" }}
              fullWidth
              sx={fieldHeightSx}
              helperText={
                costPerGift.trim() !== "" && previewQty > 0
                  ? `Total amount: ${formatCurrencyDecimal(previewTotal)} (${formatCurrencyDecimal(previewCost)} × ${previewQty})`
                  : "Optional — total = cost × gift quantities"
              }
            />
          </Stack>
        )}

        <Stack
          direction="row"
          spacing={1}
          justifyContent="flex-end"
          sx={{ mt: 3 }}
        >
          <WtButton ghost={true} type="button" onClick={close}>
            Cancel
          </WtButton>
          <WtButton type="submit" disabled={!canSubmit}>
            Create {GIFT_RUN_LABEL}
          </WtButton>
        </Stack>
      </Box>
      <IndividualsDialog
        open={pickerOpen}
        groupMembers={groupMembersOf(groups, groupIds).flat()}
        value={people}
        onClose={() => setPickerOpen(false)}
        onChange={setPeople}
      />
    </GlassDialog>
  );
}

/** Pick people outside the selected groups; anyone already in a group is dropped (by person id). */
function IndividualsDialog({
  open,
  groupMembers,
  value,
  onClose,
  onChange,
}: {
  open: boolean;
  groupMembers: PersonRef[];
  value: PersonRef[];
  onClose: () => void;
  onChange: (people: PersonRef[]) => void;
}) {
  const [draft, setDraft] = useState<PersonRef[]>([]);
  useEffect(() => {
    if (open) setDraft([...groupMembers, ...value]);
    // Seed once per open; the parent's arrays are rebuilt every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const inGroups = new Set(groupMembers.map((p) => `${p.memberType}:${p.personId}`));
  return (
    <GlassDialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      header={<GlassHeader icon={<KTIcon iconName="people" className="fs-2" />} title="Individual people" onClose={onClose} />}
    >
      <Box sx={{ px: 3, py: 2 }}>
        <PersonPicker
          selected={draft}
          onChange={setDraft}
          baselineSelected={groupMembers}
          baselineLabel="selected groups"
          hideSelectedPanels
        />
        <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 2 }}>
          <WtButton ghost onClick={onClose}>
            Cancel
          </WtButton>
          <WtButton
            onClick={() => {
              onChange(draft.filter((p) => !inGroups.has(`${p.memberType}:${p.personId}`)));
              onClose();
            }}
          >
            Done
          </WtButton>
        </Stack>
      </Box>
    </GlassDialog>
  );
}

type DriveEditModalProps = {
  open: boolean;
  drive: CourtesyDrive | null;
  onClose: () => void;
};

/** Edit title / gift / occasion / date / group. Caller must not open for Completed / Archived. */
export function DriveEditModal({ open, drive, onClose }: DriveEditModalProps) {
  const theme = useTheme();
  const desk = useCourtesyDesk();
  const occasions = desk.config.occasions;
  const groups = listGroups();

  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [giftItem, setGiftItem] = useState("");
  const [occasionType, setOccasionType] = useState("");
  const [driveDate, setDriveDate] = useState("");
  const [costPerGift, setCostPerGift] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const units = desk.config.units;
  const keepUnit = runUnitOption(drive);
  const [size, setSize] = useState<GiftSizeValue>({ unit: "", size: "1" });
  const countable = sizeIsCountable(units, keepUnit, size);

  useEffect(() => {
    if (!open || !drive) return;
    setSize(runSizeValue(drive));
    setGroupIds(driveGroupIds(drive));
    setTitle(drive.title);
    setGiftItem(drive.giftItem);
    setOccasionType(drive.occasionType);
    setDriveDate(drive.driveDate || "");
    setCostPerGift(
      drive.costPerGift !== null && drive.costPerGift !== undefined
        ? String(drive.costPerGift)
        : "",
    );
    setConfirmOpen(false);
  }, [open, drive]);

  const editPreviewQty = useMemo(
    () =>
      (drive?.recipients ?? []).reduce(
        (sum, r) => sum + recipientQty(r.quantity),
        0,
      ),
    [drive],
  );
  const editCost = Number(costPerGift);
  const editTotal =
    Number.isFinite(editCost) && editCost >= 0
      ? editCost * editPreviewQty
      : 0;

  const onSubmitForm = (e: FormEvent) => {
    e.preventDefault();
    if (!drive) return;
    if (!groupIds.length) {
      toast.error("Choose at least one People Group.");
      return;
    }
    if (!title.trim()) {
      toast.error("Title is required.");
      return;
    }
    if (!giftItem.trim()) {
      toast.error("Gift item is required.");
      return;
    }
    if (!occasionType) {
      toast.error("Occasion is required.");
      return;
    }
    // Countable left blank = people already have different counts; keep them.
    const sizeError = countable && !size.size.trim() ? null : giftSizeError(countable, size.size);
    if (sizeError) {
      toast.error(sizeError);
      return;
    }
    setConfirmOpen(true);
  };

  const groupChanged = !!drive && groupIds.join() !== driveGroupIds(drive).join();

  const onConfirmPersist = () => {
    if (!drive) return;
    const cost =
      costPerGift.trim() === "" ? null : Number(costPerGift);
    if (cost !== null && (!Number.isFinite(cost) || cost < 0)) {
      toast.error("Cost per gift must be a valid number.");
      return;
    }
    setSaving(true);
    const { giftsEach, ...unitFields } = sizeToApi(countable, size);
    void updateDriveMetaToApi(drive.id, {
      title: title.trim(),
      giftItem: giftItem.trim(),
      occasionType,
      driveDate: driveDate || undefined,
      sourceGroupIds: groupIds,
      costPerGift: cost,
      ...(size.unit ? unitFields : {}),
    })
      // Countable Quantity is "gifts each" — set it on everyone whose count differs.
      .then((updated) => {
        const ids = giftsEach
          ? updated.recipients.filter((r) => recipientQty(r.quantity) !== giftsEach).map((r) => r.id)
          : [];
        return ids.length && giftsEach
          ? bulkUpdateRecipientsToApi(updated.id, ids, { quantity: giftsEach })
          : undefined;
      })
      .then(() => {
        toast.success(
          groupChanged
            ? `${GIFT_RUN_LABEL} updated — recipients synced from the new group.`
            : `${GIFT_RUN_LABEL} updated`,
        );
        setConfirmOpen(false);
        onClose();
      })
      .catch((err: unknown) => {
        toast.error(apiErrorMessage(err, "Something went wrong"));
      })
      .finally(() => setSaving(false));
  };

  return (
    <>
      <GlassDialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <GlassHeader
          icon={<KTIcon iconName="pencil" className="fs-1" />}
          title={`Edit ${GIFT_RUN_LABEL}`}
          subtitle="Update group, title, gift, occasion, or date."
          onClose={onClose}
        />
        <Box
          component="form"
          onSubmit={onSubmitForm}
          sx={{ px: { xs: 2, md: 3 }, pb: 3, pt: 2.5 }}
        >
          <Stack spacing={2.5}>
            <GroupsField
              groups={groups}
              value={groupIds}
              onChange={setGroupIds}
              helperText={
                groupChanged
                  ? "Recipients follow the new groups (each person once). People in both keep their status; people added only to this run are kept."
                  : undefined
              }
            />
            <TextField
              label={`${GIFT_RUN_LABEL} title`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              fullWidth
              required
              sx={fieldHeightSx}
            />
            <TextField
              label="Gift item"
              value={giftItem}
              onChange={(e) => setGiftItem(e.target.value)}
              fullWidth
              required
              sx={fieldHeightSx}
            />
            <TextField
              select
              label="Occasion"
              value={occasionType}
              onChange={(e) => setOccasionType(e.target.value)}
              fullWidth
              required
              sx={selectFieldSx}
              SelectProps={{
                MenuProps: { PaperProps: { sx: menuOptionSx(theme) } },
              }}
            >
              {occasions.map((o: ConfigOption) => (
                <MenuItem key={o.id} value={o.id}>
                  {o.name}
                </MenuItem>
              ))}
            </TextField>
            <WtDateField
              label="Date"
              value={driveDate}
              onChange={(v) => setDriveDate(v || "")}
              fullWidth
              sx={fieldHeightSx}
            />
            <GiftSizeFields
              units={units}
              value={size}
              onChange={setSize}
              keep={keepUnit}
            />
            <TextField
              type="number"
              label="Cost per gift"
              value={costPerGift}
              onChange={(e) => setCostPerGift(e.target.value)}
              placeholder="e.g. 250"
              inputProps={{ min: 0, step: "0.01" }}
              fullWidth
              sx={fieldHeightSx}
              helperText={
                costPerGift.trim() !== "" && editPreviewQty > 0
                  ? `Total amount: ${formatCurrencyDecimal(editTotal)} (${formatCurrencyDecimal(editCost)} × ${editPreviewQty})`
                  : "Optional — total = cost × gift quantities"
              }
            />
          </Stack>
          <Stack
            direction="row"
            spacing={1}
            justifyContent="flex-end"
            sx={{ mt: 3 }}
          >
            <WtButton ghost={true} type="button" onClick={onClose}>
              Cancel
            </WtButton>
            <WtButton type="submit">Save</WtButton>
          </Stack>
        </Box>
      </GlassDialog>

      <ConfirmDialog
        open={confirmOpen}
        variant="confirm"
        title={`Confirm ${GIFT_RUN_LABEL} Update`}
        message={
          groupChanged
            ? `Save changes and switch this run to the selected group? Group-linked recipients will be replaced; people added only to this run stay.`
            : `Are you sure you want to update this ${GIFT_RUN_LABEL}?`
        }
        confirmLabel="Save"
        loading={saving}
        loadingLabel="Updating…"
        onClose={() => !saving && setConfirmOpen(false)}
        onConfirm={onConfirmPersist}
      />
    </>
  );
}
