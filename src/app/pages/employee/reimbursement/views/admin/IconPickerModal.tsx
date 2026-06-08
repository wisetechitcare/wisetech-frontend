import React, { useState, useRef, useCallback, useEffect } from "react";
import { Modal } from "react-bootstrap";
import { KTIcon } from "@metronic/helpers";

// ─── Types ────────────────────────────────────────────────────────────────────

export type IconSource = "system" | "iconify";

export interface SelectedIcon {
  source: IconSource;
  /** KT icon name (e.g. "car") — only when source === "system" */
  name?: string;
  /** Full image URL — when source is "iconify" or "flaticon" */
  url?: string;
  /** Human-readable label */
  label: string;
}

interface IconPickerModalProps {
  show: boolean;
  onHide: () => void;
  onSelect: (icon: SelectedIcon) => void;
  currentIcon?: SelectedIcon | null;
}

// ─── System Icons ─────────────────────────────────────────────────────────────

const SYSTEM_ICON_GROUPS: { label: string; icons: { name: string; label: string }[] }[] = [
  {
    label: "Travel",
    icons: [
      { name: "airplane", label: "Flight" },
      { name: "airplane-square", label: "Airport" },
      { name: "car", label: "Car" },
      { name: "car-2", label: "Car Rental" },
      { name: "car-3", label: "Cab" },
      { name: "bus", label: "Bus" },
      { name: "map", label: "Map" },
      { name: "route", label: "Route" },
      { name: "geolocation", label: "Location" },
      { name: "pin", label: "Pin" },
    ],
  },
  {
    label: "Food & Stay",
    icons: [
      { name: "coffee", label: "Coffee" },
      { name: "night-day", label: "Hotel" },
      { name: "home-2", label: "Accommodation" },
      { name: "wifi-home", label: "Stay" },
      { name: "home-1", label: "Home" },
    ],
  },
  {
    label: "Finance",
    icons: [
      { name: "wallet", label: "Wallet" },
      { name: "dollar", label: "Dollar" },
      { name: "credit-cart", label: "Credit Card" },
      { name: "two-credit-cart", label: "Cards" },
      { name: "bill", label: "Bill" },
      { name: "receipt-square", label: "Receipt" },
      { name: "purchase", label: "Purchase" },
      { name: "bank", label: "Bank" },
      { name: "finance-calculator", label: "Calculator" },
    ],
  },
  {
    label: "Office & Tech",
    icons: [
      { name: "laptop", label: "Laptop" },
      { name: "phone", label: "Phone" },
      { name: "devices", label: "Devices" },
      { name: "printer", label: "Printer" },
      { name: "screen", label: "Monitor" },
      { name: "briefcase", label: "Briefcase" },
      { name: "technology", label: "Technology" },
      { name: "electricity", label: "Electricity" },
    ],
  },
  {
    label: "Shopping",
    icons: [
      { name: "shop", label: "Shop" },
      { name: "gift", label: "Gift" },
      { name: "package", label: "Package" },
      { name: "handcart", label: "Cart" },
      { name: "delivery-geolocation", label: "Delivery" },
      { name: "lots-shopping", label: "Shopping" },
    ],
  },
  {
    label: "Health & Education",
    icons: [
      { name: "pill", label: "Medicine" },
      { name: "book", label: "Book" },
      { name: "book-open", label: "Study" },
      { name: "book-square", label: "Education" },
      { name: "educare", label: "Training" },
      { name: "people", label: "Team" },
    ],
  },
];

const ALL_SYSTEM_ICONS = SYSTEM_ICON_GROUPS.flatMap((g) =>
  g.icons.map((i) => ({ ...i, group: g.label }))
);

// ─── Remote icon types ────────────────────────────────────────────────────────

interface RemoteIcon {
  name: string;
  url: string;
  label: string;
}

// ─── Iconify API ──────────────────────────────────────────────────────────────

