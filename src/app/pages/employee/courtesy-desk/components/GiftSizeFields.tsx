import { InputAdornment, MenuItem, Stack, TextField, useTheme } from "@mui/material";
import { menuOptionSx } from "@app/modules/common/components/ui/patterns";
import type { ConfigOption } from "../types";
import { unitLabel } from "../types";

export type GiftSizeValue = { unit: string; size: string };

type Props = {
  /** Active units from config. */
  units: ConfigOption[];
  value: GiftSizeValue;
  onChange: (next: GiftSizeValue) => void;
  /** A run's current unit — listed even if since deactivated, so editing never forces a change. */
  keep?: ConfigOption | null;
};

/**
 * "Unit / kit" select + "Quantity" per person, always both.
 * Countable (Unit, Box, kits): whole gifts each ("2 Box"). Measurable (kg, L): amount each ("0.25 kg").
 */
export default function GiftSizeFields({ units, value, onChange, keep }: Props) {
  const theme = useTheme();
  const options = keep && !units.some((u) => u.id === keep.id) ? [...units, keep] : units;
  const selected = options.find((u) => u.id === value.unit);
  const countable = selected?.isCountable !== false;

  // A decimal ("0.25") isn't a valid count of Box — reset it when switching to a countable unit.
  const pickUnit = (id: string) => {
    const nextCountable = options.find((u) => u.id === id)?.isCountable !== false;
    onChange({ unit: id, size: nextCountable && !/^\d+$/.test(value.size) ? "1" : value.size });
  };

  return (
    <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
      <TextField
        select
        label="Unit / kit"
        value={selected ? value.unit : ""}
        onChange={(e) => pickUnit(e.target.value)}
        disabled={!options.length}
        fullWidth
        SelectProps={{ MenuProps: { PaperProps: { sx: menuOptionSx(theme) } } }}
      >
        {options.map((u) => (
          <MenuItem key={u.id} value={u.id}>
            {unitLabel(u)}
            {u.isActive === false || u === keep ? " (inactive)" : ""}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        label="Quantity"
        value={value.size}
        onChange={(e) => onChange({ ...value, size: e.target.value })}
        placeholder={countable ? "e.g. 2" : "e.g. 0.25"}
        required
        fullWidth
        inputProps={{ inputMode: countable ? "numeric" : "decimal" }}
        InputProps={{
          endAdornment: selected?.symbol ? (
            <InputAdornment position="end">{selected.symbol}</InputAdornment>
          ) : undefined,
        }}
      />
    </Stack>
  );
}
