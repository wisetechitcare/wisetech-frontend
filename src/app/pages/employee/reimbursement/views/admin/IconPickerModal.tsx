import React, { useState, useRef, useCallback, useEffect } from "react";
import { Check, Info, LayoutGrid, ListFilter, Search, X } from "lucide-react";
import { cn } from "@/ds/lib/utils";
import { Button } from "@/ds/ui/button";
import { DynamicIcon } from "@/ds/ui/dynamic-icon";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/ds/ui/input-group";
import { Spinner } from "@/ds/ui/spinner";
import { Tabs, TabsList, TabsTrigger } from "@/ds/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/ds/ui/tooltip";
import { EmptyState } from "@/ds/patterns/empty-state";
import { FormDialog } from "@/ds/patterns/form-dialog";

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

// ─── Tiles ────────────────────────────────────────────────────────────────────

/**
 * One pickable icon: the glyph over its name, a square tile. Selected = the brand ring and tint
 * (aria-pressed), the same "chosen" language as the kit's toggles.
 */
function IconTile({
  label,
  selected,
  onClick,
  children,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      data-slot="icon-picker-tile"
      data-wt-control="swatch"
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "flex min-h-[72px] w-[76px] flex-col items-center justify-center gap-1 rounded-2xl border border-border bg-card p-2 text-foreground outline-none transition-colors",
        "hover:border-primary/60 hover:bg-accent/40 focus-visible:ring-3 focus-visible:ring-ring/50",
        selected && "border-primary bg-accent ring-2 ring-primary/30",
      )}
    >
      {children}
      <span className="w-full truncate text-center text-[11px] leading-tight text-muted-foreground">{label}</span>
    </button>
  );
}

// ─── SearchInput ──────────────────────────────────────────────────────────────

/** The kit InputGroup search recipe: a magnifier inside, and a clear button once there is text. */
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
    <InputGroup className="mb-4">
      <InputGroupAddon>
        <Search aria-hidden />
      </InputGroupAddon>
      <InputGroupInput
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <InputGroupAddon align="inline-end">
          <InputGroupButton size="icon-xs" aria-label="Clear search" onClick={onClear}>
            <X aria-hidden />
          </InputGroupButton>
        </InputGroupAddon>
      )}
    </InputGroup>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type TabKey = "system" | "iconify";

