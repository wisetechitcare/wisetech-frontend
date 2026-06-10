import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Col, Modal, Row } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "@redux/store";
import {
  cacheLeaderboard,
  cacheModuleChampions,
  cacheFactorRankings,
  cacheKpiFactors,
} from "@redux/slices/leaderboardCache";
import axios from "axios";
import SVG from "react-inlinesvg";
import { getAllKpiFactors } from "@services/employee";
import { fetchLeaderboard } from "@utils/statistics";
import { getAvatar } from "@utils/avatar";
import { EMPLOYEE } from "@constants/api-endpoint";
import { sortKpiFactors } from "@utils/kpiSort";
import { formatHours } from "./kpiUtils";
import CommonCard from "@app/modules/common/components/CommonCard";
import { maleIcons } from "@metronic/assets/sidepanelicons";
import { miscellaneousIcons } from "../../../../../_metronic/assets/miscellaneousicons";
import { getKpiBehavior, KpiBehavior, normalizeScoreSign } from "@utils/kpiBehavior";
import Skeleton from "@components/loaders/Skeleton";

const API_BASE_URL = import.meta.env.VITE_APP_WISE_TECH_BACKEND;

// ==============================
// CONSTANTS & STYLES
// ==============================

const STYLES = {
  factorCard: {
    padding: "20px 28px",
    borderRadius: "12px",
    boxShadow: "8px 8px 16px 0px rgba(0,0,0,0.04)",
    marginBottom: "20px",
    position: "relative" as const,
  },
  factorTitle: {
    color: "#000",
    fontFamily: "Barlow",
    fontSize: "16px",
    fontWeight: 600,
    letterSpacing: "0.16px",
  },
  viewAllBtn: {
    fontSize: "11px",
    fontWeight: 800,
    borderRadius: "10px",
    padding: "6px 16px",
    backgroundColor: "white",
    boxShadow: "0px 2px 6px rgba(0,0,0,0.05)",
    textTransform: "uppercase" as const,
  },
  sectionHeader: {
    fontSize: "14px",
    fontWeight: 800,
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    marginBottom: "8px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  divider: {
    height: "1px",
    opacity: 0.2,
    marginBottom: "20px",
  },
  moduleItem: {
    backgroundColor: "#ffffff",
    borderRadius: "8px",
    border: "1.5px solid #D4DBE4",
    padding: "12px",
    height: "100%",
  },
};

const COLORS = {
  positive: { bg: "#eaf3de", title: "#1B8459", score: "#1B8459", accent: "#1B8459" },
  negative: { bg: "#fbecec", title: "#B51919", score: "#D9214E", accent: "#D9214E" },
  leaves: { accent: "#70829A" },
  gray: "#70829A",
  black: "#000000",
};

// Completion-state design tokens used in modal cards
const STATE = {
  success: {
    bg: "#EBFAE6",
    text: "#1B8459",
    border: "rgba(27,132,89,0.18)",
    shadow: "0 2px 8px rgba(27,132,89,0.08)",
  },
  danger: {
    bg: "#FAE8E6",
    text: "#D9214E",
    border: "rgba(217,33,78,0.18)",
    shadow: "0 2px 8px rgba(217,33,78,0.08)",
  },
  neutral: {
    bg: "#F5F8FA",
    text: "#5E6278",
    border: "#E4E6EF",
    shadow: "none",
  },
};

// Medal accent colors for rank 1-3 podium rows
const MEDAL: Record<number, { border: string; glow: string }> = {
  1: { border: "#FFD700", glow: "rgba(255,215,0,0.25)" },   // gold
  2: { border: "#A8A9AD", glow: "rgba(168,169,173,0.25)" }, // silver
  3: { border: "#CD7F32", glow: "rgba(205,127,50,0.25)" },  // bronze
};

// ==============================
// SAFE NORMALIZATION UTILS
// ==============================

const safeNumber = (value: any): number => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const safeString = (value: any): string =>
  typeof value === "string" ? value : String(value ?? "");

// ==============================
// FACTOR COLOR RULE â€” single source of truth for the leaderboard.
// Driven by the factor's BEHAVIOR (getKpiBehavior), so each kind colors right:
//   â€¢ MANDATORY  (Working Days, Total Working Hour, On Time Attendance)
//                  â†’ green when the target is met/exceeded (score â‰¥ maxScore).
//   â€¢ ACHIEVEMENT (Early CheckIn, Overtime, Extra Days)
//                  â†’ green if ANY value was earned (score > 0), else red.
//   â€¢ NEGATIVE / LEAVE (Late, Absent, Request, paid & unpaid leaves)
//                  â†’ green only at 0 (no violation), else red.
// `displayScore` must already be sign-normalized. The score NUMBER reuses this
// same state, so a red row always has a red number.
// ==============================
const resolveFactorColorState = (
  displayScore: number,
  maxScore: number | null,
  factorType?: string,
  factorName?: string
): "success" | "danger" => {
  const behavior = getKpiBehavior(factorName ?? "", factorType);
  const ms = safeNumber(maxScore);
  switch (behavior) {
    case KpiBehavior.NEGATIVE:
      return Math.abs(displayScore) < 0.005 ? "success" : "danger";
    case KpiBehavior.MANDATORY:
      return ms > 0 && displayScore >= ms - 0.005 ? "success" : "danger";
    default: // ACHIEVEMENT â€” any earned value is green
      return Math.abs(displayScore) > 0.005 ? "success" : "danger";
  }
};

// ==============================
// IS-COMPLETED HELPER
// Rule: if maxScore===0 AND maxValue===0 â†’ green/neutral (never red for 0/0)
// ==============================

const isCompleted = (
  score: number,
  maxScore: number | null,
  value: number | null,
  maxValue: number | null
): boolean => {
  const ms = safeNumber(maxScore);
  const mv = safeNumber(maxValue);
  if (ms === 0 && mv === 0) return true; // 0/0 is neutral â†’ green
  return (ms > 0 && score >= ms) || (mv > 0 && safeNumber(value) >= mv);
};

// ==============================
// CACHE KEY HELPER
// Produces "${startDate}_${endDate}_t${toggleChange}" so that admin toggle
// events always bust the cache for the affected period.
// ==============================

function makeCacheKey(startDate: string, endDate: string, toggleChange: any): string {
  return `${startDate}_${endDate}_t${toggleChange}`;
}

// ==============================
// MODULE-LEVEL PERFORMANCE CONSTANTS
// ==============================

// Static skeleton arrays â€” defined once at module scope so .map() never
// allocates a new array on each render pass.
const SKELETON_IDS_3 = [1, 2, 3] as const;
const SKELETON_IDS_5 = [1, 2, 3, 4, 5] as const;
const SKELETON_IDS_6 = [1, 2, 3, 4, 5, 6] as const;

// Stable empty-array fallback for factorRankingsMap look-ups.
// WHY: passing a literal `[]` at the call-site creates a new array reference
// on every render, breaking React.memo equality on FactorLeaderboardCard and
// causing it to re-render even when the factor data has not changed.
const EMPTY_RANKINGS: any[] = [];

