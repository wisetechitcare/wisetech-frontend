import React from "react";

interface ScoreBarProps {
  score: number;
  maxScore: number;
}

const ScoreBar: React.FC<ScoreBarProps> = ({ score, maxScore }) => {
  // Clamp percentage between 0 and 100 to prevent negative scores from going outside the bar
  const percentage = Math.max(0, Math.min((score / maxScore) * 100, 100));

  // Define color segments
  const segments = [
    "#ED1D26",
    "#F5811F",
    // "#F99F1F",
    "#E8C61B",
    "#8DC740",
    "#00B26B",
  ];
  const segmentWidth = 100 / segments.length;

  return (
    <div
      style={{
        width: "100%",
        padding: "10px 20px",
        display: "flex",
        alignItems: "center",
        gap: "10px",
      }}
    >
      <span>0</span>

      <div style={{ position: "relative", width: "100%", height: "20px" }}>
        <div
          style={{
            display: "flex",
            width: "100%",
            height: "100%",
            borderRadius: "10px",
            overflow: "hidden",
          }}
        >
          {segments.map((color, index) => (
            <div
              key={index}
              style={{
                width: `${segmentWidth}%`,
                backgroundColor: color,
              }}
            />
          ))}
        </div>

        <div
          style={{
            position: "absolute",
            left: `${percentage}%`,
            transform: "translateX(-50%)",
            height: "30px",
            borderLeft: "3px solid #3D3D3D",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            top: "-5px",
            color: "black",
            fontWeight: "bold",
          }}
        ></div>
        <div
          style={{
            position: "absolute",
            left: `${percentage}%`,
            transform: "translateX(-50%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            top: "-25px",
            color: "black",
            fontWeight: "bold",
          }}
        >
          {parseFloat(score.toFixed(2))}
        </div>
      </div>

      <span>{maxScore}</span>
    </div>
  );
};

export default ScoreBar;
