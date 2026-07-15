import { components } from "react-select";
import SmartAvatar from "@app/modules/common/components/SmartAvatar";

const getAvatarUrl = (data: any) => {
  if (data.avatar) return data.avatar; // use real avatar
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(
    data.label || "User"
  )}&background=eeeeee&color=888888&size=20&rounded=true`;
};

const renderIcon = (data: any) => {
  if (data.avatar || data.avatar===null) {
    return (
      <img
        src={getAvatarUrl(data)}
        alt={data.label}
        onError={(e) => {
          // If real avatar fails to load, fall back to generated avatar
          const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
            data.label || "User"
          )}&background=eeeeee&color=888888&size=20&rounded=true`;
          (e.target as HTMLImageElement).src = fallbackUrl;
        }}
        style={{
          width: "25px",
          height: "25px",
          borderRadius: "50%",
          objectFit: "cover",
        }}
      />
    );
  }

  if (data.color) {
    return (
      <span
        style={{
          width: "15px",
          height: "15px",
          borderRadius: "50%",
          backgroundColor: data.color,
          display: "inline-block",
        }}
      />
    );
  }

  return null;
};

export const ColourOption = (props: any) => (
  <components.Option {...props}>
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      {renderIcon(props.data)}
      <span>{props.label}</span>
    </div>
  </components.Option>
);

export const SingleValue = (props: any) => (
  <components.SingleValue {...props}>
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        width: "100%",
        minHeight: "32px"
      }}
    >
      {renderIcon(props.data)}
      <span style={{
        color: props.data.color ? "#000000" : "inherit",
        fontWeight: "inherit"
      }}>
        {props.data.label}
      </span>
    </div>
  </components.SingleValue>
);

// Avatar-based option rendering (real photo, else the SAME deterministic
// gradient + initials fallback the actual Contacts page uses — SmartAvatar —
// rather than a separate/simplified initials scheme just for this dropdown.
export const AvatarOption = (props: any) => (
  <components.Option {...props}>
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <SmartAvatar name={props.data.label} id={props.data.value} imageUrl={props.data.avatar} size={24} imageFit="cover" />
      <span>{props.data.label}</span>
    </div>
  </components.Option>
);

export const AvatarSingleValue = (props: any) => (
  <components.SingleValue {...props}>
    <div style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%", minHeight: "32px" }}>
      <SmartAvatar name={props.data.label} id={props.data.value} imageUrl={props.data.avatar} size={22} imageFit="cover" />
      <span>{props.data.label}</span>
    </div>
  </components.SingleValue>
);

export const DropdownIndicator = (props: any) => {
  const selectedColor = props.selectProps.value?.color;
  return (
    <components.DropdownIndicator {...props}>
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M5 7.5L10 12.5L15 7.5"
          stroke={selectedColor ? "#000000" : "#999"}
          strokeWidth="1.67"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </components.DropdownIndicator>
  );
};
