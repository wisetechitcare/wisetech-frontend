import React from "react";

interface ScoreBarProps {
  score: number;
  maxScore: number;
}

const ScoreBar: React.FC<ScoreBarProps> = ({ score, maxScore }) => {
  // Clamp percentage between 0 and 100 to prevent negative scores from going outside the bar
  const percentage = Math.max(0, Math.min((score / (maxScore || 1)) * 100, 100));

  // Define color segments - Premium Mood-Aligned Palette
  const segments = [
    "#9d4141", // Tier 1: Low Performance (Deep Muted Maroon)
    "#F99F1F", // Tier 2: Improving (Warm Amber)
    "#FFC700", // Tier 3: Good Progress (Muted Gold)
    "#50CD89", // Tier 4: High Output (Emerald Green)
    "#7239EA", // Tier 5: Elite Performance (Premium Violet)
  ];
  const segmentWidth = 100 / segments.length;

  return (
    <div className="w-100 position-relative py-5">
      <div className="position-relative w-100" style={{ height: "14px" }}>
        {/* Background Bar */}
        <div
          className="d-flex w-100 h-100 overflow-hidden shadow-sm border border-white border-2"
          style={{ borderRadius: "20px" }}
        >
          {segments.map((color, index) => (
            <div
              key={index}
              style={{
                width: `${segmentWidth}%`,
                backgroundColor: color,
                opacity: 0.9
              }}
            />
          ))}
        </div>

        {/* Current Score Indicator Line */}
        <div
          className="position-absolute"
          style={{
            left: `${percentage}%`,
            top: "-4px",
            transform: "translateX(-50%)",
            height: "22px",
            width: "4px",
            backgroundColor: "#181C32",
            borderRadius: "4px",
            boxShadow: "0 0 0 2px white",
            zIndex: 10,
            transition: "left 0.5s cubic-bezier(0.4, 0, 0.2, 1)"
          }}
        />

        {/* Score Value Tooltip */}
        <div
          className="position-absolute"
          style={{
            left: `${percentage}%`,
            top: "-30px",
            transform: "translateX(-50%)",
            transition: "left 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
            zIndex: 11
          }}
        >
          <div className="badge badge-dark fw-bolder fs-8 px-2 py-1 shadow-sm border border-white border-opacity-10">
            {parseFloat(score.toFixed(2))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScoreBar;
