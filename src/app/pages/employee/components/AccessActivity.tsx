import React from "react";
import { Box } from "@mui/material";
import type { SvgIconComponent } from "@mui/icons-material";
import EditOutlined from "@mui/icons-material/EditOutlined";
import BlockRounded from "@mui/icons-material/BlockRounded";
import RestartAltRounded from "@mui/icons-material/RestartAltRounded";
import BadgeOutlined from "@mui/icons-material/BadgeOutlined";
import TuneRounded from "@mui/icons-material/TuneRounded";
import TravelExploreOutlined from "@mui/icons-material/TravelExploreOutlined";
import HistoryRounded from "@mui/icons-material/HistoryRounded";
import { T, WtTooltip } from "@app/modules/common/components/ui";
import { AREA_LABELS } from "@utils/accessAreas";
import { SECTION_TABS } from "@utils/sectionTabs";
import { getAvatar } from "@utils/avatar";
import { formatDate, formatDateTime } from "@utils/dateFormats";

/**
 * Recent access changes for one person, as a readable feed: what changed, in words ("Companies ·
 * Can edit", "Leads · Configure tab off"), who did it and how long ago. Reads the RBAC audit rows
 * the access endpoints write (targetType "employee").
 */

interface Entry { Icon: SvgIconComponent; tone: string; subject: string; change: string }

const parse = (v: unknown): any => {
  if (!v) return null;
  if (typeof v === "string") { try { return JSON.parse(v); } catch { return null; } }
  return v;
};

const sectionName = (key?: string) => (key ? AREA_LABELS[key] ?? key : "Access");

const describe = (log: any): Entry => {
  const action: string = log.action || "";
  const v = parse(log.newValue) || parse(log.oldValue) || {};
  const key: string = log.permissionKey || "";

  if (action.startsWith("ROLE") && Array.isArray(v)) {
    return { Icon: BadgeOutlined, tone: T.color.success, subject: "Roles", change: v.length ? v.map((r: any) => r.name).filter(Boolean).join(", ") : "All roles removed" };
  }
  if (v.tab) {
    const tab = SECTION_TABS[v.section]?.find((t) => t.key === v.tab)?.label ?? v.tab;
    const change = v.allowed === null ? `${tab} tab follows role` : `${tab} tab ${v.allowed ? "on" : "off"}`;
    return { Icon: v.allowed === null ? RestartAltRounded : TuneRounded, tone: v.allowed === null ? "#64748B" : T.color.warning, subject: sectionName(v.section), change };
  }
  if (key.includes(" records ")) {
    const section = key.split(" records ")[0];
    const change = key.split("→").pop()?.trim().replace(/^read all/, "Read all").replace(", commercials", " · Commercials") ?? "";
    return { Icon: TravelExploreOutlined, tone: T.color.indigo, subject: sectionName(section), change: change === "default" ? "Reset to default" : change };
  }
  const level: string | undefined = v.level;
  if (!level || level === "default" || action.endsWith("DELETED")) {
    return { Icon: RestartAltRounded, tone: "#64748B", subject: sectionName(v.section), change: "Reset to role" };
  }
  if (level === "blocked") return { Icon: BlockRounded, tone: T.color.danger, subject: sectionName(v.section), change: "Blocked" };
  return { Icon: EditOutlined, tone: T.color.brand, subject: sectionName(v.section), change: level === "edit" ? "Can edit" : "View only" };
};

const ago = (iso?: string | null) => {
  if (!iso) return "";
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)}d ago`;
  return formatDate(iso);
};
const exact = (iso?: string | null) => (iso ? formatDateTime(iso) : "");

// A fixed-height panel: the header stays put and only the list scrolls inside it — it never pins
// to the page or follows the page's scroll.
const PANEL_HEIGHT = 560;

const AccessActivity: React.FC<{ logs: any[] }> = ({ logs }) => (
  <Box sx={{ height: { xs: "auto", xl: PANEL_HEIGHT }, maxHeight: PANEL_HEIGHT, display: "flex", flexDirection: "column", borderRadius: "14px", border: "1px solid", borderColor: "divider", bgcolor: "background.paper", overflow: "hidden" }}>
    <Box sx={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 1, px: 2, py: 1.5, borderBottom: "1px solid", borderColor: "divider" }}>
      <HistoryRounded sx={{ fontSize: 18, color: "text.secondary" }} />
      <Box sx={{ fontWeight: 700, fontSize: 13.5, color: "text.primary" }}>Recent changes</Box>
      {logs.length > 0 && (
        <Box component="span" sx={{ ml: "auto", fontSize: 11, fontWeight: 600, color: "text.secondary", bgcolor: "action.hover", borderRadius: 999, px: 1, py: "1px" }}>{logs.length}</Box>
      )}
    </Box>

    {logs.length === 0 ? (
      <Box sx={{ px: 2, py: 3, fontSize: 12.5, color: "text.secondary", textAlign: "center" }}>No changes recorded yet.</Box>
    ) : (
      <Box sx={{
        flex: 1, minHeight: 0, overflowY: "auto", overscrollBehavior: "contain", py: 0.5,
        scrollbarWidth: "thin", scrollbarColor: "rgba(100,116,139,0.35) transparent",
        "&::-webkit-scrollbar": { width: 6 },
        "&::-webkit-scrollbar-thumb": { bgcolor: "rgba(100,116,139,0.35)", borderRadius: 3 },
      }}>
        {logs.slice(0, 25).map((log) => {
          const { Icon, tone, subject, change } = describe(log);
          const actor = log.actorName && log.actorName !== "System" ? log.actorName : "System";
          return (
            <Box key={log.id} sx={{ display: "flex", gap: 1.25, px: 2, py: 1.1, "&:hover": { bgcolor: "action.hover" } }}>
              <Box sx={{ width: 30, height: 30, flexShrink: 0, borderRadius: "9px", display: "grid", placeItems: "center", color: tone, bgcolor: `${tone}14`, border: `1px solid ${tone}33` }}>
                <Icon sx={{ fontSize: 16 }} />
              </Box>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.75, flexWrap: "wrap" }}>
                  <Box component="span" sx={{ fontWeight: 600, fontSize: 13, color: "text.primary" }}>{subject}</Box>
                  <Box component="span" sx={{ fontSize: 11.5, fontWeight: 600, color: tone, bgcolor: `${tone}12`, borderRadius: "6px", px: 0.75, py: "1px" }}>{change}</Box>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mt: 0.4, fontSize: 11.5, color: "text.secondary", minWidth: 0 }}>
                  {actor !== "System" && (
                    <img src={getAvatar(log.actorAvatar, (log.actorGender ?? 0) as 0 | 1 | 2)} alt="" style={{ width: 16, height: 16, borderRadius: "50%", objectFit: "cover" }} />
                  )}
                  <Box component="span" sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{actor}</Box>
                  <span>·</span>
                  <WtTooltip title={exact(log.createdAt)}>
                    <Box component="span" sx={{ whiteSpace: "nowrap" }}>{ago(log.createdAt)}</Box>
                  </WtTooltip>
                </Box>
              </Box>
            </Box>
          );
        })}
      </Box>
    )}
  </Box>
);

export default AccessActivity;