// Pre-built accent stripe styles for the three Star-Employees sections.
// WHY: inline object literals create new references on every render, even
// though the values are static. Building them here means zero allocations
// in the render path.
const ACCENT_STRIPE: Record<string, React.CSSProperties> = {
  positive: { width: "4px", height: "18px", backgroundColor: COLORS.positive.accent, borderRadius: "2px" },
  negative: { width: "4px", height: "18px", backgroundColor: COLORS.negative.accent, borderRadius: "2px" },
  leaves: { width: "4px", height: "18px", backgroundColor: COLORS.leaves.accent, borderRadius: "2px" },
};

// Pre-built section divider styles â€” same reasoning as ACCENT_STRIPE above.
const SECTION_DIVIDER: Record<string, React.CSSProperties> = {
  positive: { ...STYLES.divider, backgroundColor: COLORS.positive.accent },
  negative: { ...STYLES.divider, backgroundColor: COLORS.negative.accent },
  leaves: { ...STYLES.divider, backgroundColor: COLORS.leaves.accent },
};

// ==============================
// METRIC LABEL UTILITY
// ==============================

function getMetricLabel(factor: any): string {
  const name: string = (factor?.name || "").toLowerCase();
  const unit: string = (factor?.unit || "").toLowerCase();
  if (name.includes("leave")) return "Leaves";
  if (name.includes("request")) return "Requests";
  if (
    unit === "hours" ||
    name.includes("hour") ||
    name.includes("overtime") ||
    name.includes("over time")
  )
    return "Hours";
  if (
    unit === "days" ||
    name.includes("day") ||
    name.includes("attendance") ||
    name.includes("checkin") ||
    name.includes("checkout") ||
    name.includes("check in") ||
    name.includes("check out") ||
    name.includes("extra")
  )
    return "Days";
  return "Value";
}

// ==============================
// LOCAL SKELETON COMPOSITIONS
// ==============================

const SkeletonEmployeeCard = ({
  size = "md",
  onTinted = false,
}: {
  size?: "sm" | "md" | "lg";
  onTinted?: boolean;
}) => {
  const imgSize = size === "sm" ? "40px" : "56px";
  return (
    <div className="d-flex flex-row align-items-center gap-2" style={{ minWidth: "140px" }}>
      <Skeleton width={imgSize} height={imgSize} borderRadius="50%" onTinted={onTinted} />
      <div className="d-flex flex-column gap-1 ms-2" style={{ flex: 1 }}>
        <Skeleton width="90px" height="14px" onTinted={onTinted} />
        <Skeleton width="60px" height="11px" onTinted={onTinted} />
      </div>
    </div>
  );
};

const SkeletonModuleItem = () => (
  <div
    style={{
      ...STYLES.moduleItem,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
    }}
  >
    <Skeleton width="100px" height="20px" />
    <SkeletonEmployeeCard size="sm" />
  </div>
);

const SkeletonFactorCard = () => (
  <div
    style={{
      ...STYLES.factorCard,
      background: "rgba(0,0,0,0.02)",
      border: "1px dashed rgba(0,0,0,0.05)",
    }}
  >
    <div className="d-flex justify-content-between align-items-center mb-4">
      <Skeleton width="150px" height="24px" />
      <Skeleton width="80px" height="28px" borderRadius="10px" />
    </div>
    <div className="d-flex flex-wrap gap-10 align-items-start">
      {[1, 2, 3].map((i) => (
        <SkeletonEmployeeCard key={i} onTinted />
      ))}
    </div>
  </div>
);

// ==============================
// RANK BADGE
// ==============================

const RankBadge = React.memo(
  ({ rank, size = 24, offset = -12 }: { rank: number; size?: number; offset?: number }) => (
    <span
      className="position-absolute top-100 start-100 translate-middle badge rounded-pill"
      style={{ zIndex: 1 }}
    >
      <SVG
        src={
          miscellaneousIcons[
          `StarEmployeeRank${rank}` as keyof typeof miscellaneousIcons
          ] || miscellaneousIcons.StarEmployeeRank1
        }
        style={{
          width: `${size}px`,
          height: `${size}px`,
          marginTop: `${offset}px`,
          marginLeft: `${offset}px`,
        }}
      />
    </span>
  )
);

// ==============================
// SCORE DISPLAY â€” inline preview cards
// ==============================

const ScoreDisplay = React.memo(
  ({
    value,
    maxValue,
    score,
    maxScore,
    isModule = false,
    factorName,
    factorType,
    customScoreColor,
    valueLabel = "Value",
  }: {
    value?: any;
    maxValue?: any;
    score: any;
    maxScore?: any;
    isModule?: boolean;
    customScoreColor?: string;
    valueLabel?: string;
    factorName?: string;
    factorType?: string;
  }) => {
    const scoreVal = safeNumber(score);
    const ms = safeNumber(maxScore);
    // Re-sign by live factor type for display/color (positive never shows "-").
    // Overall/module previews pass no factorType and keep their raw total.
    const displayScoreVal = factorType ? normalizeScoreSign(scoreVal, factorType) : scoreVal;

    // Resolve color state if not overridden. Uses the same factor rule as the
    // modal rows so the inline preview and "View All" never disagree.
    let resolvedColor = customScoreColor;
    if (!resolvedColor) {
      const state = factorType
        ? resolveFactorColorState(displayScoreVal, ms, factorType, factorName)
        : "success";
      resolvedColor = STATE[state].text;
    }

    const color = resolvedColor;
    return (
      <div style={{ display: "flex", flexDirection: "column" }}>
        {value !== null && value !== undefined && (
          <span style={{ fontSize: "11px", color: COLORS.gray, fontWeight: 500 }}>
            {valueLabel}: {valueLabel === "Hours"
              ? formatHours(safeNumber(value))
              : parseFloat(safeNumber(value).toFixed(2))
            }
            {valueLabel !== "Hours" && maxValue !== null && maxValue !== undefined && safeNumber(maxValue) !== 0 && (
              <span> / {maxValue}</span>
            )}
          </span>
        )}
        <span style={{ fontSize: isModule ? "14px" : "13px", fontWeight: "bold", color }}>
          {isModule ? "" : "Score: "}
          {displayScoreVal.toFixed(2)}
        </span>
      </div>
    );
  }
);

// ==============================
// SAFE AVATAR COMPONENT
// Purpose: Ensures full face visibility by using 'contain' and a subtle background fill.
// Prevents the aggressive forehead/chin cropping common with 'object-fit: cover'.
// ==============================

const SafeAvatar = React.memo(({
  src,
  alt,
  size,
  border = "2px solid white",
  shadow = "0 2px 6px rgba(0,0,0,0.12)",
  style = {}
}: {
  src: string;
  alt: string;
  size: string;
  border?: string;
  shadow?: string;
  style?: React.CSSProperties;
}) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: "50%",
      overflow: "hidden",
      backgroundColor: "#F5F8FA", // Subtle background for transparent/contain images
      border,
      boxShadow: shadow,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      ...style,
    }}
  >
    <img
      src={src}
      alt={alt}
      style={{
        width: "100%",
        height: "100%",
        objectFit: "contain", // Safer than 'cover' for headshots
        objectPosition: "center",
        display: "block",
      }}
    />
  </div>
));

// ==============================
// EMPLOYEE CARD â€” inline preview (page body, unchanged)
// ==============================

