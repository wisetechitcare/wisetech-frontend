import React, { useState } from "react";
import { IconButton, Menu, MenuItem, Checkbox, ListItemText, Tooltip } from "@mui/material";
import ViewColumnIcon from "@mui/icons-material/ViewColumn";

/** Which columns of a report table are currently shown, by key. */
export function useColumnVisibility(allKeys: string[], alwaysOn: string[] = []) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const toggle = (key: string) => {
    if (alwaysOn.includes(key)) return;
    setHidden((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };
  return { isVisible: (key: string) => !hidden.has(key), toggle, hidden };
}

const ColumnSelector: React.FC<{
  columns: { key: string; header: string }[];
  isVisible: (key: string) => boolean;
  onToggle: (key: string) => void;
  alwaysOn?: string[];
}> = ({ columns, isVisible, onToggle, alwaysOn = [] }) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  return (
    <>
      <Tooltip title="Choose columns">
        <IconButton
          size="small" onClick={(e) => setAnchorEl(e.currentTarget)}
          sx={{ border: "1px solid", borderColor: "divider", borderRadius: "10px" }}
        >
          <ViewColumnIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Tooltip>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
        {columns.map((c) => (
          <MenuItem
            key={c.key} dense
            onClick={() => !alwaysOn.includes(c.key) && onToggle(c.key)}
            disabled={alwaysOn.includes(c.key)}
          >
            <Checkbox checked={isVisible(c.key)} size="small" disableRipple />
            <ListItemText primary={c.header} primaryTypographyProps={{ fontSize: 13 }} />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

export default ColumnSelector;
