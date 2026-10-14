import { useEffect, useState } from "react";
import { Alert, DialogActions, DialogContent, Stack } from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import {
  GlassDialog,
  GlassHeader,
  KIT_HEX_SWATCHES,
  WtButton,
  WtColorPicker,
  WtField,
} from "@app/modules/common/components/ui";
import type { ConfigOption } from "../types";

const DEFAULT_COLOR = "#1E3A8A";

type Props = {
  show: boolean;
  onClose: () => void;
  title: string;
  nameLabel?: string;
  initial?: ConfigOption | null;
  onSave: (option: ConfigOption) => void;
};

export default function GiftConfigOptionModal({
  show,
  onClose,
  title,
  nameLabel = "Name",
  initial,
  onSave,
}: Props) {
  const isEditing = Boolean(initial?.id);
  const [name, setName] = useState(initial?.name ?? "");
  const [color, setColor] = useState(initial?.color ?? DEFAULT_COLOR);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!show) return;
    setName(initial?.name ?? "");
    setColor(initial?.color ?? DEFAULT_COLOR);
    setError("");
  }, [show, initial]);

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError(`${nameLabel} is required`);
      return;
    }
    const id =
      initial?.id ||
      trimmed
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "_")
        .replace(/^_|_$/g, "") ||
      `OPT_${Date.now()}`;
    onSave({ id, name: trimmed, color });
    onClose();
  };

  return (
    <GlassDialog
      open={show}
      onClose={onClose}
      maxWidth="xs"
      header={
        <GlassHeader
          title={`${isEditing ? "Edit" : "New"} ${title}`}
          icon={<KTIcon iconName="bi-palette" className="fs-2" />}
          onClose={onClose}
        />
      }
    >
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error ? <Alert severity="error">{error}</Alert> : null}
          <WtField
            label={nameLabel}
            required
            fullWidth
            value={name}
            onChange={setName}
            placeholder={`Enter ${nameLabel.toLowerCase()}`}
          />
          <WtColorPicker
            label="Colour"
            variant="row"
            palette={KIT_HEX_SWATCHES}
            value={color}
            onChange={setColor}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <WtButton ghost onClick={onClose}>Cancel</WtButton>
        <WtButton tone="primary" disabled={!name.trim()} onClick={submit}>
          Save
        </WtButton>
      </DialogActions>
    </GlassDialog>
  );
}
