import { useState } from "react";
import { Box, Menu, MenuItem, useMediaQuery, useTheme } from "@mui/material";
import { WtField } from "@app/modules/common/components/ui";
import { AppIcon } from "@app/modules/common/components/ui/AppIcon";
import { ALL_ORGS } from "@/hooks/useOrgScope";

/**
 * The module-wide organization filter, sized for `MaterialHeaderTab`'s `headerAction` slot.
 *
 * One control in the module's tab bar instead of a filter on every tab: the same org stays
 * selected as you move between tabs, rather than several independent filters that silently
 * disagree. Feed it `useOrgScope()`; the module passes the chosen id down to its tabs.
 *
 * NO LABEL, deliberately. `WtField` never styles its label — MUI sizes the notch from the
 * label's default metrics, so restyling one for a dark gradient is how a label ends up
 * sitting on the border line. It reads "All organizations" beside a bank icon, which says
 * what it is without a caption.
 *
 * Phones get one 36px icon button with a menu: a 200px select cannot share a ~360px bar
 * with the tabs. A white dot says a specific organization is selected.
 */
interface Props {
  scopeId: string;
  setScopeId: (id: string) => void;
  selectOptions: { value: string; label: string }[];
  /** A single-org family has nothing to filter; renders nothing. */
  hasChoice: boolean;
}

export function ModuleOrgFilter({ scopeId, setScopeId, selectOptions, hasChoice }: Props) {
  const theme = useTheme();
  const isPhone = useMediaQuery(theme.breakpoints.down("sm"));
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  if (!hasChoice) return null;

  const scopedToOne = scopeId !== ALL_ORGS;
  // The header is always dark navy — frosted white controls, not brand hex literals.
  const onBar = theme.palette.common.white;
  const onBarMuted = "rgba(255,255,255,0.85)";
  const onBarFill = "rgba(255,255,255,0.14)";
  const onBarFillActive = "rgba(255,255,255,0.18)";

  if (!isPhone) {
    return (
      <WtField
        icon="bank"
        value={scopeId}
        onChange={setScopeId}
        options={selectOptions}
        tone={onBar}
        fullWidth={false}
        // Content-sized; minWidth keeps short names usable on the navy bar.
        minWidth={200}
        ariaLabel="Organization"
        sx={{
          "& .MuiOutlinedInput-root": { color: onBar, backgroundColor: onBarFill },
          "& .MuiSelect-icon": { color: onBarMuted },
        }}
      />
    );
  }

  return (
    <>
      <Box
        component="button"
        type="button"
        aria-label={`Organization: ${selectOptions.find((o) => o.value === scopeId)?.label ?? ""}. Change organization`}
        aria-haspopup="menu"
        aria-expanded={Boolean(anchor)}
        title="Organization"
        onClick={(e: React.MouseEvent<HTMLElement>) => setAnchor(e.currentTarget)}
        sx={{
          position: "relative",
          width: 44,
          minHeight: 36,
          display: "grid",
          placeItems: "center",
          border: 0,
          borderRadius: "10px",
          color: onBar,
          backgroundColor: scopedToOne || anchor ? onBarFillActive : "transparent",
          cursor: "pointer",
          "&:focus-visible": { outline: `2px solid ${onBarMuted}`, outlineOffset: "-2px" },
        }}
      >
        <AppIcon name="bank" className="fs-3" />
        {scopedToOne && (
          <Box component="span" sx={{ position: "absolute", top: 7, right: 7, width: 7, height: 7, borderRadius: "50%", bgcolor: "background.paper" }} />
        )}
      </Box>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { sx: { mt: 0.75, minWidth: 220, borderRadius: "12px" } } }}
      >
        {selectOptions.map((option) => {
          const selected = option.value === scopeId;
          return (
            <MenuItem
              key={option.value}
              selected={selected}
              onClick={() => { setAnchor(null); setScopeId(option.value); }}
              sx={{
                minHeight: 44, gap: 1, fontSize: 14,
                fontWeight: selected ? 700 : 500,
                color: selected ? "primary.main" : "text.primary",
                "&.Mui-selected": { backgroundColor: "action.selected" },
                "&.Mui-selected:hover": { backgroundColor: "action.hover" },
              }}
            >
              <Box component="span" sx={{ flex: 1 }}>{option.label}</Box>
              {selected && (
                <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
              )}
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
}

export default ModuleOrgFilter;
