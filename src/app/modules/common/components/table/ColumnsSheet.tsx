import { useState } from "react";
import { Box, Stack, Tooltip, Typography } from "@mui/material";
import { TRIO, WtButton, WtField, WtSheet, WtSwitch } from "@app/modules/common/components/ui";

/**
 * Column show / hide workspace for `MaterialTable` — the side-sheet twin of `FilterSheet`,
 * replacing MRT's popover menu. Changes apply live (same as the menu did), so the saved column
 * preferences pick them up through the table's own state. Columns cannot be pinned.
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

  const row = (c: any) => {
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

  const section = (title: string, list: any[]) =>
    list.length ? (
      <Box>
        <Typography
          sx={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.6, textTransform: "uppercase", color: "text.secondary", mb: 0.75, px: 0.5 }}
        >
          {title} · {list.length}
        </Typography>
        <Stack spacing={0.75}>{list.map(row)}</Stack>
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
        <WtButton fullWidth size="medium" tone="primary" flat={false} onClick={onClose}>
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
        <Stack direction="row" spacing={1}>
          <WtButton ghost fullWidth disabled={visibleCount === columns.length} onClick={() => table.toggleAllColumnsVisible(true)}>
            Show all
          </WtButton>
          <WtButton ghost fullWidth onClick={() => table.toggleAllColumnsVisible(false)}>
            Hide all
          </WtButton>
        </Stack>
        {section("All columns", shown)}
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
