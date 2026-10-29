import { MenuItem, TextField, useTheme } from "@mui/material";
import { menuOptionSx } from "@app/modules/common/components/ui/patterns";
import type { PeopleGroup } from "../types";

/** People Groups multi-select (New / Edit Gift Run, Add people). The first picked is the primary. */
export default function GroupsField({
  groups,
  value,
  onChange,
  helperText,
}: {
  groups: PeopleGroup[];
  value: string[];
  onChange: (ids: string[]) => void;
  helperText?: string;
}) {
  const theme = useTheme();
  return (
    <TextField
      select
      label="People Groups"
      value={value}
      onChange={(e) => onChange(e.target.value as unknown as string[])}
      fullWidth
      required
      helperText={helperText}
      sx={{
        "& .MuiOutlinedInput-root": { minHeight: 56 },
        "& .MuiSelect-select": { display: "flex", alignItems: "center", py: 1.75 },
      }}
      SelectProps={{
        multiple: true,
        renderValue: (ids) =>
          (ids as string[]).map((id) => groups.find((g) => g.id === id)?.name ?? id).join(", "),
        MenuProps: { PaperProps: { sx: menuOptionSx(theme) } },
      }}
    >
      {groups.map((g) => (
        <MenuItem key={g.id} value={g.id}>
          {g.name} ({g.members.length})
        </MenuItem>
      ))}
    </TextField>
  );
}