const EmployeeCard = React.memo(({ emp, rank, size = "md", scoreData }: any) => {
  const imgSize = size === "sm" ? "40px" : "56px";
  const nameSize = size === "sm" ? "12px" : "15px";
  return (
    <div className="d-flex flex-row align-items-center gap-2">
      <div className="position-relative" style={{ flexShrink: 0 }}>
        <SafeAvatar
          src={emp.avatar}
          alt={emp.name}
          size={imgSize}
        />
        {rank && (
          <RankBadge
            rank={rank}
            size={size === "sm" ? 24 : 28}
            offset={size === "sm" ? -12 : -14}
          />
        )}
      </div>
      <div className="d-flex flex-column ms-2">
        <span style={{ fontSize: nameSize, color: "black", fontWeight: 600 }}>{emp.name}</span>
        <ScoreDisplay {...scoreData} />
      </div>
    </div>
  );
});

// ==============================
// RANKING ROW â€” unified card used in ALL "View All" modals
//
// LEFT:   rank number / SVG badge (top 3)
// MIDDLE: avatar  |  name  |  value label (dynamic unit)
// RIGHT:  score / maxScore  +  "KPI Score" label
//
// Color: green = completed / neutral, red = not yet achieved
// Special: 0/0 â†’ green (never red)
// ==============================

interface RankingRowData {
  rank: number;
  name: string;
  avatar: string;
  score: number;
  maxScore: number | null;
  value: number | null;
  maxValue: number | null;
  valueLabel?: string;
  /** Overall mode: no value row shown (used for Top Performers modal) */
  overallMode?: boolean;
  factorName?: string;
  factorType?: string;
}

const RankingRow = React.memo(({ data }: { data: RankingRowData }) => {
  const {
    rank,
    name,
    avatar,
    score,
    maxScore,
    value,
    maxValue,
    valueLabel = "Value",
    overallMode = false,
    factorName,
    factorType,
  } = data;

  // â”€â”€ PERFORMANCE COLOR LOGIC (behavior-driven; see resolveFactorColorState) â”€â”€
  // Re-sign the score for display so a positive factor never shows "-" (and a
  // negative/leave factor always shows a penalty). Overall (Top Performers) rows
  // have no factor type and keep their raw total, which can legitimately be
  // negative; they retain the "â‰¥ 50% of total" interpretation.
  const ms = safeNumber(maxScore);
  const displayScore = factorType ? normalizeScoreSign(score, factorType) : score;
  const colorState: "success" | "danger" = factorType
    ? resolveFactorColorState(displayScore, maxScore, factorType, factorName)
    : ms > 0
      ? displayScore >= ms * 0.5
        ? "success"
        : "danger"
      : "success";
  const theme = STATE[colorState];

  const medal = MEDAL[rank] ?? null;
  const mv = safeNumber(maxValue);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "14px",
        padding: "14px 18px",
        borderRadius: "12px",
        backgroundColor: theme.bg,
        border: `1.5px solid ${medal ? medal.border : theme.border}`,
        boxShadow: medal
          ? `0 2px 12px ${medal.glow}, ${theme.shadow}`
          : theme.shadow,
        marginBottom: "10px",
        // Subtle left accent stripe for podium rows
        borderLeft: medal ? `4px solid ${medal.border}` : undefined,
      }}
    >
      {/* â”€â”€ Rank â”€â”€ */}
      <div style={{ minWidth: "36px", textAlign: "center", flexShrink: 0 }}>
        {rank <= 3 ? (
          <SVG
            src={
              miscellaneousIcons[
              `StarEmployeeRank${rank}` as keyof typeof miscellaneousIcons
              ] || miscellaneousIcons.StarEmployeeRank1
            }
            style={{ width: "32px", height: "32px" }}
          />
        ) : (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              backgroundColor: "#F5F8FA",
              fontSize: "13px",
              fontWeight: 800,
              color: COLORS.gray,
            }}
          >
            {rank}
          </span>
        )}
      </div>

      {/* â”€â”€ Avatar â”€â”€ */}
      <SafeAvatar
        src={avatar}
        alt={name}
        size="44px"
        border={medal ? `2.5px solid ${medal.border}` : "2px solid white"}
        shadow={medal ? `0 0 0 2px white, 0 2px 8px ${medal.glow}` : "0 2px 6px rgba(0,0,0,0.1)"}
      />

      {/* â”€â”€ Name + Value row â”€â”€ */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontWeight: 700,
            fontSize: "14px",
            color: "#181C32",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {name}
        </div>
        {!overallMode && value !== null && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "2px",
              marginTop: "3px",
              fontSize: "11px",
              fontWeight: 500,
              color: COLORS.gray,
              background: "rgba(255,255,255,0.6)",
              borderRadius: "6px",
              padding: "1px 6px",
            }}
          >
            <span>{valueLabel}:</span>
            <span style={{ fontWeight: 700, color: "#181C32" }}>
              {valueLabel === "Hours"
                ? formatHours(safeNumber(value))
                : parseFloat(safeNumber(value).toFixed(2))
              }
            </span>
            {valueLabel !== "Hours" && mv > 0 && (
              <span style={{ color: COLORS.gray, fontWeight: 400 }}>/ {mv}</span>
            )}
          </div>
        )}
      </div>

      {/* â”€â”€ Score â”€â”€ */}
      <div
        style={{
          flexShrink: 0,
          textAlign: "right",
          background: "rgba(255,255,255,0.55)",
          borderRadius: "10px",
          padding: "6px 12px",
          minWidth: "80px",
        }}
      >
        <div style={{ fontSize: "17px", fontWeight: 800, color: theme.text, lineHeight: 1.1 }}>
          {displayScore.toFixed(2)}
        </div>
        <div
          style={{
            fontSize: "9px",
            fontWeight: 700,
            color: COLORS.gray,
            textTransform: "uppercase",
            letterSpacing: "0.07em",
            marginTop: "2px",
          }}
        >
          KPI Score
        </div>
      </div>
    </div>
  );
});

// ==============================
// RANKING LEGEND â€” shown in both modal headers
// ==============================

// const RankingLegend = React.memo(() => (
//   <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
//     <span style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", color: COLORS.gray }}>
//       <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: STATE.success.text, display: "inline-block" }} />
//       Positive/Compliant
//     </span>
//     <span style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", color: COLORS.gray }}>
//       <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: STATE.danger.text, display: "inline-block" }} />
//       Violation/Non-compliant
//     </span>
//     <span style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", color: COLORS.gray }}>
//       <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: STATE.neutral.text, display: "inline-block" }} />
//       Neutral
//     </span>
//     {[1, 2, 3].map((r) => (
//       <span key={r} style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", color: COLORS.gray }}>
//         <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: MEDAL[r].border, display: "inline-block" }} />
//         {r === 1 ? "Gold" : r === 2 ? "Silver" : "Bronze"}
//       </span>
//     ))}
//   </div>
// ));

// ==============================
// FACTOR LEADERBOARD CARD â€” inline preview on page body
// ==============================

