import { useState } from "react";
import { Box, ListItemIcon, Menu, MenuItem, Stack, Tooltip, Typography } from "@mui/material";
import { ArrowLeftToLine, ArrowRightToLine, ChevronDown, ChevronUp, Pin, PinOff } from "lucide-react";
import { Button } from "@/ds/ui/button";
import { TRIO, WtButton, WtField, WtSheet, WtSwitch } from "@app/modules/common/components/ui";

/**
 * One pin button per column; the side is picked from a menu with words in it. Two bare icons
 * (arrows, a mini-table glyph) were tried first and nobody could tell them apart.
 * A filled button means the column is pinned.
 */
const PinMenu = ({ column, name, zIndex }: { column: any; name: string; zIndex?: number }) => {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const side: false | "left" | "right" = column.getIsPinned();
  const choose = (next: false | "left" | "right") => {
    column.pin(next);
    setAnchor(null);
  };

  return (
    <>
      <Tooltip title={side ? `Pinned ${side} — click to change` : `Pin ${name}`}>
        <Button
          variant={side ? "default" : "outline"}
          size="icon-sm"
          aria-label={`Pin options for ${name}`}
          aria-haspopup="menu"
          onClick={(e) => setAnchor(e.currentTarget)}
        >
          <Pin size={15} fill={side ? "currentColor" : "none"} />
        </Button>
      </Tooltip>
      <Menu
        anchorEl={anchor}
        open={!!anchor}
        onClose={() => setAnchor(null)}
        // Above the sheet, which can itself be lifted over a drill-down dialog.
        sx={{ zIndex: (zIndex ?? 1300) + 10 }}
      >
        <MenuItem selected={side === "left"} onClick={() => choose("left")}>
          <ListItemIcon><ArrowLeftToLine size={16} /></ListItemIcon>
          Pin to left
        </MenuItem>
        <MenuItem selected={side === "right"} onClick={() => choose("right")}>
          <ListItemIcon><ArrowRightToLine size={16} /></ListItemIcon>
          Pin to right
        </MenuItem>
        {side ? (
          <MenuItem onClick={() => choose(false)}>
            <ListItemIcon><PinOff size={16} /></ListItemIcon>
            Unpin
          </MenuItem>
        ) : null}
      </Menu>
    </>
  );
};

/**
 * Column show / hide / pin workspace for `MaterialTable` — the side-sheet twin of `FilterSheet`,
 * replacing MRT's popover menu. Changes apply live (same as the menu did), so the saved column
 * preferences pick them up through the table's own state. Pinned columns are listed first, in
 * their own section; each row has a pin button that opens a Pin to left / right / Unpin menu.
 */
