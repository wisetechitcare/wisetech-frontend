import { useEffect, useState } from "react";
import { Alert, DialogActions, DialogContent, Stack } from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import {
  GlassDialog,
  GlassHeader,
  KIT_HEX_SWATCHES,
  SegmentedControl,
  WtButton,
  WtColorPicker,
  WtField,
} from "@app/modules/common/components/ui";
import type { ConfigOption } from "../types";

const DEFAULT_COLOR = "#1E3A8A";

type UnitKind = "countable" | "measurable";

type Props = {
  show: boolean;
  onClose: () => void;
  title: string;
  nameLabel?: string;
  initial?: ConfigOption | null;
  /** Other options in this section — used to block duplicate name / id. */
  existing?: ConfigOption[];
  onSave: (option: ConfigOption) => void;
  /** Units: symbol + countable/measurable instead of a colour. */
  unit?: boolean;
};

function optionSlug(name: string, fallbackId?: string) {
  return (
    fallbackId?.trim() ||
    name
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_|_$/g, "") ||
    `OPT_${Date.now()}`
  );
}

export default function GiftConfigOptionModal({
  show,
  onClose,
  title,
  nameLabel = "Name",
  initial,
  existing = [],
  onSave,
  unit = false,
}: Props) {
  const isEditing = Boolean(initial?.id);
  const [name, setName] = useState(initial?.name ?? "");
  const [color, setColor] = useState(initial?.color ?? DEFAULT_COLOR);
  const [symbol, setSymbol] = useState(initial?.symbol ?? "");
  const [unitKind, setUnitKind] = useState<UnitKind>("countable");
  const [error, setError] = useState("");
  // A used unit's symbol/type are frozen server-side so history keeps its meaning.
  const unitLocked = unit && !!initial?.inUse;

  useEffect(() => {
    if (!show) return;
    setName(initial?.name ?? "");
    setColor(initial?.color ?? DEFAULT_COLOR);
    setSymbol(initial?.symbol ?? "");
    setUnitKind(initial?.isCountable === false ? "measurable" : "countable");
    setError("");
  }, [show, initial]);

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError(`${nameLabel} is required`);
      return;
    }
    const id = optionSlug(trimmed, initial?.id);
    const rivals = existing.filter((o) => o.id !== initial?.id);
    if (rivals.some((o) => o.id === id)) {
      setError(`${nameLabel} already exists`);
      return;
    }
    if (
      rivals.some((o) => o.name.trim().toLowerCase() === trimmed.toLowerCase())
    ) {
      setError(`${nameLabel} already exists`);
      return;
    }
    if (!unit) {
      onSave({ id, name: trimmed, color });
      onClose();
      return;
    }
    const sym = symbol.trim() || trimmed;
    if (rivals.some((o) => (o.symbol ?? "").trim().toLowerCase() === sym.toLowerCase())) {
      setError("Symbol already exists");
      return;
    }
    onSave({
      ...initial,
      id,
      name: trimmed,
      color: initial?.color ?? "",
      symbol: sym,
      isCountable: unitKind === "countable",
    });
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
          {unit ? (
            <>
              <WtField
                label="Symbol"
                fullWidth
                value={symbol}
                onChange={setSymbol}
                disabled={unitLocked}
                placeholder={name.trim() || "e.g. kg, Box, Office Kit"}
                maxLength={40}
                hint={
                  unitLocked
                    ? "Used by gift runs — symbol and type are locked."
                    : "Shown next to quantities. Leave empty to use the name."
                }
              />
              <SegmentedControl<UnitKind>
                ariaLabel="Unit type"
                fullWidth
                options={[
                  { value: "countable", label: "Countable", disabled: unitLocked },
                  { value: "measurable", label: "Measurable", disabled: unitLocked },
                ]}
                value={unitKind}
                onChange={setUnitKind}
              />
            </>
          ) : (
            <WtColorPicker
              label="Colour"
              variant="row"
              palette={KIT_HEX_SWATCHES}
              value={color}
              onChange={setColor}
            />
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <WtButton ghost onClick={onClose}>Cancel</WtButton>
        <WtButton disabled={!name.trim()} onClick={submit}>
          Save
        </WtButton>
      </DialogActions>
    </GlassDialog>
  );
}