const FactorLeaderboardCard = React.memo(
  ({
    factor,
    rankings,
    loading,
    onViewAll,
  }: {
    factor: any;
    rankings: any[];
    loading: boolean;
    onViewAll: (factor: any, rankings: any[]) => void;
  }) => {
    if (!loading && (!rankings || rankings.length === 0)) return null;

    const factorType = (factor.type as string)?.toUpperCase();
    // Theme follows the live config type only: NEGATIVE/LEAVE use the red theme,
    // POSITIVE uses green. No name-based overrides.
    const isNegative = factorType === "NEGATIVE" || factorType === "LEAVE";
    const theme = isNegative ? COLORS.negative : COLORS.positive;
    const valueLabel = getMetricLabel(factor);

    return (
      <div style={{ ...STYLES.factorCard, background: theme.bg }}>
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div style={STYLES.factorTitle}>{factor.name}</div>
          <button
            className={`btn btn-sm ${isNegative ? "btn-outline-danger" : "btn-outline-success"}`}
            onClick={() => onViewAll(factor, rankings)}
            style={STYLES.viewAllBtn}
          >
            View All
          </button>
        </div>
        <div className="d-flex flex-wrap gap-10 align-items-start">
          {loading ? (
            [1, 2, 3].map((i) => <SkeletonEmployeeCard key={i} />)
          ) : (
            rankings.slice(0, 5).map((item, i) => {
              const firstName = safeString(item?.employee?.firstName);
              const lastName = safeString(item?.employee?.lastName);
              const avatarSrc =
                getAvatar(
                  safeString(item?.employee?.avatar),
                  item?.employee?.gender as 0 | 1 | 2
                ) || maleIcons.maleIcon?.default;
              return (
                <EmployeeCard
                  key={i}
                  emp={{ name: `${firstName} ${lastName}`.trim() || "-", avatar: avatarSrc }}
                  rank={i + 1}
                  scoreData={{
                    value: item?.value ?? null,
                    maxValue: item?.maxValue ?? null,
                    score: safeNumber(item?.score),
                    maxScore: item?.maxScore ?? null,
                    valueLabel,
                    factorName: factor.name,
                    factorType: factor.type,
                  }}
                />
              );
            })
          )}
        </div>
      </div>
    );
  }
);

// ==============================
// MAIN COMPONENT
// ==============================

// Legacy name-based leave detection â€” used as a fallback for factors that
// predate the LEAVE enum value (i.e. were created before the schema migration).
// New factors with type === "LEAVE" are detected by type first.
const LEAVE_FACTOR_NAMES = ["Total Paid Leaves Taken", "Total Unpaid Leaves Taken"];

const isLeave = (f: any): boolean =>
  (f.type as string)?.toUpperCase() === "LEAVE" || LEAVE_FACTOR_NAMES.includes(f.name);

