import React from "react";
import { Paper, Box, Stack, Typography } from "@mui/material";
import { PodiumEntry } from "./types";

/**
 * Tone map (accent + tint) keyed by module label — ported in spirit from the
 * salary module's `metricToneMap` (EmployeeDetailsCard.tsx). Falls back to a
 * neutral blue for unknown labels.
 */
const TONES: Array<{ color: string; iconBg: string }> = [
  { color: "#3b82f6", iconBg: "#eff6ff" }, // blue
  { color: "#8b5cf6", iconBg: "#f5f3ff" }, // violet
  { color: "#06b6d4", iconBg: "#ecfeff" }, // cyan
  { color: "#f97316", iconBg: "#fff7ed" }, // orange
  { color: "#22c55e", iconBg: "#f0fdf4" }, // green
  { color: "#e11d48", iconBg: "#fff1f2" }, // rose
  { color: "#f59e0b", iconBg: "#fffbeb" }, // amber
  { color: "#6366f1", iconBg: "#eef2ff" }, // indigo
];

const TONE_BY_LABEL: Record<string, { color: string; iconBg: string }> = {
  attendance: TONES[0],
  leaves: TONES[1],
  projects: TONES[2],
  tasks: TONES[3],
  sale: TONES[4],
  target: TONES[5],
  performance: TONES[6],
  "ratings & reviews": TONES[7],
};

function toneFor(label: string) {
  return TONE_BY_LABEL[label?.toLowerCase()?.trim()] ?? TONES[0];
}

export interface ModuleChampionCardProps {
  item: { icon: string; label: string };
  emp: PodiumEntry | null;
}

/**
 * "Top Performers By Modules" tile, restyled with the salary KpiCard look:
 * MUI Paper, 16px radius, soft dual shadow, hover lift, a 4px left accent bar and
 * a tinted icon badge. Shows the module's champion (avatar + name + score).
 */
export const ModuleChampionCard: React.FC<ModuleChampionCardProps> = ({ item, emp }) => {
  const tone = toneFor(item.label);
  return (
    <Paper
      elevation={0}
      sx={{
        height: "100%",
        borderRadius: "16px",
        border: "1px solid #f0f0f0",
        background: "#ffffff",
        overflow: "hidden",
        position: "relative",
        transition: "box-shadow 220ms ease, transform 220ms ease",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.05)",
        "&:hover": {
          transform: "translateY(-3px)",
          boxShadow: "0 4px 8px rgba(0,0,0,0.06), 0 12px 24px rgba(0,0,0,0.08)",
        },
      }}
    >
      {/* Left accent bar */}
      <Box
        sx={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: "4px",
          background: tone.color,
          borderRadius: "16px 0 0 16px",
        }}
      />

      <Box sx={{ p: "15px 18px 15px 22px" }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1.5}>
          {/* Module label + icon */}
          <Stack direction="row" alignItems="center" gap={1.5} sx={{ minWidth: 0 }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: "12px",
                display: "grid",
                placeItems: "center",
                backgroundColor: tone.iconBg,
                flexShrink: 0,
              }}
            >
              <img src={item.icon} alt={item.label} style={{ width: 22, height: 22 }} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography
                sx={{
                  fontSize: "0.92rem",
                  fontWeight: 700,
                  color: "#1B1B2F",
                  lineHeight: 1.2,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {item.label}
              </Typography>
              <Typography sx={{ fontSize: "0.68rem", fontWeight: 600, color: "#94a3b8", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                Top Performer
              </Typography>
            </Box>
          </Stack>

          {/* Champion */}
          {emp ? (
            <Stack direction="row" alignItems="center" gap={1.25} sx={{ minWidth: 0, flexShrink: 0 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  overflow: "hidden",
                  background: "#F5F8FA",
                  border: "2px solid #fff",
                  boxShadow: `0 0 0 2px ${tone.iconBg}, 0 2px 6px rgba(0,0,0,0.12)`,
                  flexShrink: 0,
                }}
              >
                <img src={emp.avatar} alt={emp.name} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              </Box>
              <Box sx={{ minWidth: 0, textAlign: "right" }}>
                <Typography
                  sx={{
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    color: "#181C32",
                    lineHeight: 1.25,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    maxWidth: 120,
                  }}
                >
                  {emp.name}
                </Typography>
                <Typography sx={{ fontSize: "1.02rem", fontWeight: 800, color: tone.color, lineHeight: 1.2 }}>
                  {emp.score.toFixed(2)}
                </Typography>
              </Box>
            </Stack>
          ) : (
            <Typography
              sx={{
                fontSize: "0.72rem",
                color: "#b0bec5",
                fontWeight: 700,
                fontStyle: "italic",
                whiteSpace: "nowrap",
              }}
            >
              No leader yet
            </Typography>
          )}
        </Stack>
      </Box>
    </Paper>
  );
};

export default ModuleChampionCard;