export function ColumnsSheet({
  table,
  open,
  onClose,
  zIndex,
}: {
  table: any;
  open: boolean;
  onClose: () => void;
  zIndex?: number;
}) {
  const [query, setQuery] = useState("");

  // Re-read every render: the table instance is stable, its state is not.
  const order: string[] = table.getState().columnOrder ?? [];
  const columns: any[] = table
    .getAllLeafColumns()
    .filter((c: any) => c.id !== "mrt-row-spacer" && c.columnDef.columnDefType !== "group");
  if (order.length) {
    const rank = (id: string) => {
      const i = order.indexOf(id);
      return i === -1 ? Number.MAX_SAFE_INTEGER : i;
    };
    columns.sort((a, b) => rank(a.id) - rank(b.id));
  }

  const label = (c: any) =>
    typeof c.columnDef.header === "string" && c.columnDef.header ? c.columnDef.header : c.id;
  const visibleCount = columns.filter((c) => c.getIsVisible()).length;

  const q = query.trim().toLowerCase();
  const shown = q ? columns.filter((c) => label(c).toLowerCase().includes(q)) : columns;
  // Pinned columns in the order the table draws them. That order is the pinning array's, not
  // the column order, so moving a column up or down edits that array.
  const pinnedOn = (side: "left" | "right"): any[] =>
    ((table.getState().columnPinning?.[side] ?? []) as string[])
      .map((id) => columns.find((c) => c.id === id))
      .filter(Boolean);
  const pinnedLeft = pinnedOn("left");
  const pinnedRight = pinnedOn("right");
  const matches = (c: any) => !q || label(c).toLowerCase().includes(q);
  const others = shown.filter((c) => !c.getIsPinned());

  const move = (c: any, delta: -1 | 1) => {
    const side = c.getIsPinned();
    if (!side) return;
    const ids = pinnedOn(side).map((p) => p.id);
    const i = ids.indexOf(c.id);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    table.setColumnPinning((prev: any) => ({ ...prev, [side]: ids }));
  };

  /** `order` is set for pinned rows: where the column sits among its side's pinned columns. */
  const row = (c: any, order?: { pos: number; count: number }) => {
    const visible = c.getIsVisible();
    const lockedOn = !c.getCanHide();

    return (
      <Stack
        key={c.id}
        direction="row"
        alignItems="center"
        spacing={1}
        sx={{
          px: 1.5,
          py: 0.75,
          borderRadius: 2,
          border: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
          transition: "background-color .15s",
          "&:hover": { bgcolor: "action.hover" },
        }}
      >
        {order ? (
          <Box
            title={`Position ${order.pos + 1} of ${order.count}`}
            sx={{
              flexShrink: 0,
              width: 22,
              height: 22,
              borderRadius: "50%",
              display: "grid",
              placeItems: "center",
              fontSize: 11.5,
              fontWeight: 800,
              color: "primary.main",
              bgcolor: "action.selected",
            }}
          >
            {order.pos + 1}
          </Box>
        ) : null}
        <Typography
          noWrap
          sx={{
            flex: 1,
            minWidth: 0,
            fontSize: 13.5,
            fontWeight: 600,
            color: visible ? "text.primary" : "text.disabled",
          }}
          title={label(c)}
        >
          {label(c)}
        </Typography>
        {order ? (
          <Stack direction="row" sx={{ flexShrink: 0 }}>
            <Tooltip title="Move up">
              <span>
                <Button variant="ghost" size="icon-sm" disabled={order.pos === 0} aria-label={`Move ${label(c)} up`} onClick={() => move(c, -1)}>
                  <ChevronUp size={16} />
                </Button>
              </span>
            </Tooltip>
            <Tooltip title="Move down">
              <span>
                <Button variant="ghost" size="icon-sm" disabled={order.pos === order.count - 1} aria-label={`Move ${label(c)} down`} onClick={() => move(c, 1)}>
                  <ChevronDown size={16} />
                </Button>
              </span>
            </Tooltip>
          </Stack>
        ) : null}
        {c.getCanPin() ? <PinMenu column={c} name={label(c)} zIndex={zIndex} /> : null}
        <Tooltip title={lockedOn ? "Always shown" : visible ? "Hide column" : "Show column"}>
          <span>
            <WtSwitch
              size="sm"
              checked={visible}
              disabled={lockedOn}
              onChange={() => c.toggleVisibility(!visible)}
              inputProps={{ "aria-label": `Show ${label(c)}` }}
            />
          </span>
        </Tooltip>
      </Stack>
    );
  };

  /** `ranked` is a whole pinned side: rows then show their place in it and can be moved. */
  const section = (title: string, list: any[], ranked?: any[]) =>
    list.length ? (
      <Box>
        <Typography
          sx={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.6, textTransform: "uppercase", color: "text.secondary", mb: 0.75, px: 0.5 }}
        >
          {title} · {list.length}
        </Typography>
        <Stack spacing={0.75}>
          {list.map((c) => row(c, ranked ? { pos: ranked.indexOf(c), count: ranked.length } : undefined))}
        </Stack>
      </Box>
    ) : null;

  return (
    <WtSheet
      open={open}
      onClose={onClose}
      title="Columns"
      description={`${visibleCount} of ${columns.length} columns shown`}
      icon="eye"
      tone={TRIO.blue}
      zIndex={zIndex}
      footer={
        <WtButton fullWidth size="medium" tone="accent" flat={false} onClick={onClose}>
          Done
        </WtButton>
      }
    >
      <Stack spacing={1.5}>
        <WtField
          ariaLabel="Find a column"
          placeholder="Find a column…"
          icon="bi-search"
          value={query}
          onChange={setQuery}
          fullWidth
        />
        {/* flex:1 + minWidth:0 on a wrapper, not fullWidth on the buttons: two width:100% buttons
            in a row overflow the sheet and push "Hide all" off the edge. */}
        <Stack direction="row" spacing={1}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <WtButton ghost fullWidth disabled={visibleCount === columns.length} onClick={() => table.toggleAllColumnsVisible(true)}>
              Show all
            </WtButton>
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <WtButton ghost fullWidth disabled={visibleCount === 0} onClick={() => table.toggleAllColumnsVisible(false)}>
              Hide all
            </WtButton>
          </Box>
        </Stack>
        <Typography sx={{ fontSize: 12, color: "text.secondary", px: 0.5 }}>
          Click the pin on a column to keep it fixed to the left or right edge while you scroll sideways.
          Pinned columns are numbered in the order they appear — use the arrows to reorder them.
        </Typography>
        {section("Pinned to the left", pinnedLeft.filter(matches), pinnedLeft)}
        {section("Pinned to the right", pinnedRight.filter(matches), pinnedRight)}
        {section(pinnedLeft.length + pinnedRight.length ? "Other columns" : "All columns", others)}
        {!shown.length ? (
          <Typography color="text.secondary" sx={{ textAlign: "center", py: 3, fontSize: 13 }}>
            No column matches “{query}”.
          </Typography>
        ) : null}
      </Stack>
    </WtSheet>
  );
}

export default ColumnsSheet;