function LeaderBoardCore({
  startDate,
  endDate,
  fromAdmin = false,
  resourseAndView,
  overviewData,
  isLoading = false,
}: any) {
  const toggleChange = useSelector((state: RootState) => state.attendanceStats.toggleChange);

  const dispatch = useDispatch<AppDispatch>();

  // â”€â”€ Redux cache selectors â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // WHY: Redux cache survives component unmounts and route changes within the
  // same session. When the user navigates away and back, these selectors return
  // the already-fetched data instantly â€” zero API calls, zero loading states.
  // The toggleChange suffix in every key ensures admin edits bust the cache.
  const reduxLbCache     = useSelector((state: RootState) => state.leaderboardCache.leaderboard);
  const reduxModCache    = useSelector((state: RootState) => state.leaderboardCache.moduleChampions);
  const reduxFactorCache = useSelector((state: RootState) => state.leaderboardCache.factorRankings);
  const reduxKpiFactors  = useSelector((state: RootState) => state.leaderboardCache.kpiFactors);
  const reduxKpiFactorsToggle = useSelector((state: RootState) => state.leaderboardCache.kpiFactorsToggle);

  const [showFactorModal, setShowFactorModal] = useState(false);
  const [selectedFactor, setSelectedFactor] = useState<any>(null);
  const [selectedFactorRankings, setSelectedFactorRankings] = useState<any[]>([]);
  const [showAllOverAllEmployeeByScore, setShowAllOverAllEmployeeByScore] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);

  // Granular loading states â€” each section renders independently
  const [topFiveLoading, setTopFiveLoading] = useState(true);
  const [modulesLoading, setModulesLoading] = useState(true);
  const [factorsLoading, setFactorsLoading] = useState(true);

  const [topFive, setTopFive] = useState<any[]>([]);
  const [allEmployeesByScore, setAllEmployeesByScore] = useState<any[]>([]);
  const [moduleChampions, setModuleChampions] = useState<any[]>([]);
  const [allKPIFactors, setAllKPIFactors] = useState<any[]>([]);
  const [factorRankingsMap, setFactorRankingsMap] = useState<Record<string, any[]>>({});

  // Stable formatted date strings â€” never use dayjs objects in deps or API calls
  const startDateStr = startDate?.format("YYYY-MM-DD") ?? "";
  const endDateStr = endDate?.format("YYYY-MM-DD") ?? "";

  const getEmployeeAvatar = useCallback((avatar: string | undefined, gender: number | undefined) => {
    const url = getAvatar(avatar || "", gender as 0 | 1 | 2);
    return url && url.trim() !== "" ? url : maleIcons.maleIcon?.default;
  }, []);

  // â”€â”€ Dedicated normalizers â€” each API returns a different schema â”€â”€
  // maxTotal is NEVER used here; KPI denominator comes exclusively from maxScore.

  const normalizeLeaderboardEmployee = useCallback(
    (emp: any = {}) => {
      const firstName = safeString(
        emp?.employee?.users?.firstName || emp?.employee?.firstName || emp?.firstName || ""
      );
      const lastName = safeString(
        emp?.employee?.users?.lastName || emp?.employee?.lastName || emp?.lastName || ""
      );
      const avatar = safeString(emp?.employee?.avatar || emp?.avatar || "");
      const gender = emp?.employee?.gender ?? emp?.gender ?? 0;
      const score = safeNumber(emp?.totalScore ?? emp?.score ?? 0);
      const maxScoreRaw = emp?.maxScore ?? null;
      const valueRaw = emp?.value ?? null;
      const maxValueRaw = emp?.maxValue ?? null;
      return {
        name: `${firstName} ${lastName}`.trim() || "-",
        avatar: getEmployeeAvatar(avatar, gender),
        score,
        maxScore: maxScoreRaw !== null ? safeNumber(maxScoreRaw) : null,
        value: valueRaw !== null ? safeNumber(valueRaw) : null,
        maxValue: maxValueRaw !== null ? safeNumber(maxValueRaw) : null,
      };
    },
    [getEmployeeAvatar]
  );

  // normalizeModuleEmployee removed â€” it was byte-for-byte identical to
  // normalizeLeaderboardEmployee. All module champion look-ups now use
  // normalizeLeaderboardEmployee directly, eliminating a redundant useCallback.

  const normalizeFactorEmployee = useCallback(
    (item: any = {}) => {
      const emp = item?.employee || {};
      const avatar =
        getAvatar(safeString(emp.avatar), emp.gender as 0 | 1 | 2) ||
        maleIcons.maleIcon?.default;
      return {
        name: `${safeString(emp.firstName)} ${safeString(emp.lastName)}`.trim() || "-",
        avatar,
        score: safeNumber(item?.score),
        maxScore: item?.maxScore != null ? safeNumber(item.maxScore) : null,
        value: item?.value != null ? safeNumber(item.value) : null,
        maxValue: item?.maxValue != null ? safeNumber(item.maxValue) : null,
      };
    },
    []
  );

  // â”€â”€ 1. KPI Factors (cached in Redux per toggle generation) â”€â”€
  // Hydrates from Redux when the cached factors belong to the CURRENT toggle
  // generation. When an admin edits KPI config (KpiSettings), toggleChange is
  // bumped â€” the cached toggle no longer matches, so we refetch the definitions
  // and type / weightage / active changes reflect instantly without a reload.
  useEffect(() => {
    if (reduxKpiFactors && reduxKpiFactorsToggle === toggleChange) {
      // Redux hit for this toggle generation â€” hydrate instantly, no request
      setAllKPIFactors(reduxKpiFactors);
      return;
    }
    getAllKpiFactors()
      .then((res) => {
        const factors = res?.data?.factors || [];
        dispatch(cacheKpiFactors({ factors, toggle: toggleChange })); // persist for this generation
        setAllKPIFactors(factors);
      })
      .catch((e) => console.error("KPI Factors fetch failed:", e));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toggleChange]); // refetch when admin edits bump the toggle; redux read from closure

  // â”€â”€ 2. Leaderboard (top 5 + full list) â”€â”€
  useEffect(() => {
    if (!startDateStr || !endDateStr) return;
    const controller = new AbortController();
    // toggleChange in key ensures admin edits bust the cache for this period
    const key = makeCacheKey(startDateStr, endDateStr, toggleChange);
    const load = async () => {
      const cached = reduxLbCache[key]; // read Redux at effect-invocation time
      if (cached) {
        // Redux hit â€” instant hydration, no network request
        setTopFive(cached.topFive);
        setAllEmployeesByScore(cached.fullList);
        setTopFiveLoading(false);
        return;
      }
      try {
        setTopFiveLoading(true);
        const lbData = await fetchLeaderboard(startDateStr, endDateStr, controller.signal);
        const result = { topFive: lbData?.topFive || [], fullList: lbData?.fullList || [] };
        dispatch(cacheLeaderboard({ key, ...result })); // persist to Redux
        setTopFive(result.topFive);
        setAllEmployeesByScore(result.fullList);
      } catch (e: any) {
        if (e?.name !== "CanceledError" && e?.name !== "AbortError")
          console.error("Leaderboard API Failed:", e);
      } finally {
        if (!controller.signal.aborted) setTopFiveLoading(false);
      }
    };
    load();
    return () => controller.abort();
  }, [startDateStr, endDateStr, toggleChange]); // reduxLbCache read at closure time, not as dep

  // â”€â”€ 3. Module champions â”€â”€
  useEffect(() => {
    if (!startDateStr || !endDateStr) return;
    const controller = new AbortController();
    const key = makeCacheKey(startDateStr, endDateStr, toggleChange);
    const load = async () => {
      const cached = reduxModCache[key]; // read Redux at effect-invocation time
      if (cached) {
        setModuleChampions(cached);
        setModulesLoading(false);
        return;
      }
      try {
        setModulesLoading(true);
        const res = await axios.get(
          `${API_BASE_URL}/${EMPLOYEE.GET_ALL_STAR_EMPLOYEES_BY_EACH_FACTOR}`,
          { params: { startDate: startDateStr, endDate: endDateStr }, signal: controller.signal }
        );
        const result = res.data?.data || res.data?.result || [];
        dispatch(cacheModuleChampions({ key, data: result })); // persist to Redux
        setModuleChampions(result);
      } catch (e: any) {
        if (!axios.isCancel(e)) console.error("Modules API Failed:", e);
      } finally {
        if (!controller.signal.aborted) setModulesLoading(false);
      }
    };
    load();
    return () => controller.abort();
  }, [startDateStr, endDateStr, toggleChange]); // reduxModCache read at closure time, not as dep

  // â”€â”€ 4. Factor rankings â€” consolidated batch call â”€â”€
  useEffect(() => {
    if (!allKPIFactors.length || !startDateStr || !endDateStr) return;
    const key = makeCacheKey(startDateStr, endDateStr, toggleChange);
    const cached = reduxFactorCache[key];
    if (cached) {
      setFactorRankingsMap(cached);
      setFactorsLoading(false);
      return;
    }
    const controller = new AbortController();
    setFactorsLoading(true);

    // 🔥 BATCH OPTIMIZATION: One call to get ALL factor rankings
    const loadFactors = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/employee/kpi/top-employees-by-factor`, {
          params: { startDate: startDateStr, endDate: endDateStr },
          signal: controller.signal,
        });

        const factorData = res.data?.data || [];
        const map: Record<string, any[]> = {};
        
        factorData.forEach((item: any) => {
          map[item.factorId] = item.rankings || [];
        });

        if (!controller.signal.aborted) {
          dispatch(cacheFactorRankings({ key, map }));
          setFactorRankingsMap(map);
        }
      } catch (e: any) {
        if (!axios.isCancel(e)) {
          console.error("Batch Factor Rankings Failed:", e);
          // Optional: Add retry logic here if needed, but the backend is now much faster
        }
      } finally {
        if (!controller.signal.aborted) setFactorsLoading(false);
      }
    };

    loadFactors();
    return () => controller.abort();
  }, [allKPIFactors, startDateStr, endDateStr, toggleChange]);

  const handleViewAllFactor = useCallback((factor: any, rankings: any[]) => {
    setSelectedFactor(factor);
    setSelectedFactorRankings(rankings);
    setShowFactorModal(true);
  }, []);

  // â”€â”€ Factor grouping â”€â”€
  // Order on page: Positive â†’ Negative â†’ Leaves
  // Leaves = only LEAVE_FACTOR_NAMES, never bleeds into Positive/Negative
  const factorsGroups = useMemo(() => {
    const arr = Array.isArray(allKPIFactors) ? allKPIFactors : [];
    return {
      positive: sortKpiFactors(
        arr.filter((f: any) => (f.type as string)?.toUpperCase() === "POSITIVE" && !isLeave(f)),
        (f) => f.name
      ),
      negative: sortKpiFactors(
        arr.filter((f: any) => (f.type as string)?.toUpperCase() === "NEGATIVE" && !isLeave(f)),
        (f) => f.name
      ),
      leave: sortKpiFactors(
        arr.filter(isLeave),
        (f) => f.name
      ),
    };
  }, [allKPIFactors]);

  // â”€â”€ Pre-build RankingRow data for modals â”€â”€

  const overallRankingRows: RankingRowData[] = useMemo(
    () => {
      // Lazy: skip normalization of potentially 100+ rows until the modal is open.
      // WHY: on every date change allEmployeesByScore updates, which would trigger
      // normalizing the full employee list synchronously on the render thread â€” even
      // when the modal is closed and no user sees the result. With this guard, that
      // O(n) work is deferred until the user actually clicks "View All".
      if (!showAllOverAllEmployeeByScore) return [];
      return allEmployeesByScore.map((emp, i) => {
        const n = normalizeLeaderboardEmployee(emp);
        return {
          rank: i + 1,
          name: n.name,
          avatar: n.avatar,
          score: n.score,
          maxScore: n.maxScore,
          value: n.value,
          maxValue: n.maxValue,
          overallMode: true, // Top Performers modal: show score only, no value row
        };
      });
    },
    [showAllOverAllEmployeeByScore, allEmployeesByScore, normalizeLeaderboardEmployee]
  );

  const factorRankingRows: RankingRowData[] = useMemo(() => {
    const valueLabel = getMetricLabel(selectedFactor);
    return (selectedFactorRankings || []).map((item, i) => {
      const n = normalizeFactorEmployee(item);
      return {
        rank: i + 1,
        name: n.name,
        avatar: n.avatar,
        score: n.score,
        maxScore: n.maxScore,
        value: n.value,
        maxValue: n.maxValue,
        valueLabel,
        overallMode: false,
        factorName: selectedFactor?.name,
        factorType: selectedFactor?.type,
      };
    });
  }, [selectedFactorRankings, selectedFactor, normalizeFactorEmployee]);

  // â”€â”€ Pre-normalized top-five for inline render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // WHY: without this, normalizeLeaderboardEmployee() runs for every employee
  // on every render even when topFive hasn't changed (e.g. a modal opens).
  // useMemo ensures normalization only reruns when the topFive array changes.
  const normalizedTopFive = useMemo(
    () => topFive.map((emp) => normalizeLeaderboardEmployee(emp)),
    [topFive, normalizeLeaderboardEmployee]
  );

  // â”€â”€ Module champion lookup map â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // WHY: the previous render path used moduleChampions.find() inside
  // overviewData.map(), producing an O(nÂ²) search on every render. Building
  // a keyed Map here converts the look-up to O(1) and only rebuilds when
  // moduleChampions actually changes.
  const moduleChampionMap = useMemo(() => {
    const map = new Map<string, any>();
    (moduleChampions || []).forEach((m: any) => {
      const key = m?.moduleName?.toLowerCase()?.trim();
      if (key) map.set(key, m);
    });
    return map;
  }, [moduleChampions]);

  // â”€â”€ Pre-normalized module overview items â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // WHY: overviewData.map() with normalizeLeaderboardEmployee() ran on every
  // render even when overviewData and moduleChampions were unchanged (e.g.
  // when toggling a modal). useMemo limits this to dependency changes only.
  const normalizedOverviewItems = useMemo<Array<{ item: any; emp: ReturnType<typeof normalizeLeaderboardEmployee> | null }>>(() => {
    if (!overviewData) return [];
    return overviewData.map((item: any) => {
      const champion = moduleChampionMap.get(item.label?.toLowerCase()?.trim());
      const emp = champion?.topEmployee
        ? normalizeLeaderboardEmployee(champion.topEmployee)
        : null;
      return { item, emp };
    });
  }, [overviewData, moduleChampionMap, normalizeLeaderboardEmployee]);

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // RENDER â€” page body structure unchanged
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return (
    <>
      <div className="d-flex align-items-center justify-content-between mb-8 mt-2">
        <div>
          <h2 className="fw-bolder text-dark mb-1">Leaderboard Overview</h2>
          <span className="text-muted fw-bold fs-7">Real-time performance rankings and KPI analytics</span>
        </div>
        <div className="d-flex align-items-center gap-3">
          <button
            className="btn btn-icon btn-sm btn-active-light-danger bg-transparent border-0 shadow-none"
            onClick={() => setShowInfoModal(true)}
            style={{ 
              width: "32px", 
              height: "32px",
              transition: "all 0.2s ease-in-out"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
            }}
            title="How KPI Score Works"
          >
            <i className="fa-solid fa-circle-info text-gray-500 fs-2" />
          </button>
        </div>
      </div>
      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
          1. TOP PERFORMERS
          â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <Row className="gy-5">
        <CommonCard>
          <div className="d-flex justify-content-between align-items-center mb-6">
            <h3 style={{ fontSize: "18px", fontWeight: "bold" }}>Top Performers</h3>
            <button
              className="btn btn-sm btn-light-primary fw-bolder"
              onClick={() => setShowAllOverAllEmployeeByScore(true)}
            >
              View All
            </button>
          </div>
          <div
            className="d-flex flex-row align-items-center justify-content-between gap-10 py-5"
            style={{ overflowX: "auto" }}
          >
            {topFiveLoading || isLoading
              ? SKELETON_IDS_5.map((i) => <SkeletonEmployeeCard key={i} size="lg" />)
              : normalizedTopFive.map((normalized, i) => (
                // normalizedTopFive is memoized â€” this .map() only reruns when
                // topFive changes, not on every parent re-render.
                <EmployeeCard
                  key={i}
                  emp={normalized}
                  rank={i + 1}
                  size="lg"
                  scoreData={{
                    // Top Overall preview: Score only, no Value row
                    score: normalized.score,
                    maxScore: normalized.maxScore,
                    customScoreColor: "black",
                  }}
                />
              ))}
          </div>
        </CommonCard>
      </Row>

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
          2. TOP PERFORMERS BY MODULES
          â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <Row className="mt-7 gy-5">
        <CommonCard>
          <h3 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "20px" }}>
            Top Performers By Modules
          </h3>
          {modulesLoading || isLoading ? (
            <Row className="gy-3 gx-2">
              {/* SKELETON_IDS_6 is a module-level constant â€” no new array on re-render */}
              {SKELETON_IDS_6.map((i) => (
                <Col key={i} xs={12} sm={6} md={4}>
                  <SkeletonModuleItem />
                </Col>
              ))}
            </Row>
          ) : (
            <Row className="gy-3 gx-2">
              {/* normalizedOverviewItems is memoized â€” champion look-up and
                  employee normalization only rerun when overviewData or
                  moduleChampions change, not on every render. */}
              {normalizedOverviewItems.map(({ item, emp }, index) => (
                <Col key={index} xs={12} sm={6} md={4}>
                  <div
                    className="d-flex align-items-center justify-content-between"
                    style={STYLES.moduleItem}
                  >
                    <div className="d-flex align-items-center gap-2" style={{ padding: "6px 8px" }}>
                      <img src={item.icon} alt={item.label} style={{ width: "20px", height: "20px" }} />
                      <span>{item.label}</span>
                    </div>
                    {emp && (
                      <EmployeeCard
                        emp={emp}
                        size="sm"
                        scoreData={{
                          value: emp.value,
                          maxValue: emp.maxValue,
                          score: emp.score,
                          maxScore: emp.maxScore,
                          isModule: true,
                          customScoreColor: "black",
                        }}
                      />
                    )}
                  </div>
                </Col>
              ))}
            </Row>
          )}
        </CommonCard>
      </Row>

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
          3. STAR EMPLOYEES
          Section order: Positive KPI â†’ Negative KPI â†’ Leaves
          â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <Row className="mt-7">
        <CommonCard>
          <h3 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "24px" }}>
            Star Employees
          </h3>

          {/* â€” Skeleton Loading State for Star Employees â€” */}
          {(factorsLoading || isLoading) && (
            <div className="mb-8">
              {/* SKELETON_IDS_3 is a module-level constant â€” no allocation per render */}
              {SKELETON_IDS_3.map((i) => (
                <SkeletonFactorCard key={i} />
              ))}
            </div>
          )}

          {/* â€” Positive KPI Factors â€” */}
          {!(factorsLoading || isLoading) && factorsGroups.positive.length > 0 && (
            <div className="mb-8">
              {/* ACCENT_STRIPE / SECTION_DIVIDER are module-level constants â€” no
                  new style object is allocated on each render for these sections. */}
              <div style={STYLES.sectionHeader}>
                <div style={ACCENT_STRIPE.positive} />
                Positive KPI Factors
              </div>
              <div style={SECTION_DIVIDER.positive} />
              {factorsGroups.positive.map((factor: any) => (
                <FactorLeaderboardCard
                  key={factor.id}
                  factor={factor}
                  // EMPTY_RANKINGS is a stable module-level constant. Using a literal
                  // `[]` here would create a new reference on every render, breaking
                  // React.memo equality on FactorLeaderboardCard for unloaded factors.
                  rankings={factorRankingsMap[factor.id] ?? EMPTY_RANKINGS}
                  loading={factorsLoading}
                  onViewAll={handleViewAllFactor}
                />
              ))}
            </div>
          )}

          {/* â€” Negative KPI Factors â€” */}
          {!(factorsLoading || isLoading) && factorsGroups.negative.length > 0 && (
            <div className="mb-8">
              <div style={STYLES.sectionHeader}>
                <div style={ACCENT_STRIPE.negative} />
                Negative KPI Factors
              </div>
              <div style={SECTION_DIVIDER.negative} />
              {factorsGroups.negative.map((factor: any) => (
                <FactorLeaderboardCard
                  key={factor.id}
                  factor={factor}
                  rankings={factorRankingsMap[factor.id] ?? EMPTY_RANKINGS}
                  loading={factorsLoading}
                  onViewAll={handleViewAllFactor}
                />
              ))}
            </div>
          )}

          {/* â€” Leaves (dedicated section, always separate and last) â€” */}
          {!(factorsLoading || isLoading) && factorsGroups.leave.length > 0 && (
            <div className="mb-8">
              <div style={STYLES.sectionHeader}>
                <div style={ACCENT_STRIPE.leaves} />
                Leaves
              </div>
              <div style={SECTION_DIVIDER.leaves} />
              {factorsGroups.leave.map((factor: any) => (
                <FactorLeaderboardCard
                  key={factor.id}
                  factor={factor}
                  rankings={factorRankingsMap[factor.id] ?? EMPTY_RANKINGS}
                  loading={factorsLoading}
                  onViewAll={handleViewAllFactor}
                />
              ))}
            </div>
          )}
        </CommonCard>
      </Row>

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
          MODAL â€” Full Leaderboard
          Opened from: Top Performers â†’ View All
          â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <Modal
        show={showAllOverAllEmployeeByScore}
        onHide={() => setShowAllOverAllEmployeeByScore(false)}
        size="lg"
        centered
      >
        <Modal.Header
          closeButton
          style={{ borderBottom: "2px solid #EFF2F5", padding: "20px 28px" }}
        >
          <div className="d-flex align-items-center justify-content-between w-100">
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              <Modal.Title style={{ fontSize: "20px", fontWeight: 800, color: "#181C32" }}>
                Full Leaderboard
              </Modal.Title>
              <span className="text-muted fs-7 fw-bold">Rankings for current period</span>
            </div>
            {overallRankingRows.length > 0 && Number(overallRankingRows[0].maxScore) > 0 && (
              <div className="d-flex gap-4">
                <div className="bg-light-success rounded-pill px-5 py-2 border border-success border-dashed">
                  <span className="text-success fw-bolder fs-7">
                    Max Score: {overallRankingRows[0].maxScore}
                  </span>
                </div>
              </div>
            )}
          </div>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: "72vh", overflowY: "auto", padding: "20px 28px" }}>
          {overallRankingRows.length === 0 ? (
            <div style={{ padding: "20px", color: COLORS.gray, textAlign: "center" }}>
              No data available.
            </div>
          ) : (
            overallRankingRows.map((row) => <RankingRow key={row.rank} data={row} />)
          )}
        </Modal.Body>
      </Modal>

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
          MODAL â€” Factor Rankings
          Opened from: any factor "View All" button
          Covers: Positive KPI, Negative KPI, Leaves â€” same modal, same UI
          â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <Modal
        show={showFactorModal}
        onHide={() => setShowFactorModal(false)}
        size="lg"
        centered
      >
        <Modal.Header
          closeButton
          style={{ borderBottom: "2px solid #EFF2F5", padding: "20px 28px" }}
        >
          <div className="d-flex align-items-center justify-content-between w-100">
            <div className="d-flex flex-column gap-1">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {selectedFactor && (
                  <span
                    style={{
                      display: "inline-block",
                      width: "10px",
                      height: "10px",
                      borderRadius: "50%",
                      backgroundColor: ["NEGATIVE", "LEAVE"].includes(
                        (selectedFactor.type as string)?.toUpperCase()
                      )
                        ? COLORS.negative.accent
                        : COLORS.positive.accent,
                      flexShrink: 0,
                    }}
                  />
                )}
                <Modal.Title style={{ fontSize: "20px", fontWeight: 800, color: "#181C32" }}>
                  {selectedFactor?.name} Rankings
                </Modal.Title>
              </div>
              <span className="text-muted fs-7 fw-bold ps-5">Factor specific results</span>
            </div>
            {/* Use a boolean guard (not the raw maxScore) so a 0/empty maxScore
                never leaks a stray "0" into the header via `0 && â€¦`. */}
            {factorRankingRows.length > 0 && Number(factorRankingRows[0].maxScore) > 0 && (
              <div className="d-flex gap-4">
                <div className="bg-light-success rounded-pill px-5 py-2 border border-success border-dashed">
                  <span className="text-success fw-bolder fs-7">
                    Max: {factorRankingRows[0].maxScore}
                  </span>
                </div>
              </div>
            )}
          </div>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: "72vh", overflowY: "auto", padding: "20px 28px" }}>
          {factorRankingRows.length === 0 ? (
            <div style={{ padding: "20px", color: COLORS.gray, textAlign: "center" }}>
              No rankings available.
            </div>
          ) : (
            factorRankingRows.map((row) => <RankingRow key={row.rank} data={row} />)
          )}
        </Modal.Body>
      </Modal>
      <KpiInfoModal
        show={showInfoModal}
        onHide={() => setShowInfoModal(false)}
        factorsGroups={factorsGroups}
      />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS FOR INFO MODAL
// ─────────────────────────────────────────────────────────────────────────────


const KpiInfoModal = ({ show, onHide, factorsGroups }: any) => {
  return (
    <Modal show={show} onHide={onHide} size="lg" centered scrollable>
      <Modal.Header closeButton className="border-0 pt-8 px-8 pb-0">
        <div className="d-flex flex-column">
          <Modal.Title className="fw-bolder fs-1 mb-1">How KPI Score Works</Modal.Title>
          <span className="text-muted fs-7 fw-bold">Understanding your performance and discipline ranking</span>
        </div>
      </Modal.Header>
      <Modal.Body className="px-8 pb-12 pt-5">
        
        {/* SECTION 1: WHAT IS KPI SCORE? */}
        <div className="mb-10 text-center p-8 bg-light-primary rounded-4 border border-primary border-opacity-10">
          <h3 className="fw-bolder text-primary mb-3">What is KPI Score?</h3>
          <p className="text-gray-700 fs-6 fw-semibold mb-0 px-md-10 lh-lg">
            Your KPI score shows your overall <strong>work discipline</strong>, <strong>attendance consistency</strong>, 
            and <strong>contribution</strong> during the selected period. A higher score directly reflects better overall performance.
          </p>
        </div>

        {/* SECTION 2: HOW POINTS WORK */}
        <div className="mb-12">
          <h4 className="fw-bolder text-dark mb-6 d-flex align-items-center gap-2 ps-2">
            <i className="fa-solid fa-calculator text-gray-400 fs-4" />
            How Points Work
          </h4>
          <div className="row g-6">
            <div className="col-md-6">
              <div className="p-6 h-100 rounded-4 bg-light-success border border-success border-opacity-10 shadow-xs">
                <div className="d-flex align-items-center gap-3 mb-4">
                  <div className="symbol symbol-30px">
                    <div className="symbol-label bg-success text-white shadow-sm">
                      <i className="fa-solid fa-plus fs-6 text-white" />
                    </div>
                  </div>
                  <h5 className="fw-bolder text-success mb-0">Positive Factors</h5>
                </div>
                <p className="text-gray-600 fs-7 mb-5 fw-semibold">
                  These factors <strong>ADD</strong> points to your score. The better you perform in these areas, the more points you earn.
                </p>
                <div className="d-flex flex-wrap gap-2">
                  {factorsGroups.positive.map((f: any) => (
                    <span key={f.id} className="badge badge-light-success border border-success border-opacity-20 px-3 py-2 fw-bold">{f.name}</span>
                  ))}
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="p-6 h-100 rounded-4 bg-light-danger border border-danger border-opacity-10 shadow-xs">
                <div className="d-flex align-items-center gap-3 mb-4">
                  <div className="symbol symbol-30px">
                    <div className="symbol-label bg-danger text-white shadow-sm">
                      <i className="fa-solid fa-minus fs-6 text-white" />
                    </div>
                  </div>
                  <h5 className="fw-bolder text-danger mb-0">Negative Factors</h5>
                </div>
                <p className="text-gray-600 fs-7 mb-5 fw-semibold">
                  These factors <strong>REDUCE</strong> your score. They indicate attendance or discipline issues that need attention.
                </p>
                <div className="d-flex flex-wrap gap-2">
                  {factorsGroups.negative.map((f: any) => (
                    <span key={f.id} className="badge badge-light-danger border border-danger border-opacity-20 px-3 py-2 fw-bold">{f.name}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: VERY IMPORTANT RULES */}
        <div className="mb-12">
          <h4 className="fw-bolder text-dark mb-6 d-flex align-items-center gap-2 ps-2">
            <i className="fa-solid fa-circle-exclamation text-gray-400 fs-4" />
            Company Discipline Rules
          </h4>
          <div className="d-flex flex-column gap-6">
            <div className="d-flex align-items-start gap-5 p-6 border border-gray-300 rounded-4 border-dashed bg-white">
              <div className="symbol symbol-45px flex-shrink-0">
                <div className="symbol-label bg-light-warning shadow-xs">
                  <i className="fa-solid fa-clipboard-check text-warning fs-2" />
                </div>
              </div>
              <div>
                <h5 className="fw-bolder text-dark mb-1 fs-5">Mandatory Factors</h5>
                <p className="text-gray-600 fs-7 mb-3 fw-semibold lh-base">
                  Factors like <strong>Working Days</strong>, <strong>On Time Attendance</strong>, and <strong>Total Working Hours </strong> 
                  are essential discipline requirements.
                </p>
                <div className="bg-light-warning bg-opacity-30 px-4 py-3 rounded-3 border border-warning border-opacity-10">
                  <span className="text-gray-800 fs-8 fw-bolder lh-sm d-block">
                    Employees are expected to fully complete these targets. Any shortfall in these core requirements will directly decrease your score.
                  </span>
                </div>
              </div>
            </div>

            <div className="d-flex align-items-start gap-5 p-6 border border-gray-300 rounded-4 border-dashed bg-white">
              <div className="symbol symbol-45px flex-shrink-0">
                <div className="symbol-label bg-light-info shadow-xs">
                  <i className="fa-solid fa-star text-info fs-2" />
                </div>
              </div>
              <div>
                <h5 className="fw-bolder text-dark mb-1 fs-5">Optional & Extra Contributions</h5>
                <p className="text-gray-600 fs-7 mb-3 fw-semibold lh-base">
                  Factors like <strong>Extra Days</strong>, <strong>Overtime</strong>, or <strong>Early Check-In</strong> are 
                  additional reward categories.
                </p>
                <div className="bg-light-info bg-opacity-30 px-4 py-3 rounded-3 border border-info border-opacity-10">
                  <span className="text-gray-800 fs-8 fw-bolder lh-sm d-block">
                    These reward extra effort and initiative, but you are never penalized for not participating in them.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 4 & 5: PERFORMANCE COLORS & MAX SCORE */}
        <div className="row g-6 mb-12">
          <div className="col-md-7">
            <div className="bg-light p-6 rounded-4 border border-gray-300 h-100 shadow-xs">
              <h5 className="fw-bolder text-dark mb-5 d-flex align-items-center gap-2">
                <i className="fa-solid fa-palette text-gray-500 fs-5" />
                Performance Colors
              </h5>
              <div className="d-flex flex-column gap-4">
                <div className="d-flex align-items-center gap-3">
                  <span className="w-12px h-12px rounded-circle bg-success shadow-sm" />
                  <span className="text-gray-700 fs-7 fw-bolder">Green: <span className="text-muted fw-semibold ms-1">Strong or satisfactory performance.</span></span>
                </div>
                <div className="d-flex align-items-center gap-3">
                  <span className="w-12px h-12px rounded-circle bg-danger shadow-sm" />
                  <span className="text-gray-700 fs-7 fw-bolder">Red: <span className="text-muted fw-semibold ms-1">Improvement is needed.</span></span>
                </div>
                <div className="mt-2 bg-white p-4 rounded-3 border border-gray-200">
                   <p className="text-gray-800 fs-8 mb-0 fw-bold lh-sm">
                    Reaching at least <strong>50%</strong> of the maximum achievable score keeps you within the acceptable performance range.
                   </p>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-5">
            <div className="bg-light-danger bg-opacity-10 p-6 rounded-4 border border-danger border-opacity-10 h-100 d-flex flex-column justify-content-center align-items-center text-center">
              <div className="symbol symbol-50px mb-3">
                <div className="symbol-label bg-white shadow-sm">
                  <i className="fa-solid fa-trophy text-danger fs-2" />
                </div>
              </div>
              <h5 className="fw-bolder text-dark mb-1">Maximum Score</h5>
              <p className="text-muted fs-8 mb-0 fw-semibold">
                Represents the highest possible KPI score achievable during the selected period.
              </p>
            </div>
          </div>
        </div>

        {/* SECTION 6: HOW TO IMPROVE KPI */}
        <div className="p-8 rounded-4 bg-dark text-white shadow-lg overflow-hidden position-relative">
          <div className="position-absolute top-0 end-0 opacity-10 p-5">
            <i className="fa-solid fa-arrow-trend-up text-white" style={{ fontSize: "7rem" }} />
          </div>
          <div className="position-relative z-index-1">
            <h4 className="fw-bolder text-white mb-6 d-flex align-items-center gap-3">
              <i className="fa-solid fa-lightbulb text-warning fs-2" />
              How to Improve?
            </h4>
            <div className="row g-5">
              {[
                "Maintain attendance regularly",
                "Avoid late arrivals",
                "Complete working hours properly",
                "Minimize unnecessary requests",
                "Improve discipline consistency"
              ].map((tip, idx) => (
                <div key={idx} className="col-md-6">
                  <div className="d-flex align-items-center gap-3">
                    <div className="w-20px h-20px rounded-circle bg-white bg-opacity-10 d-flex align-items-center justify-content-center">
                      <i className="fa-solid fa-check text-success fs-9" />
                    </div>
                    <span className="fs-7 fw-bold text-gray-300">{tip}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal.Body>
    </Modal>
  );
};

export default LeaderBoardCore;