async function searchIconify(query: string): Promise<RemoteIcon[]> {
  if (!query.trim()) return [];
  const res = await fetch(
    `https://api.iconify.design/search?query=${encodeURIComponent(query)}&limit=40`
  );
  if (!res.ok) return [];
  const data = await res.json();
  return (data.icons ?? []).map((name: string) => ({
    name,
    url: `https://api.iconify.design/${name.replace(":", "/")}.svg?color=%23181C32`,
    label: name.split(":").pop()?.replace(/-/g, " ") ?? name,
  }));
}


// ─── Shared card styles ───────────────────────────────────────────────────────

const cardBase: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "4px",
  padding: "8px 6px",
  border: "1.5px solid #E4E6EF",
  borderRadius: "10px",
  background: "#FAFAFA",
  cursor: "pointer",
  transition: "all 0.15s ease",
  minWidth: "68px",
  minHeight: "68px",
};

// ─── SystemIconItem ───────────────────────────────────────────────────────────

function SystemIconItem({
  icon,
  isSelected,
  onClick,
}: {
  icon: { name: string; label: string };
  isSelected: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const style: React.CSSProperties = {
    ...cardBase,
    ...(isSelected
      ? { border: "2px solid #3E97FF", background: "#EEF6FF" }
      : hovered
      ? { borderColor: "#3E97FF", background: "#F5F8FF" }
      : {}),
  };

  return (
    <button
      type="button"
      title={icon.label}
      onClick={onClick}
      style={style}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/*
       * ✅ FIX (Image 2 & 3):
       * KTIcon does NOT accept a `style` prop — its Props type only allows
       * className, iconType, iconName. Wrapping it in a <span> handles all
       * positioning / sizing without touching KTIcon's props at all.
       */}
      <span style={{ display: "flex", alignItems: "center", fontSize: "24px", lineHeight: 1 }}>
        <KTIcon iconName={icon.name} className="fs-2x text-gray-700" />
      </span>
      <span style={{ fontSize: "10px", color: "#5E6278", textAlign: "center", lineHeight: 1.2 }}>
        {icon.label}
      </span>
    </button>
  );
}

// ─── RemoteIconItem ───────────────────────────────────────────────────────────

