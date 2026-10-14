import { useEffect, useState, type FormEvent } from "react";
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
import PremiumButton from "@app/modules/common/components/PremiumButton";
import {
  GlassDialog,
  GlassHeader,
  WtButton,
  WtDateField,
} from "@app/modules/common/components/ui";
import { menuOptionSx } from "@app/modules/common/components/ui/patterns";
import { GIFT_MANAGEMENT_BASE } from "../giftPaths";
import { useCourtesyDesk } from "../hooks/useCourtesyDesk";
import { createDriveToApi, listGroups } from "../store/courtesyDeskStore";
import type { ConfigOption } from "../types";
import { GIFT_RUN_LABEL } from "../types";

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
};

export function DriveCreateModal({
  open,
  onClose,
  presetGroupId,
}: DriveCreateModalProps) {
  const theme = useTheme();
  const desk = useCourtesyDesk();
  const navigate = useNavigate();
  const groups = listGroups();
  const occasions = desk.config.occasions;

  const [groupId, setGroupId] = useState("");
  const [title, setTitle] = useState("");
  const [occasionType, setOccasionType] = useState("");
  const [giftItem, setGiftItem] = useState("");
  const [driveDate, setDriveDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [defaultQuantity, setDefaultQuantity] = useState(1);

  useEffect(() => {
    if (!open) return;
    const gs = listGroups();
    setGroupId(presetGroupId || gs[0]?.id || "");
    setTitle("");
    setOccasionType("");
    setGiftItem("");
    setDriveDate(new Date().toISOString().slice(0, 10));
    setDefaultQuantity(1);
  }, [open, presetGroupId]);

  const onCreate = (e: FormEvent) => {
    e.preventDefault();
    try {
      if (!groups.length) throw new Error("Create a People Group first.");
      if (!groupId) throw new Error("Choose a People Group.");
      if (!title.trim())
        throw new Error(`${GIFT_RUN_LABEL} title is required.`);
      if (!giftItem.trim()) throw new Error("Gift item is required.");
      if (!occasionType)
        throw new Error("Choose an occasion (add new ones under Configure).");
      void createDriveToApi({
        title,
        occasionType,
        giftItem,
        driveDate,
        sourceGroupId: groupId,
        defaultQuantity: Math.max(1, defaultQuantity || 1),
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
        subtitle="Recipients come from the group. Occasions are managed under Configure."
        onClose={close}
      />
      <Box
        component="form"
        onSubmit={onCreate}
        sx={{ px: { xs: 2, md: 3 }, pb: 3, pt: 2.5 }}
      >
        {!groups.length ? (
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
        ) : (
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
          <WtButton type="submit" disabled={!groups.length}>
            Create {GIFT_RUN_LABEL}
          </WtButton>
        </Stack>
      </Box>
    </GlassDialog>
  );
}
