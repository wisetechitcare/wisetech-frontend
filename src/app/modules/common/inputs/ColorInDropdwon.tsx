import { components } from "react-select";
import { SmartAvatar } from "@/ds/ui/smart-avatar";
import DropdownChevron from "./DropdownChevron";

/** Soft tint of a hex colour for chip backgrounds (≈14% opacity). */
function softTint(hex?: string, alpha = 0.14): string | undefined {
  if (!hex || typeof hex !== "string") return undefined;
  const h = hex.trim();
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(h)) {
    return `${h.length === 4 ? expandShortHex(h) : h}${Math.round(alpha * 255)
      .toString(16)
      .padStart(2, "0")}`;
  }
  return undefined;
}

function expandShortHex(h: string) {
  const r = h[1],
    g = h[2],
    b = h[3];
  return `#${r}${r}${g}${g}${b}${b}`;
}

const StatusDot = ({ color, size = 12 }: { color: string; size?: number }) => (
  <span
    aria-hidden
    style={{
      width: size,
      height: size,
      minWidth: size,
      borderRadius: "50%",
      backgroundColor: color,
      boxShadow: `0 0 0 3px ${softTint(color, 0.28) || "transparent"}`,
      display: "inline-block",
      flexShrink: 0,
    }}
  />
);

const renderIcon = (data: any) => {
  if (data.avatar || data.avatar === null) {
    // Photo when there is one, else the one initials tile. No third-party avatar service:
    // that leaked every name to ui-avatars.com.
    return <SmartAvatar name={data.label} src={data.avatar} seed={data.value} size={25} decorative />;
  }

  if (data.color) {
    return <StatusDot color={data.color} size={12} />;
  }

  return null;
};

export const ColourOption = (props: any) => {
  const color = props.data?.color as string | undefined;
  const tint = softTint(color, 0.12);
  const isSelected = props.isSelected;
  const isFocused = props.isFocused;

  return (
    <components.Option {...props}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          margin: "-2px -6px",
          padding: "8px 10px",
          borderRadius: 8,
          backgroundColor: isSelected
            ? softTint(color, 0.22) || "rgba(30,58,138,0.08)"
            : isFocused
              ? tint || "rgba(15,23,42,0.04)"
              : "transparent",
          borderLeft: color ? `3px solid ${color}` : "3px solid transparent",
        }}
      >
        {renderIcon(props.data)}
        <span
          style={{
            fontWeight: isSelected ? 700 : 500,
            fontSize: 13.5,
            color: "#0f172a",
            letterSpacing: "0.01em",
          }}
        >
          {props.label}
        </span>
      </div>
    </components.Option>
  );
};

export const SingleValue = (props: any) => {
  const color = props.data?.color as string | undefined;
  const tint = softTint(color, 0.16);

  return (
    <components.SingleValue {...props}>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          maxWidth: "100%",
          minHeight: 28,
          padding: color ? "2px 10px 2px 8px" : 0,
          borderRadius: 999,
          backgroundColor: tint || "transparent",
          border: color ? `1px solid ${softTint(color, 0.45)}` : "none",
        }}
      >
        {renderIcon(props.data)}
        <span
          style={{
            color: color || "inherit",
            fontWeight: 600,
            fontSize: 13.5,
            lineHeight: 1.2,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {props.data.label}
        </span>
      </div>
    </components.SingleValue>
  );
};

// Avatar-based option rendering (real photo, else the SAME deterministic
// gradient + initials fallback the actual Contacts page uses — SmartAvatar —
// rather than a separate/simplified initials scheme just for this dropdown.
export const AvatarOption = (props: any) => (
  <components.Option {...props}>
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <SmartAvatar name={props.data.label} seed={props.data.value} src={props.data.avatar} size="xs" decorative />
      <span>{props.data.label}</span>
    </div>
  </components.Option>
);

export const AvatarSingleValue = (props: any) => {
  const wrap = Boolean(props.selectProps?.allowValueWrap);

  return (
    <components.SingleValue {...props}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          width: "100%",
          minHeight: "32px",
          ...(wrap
            ? { overflow: "visible", flexWrap: "wrap" as const }
            : { minWidth: 0, overflow: "hidden" }),
        }}
      >
        <span style={{ flexShrink: 0, display: "flex" }}>
          <SmartAvatar name={props.data.label} seed={props.data.value} src={props.data.avatar} size={22} decorative />
        </span>
        <span
          style={
            wrap
              ? {
                  flex: 1,
                  whiteSpace: "normal",
                  overflow: "visible",
                  lineHeight: 1.35,
                  wordBreak: "break-word",
                }
              : {
                  flex: 1,
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }
          }
        >
          {props.data.label}
        </span>
      </div>
    </components.SingleValue>
  );
};

export const DropdownIndicator = (props: any) => {
  const selectedColor = props.selectProps.value?.color;
  return (
    <DropdownChevron {...props} color={selectedColor ? "#000000" : "#999"} />
  );
};
