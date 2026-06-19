import React, { useMemo } from "react";
import { motion } from "framer-motion";
import CountUp from "react-countup";
import { PipelineHealth } from "./leadAnalyticsUtils";

interface PipelineHealthRingProps {
  health: PipelineHealth;
  /** Outer diameter in px. */
  size?: number;
  /** Stroke thickness in px. */
  stroke?: number;
}

/**
 * Radial pipeline-health gauge — a single, instantly-readable 0–100 score.
 * Pure SVG so it is crisp on every DPI, themable and animation-friendly; the
 * arc sweeps in with Framer Motion and the number counts up in sync.
 */
const PipelineHealthRing: React.FC<PipelineHealthRingProps> = ({
  health,
  size = 132,
  stroke = 12,
}) => {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  // 270° arc (gauge style): leave a gap at the bottom for the label to breathe.
  const arcFraction = 0.75;
  const arcLength = circumference * arcFraction;
  const progress = Math.max(0, Math.min(100, health.score)) / 100;

  const gradientId = useMemo(
    () => `health-grad-${Math.random().toString(36).slice(2, 8)}`,
    []
  );

  return (
    <div
      style={{ position: "relative", width: size, height: size }}
      role="img"
      aria-label={`Pipeline health score ${health.score} out of 100 — ${health.label}`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: "rotate(135deg)" }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={health.color} stopOpacity={0.65} />
            <stop offset="100%" stopColor={health.color} />
          </linearGradient>
        </defs>

        {/* Track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#EEF2F7"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${arcLength} ${circumference}`}
        />

        {/* Animated value arc */}
        <motion.circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${arcLength} ${circumference}`}
          initial={{ strokeDashoffset: arcLength }}
          animate={{ strokeDashoffset: arcLength * (1 - progress) }}
          transition={{ duration: 1.1, ease: "easeOut" }}
        />
      </svg>

      {/* Centre readout */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
        }}
      >
        <div
          style={{
            fontFamily: "Barlow, sans-serif",
            fontWeight: 800,
            fontSize: size * 0.26,
            lineHeight: 1,
            color: health.color,
          }}
        >
          <CountUp end={health.score} duration={1.1} />
        </div>
        <div
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: 0.3,
            textTransform: "uppercase",
            color: health.color,
          }}
        >
          {health.label}
        </div>
      </div>
    </div>
  );
};

export default PipelineHealthRing;
