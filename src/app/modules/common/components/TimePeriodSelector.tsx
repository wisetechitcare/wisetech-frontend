import React, { useMemo, CSSProperties } from "react";

export type TimePeriodMode = "daily" | "weekly" | "monthly" | "yearly" | "allyear" | "custom";

interface TimePeriodSelectorProps {
  value: TimePeriodMode;
  onChange: (mode: TimePeriodMode) => void;
  isMobile?: boolean;
  showCustom?: boolean;
  variant?: "light" | "dark" | "outline" | "boxed";
  containerStyle?: CSSProperties;
  buttonStyle?: CSSProperties;
}

const TimePeriodSelector: React.FC<TimePeriodSelectorProps> = ({
  value,
  onChange,
  isMobile = false,
  showCustom = true,
  variant = "light",
  containerStyle = {},
  buttonStyle = {},
}) => {
  const modes: TimePeriodMode[] = useMemo(() => {
    const baseMode: TimePeriodMode[] = ["daily", "weekly", "monthly", "yearly", "allyear"];
    return showCustom ? [...baseMode, "custom"] : baseMode;
  }, [showCustom]);

  const labels: Record<TimePeriodMode, string> = {
    daily: "Daily",
    weekly: "Weekly",
    monthly: "Monthly",
    yearly: "Yearly",
    allyear: "All Time",
    custom: "Custom",
  };

  const getContainerStyles = (): CSSProperties => {
    const baseStyles: CSSProperties = {
      display: "flex",
      alignItems: "center",
      gap: variant === "boxed" ? "2px" : "4px",
      width: isMobile ? "100%" : "fit-content",
      overflowX: isMobile ? "auto" : "visible",
      overflowY: "visible",
      scrollbarWidth: "none",
      marginRight: "4px",
      WebkitOverflowScrolling: "touch",
    };

    if (variant === "boxed") {
      return {
        ...baseStyles,
        background: "#F1F5F9",
        borderRadius: "6px",
        padding: "2px",
      };
    }

    return baseStyles;
  };

  // Caret color per variant — matches each variant's own active text color, so
  // the little pointer above the selected tab reads as part of the same
  // selection state rather than a mismatched accent. "dark" skips the caret
  // entirely: its solid fill already makes the active tab unambiguous.
  const activeCaretColor: Partial<Record<NonNullable<TimePeriodSelectorProps["variant"]>, string>> = {
    light: "#1E3A8A",
    boxed: "#1E3A8A",
    outline: "#1E3A8A",
  };

  const getButtonStyles = (isActive: boolean): CSSProperties => {
    const baseStyles: CSSProperties = {
      border: "none",
      borderRadius: "4px",
      padding: "4px 10px",
      fontSize: "12px",
      fontWeight: isActive ? 600 : 500,
      fontFamily: "Inter, sans-serif",
      transition: "all 0.2s ease",
      cursor: "pointer",
      whiteSpace: "nowrap",
      flex: isMobile ? 1 : "none",
      position: "relative",
      overflow: "visible",
      ...buttonStyle,
    };

    if (variant === "light") {
      return {
        ...baseStyles,
        background: isActive ? "#ffffff" : "transparent",
        color: isActive ? "#1E3A8A" : "#64748B",
        boxShadow: isActive ? "0 1px 2px rgba(16, 24, 40, 0.06)" : "none",
      };
    }

    if (variant === "dark") {
      return {
        ...baseStyles,
        background: isActive ? "#1E3A8A" : "#F1F5F9",
        color: isActive ? "#ffffff" : "#64748B",
        boxShadow: isActive ? "0 2px 8px rgba(30, 58, 138, 0.15)" : "none",
      };
    }

    if (variant === "outline") {
      return {
        ...baseStyles,
        background: "transparent",
        color: isActive ? "#1E3A8A" : "#64748B",
        border: isActive ? "1px solid #1E3A8A" : "1px solid #E2E8F0",
        boxShadow: isActive ? "0 1px 2px rgba(30, 58, 138, 0.1)" : "none",
      };
    }

    if (variant === "boxed") {
      return {
        ...baseStyles,
        background: isActive ? "#ffffff" : "transparent",
        color: isActive ? "#1E3A8A" : "#64748B",
        boxShadow: isActive ? "0 1px 2px rgba(16, 24, 40, 0.06)" : "none",
      };
    }

    return baseStyles;
  };

  return (
    <div style={{ ...getContainerStyles(), ...containerStyle }}>
      {modes.map((mode) => {
        const isActive = value === mode;
        const caretColor = activeCaretColor[variant];
        return (
          <button
            key={mode}
            onClick={() => onChange(mode)}
            style={getButtonStyles(isActive)}
          >
            {labels[mode]}
            {isActive && caretColor && (
              <span
                style={{
                  position: "absolute",
                  top: -5,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: 0,
                  height: 0,
                  borderLeft: "5px solid transparent",
                  borderRight: "5px solid transparent",
                  borderTop: `5px solid ${caretColor}`,
                  pointerEvents: "none",
                }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
};

export default TimePeriodSelector;
