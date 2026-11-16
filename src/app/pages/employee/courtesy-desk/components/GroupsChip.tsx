import { useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { ListItemText, Menu, MenuItem, Tooltip } from "@mui/material";
import { ToneChip } from "@app/modules/common/components/ui";
import { GIFT_MANAGEMENT_BASE } from "../giftPaths";
import { listGroups } from "../store/courtesyDeskStore";
import type { CourtesyDrive } from "../types";
import { driveGroupIds } from "../types";

/**
 * A run's People Groups in one chip: "Directors" or "Directors +6".
 * Hover lists them all; click opens a menu linking to each group with its member count.
 */
export default function GroupsChip({ drive }: { drive: CourtesyDrive }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const all = listGroups(true);
  const linked = driveGroupIds(drive).map(
    (id) => all.find((g) => g.id === id) ?? { id, name: drive.sourceGroupName, members: [] },
  );
  if (!linked.length) return null;
  const label = linked.length > 1 ? `${linked[0].name} +${linked.length - 1}` : linked[0].name;
  return (
    <>
      <Tooltip title={linked.map((g) => g.name).join(", ")}>
        <ToneChip
          tone="indigo"
          label={label}
          onClick={(e) => {
            e.stopPropagation();
            setAnchor(e.currentTarget);
          }}
        />
      </Tooltip>
      <Menu
        anchorEl={anchor}
        open={!!anchor}
        onClose={() => setAnchor(null)}
        onClick={(e) => e.stopPropagation()}
      >
        {linked.map((g) => (
          <MenuItem
            key={g.id}
            component={RouterLink}
            to={`${GIFT_MANAGEMENT_BASE}/groups/${g.id}`}
            onClick={() => setAnchor(null)}
          >
            <ListItemText primary={g.name} secondary={`${g.members.length} people`} />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
