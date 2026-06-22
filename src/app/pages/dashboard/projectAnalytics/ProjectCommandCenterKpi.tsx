import React from "react";
import { motion } from "framer-motion";
import CountUp from "react-countup";
import { ProjectKpi } from "./projectAnalyticsUtils";

interface Props extends ProjectKpi {
  index?: number;
}

/**
 * Project Command Center KPI Card — Operational metrics for PMO dashboard.
 * Designed for project executives, not sales dashboard.
 * Shows: Active projects, completed, delayed, contract value, billing, collections.
 */
const ProjectCommandCenterKpi: React.FC<Props> = ({
  label,
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
  accent,
  icon,
  trend,
  trendDirection,
  index = 0,
}) => {
  const isNumeric = typeof value === "number";
  const displayValue = isNumeric
    ? Math.floor(value)
    : value;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all"
      style={{
        borderLeft: `4px solid ${accent}`,
      }}
    >
      {/* Header: Icon + Trend */}
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
          style={{ backgroundColor: accent }}
        >
          <i className={`${icon} text-sm`}></i>
        </div>
        {trend !== undefined && (
          <div
            className={`text-xs font-semibold px-2 py-1 rounded ${
              trendDirection === "up"
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {trendDirection === "up" ? "↑" : "↓"} {Math.abs(trend)}%
          </div>
        )}
      </div>

      {/* Value: Large, prominent number */}
      <div className="mb-2">
        <div className="text-3xl font-bold text-gray-900">
          {prefix}
          {isNumeric ? (
            <CountUp
              end={displayValue}
              duration={0.6}
              separator=","
              decimals={decimals}
            />
          ) : (
            value
          )}
          {suffix}
        </div>
      </div>

      {/* Label: Context */}
      <div className="text-sm font-medium text-gray-600">{label}</div>
    </motion.div>
  );
};

export default React.memo(ProjectCommandCenterKpi);
