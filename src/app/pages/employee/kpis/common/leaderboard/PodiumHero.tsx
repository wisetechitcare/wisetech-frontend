import React, { useMemo } from "react";
import useMediaQuery from "@mui/material/useMediaQuery";
import { PodiumEntry } from "./types";

interface PodiumHeroProps {
  entries: PodiumEntry[];
  allEntries?: PodiumEntry[];
}

const SCORE_COLOR = "#9F1D1D";

// Medal theming — gold (1), silver (2), bronze (3).
const RING: Record<number, string> = { 1: "#E7C24E", 2: "#C4C9D0", 3: "#DBA36B" };
const RANK_SOLID: Record<number, string> = { 1: "#E7C24E", 2: "#C4C9D0", 3: "#DBA36B" };
const CARD_STYLE: Record<number, React.CSSProperties> = {
  1: { background: "linear-gradient(180deg,#FFFDF6 0%,#FFF3CF 100%)", border: "1.5px solid #EAC85C", boxShadow: "0 10px 26px rgba(234,200,92,0.28)" },
  2: { background: "linear-gradient(180deg,#FDFEFF 0%,#EDF0F3 100%)", border: "1.5px solid #CBD0D7", boxShadow: "0 8px 20px rgba(148,163,184,0.20)" },
  3: { background: "linear-gradient(180deg,#FFFCF8 0%,#FBEAD8 100%)", border: "1.5px solid #E4B98C", boxShadow: "0 8px 20px rgba(219,163,107,0.20)" },
};
const PEDESTAL_STYLE: Record<number, React.CSSProperties> = {
  1: { background: "linear-gradient(180deg,#FBE59F 0%,#F1C955 100%)", color: "#8A6A12" },
  2: { background: "linear-gradient(180deg,#EFF1F4 0%,#D7DBE1 100%)", color: "#7C818A" },
  3: { background: "linear-gradient(180deg,#F7E3CE 0%,#E7BC91 100%)", color: "#8A5A2A" },
};