/**
 * Choose a category's icon: a curated set of system icons by group, or any icon from Iconify.
 * The kit FormDialog (lg) with Cancel / Select This Icon in its footer.
 */
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
  const [iconifyQuery, setIconifyQuery] = useState("");
  const [iconifyResults, setIconifyResults] = useState<RemoteIcon[]>([]);
  const [iconifyLoading, setIconifyLoading] = useState(false);
  const [iconifyError, setIconifyError] = useState<string | null>(null);

  const [selectedIcon, setSelectedIcon] = useState<SelectedIcon | null>(currentIcon ?? null);

  const iconifyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset when modal opens
  useEffect(() => {
    if (show) {
      setSelectedIcon(currentIcon ?? null);
      setActiveTab("system");
      setSysQuery("");
      setActiveGroup(SYSTEM_ICON_GROUPS[0].label);
      setIconifyQuery(""); setIconifyResults([]); setIconifyError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset on open only, as before
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

  const systemTile = (icon: { name: string; label: string }) => (
    <IconTile
      key={icon.name}
      label={icon.label}
      selected={isSystemSelected(icon.name)}
      onClick={() => setSelectedIcon({ source: "system", name: icon.name, label: icon.label })}
    >
      <DynamicIcon name={icon.name} className="size-[26px]" />
    </IconTile>
  );

  return (
    <FormDialog
      open={show}
      onOpenChange={(open) => { if (!open) onHide(); }}
      size="lg"
      title="Choose Icon"
      icon={<LayoutGrid />}
      subheader={
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)}>
          <TabsList aria-label="Icon source">
            <TabsTrigger value="system"><LayoutGrid aria-hidden /> System Icons</TabsTrigger>
            <TabsTrigger value="iconify"><Search aria-hidden /> Iconify</TabsTrigger>
          </TabsList>
        </Tabs>
      }
      footer={(close) => (
        <div className="flex w-full flex-wrap items-center justify-end gap-2">
          <Button variant="outline" onClick={close}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={!selectedIcon}>
            <Check data-icon="inline-start" aria-hidden /> Select This Icon
          </Button>
        </div>
      )}
    >
      {/* ── Selected preview strip ─────────────────────────────────── */}
      {selectedIcon && (
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-border bg-muted/50 p-3">
          <div
            data-testid="selected-icon-preview"
            className="grid size-11 shrink-0 place-items-center rounded-full bg-accent text-primary ring-2 ring-primary/40"
          >
            {selectedIcon.source === "system" ? (
              <DynamicIcon name={selectedIcon.name!} className="size-[23px]" />
            ) : (
              <img src={selectedIcon.url} alt={selectedIcon.label} className="size-[26px] object-contain" />
            )}
          </div>
          <div className="min-w-0">
            <p className="m-0 text-xs text-muted-foreground">Selected Icon</p>
            <p className="m-0 truncate text-sm font-semibold capitalize">{selectedIcon.label}</p>
            <p className="m-0 text-xs text-muted-foreground">
              {selectedIcon.source === "system" ? "System Icon" : "Iconify"}
            </p>
          </div>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="tinted"
                  size="icon-sm"
                  className="ml-auto [--tint:var(--muted-foreground)]"
                  aria-label="Clear selected icon"
                  onClick={() => setSelectedIcon(null)}
                />
              }
            >
              <X aria-hidden />
            </TooltipTrigger>
            <TooltipContent>Clear selected icon</TooltipContent>
          </Tooltip>
        </div>
      )}

      {/* ── System Tab ────────────────────────────────────────────── */}
      {activeTab === "system" && (
        <div>
          <SearchInput
            value={sysQuery}
            onChange={setSysQuery}
            onClear={() => setSysQuery("")}
            placeholder="Filter icons…"
          />

          {filteredSystem ? (
            filteredSystem.length === 0 ? (
              <EmptyState
                variant="no-match"
                size="sm"
                icon={<ListFilter />}
                title={`No system icons matched "${sysQuery}"`}
              />
            ) : (
              <div className="flex flex-wrap gap-2">{filteredSystem.map(systemTile)}</div>
            )
          ) : (
            <>
              {/* Group pills — one chosen at a time, the kit's pressed (brand) look. */}
              <div role="group" aria-label="Icon groups" className="mb-3.5 flex flex-wrap gap-1.5">
                {SYSTEM_ICON_GROUPS.map((g) => {
                  const active = activeGroup === g.label;
                  return (
                    <Button
                      key={g.label}
                      data-wt-control="chip"
                      size="sm"
                      variant={active ? "default" : "outline"}
                      aria-pressed={active}
                      onClick={() => setActiveGroup(g.label)}
                    >
                      {g.label}
                    </Button>
                  );
                })}
              </div>

              {/* Icons grid */}
              <div className="flex max-h-60 flex-wrap gap-2 overflow-y-auto pr-1">
                {SYSTEM_ICON_GROUPS.find((g) => g.label === activeGroup)?.icons.map(systemTile)}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Iconify Tab ───────────────────────────────────────────── */}
      {activeTab === "iconify" && (
        <div>
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
              size="sm"
              icon={<Search />}
              title="Search From Thousands of Icons"
              description="Try: travel, food, hotel, medical, laptop…"
            />
          )}
          {iconifyLoading && (
            <p role="status" className="m-0 flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Spinner /> Searching icons…
            </p>
          )}
          {iconifyError && !iconifyLoading && (
            <EmptyState variant="no-match" size="sm" icon={<Info />} title={iconifyError} />
          )}
          {!iconifyLoading && iconifyResults.length > 0 && (
            <div className="flex max-h-72 flex-wrap gap-2 overflow-y-auto pr-1">
              {iconifyResults.map((icon) => (
                <IconTile
                  key={icon.name}
                  label={icon.label}
                  selected={isRemoteSelected(icon.url)}
                  onClick={() => setSelectedIcon({ source: "iconify", url: icon.url, label: icon.label })}
                >
                  <img
                    src={icon.url}
                    alt=""
                    className="size-7 object-contain dark:invert"
                    onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }}
                  />
                </IconTile>
              ))}
            </div>
          )}
          <p className="m-0 mt-3 text-right text-[11px] text-muted-foreground">
            Icons via{" "}
            <a href="https://iconify.design" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
              Iconify
            </a>
          </p>
        </div>
      )}
    </FormDialog>
  );
};

export default IconPickerModal;