function RemoteIconItem({
  icon,
  isSelected,
  onClick,
}: {
  icon: RemoteIcon;
  isSelected: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const style: React.CSSProperties = {
    ...cardBase,
    ...(isSelected
      ? { border: "2px solid #3E97FF", background: "#EEF6FF" }
      : hovered
      ? { borderColor: "#3E97FF", background: "#F5F8FF" }
      : {}),
  };

  return (
    <button
      type="button"
      title={icon.label}
      onClick={onClick}
      style={style}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <img
        src={icon.url}
        alt={icon.label}
        style={{ width: 28, height: 28, objectFit: "contain" }}
        onError={(e) => {
          (e.target as HTMLImageElement).style.opacity = "0.3";
        }}
      />
      <span
        style={{
          fontSize: "10px",
          color: "#5E6278",
          textAlign: "center",
          lineHeight: 1.2,
          maxWidth: 60,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {icon.label}
      </span>
    </button>
  );
}

// ─── SearchInput ──────────────────────────────────────────────────────────────
// Extracted component so KTIcon never receives a `style` prop.
// The magnifier icon sits inside a <span> that is absolutely positioned —
// KTIcon itself gets only className (which is valid) and nothing else.

function SearchInput({
  value,
  onChange,
  onClear,
  placeholder,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  onClear: () => void;
  placeholder: string;
  autoFocus?: boolean;
}) {
  return (
    <div style={{ position: "relative", marginBottom: "16px" }}>
      {/* ✅ FIX: <span> positioned absolutely — KTIcon has NO style prop */}
      <span
        style={{
          position: "absolute",
          left: 12,
          top: "50%",
          transform: "translateY(-50%)",
          pointerEvents: "none",
          display: "flex",
          alignItems: "center",
        }}
      >
        <KTIcon iconName="magnifier" className="fs-5 text-muted" />
      </span>

      <input
        type="text"
        placeholder={placeholder}
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          padding: "9px 36px 9px 36px",
          border: "1.5px solid #E4E6EF",
          borderRadius: "8px",
          fontSize: "13px",
          color: "#181C32",
          background: "#FAFAFA",
          outline: "none",
        }}
      />

      {value && (
        <button
          type="button"
          onClick={onClear}
          style={{
            position: "absolute",
            right: 10,
            top: "50%",
            transform: "translateY(-50%)",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#A1A5B7",
            padding: 0,
            display: "flex",
            alignItems: "center",
          }}
        >
          <KTIcon iconName="cross" className="fs-6" />
        </button>
      )}
    </div>
  );
}

// ─── EmptyState / LoadingState ────────────────────────────────────────────────

function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div style={{ textAlign: "center", padding: "40px 0", color: "#A1A5B7" }}>
      <span style={{ display: "block", marginBottom: 12 }}>
        <KTIcon iconName={icon} className="fs-2x text-muted" />
      </span>
      <div style={{ fontSize: "13px", marginBottom: subtitle ? 4 : 0 }}>{title}</div>
      {subtitle && <div style={{ fontSize: "11px" }}>{subtitle}</div>}
    </div>
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <div style={{ textAlign: "center", padding: "40px 0", color: "#A1A5B7" }}>
      <span className="spinner-border spinner-border-sm text-primary me-2" />
      {label}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type TabKey = "system" | "iconify";

const TABS: { key: TabKey; label: string; ktIcon: string }[] = [
  { key: "system",   label: "System Icons", ktIcon: "category"  },
  { key: "iconify",  label: "Iconify",      ktIcon: "magnifier" },
];

const IconPickerModal: React.FC<IconPickerModalProps> = ({
  show,
  onHide,
  onSelect,
  currentIcon,
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>("system");

  // System tab
  const [activeGroup, setActiveGroup] = useState(SYSTEM_ICON_GROUPS[0].label);
  const [sysQuery, setSysQuery] = useState("");

  // Iconify tab
  const [iconifyQuery,   setIconifyQuery]   = useState("");
  const [iconifyResults, setIconifyResults] = useState<RemoteIcon[]>([]);
  const [iconifyLoading, setIconifyLoading] = useState(false);
  const [iconifyError,   setIconifyError]   = useState<string | null>(null);

  const [selectedIcon, setSelectedIcon] = useState<SelectedIcon | null>(currentIcon ?? null);

  const iconifyTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset when modal opens
  useEffect(() => {
    if (show) {
      setSelectedIcon(currentIcon ?? null);
      setActiveTab("system");
      setSysQuery("");
      setActiveGroup(SYSTEM_ICON_GROUPS[0].label);
      setIconifyQuery("");  setIconifyResults([]);  setIconifyError(null);
    }
  }, [show]);

  // Debounced Iconify search
  const handleIconifySearch = useCallback((q: string) => {
    setIconifyQuery(q);
    if (iconifyTimer.current) clearTimeout(iconifyTimer.current);
    if (!q.trim()) { setIconifyResults([]); return; }
    iconifyTimer.current = setTimeout(async () => {
      setIconifyLoading(true); setIconifyError(null);
      try {
        const results = await searchIconify(q);
        setIconifyResults(results);
        if (!results.length) setIconifyError("No icons found. Try a different keyword.");
      } catch {
        setIconifyError("Failed to fetch icons. Check your connection.");
      } finally {
        setIconifyLoading(false);
      }
    }, 450);
  }, []);

  // Filtered system icons (when filter input has text)
  const filteredSystem = sysQuery.trim()
    ? ALL_SYSTEM_ICONS.filter(
        (i) =>
          i.label.toLowerCase().includes(sysQuery.toLowerCase()) ||
          i.name.toLowerCase().includes(sysQuery.toLowerCase()) ||
          i.group.toLowerCase().includes(sysQuery.toLowerCase())
      )
    : null;

  const isSystemSelected = (name: string) =>
    selectedIcon?.source === "system" && selectedIcon.name === name;

  const isRemoteSelected = (url: string) =>
    selectedIcon?.source === "iconify" && selectedIcon.url === url;

  const handleConfirm = () => {
    if (selectedIcon) { onSelect(selectedIcon); onHide(); }
  };

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      {/* ── Header ────────────────────────────────────────────────────── */}
      <Modal.Header
        closeButton
        style={{ borderBottom: "1.5px solid #EEF0F8", padding: "20px 24px" }}
      >
        <Modal.Title
          style={{
            fontSize: "16px",
            fontWeight: 700,
            color: "#181C32",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ display: "flex", alignItems: "center" }}>
            <KTIcon iconName="category" className="fs-3 text-primary" />
          </span>
          Choose Icon
        </Modal.Title>
      </Modal.Header>

      <Modal.Body style={{ padding: 0 }}>
        {/* ── Selected preview strip ─────────────────────────────────── */}
        {selectedIcon && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "12px 24px",
              background: "#F8FAFF",
              borderBottom: "1.5px solid #EEF0F8",
            }}
          >
            <div
              style={{
                width: 44, height: 44, borderRadius: "50%",
                background: "#EEF6FF", border: "2px solid #3E97FF",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {selectedIcon.source === "system" ? (
                <KTIcon iconName={selectedIcon.name!} className="fs-2 text-primary" />
              ) : (
                <img
                  src={selectedIcon.url}
                  alt={selectedIcon.label}
                  style={{ width: 26, height: 26, objectFit: "contain" }}
                />
              )}
            </div>
            <div>
              <div style={{ fontSize: "12px", color: "#A1A5B7", marginBottom: 2 }}>
                Selected Icon
              </div>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "#181C32" }}>
                {selectedIcon.label}
              </div>
              <div style={{ fontSize: "11px", color: "#A1A5B7" }}>
                {selectedIcon.source === "system"
                  ? "System Icon"
                  : "Iconify"}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedIcon(null)}
              style={{
                marginLeft: "auto",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#A1A5B7",
                display: "flex",
                alignItems: "center",
              }}
            >
              <KTIcon iconName="cross" className="fs-5" />
            </button>
          </div>
        )}

        {/* ── Tabs ──────────────────────────────────────────────────── */}
        <div style={{ display: "flex", borderBottom: "1.5px solid #EEF0F8", padding: "0 24px" }}>
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: "14px 16px",
                border: "none",
                background: "none",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: activeTab === tab.key ? 700 : 500,
                color: activeTab === tab.key ? "#3E97FF" : "#7E8299",
                borderBottom:
                  activeTab === tab.key ? "2.5px solid #3E97FF" : "2.5px solid transparent",
                marginBottom: "-1.5px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                transition: "all 0.15s",
              }}
            >
              {/* ✅ FIX: span wrapper — KTIcon never gets style prop */}
              <span style={{ display: "flex", alignItems: "center" }}>
                <KTIcon
                  iconName={tab.ktIcon}
                  className={`fs-5 ${activeTab === tab.key ? "text-primary" : "text-muted"}`}
                />
              </span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── System Tab ────────────────────────────────────────────── */}
        {activeTab === "system" && (
          <div style={{ padding: "16px 24px" }}>
            <SearchInput
              value={sysQuery}
              onChange={setSysQuery}
              onClear={() => setSysQuery("")}
              placeholder="Filter icons…"
            />

            {filteredSystem ? (
              filteredSystem.length === 0 ? (
                <EmptyState
                  icon="search-list"
                  title={`No system icons matched "${sysQuery}"`}
                />
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {filteredSystem.map((icon) => (
                    <SystemIconItem
                      key={icon.name}
                      icon={icon}
                      isSelected={isSystemSelected(icon.name)}
                      onClick={() =>
                        setSelectedIcon({ source: "system", name: icon.name, label: icon.label })
                      }
                    />
                  ))}
                </div>
              )
            ) : (
              <>
                {/* Group pills */}
                <div
                  style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "14px" }}
                >
                  {SYSTEM_ICON_GROUPS.map((g) => (
                    <button
                      key={g.label}
                      type="button"
                      onClick={() => setActiveGroup(g.label)}
                      style={{
                        padding: "5px 12px",
                        borderRadius: "20px",
                        border: `1.5px solid ${activeGroup === g.label ? "#3E97FF" : "#E4E6EF"}`,
                        background: activeGroup === g.label ? "#EEF6FF" : "#FAFAFA",
                        color: activeGroup === g.label ? "#3E97FF" : "#5E6278",
                        fontSize: "12px",
                        fontWeight: activeGroup === g.label ? 600 : 400,
                        cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>

                {/* Icons grid */}
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "8px",
                    maxHeight: "240px",
                    overflowY: "auto",
                    paddingRight: "4px",
                  }}
                >
                  {SYSTEM_ICON_GROUPS.find((g) => g.label === activeGroup)?.icons.map((icon) => (
                    <SystemIconItem
                      key={icon.name}
                      icon={icon}
                      isSelected={isSystemSelected(icon.name)}
                      onClick={() =>
                        setSelectedIcon({
                          source: "system",
                          name: icon.name,
                          label: icon.label,
                        })
                      }
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Iconify Tab ───────────────────────────────────────────── */}
        {activeTab === "iconify" && (
          <div style={{ padding: "16px 24px" }}>
            <SearchInput
              value={iconifyQuery}
              onChange={handleIconifySearch}
              onClear={() => {
                setIconifyQuery("");
                setIconifyResults([]);
                setIconifyError(null);
              }}
              placeholder="Search icons (e.g. travel, food, hotel)…"
              autoFocus
            />

            {!iconifyQuery && (
              <EmptyState
                icon="magnifier"
                title="Search from thousands of icons"
                subtitle="Try: travel, food, hotel, medical, laptop…"
              />
            )}
            {iconifyLoading && <LoadingState label="Searching icons…" />}
            {iconifyError && !iconifyLoading && (
              <EmptyState icon="information" title={iconifyError} />
            )}
            {!iconifyLoading && iconifyResults.length > 0 && (
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "8px",
                  maxHeight: "280px",
                  overflowY: "auto",
                  paddingRight: "4px",
                }}
              >
                {iconifyResults.map((icon) => (
                  <RemoteIconItem
                    key={icon.name}
                    icon={icon}
                    isSelected={isRemoteSelected(icon.url)}
                    onClick={() =>
                      setSelectedIcon({ source: "iconify", url: icon.url, label: icon.label })
                    }
                  />
                ))}
              </div>
            )}
            <div
              style={{ marginTop: "12px", fontSize: "10px", color: "#C4C8D8", textAlign: "right" }}
            >
              Icons via{" "}
              <a
                href="https://iconify.design"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#C4C8D8" }}
              >
                Iconify
              </a>
            </div>
          </div>
        )}

      </Modal.Body>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <Modal.Footer
        style={{
          borderTop: "1.5px solid #EEF0F8",
          padding: "14px 24px",
          justifyContent: "flex-end",
          gap: "10px",
        }}
      >
        <button
          type="button"
          className="btn btn-light btn-sm"
          onClick={onHide}
          style={{ fontWeight: 600 }}
        >
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={handleConfirm}
          disabled={!selectedIcon}
          style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}
        >
          <span style={{ display: "flex", alignItems: "center" }}>
            <KTIcon iconName="check" className="fs-5" />
          </span>
          Select This Icon
        </button>
      </Modal.Footer>
    </Modal>
  );
};

export default IconPickerModal;
