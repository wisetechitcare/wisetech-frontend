import React from "react";
import { useNavigate } from "react-router-dom";
import { Box, keyframes } from "@mui/material";
import LockOutlined from "@mui/icons-material/LockOutlined";
import BoltRounded from "@mui/icons-material/BoltRounded";
import { T, WtButton } from "@app/modules/common/components/ui";
import { AREA_LABELS } from "@utils/accessAreas";

/**
 * The one "no access" screen — shown wherever a page can't be opened for lack of access: a section
 * the person doesn't have (or just lost: access updates live, so an admin revoking it swaps the page
 * for this one, and granting it swaps back), or a single record that isn't theirs.
 */

interface Props {
  /** Section key (e.g. "crm.leads") — named in the message. */
  section?: string;
  /** "record": one lead / project / employee that isn't theirs, rather than a whole section. */
  kind?: "section" | "record";
  title?: string;
  message?: string;
}

const pulse = keyframes`
  0%   { transform: scale(0.92); opacity: 0.55; }
  70%  { transform: scale(1.18); opacity: 0; }
  100% { transform: scale(1.18); opacity: 0; }
`;

const NoAccessPage: React.FC<Props> = ({ section, kind = "section", title, message }) => {
  const navigate = useNavigate();
  const name = section ? AREA_LABELS[section] ?? section : null;
  const heading = title ?? (kind === "record" ? "You don't have access to this record" : `You don't have access to ${name ?? "this page"}`);
  const body = message ?? (kind === "record"
    ? "It isn't assigned to you and you're not on its team, or it no longer exists. Ask an admin if you need it."
    : `Your role doesn't include ${name ?? "this page"}, or an admin has just changed your access. Ask an admin if you need it.`);

  return (
    <Box sx={{ minHeight: "62vh", display: "grid", placeItems: "center", px: 2, py: 6 }}>
      <Box
        role="alert"
        sx={{
          width: "100%", maxWidth: 520, textAlign: "center", px: { xs: 3, sm: 5 }, py: { xs: 4, sm: 5 },
          borderRadius: "22px", border: "1px solid", borderColor: "divider", bgcolor: "background.paper",
          boxShadow: "0 1px 2px rgba(16,24,40,0.04), 0 18px 40px -20px rgba(16,24,40,0.22)",
        }}
      >
        {/* Lock in layered rings; the outer ring breathes slowly. */}
        <Box sx={{ position: "relative", width: 104, height: 104, mx: "auto", mb: 3 }}>
          <Box sx={{
            position: "absolute", inset: 0, borderRadius: "50%", border: `2px solid ${T.color.brand}33`,
            animation: `${pulse} 2.8s ease-out infinite`,
            "@media (prefers-reduced-motion: reduce)": { animation: "none", opacity: 0.4 },
          }} />
          <Box sx={{ position: "absolute", inset: 10, borderRadius: "50%", bgcolor: `${T.color.brand}0D`, border: `1px solid ${T.color.brand}1F` }} />
          <Box sx={{
            position: "absolute", inset: 24, borderRadius: "50%", display: "grid", placeItems: "center",
            color: T.color.brand, bgcolor: `${T.color.brand}14`, border: `1px solid ${T.color.brand}33`,
          }}>
            <LockOutlined sx={{ fontSize: 30 }} />
          </Box>
        </Box>

        <Box component="span" sx={{
          display: "inline-block", mb: 1.5, px: 1.25, py: "3px", borderRadius: 999, fontSize: 11, fontWeight: 700,
          letterSpacing: 0.8, textTransform: "uppercase", color: "text.secondary", bgcolor: "action.hover", border: "1px solid", borderColor: "divider",
        }}>
          No access
        </Box>
        <Box component="h2" sx={{ m: 0, mb: 1, fontSize: { xs: 19, sm: 21 }, fontWeight: 700, color: "text.primary", lineHeight: 1.3 }}>
          {heading}
        </Box>
        <Box component="p" sx={{ m: 0, mx: "auto", maxWidth: 400, fontSize: 14, lineHeight: 1.6, color: "text.secondary" }}>
          {body}
        </Box>

        {kind === "section" && (
          <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.75, mt: 2.5, px: 1.5, py: 0.75, borderRadius: "10px", fontSize: 12.5, color: "text.secondary", bgcolor: "action.hover" }}>
            <BoltRounded sx={{ fontSize: 16, color: T.color.warning }} />
            This page opens by itself as soon as you're given access.
          </Box>
        )}

        <Box sx={{ display: "flex", justifyContent: "center", gap: 1.5, mt: 3.5, flexWrap: "wrap" }}>
          <WtButton ghost onClick={() => navigate(-1)}>Go back</WtButton>
          <WtButton flat onClick={() => navigate("/dashboard", { replace: true })}>Go to Dashboard</WtButton>
        </Box>
      </Box>
    </Box>
  );
};

export default NoAccessPage;
