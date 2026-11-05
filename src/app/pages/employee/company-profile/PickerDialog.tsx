import type { ReactNode } from "react";
import { X } from "lucide-react";
import { DialogContent } from "@mui/material";
import ReorderableGroup, {
  DragHandle,
  nudgeItems,
} from "@app/modules/common/components/ReorderableGroup";
import {
  FORM_SPACE,
  GlassDialog,
  GlassDialogActions,
  GlassHeader,
  WtButton,
  WtField,
} from "@app/modules/common/components/ui";
import { Button } from "@/ds/ui/button";
import { Item } from "@/ds/ui/item";

/*
 * Rows are the kit's `Item` and the tile's border is `border-1` (width only): Bootstrap's `.border` is an
 * !important shorthand that would force its own colour, so a selected tile would lose its primary border.
 * Text sizes sit on spans and are one step up from the prototype's (app root font 13px; see DeckStage).
 */

export type PickedItem = { id: string; label: string };

/** A pickable tile: pressed when selected, numbered with its place in the slide order. */
export function PickTile({
  pos,
  disabled,
  onToggle,
  children,
}: {
  pos: number;
  disabled?: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pos > 0}
      disabled={disabled}
      onClick={onToggle}
      className="relative w-full overflow-hidden rounded-xl! border border-border bg-card text-left outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 aria-pressed:border-primary aria-pressed:ring-2 aria-pressed:ring-primary"
    >
      {children}
      {pos > 0 && (
        <span className="absolute top-1.5 right-1.5 grid size-6 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
          {pos}
        </span>
      )}
    </button>
  );
}

/** The picked items in slide order: drag a row (or focus its grip and use the arrow keys) to reorder, × to drop it. */
function SelectedOrder({
  items,
  onChange,
}: {
  items: PickedItem[];
  onChange: (ids: string[]) => void;
}) {
  const ids = items.map((i) => i.id);
  return (
    <section
      aria-label="Selected order"
      className="flex flex-col gap-2 lg:sticky lg:top-0"
    >
      <p className="text-base font-semibold">Selected order</p>
      {items.length ? (
        <ReorderableGroup
          items={items}
          getItemId={(i) => i.id}
          onReorder={(next) => onChange(next.map((i) => i.id))}
          axis="y"
          withHandle
          className="flex flex-col gap-1"
          renderItem={(item, handleProps) => {
            const i = ids.indexOf(item.id);
            return (
              <Item
                variant="outline"
                size="xs"
                className="flex-nowrap gap-1.5 rounded-lg bg-card p-1 pr-1.5"
              >
                <DragHandle
                  handleProps={handleProps}
                  disabled={items.length < 2}
                  onNudge={(d) => onChange(nudgeItems(ids, i, d))}
                  title={`Drag to reorder ${item.label}`}
                />
                <span className="w-5 shrink-0 text-center text-sm font-bold text-muted-foreground tabular-nums">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-base">
                  {item.label}
                </span>
                <Button
                  size="icon-xs"
                  variant="ghost"
                  aria-label={`Remove ${item.label}`}
                  onClick={() => onChange(ids.filter((x) => x !== item.id))}
                >
                  <X />
                </Button>
              </Item>
            );
          }}
        />
      ) : (
        <p className="text-base text-muted-foreground">Nothing selected yet.</p>
      )}
    </section>
  );
}

/**
 * The shell both section pickers share: slide title, search, the tiles (`children`, as `<li>`s), the
 * selected order and the save summary. The pickers own the draft and decide what can be picked.
 */
export function PickerDialog({
  heading,
  subtitle,
  title,
  onTitle,
  query,
  onQuery,
  selected,
  onSelected,
  summary,
  canSave,
  onSave,
  onClose,
  children,
}: {
  heading: string;
  subtitle: string;
  title: string;
  onTitle: (title: string) => void;
  query: string;
  onQuery: (query: string) => void;
  selected: PickedItem[];
  onSelected: (ids: string[]) => void;
  summary: string;
  canSave: boolean;
  onSave: () => void;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <GlassDialog
      open
      onClose={onClose}
      maxWidth="lg"
      preset="workspace"
      header={
        <GlassHeader
          title={heading}
          subtitle={subtitle}
          icon="pencil"
          onClose={onClose}
        />
      }
    >
      <DialogContent
        sx={{
          p: FORM_SPACE.bodyPad,
          flex: "1 1 auto",
          minHeight: 0,
          overflowY: "auto",
          overscrollBehavior: "contain",
        }}
      >
        <div className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <WtField
              label="Slide title"
              value={title}
              onChange={(v) => onTitle(String(v))}
            />
            <WtField
              label="Search"
              value={query}
              onChange={(v) => onQuery(String(v))}
            />
          </div>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] content-start gap-3">
              {children}
            </ul>
            <SelectedOrder items={selected} onChange={onSelected} />
          </div>
        </div>
      </DialogContent>
      <GlassDialogActions sx={{ flexWrap: "wrap" }}>
        <span
          className="mr-auto text-base text-muted-foreground"
          data-testid="picker-summary"
        >
          {summary}
        </span>
        <WtButton ghost onClick={onClose}>
          Cancel
        </WtButton>
        <WtButton tone="accent" disabled={!canSave} onClick={onSave}>
          Save section
        </WtButton>
      </GlassDialogActions>
    </GlassDialog>
  );
}
