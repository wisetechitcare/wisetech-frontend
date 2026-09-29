import React from "react";
import { Box } from "@mui/material";
import RestartAltRounded from "@mui/icons-material/RestartAltRounded";
import TuneRounded from "@mui/icons-material/TuneRounded";
import { GlassDialog, GlassHeader, T, WtButton, WtSwitch, WtTooltip } from "@app/modules/common/components/ui";
import { navIcon } from "@components/navigation/NavContainers/navIcons";
import { SECTION_TABS, tabKey } from "@utils/sectionTabs";
import type { AccessLayoutNode } from "@utils/accessSidebarLayout";
import type { EffLevel, TabControls } from "./accessControlTypes";

/**
 * A card whose tabs are sections of their own (KPI): each tab's switch sets that section — on at the
 * card's level (Configure needs Write), off = no access.
 */
export interface CompositeTabs {
  children: AccessLayoutNode[];
  levels: Record<string, EffLevel>;
  onSetLevel: (module: string, level: EffLevel) => void;
}

interface Props {
  open: boolean;
  onClose: () => void;
  section: string;
  label: string;
  /** The section's sidebar icon (bootstrap-icon name). */
  icon: string;
  /** The person's / role's level on the section: a tab can't open beyond it. */
  level: EffLevel;
  /** Tabs of one section (Leads …), stored as `<section>/<tab>` — or … */
  tabs?: TabControls;
  /** … tabs that are sections themselves (KPI). */
  composite?: CompositeTabs;
  readOnly?: boolean;
}

interface Row {
  key: string;
  label: string;
  icon: string;
  hint: string;
  needsWrite: boolean;
  reachable: boolean;
  on: boolean;
  custom?: boolean;
  toggle: () => void;
  reset?: () => void;
}

// One list for the dialog and the button's "n off" count, whichever kind of tabs the card has.
const rowsFor = ({ section, level, tabs, composite }: Pick<Props, "section" | "level" | "tabs" | "composite">): Row[] => {
  if (composite) {
    return composite.children.map((c) => {
      const needsWrite = c.module.endsWith(".configure");
      const reachable = needsWrite ? level === "edit" : level !== "none";
      const on = (composite.levels[c.module] || "none") !== "none";
      return {
        key: c.module, label: c.label, icon: c.icon, hint: c.hint ?? "", needsWrite, reachable, on,
        toggle: () => composite.onSetLevel(c.module, on ? "none" : needsWrite || level === "edit" ? "edit" : "view"),
      };
    });
  }
  return (SECTION_TABS[section] ?? []).map((t) => {
    const key = tabKey(section, t.key);
    const needsWrite = !!t.needsWrite;
    const reachable = needsWrite ? level === "edit" : level !== "none";
    const on = reachable && !tabs?.denied.has(key);
    return {
      key, label: t.label, icon: t.icon, hint: t.hint, needsWrite, reachable, on, custom: tabs?.custom?.has(key),
      toggle: () => tabs?.onSet(key, !on),
      reset: () => tabs?.onSet(key, null),
    };
  });
};

/**
 * Access → Advanced for one section: which of its tabs this person (or role) gets. Every tab follows
 * the section unless turned off here — so someone can enter data in Leads with Write while
 * Configure, where its statuses and settings live, stays closed. Changes are staged with the rest
 * of the page and applied on Save.
 */