const PodiumHero: React.FC<PodiumHeroProps> = ({ entries, allEntries }) => {
  const isMobile = useMediaQuery("(max-width:900px)");

  const top3 = entries.slice(0, 3);
  const count = top3.length;
  const standings = useMemo(
    () => (allEntries && allEntries.length ? allEntries : entries),
    [allEntries, entries]
  );

  if (entries.length === 0) {
    return (
      <div className="text-center text-muted py-10" style={{ fontSize: 14 }}>
        No ranked employees for this period yet.
      </div>
    );
  }

  const S = isMobile
    ? { av1: 62, av: 48, cw1: 124, cw: 106, name1: 12.5, name: 11, role: 8, score1: 19, score: 15, label: 7, pedH1: 30, pedH: 24, gap: 8, pad: "12px 8px 10px" }
    : { av1: 88, av: 64, cw1: 200, cw: 168, name1: 16, name: 14, role: 9.5, score1: 28, score: 22, label: 9, pedH1: 42, pedH: 30, gap: 14, pad: "14px 14px 12px" };

  const renderColumn = (rank: number) => {
    const entry = top3[rank - 1];
    if (!entry) return null;
    const av = rank === 1 ? S.av1 : S.av;
    const cw = rank === 1 ? S.cw1 : S.cw;
    const ringWidth = rank === 1 ? 4 : 3;

    return (
      <div key={rank} style={{ display: "flex", flexDirection: "column", alignItems: "center", width: cw, flexShrink: 0 }}>
        {/* Avatar */}
        <div
          style={{
            width: av,
            height: av,
            borderRadius: "50%",
            overflow: "hidden",
            background: "#F5F8FA",
            border: `${ringWidth}px solid ${RING[rank]}`,
            boxShadow: "0 0 0 3px #fff, 0 5px 14px rgba(0,0,0,0.12)",
            boxSizing: "border-box",
            zIndex: 2,
          }}
        >
          <img src={entry.avatar} alt={entry.name} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        </div>

        {/* Card */}
        <div
          style={{
            width: "100%",
            marginTop: -av * 0.44,
            borderRadius: 14,
            textAlign: "center",
            ...CARD_STYLE[rank],
            padding: S.pad,
            paddingTop: av * 0.44 + 10,
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              fontSize: rank === 1 ? S.name1 : S.name,
              fontWeight: 800,
              color: "#1B1B2F",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {entry.name}
          </div>
          {entry.designation ? (
            <div
              style={{
                fontSize: S.role,
                fontWeight: 700,
                color: "#94a3b8",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginTop: 2,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {entry.designation}
            </div>
          ) : null}

          <div style={{ marginTop: rank === 1 ? 8 : 6 }}>
            <span style={{ fontSize: rank === 1 ? S.score1 : S.score, fontWeight: 800, color: SCORE_COLOR, letterSpacing: "-0.5px" }}>
              {entry.score.toFixed(2)}
            </span>
          </div>
          <div
            style={{
              fontSize: S.label,
              fontWeight: 800,
              color: rank === 1 ? "#B08421" : "#94a3b8",
              textTransform: "uppercase",
              letterSpacing: "0.09em",
              marginTop: 1,
            }}
          >
            {rank === 1 ? "Elite Score" : "KPI Score"}
          </div>
        </div>

        {/* Pedestal */}
        <div
          style={{
            width: "82%",
            height: rank === 1 ? S.pedH1 : S.pedH,
            marginTop: 8,
            borderRadius: "8px 8px 4px 4px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: rank === 1 ? (isMobile ? 14 : 18) : isMobile ? 11 : 15,
            fontWeight: 900,
            ...PEDESTAL_STYLE[rank],
          }}
        >
          {rank}
        </div>
      </div>
    );
  };

  const podium = (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: S.gap, flexWrap: "wrap" }}>
      {[2, 1, 3].filter((r) => r <= count).map((rank) => renderColumn(rank))}
    </div>
  );

  const standingsPanel = (
    <div
      style={{
        background: "#ffffff",
        borderRadius: 14,
        border: "1px solid #EEF1F5",
        boxShadow: "0 2px 10px rgba(15,23,42,0.05)",
        padding: "12px 14px",
        height: "100%",
      }}
    >
      <div className="d-flex align-items-center justify-content-between" style={{ padding: "2px 4px 10px", borderBottom: "1px solid #F1F4F8", marginBottom: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.07em", textTransform: "uppercase", color: "#94a3b8" }}>
          Global Rank
        </span>
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.07em", textTransform: "uppercase", color: "#94a3b8" }}>
          KPI Score
        </span>
      </div>
      <div style={{ maxHeight: isMobile ? "none" : 360, overflowY: isMobile ? "visible" : "auto" }}>
        {standings.map((e, i) => {
          const rank = i + 1;
          const medal = RANK_SOLID[rank];
          return (
            <div
              key={i}
              className="d-flex align-items-center"
              style={{ gap: 12, padding: "8px 6px", borderRadius: 10, background: rank <= 3 ? `${medal}1f` : i % 2 ? "transparent" : "rgba(248,250,252,0.7)" }}
            >
              <span
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 11,
                  fontWeight: 800,
                  color: rank <= 3 ? "#1B1B2F" : "#64748b",
                  background: rank <= 3 ? medal : "#F1F4F8",
                  flexShrink: 0,
                }}
              >
                {rank}
              </span>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  overflow: "hidden",
                  background: "#F5F8FA",
                  border: "2px solid #fff",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
                  flexShrink: 0,
                }}
              >
                <img src={e.avatar} alt={e.name} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: "#1B1B2F", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {e.name}
                </div>
                {e.designation ? (
                  <div style={{ fontSize: 10.5, fontWeight: 600, color: "#94a3b8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {e.designation}
                  </div>
                ) : null}
              </div>
              <span style={{ fontSize: 15, fontWeight: 800, color: SCORE_COLOR, flexShrink: 0 }}>{e.score.toFixed(2)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );

  if (isMobile) {
    // Mobile shows only the podium — the full standings live behind the header's
    // "View All" button, so the side list isn't needed here.
    return <div style={{ padding: "2px 2px 6px" }}>{podium}</div>;
  }

  return (
    <div style={{ display: "flex", alignItems: "stretch", gap: 24, padding: "6px 4px" }}>
      <div style={{ flex: "1 1 52%", display: "flex", alignItems: "center", justifyContent: "center", minWidth: 0 }}>
        {podium}
      </div>
      <div style={{ flex: "1 1 44%", minWidth: 300 }}>{standingsPanel}</div>
    </div>
  );
};

export default PodiumHero;
