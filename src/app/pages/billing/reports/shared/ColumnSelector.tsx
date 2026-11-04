import React, { useState } from "react";
import { Menu, MenuItem, Checkbox, ListItemText, Tooltip } from "@mui/material";
import ViewColumnIcon from "@mui/icons-material/ViewColumn";
import { Button } from "@/ds/ui/button";

/** Which columns of a report table are currently shown, by key. */
export function useColumnVisibility(allKeys: string[], alwaysOn: string[] = []) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const toggle = (key: string) => {
    if (alwaysOn.includes(key)) return;
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
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
        <Button
          variant="outline" size="icon-sm" aria-label="Choose columns"
          onClick={(e) => setAnchorEl(e.currentTarget)}
        >
          <ViewColumnIcon sx={{ fontSize: 18 }} />
        </Button>
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
