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
import { menuOptionSx } from "@app/modules/common/components/ui/patterns";
import { GIFT_MANAGEMENT_BASE } from "../giftPaths";
import { useCourtesyDesk } from "../hooks/useCourtesyDesk";
import {
  createDriveToApi,
  listGroups,
  updateDriveMetaToApi,
} from "../store/courtesyDeskStore";
import type { ConfigOption, CourtesyDrive } from "../types";
import { GIFT_RUN_LABEL } from "../types";

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

  const [groupId, setGroupId] = useState("");
  const [title, setTitle] = useState("");
  const [occasionType, setOccasionType] = useState("");
  const [giftItem, setGiftItem] = useState("");
  const [driveDate, setDriveDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [defaultQuantity, setDefaultQuantity] = useState(1);
  const [costPerGift, setCostPerGift] = useState("");

  useEffect(() => {
    if (!open) return;
    const gs = listGroups();
    setGroupId(
      fromDrive?.sourceGroupId || presetGroupId || gs[0]?.id || "",
    );
    setTitle("");
    setOccasionType("");
    setGiftItem("");
    setDriveDate(new Date().toISOString().slice(0, 10));
    setDefaultQuantity(1);
    setCostPerGift("");
  }, [open, presetGroupId, fromDrive]);

  const previewQty = useMemo(() => {
    const fallback = Math.max(1, defaultQuantity || 1);
    if (fromDrive) {
      return (fromDrive.recipients?.length ?? 0) * fallback;
    }
    const g = groups.find((x) => x.id === groupId);
    if (!g?.members.length) return 0;
    return g.members.reduce(
      (sum, m) => sum + Math.max(1, m.giftQuantity || fallback),
      0,
    );
  }, [fromDrive, groups, groupId, defaultQuantity]);

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
        if (!groupId) throw new Error("Choose a People Group.");
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
      void createDriveToApi({
        title,
        occasionType,
        giftItem,
        driveDate,
        ...(fromRun && fromDrive
          ? { fromRunId: fromDrive.id }
          : { sourceGroupId: groupId }),
        defaultQuantity: Math.max(1, defaultQuantity || 1),
        costPerGift: cost,
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
            : "Recipients come from the group. Occasions are managed under Configure."
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
              <TextField
                select
                label="People Group"
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                fullWidth
                required
                sx={selectFieldSx}
                SelectProps={{
                  MenuProps: { PaperProps: { sx: menuOptionSx(theme) } },
                }}
              >
                {groups.map((g) => (
                  <MenuItem key={g.id} value={g.id}>
                    {g.name} ({g.members.length})
                  </MenuItem>
                ))}
              </TextField>
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
            <TextField
              type="number"
              label="Default quantity per person"
              value={defaultQuantity}
              onChange={(e) =>
                setDefaultQuantity(Math.max(1, Number(e.target.value) || 1))
              }
              inputProps={{ min: 1, step: 1 }}
              fullWidth
              sx={fieldHeightSx}
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

  const [groupId, setGroupId] = useState("");
  const [title, setTitle] = useState("");
  const [giftItem, setGiftItem] = useState("");
  const [occasionType, setOccasionType] = useState("");
  const [driveDate, setDriveDate] = useState("");
  const [costPerGift, setCostPerGift] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !drive) return;
    setGroupId(drive.sourceGroupId);
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
        (sum, r) => sum + Math.max(1, r.quantity || 1),
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
    if (!groupId) {
      toast.error("People Group is required.");
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
    setConfirmOpen(true);
  };

  const groupChanged = !!drive && groupId !== drive.sourceGroupId;

  const onConfirmPersist = () => {
    if (!drive) return;
    const cost =
      costPerGift.trim() === "" ? null : Number(costPerGift);
    if (cost !== null && (!Number.isFinite(cost) || cost < 0)) {
      toast.error("Cost per gift must be a valid number.");
      return;
    }
    setSaving(true);
    void updateDriveMetaToApi(drive.id, {
      title: title.trim(),
      giftItem: giftItem.trim(),
      occasionType,
      driveDate: driveDate || undefined,
      sourceGroupId: groupId,
      costPerGift: cost,
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
            <TextField
              select
              label="People Group"
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              fullWidth
              required
              sx={selectFieldSx}
              SelectProps={{
                MenuProps: { PaperProps: { sx: menuOptionSx(theme) } },
              }}
              helperText={
                groupChanged
                  ? "Changing the group replaces group-linked recipients. People added only to this run are kept."
                  : undefined
              }
            >
              {groups.map((g) => (
                <MenuItem key={g.id} value={g.id}>
                  {g.name} ({g.members.length})
                </MenuItem>
              ))}
            </TextField>
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
