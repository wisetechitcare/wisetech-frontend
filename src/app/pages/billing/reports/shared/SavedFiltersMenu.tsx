import React, { useState } from "react";
import { IconButton, Menu, MenuItem, ListItemText, Divider, TextField, Box, Tooltip } from "@mui/material";
import BookmarkIcon from "@mui/icons-material/Bookmark";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { WtButton } from "@app/modules/common/components/ui";
import type { SavedFilter } from "./useSavedFilters";

const SavedFiltersMenu = <T,>({
  saved, onApply, onSave, onRemove,
}: {
  saved: SavedFilter<T>[];
  onApply: (values: T) => void;
  onSave: (name: string) => void;
  onRemove: (name: string) => void;
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [name, setName] = useState("");

  return (
    <>
      <Tooltip title="Saved filters">
        <IconButton
          size="small" onClick={(e) => setAnchorEl(e.currentTarget)}
          sx={{ border: "1px solid", borderColor: "divider", borderRadius: "10px" }}
        >
          <BookmarkIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Tooltip>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
        <Box sx={{ px: 1.5, py: 1 }}>
          <Box sx={{ display: "flex", gap: 0.5 }}>
            <TextField
              size="small" placeholder="Preset name" value={name}
              onChange={(e) => setName(e.target.value)} sx={{ minWidth: 160 }}
            />
            <WtButton
              size="small" onClick={() => { if (name.trim()) { onSave(name.trim()); setName(""); } }}
              disabled={!name.trim()}
            >
              Save
            </WtButton>
          </Box>
        </Box>
        {saved.length > 0 && <Divider />}
        {saved.map((s) => (
          <MenuItem key={s.name} sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
            <ListItemText
              primary={s.name} primaryTypographyProps={{ fontSize: 13 }}
              onClick={() => { onApply(s.values); setAnchorEl(null); }}
              sx={{ cursor: "pointer" }}
            />
            <IconButton size="small" onClick={() => onRemove(s.name)}>
              <DeleteOutlineIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

export default SavedFiltersMenu;