const AccessTabsDialog: React.FC<Props> = ({ open, onClose, label, icon, readOnly, ...rest }) => {
  const SectionIcon = navIcon(icon);
  const rows = rowsFor(rest);
  return (
    <GlassDialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      plain
      header={
        <GlassHeader
          title={`${label} tabs`}
          subtitle="Choose which tabs of this section are available. Everything else in the section stays as set."
          onClose={onClose}
          icon={<SectionIcon sx={{ fontSize: 22, color: "#fff" }} />}
        />
      }
    >
      <Box sx={{ px: { xs: 2, sm: 3 }, py: 2, display: "flex", flexDirection: "column", gap: 1 }}>
        {rows.map((r) => {
          const TabIcon = navIcon(r.icon);
          return (
            <Box
              key={r.key}
              sx={{
                display: "flex", alignItems: "center", gap: 1.5, p: 1.5, borderRadius: "14px",
                border: "1px solid", borderColor: r.on ? "rgba(63,91,217,0.28)" : "divider",
                bgcolor: r.on ? "rgba(63,91,217,0.04)" : "transparent",
                transition: "border-color .15s ease, background .15s ease",
              }}
            >
              <Box sx={{ width: 38, height: 38, borderRadius: "11px", display: "grid", placeItems: "center", flexShrink: 0, bgcolor: r.on ? "rgba(63,91,217,0.12)" : "action.hover", color: r.on ? "#2A3F9E" : "text.disabled" }}>
                <TabIcon sx={{ fontSize: 19 }} />
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Box sx={{ fontWeight: 600, fontSize: 14, color: "text.primary" }}>{r.label}</Box>
                  <Box component="span" sx={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase", px: 0.75, py: "1px", borderRadius: "6px", color: r.needsWrite ? "#0B7A69" : "#2A3F9E", bgcolor: r.needsWrite ? "rgba(20,163,139,0.1)" : "rgba(63,91,217,0.1)" }}>
                    Needs {r.needsWrite ? "Write" : "Read"}
                  </Box>
                  {r.custom && (
                    <Box component="span" sx={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase", color: "primary.main", bgcolor: "action.selected", borderRadius: 999, px: 0.75 }}>Custom</Box>
                  )}
                </Box>
                <Box sx={{ fontSize: 12, color: "text.secondary", mt: 0.25 }}>
                  {r.reachable ? r.hint : `Give ${r.needsWrite ? "Write" : "Read"} on ${label} first.`}
                </Box>
              </Box>
              {r.custom && r.reset && !readOnly && (
                <WtTooltip title="Follow their roles again">
                  <Box component="button" type="button" aria-label={`Reset ${r.label} to role`} onClick={r.reset}
                    sx={{ border: "none", bgcolor: "transparent", color: "text.secondary", cursor: "pointer", p: 0.5, borderRadius: "8px", display: "inline-flex", "&:hover": { bgcolor: "action.hover", color: "text.primary" } }}>
                    <RestartAltRounded sx={{ fontSize: 18 }} />
                  </Box>
                </WtTooltip>
              )}
              <WtSwitch
                checked={r.on}
                disabled={readOnly || (!r.reachable && !r.on)}
                onChange={r.toggle}
                inputProps={{ "aria-label": `${r.label} tab` }}
                tone="#2A3F9E"
              />
            </Box>
          );
        })}
      </Box>
      <Box sx={{ px: { xs: 2, sm: 3 }, pb: 2.5, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
        <Box sx={{ fontSize: 12, color: "text.secondary" }}>Applied when you save the page.</Box>
        <WtButton onClick={onClose}>Done</WtButton>
      </Box>
    </GlassDialog>
  );
};

/**
 * The "Advanced" control a section with tabs carries, in both the table and the cards: shows how
 * many of its tabs are off, and opens the dialog above.
 */
export const AdvancedTabsButton: React.FC<Omit<Props, "open" | "onClose"> & { compact?: boolean }> = ({ compact, ...props }) => {
  const [open, setOpen] = React.useState(false);
  const off = rowsFor(props).filter((r) => r.reachable && !r.on).length;
  const tip = `Advanced — choose which ${props.label} tabs are available${off ? ` (${off} off)` : ""}`;
  return (
    <>
      <WtTooltip title={tip}>
        {compact ? (
          // Cards: the same tinted square as the permission toggles, with a count when tabs are off.
          <Box
            component="button"
            type="button"
            onClick={() => setOpen(true)}
            aria-label={tip}
            sx={{
              position: "relative", width: 28, height: 28, display: "grid", placeItems: "center", borderRadius: "8px",
              border: "1px solid", borderColor: off ? `${T.color.warning}5C` : "#64748B3D",
              bgcolor: off ? `${T.color.warning}1F` : "#64748B12", color: off ? T.color.warning : "#64748B", cursor: "pointer",
              transition: "border-color .2s ease, color .2s ease",
              "&:hover": { borderColor: `${T.color.brand}66`, color: T.color.brand },
            }}
          >
            <TuneRounded sx={{ fontSize: 16 }} />
            {off > 0 && (
              <Box component="span" sx={{ position: "absolute", top: -5, right: -5, minWidth: 14, height: 14, px: "3px", borderRadius: 999, bgcolor: T.color.warning, color: "#fff", fontSize: 9, fontWeight: 700, lineHeight: "14px", textAlign: "center" }}>
                {off}
              </Box>
            )}
          </Box>
        ) : (
          <Box
            component="button"
            type="button"
            onClick={() => setOpen(true)}
            aria-label={`Advanced: ${props.label} tabs`}
            sx={{
              display: "inline-flex", alignItems: "center", gap: 0.5, height: 26, px: 1, borderRadius: "8px",
              border: "1px solid", borderColor: off ? "rgba(168,116,26,0.35)" : "divider",
              bgcolor: off ? "rgba(212,161,58,0.1)" : "transparent",
              color: off ? "#8A5D12" : "text.secondary", fontSize: 11.5, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
              transition: "all .15s ease",
              "&:hover": { borderColor: "rgba(63,91,217,0.45)", color: "#2A3F9E" },
            }}
          >
            <TuneRounded sx={{ fontSize: 15 }} />
            Advanced{off ? ` · ${off} off` : ""}
          </Box>
        )}
      </WtTooltip>
      <AccessTabsDialog {...props} open={open} onClose={() => setOpen(false)} />
    </>
  );
};

/** A composite card's own level, from its tabs: Write if any tab has it, else Read if any does. */
export const compositeLevel = (children: AccessLayoutNode[], levels: Record<string, EffLevel>): EffLevel =>
  children.some((c) => levels[c.module] === "edit") ? "edit" : children.some((c) => (levels[c.module] || "none") !== "none") ? "view" : "none";

/** The card's Read / Write set every tab: on at that level (Configure only with Write), off = none. */
export const setCompositeLevel = (children: AccessLayoutNode[], level: EffLevel, onSetLevel: (m: string, l: EffLevel) => void) =>
  children.forEach((c) => onSetLevel(c.module, level === "none" ? "none" : c.module.endsWith(".configure") ? (level === "edit" ? "edit" : "none") : level));

export default AccessTabsDialog;
