import { useState } from 'react';
import CheckRounded from '@mui/icons-material/CheckRounded';
import FilterAltOutlined from '@mui/icons-material/FilterAltOutlined';
import { Menu, MenuItem, Tooltip } from '@mui/material';
import {
  sectionAccent,
  SORT_MENU_HEADING, SORT_MENU_ITEM, SORT_MENU_LABEL, SORT_MENU_PAPER,
  SORT_TRIGGER, SORT_TRIGGER_ON,
} from '../shellTokens';
import { MODULE_SORTS, setModuleSort, useModuleSort } from '../moduleSort';
import { useWorkspaceShell } from '../WorkspaceShellContext';

/**
 * How this application's modules are ordered — a filter chip in the workspace header.
 *
 * ─── WHY A MENU AND NOT A SEGMENTED CONTROL ──────────────────────────────────
 * Three labels sitting permanently in the header put a persistent control next to the
 * application's identity, competing with it for a decision most people make once. Folded
 * behind the funnel, ordering costs one glyph until someone wants it, and the header stays a
 * statement of where you are.
 *
 * MUI's Menu IS a modal — focus is trapped, Escape and a click outside close it, and the
 * list is keyboard-navigable — so this is the enterprise pattern without a Dialog's ceremony
 * for what is a three-item choice.
 *
 * ─── THE CHIP CARRIES THE STATE ──────────────────────────────────────────────
 * The trigger takes the application's accent whenever the order is NOT the default. That
 * matters: alphabetical order looks like a bug if you do not know you asked for it, and the
 * one thing a collapsed control must never do is hide that it is on. Default order leaves the
 * chip neutral, because there is nothing to disclose.
 */
export function ModuleSortMenu() {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const { activeApp, activeModule } = useWorkspaceShell();
  const sort = useModuleSort();
  const active = MODULE_SORTS.find((o) => o.id === sort) ?? MODULE_SORTS[0];
  const modified = sort !== 'frequent';

  // Reads shell state and gates itself, so it can be composed into the rail without the
  // dock learning that module ordering exists — AppDock still receives nothing but
  // launcher data. Inside a module there is no grid to order, so there is no control.
  if (!activeApp || activeModule) return null;

  const accent = sectionAccent(activeApp.id);

  return (
    <>
      {/* MUI Tooltip, not a raw `title` — the browser's is unstyled, unthemed and slow.
          The glyph says neither what it orders nor what it is set to, so both go in the
          hint and in the accessible name rather than into header text nobody needs twice. */}
      <Tooltip title={`Sort modules — ${active.label}`}>
        <button
          type="button"
          onClick={(e) => setAnchor(e.currentTarget)}
          aria-haspopup="menu"
          aria-expanded={!!anchor}
          aria-label={`Sort modules — ${active.label}`}
          className={`${SORT_TRIGGER} ${modified ? `${accent.iconWrap} ${SORT_TRIGGER_ON}` : ''}`}
        >
          <FilterAltOutlined sx={{ fontSize: 18 }} />
        </button>
      </Tooltip>

      <Menu
        open={!!anchor}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        // PaperProps, not slotProps.paper — this project is on MUI v5, where the `paper`
        // slot does not exist yet (it arrives in v6). Same note as NavSectionDialog.
        PaperProps={{ className: SORT_MENU_PAPER }}
        MenuListProps={{ dense: true, 'aria-label': 'Sort modules' }}
      >
        {/* A funnel is not self-describing. One line of scope, then the choices. */}
        <div className={SORT_MENU_HEADING}>Sort modules</div>
        {MODULE_SORTS.map((option) => (
          <MenuItem
            key={option.id}
            selected={option.id === sort}
            onClick={() => { setModuleSort(option.id); setAnchor(null); }}
            className={SORT_MENU_ITEM}
          >
            <span className={SORT_MENU_LABEL}>{option.label}</span>
            {/* Reserved space, not a conditional element: rendering the tick only when
                selected reflows every row the moment the selection moves. */}
            <CheckRounded
              sx={{ fontSize: 16, opacity: option.id === sort ? 1 : 0 }}
              aria-hidden="true"
            />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
