import React, { useRef } from 'react';
import { Reorder, useDragControls } from 'framer-motion';

/** Props passed to a drag handle element when `withHandle` is on. Spread onto the grip:
 *  `<span {...handleProps}>≡</span>`. Only pointer-down on the handle starts a drag, so the rest
 *  of the item (buttons, toggles, links) stays fully interactive. */
export interface DragHandleProps {
  onPointerDown: (e: React.PointerEvent) => void;
  style: React.CSSProperties;
}

/**
 * ReorderableGroup — a reusable, smooth drag-to-reorder container.
 *
 * Wraps any list of items so the user can drag them into a new order. Built on
 * framer-motion's `Reorder` (GPU-accelerated FLIP animation = no lag, no layout
 * jank). Layout-agnostic: pass your own `className` on the group and `itemStyle`
 * on each item, so it slots into an existing flex/grid row without changing the
 * visual structure.
 *
 * Design notes
 * - Items are tracked by a STABLE string id (`getItemId`), not object identity,
 *   so the list can re-render with fresh data (e.g. live stats) without breaking
 *   the drag state.
 * - A drag suppresses the trailing click, so cards that are also clickable don't
 *   fire their onClick after being dragged.
 * - `disabled` renders a plain container (same markup, no dragging) for places
 *   that only sometimes want reordering.
 */
export interface ReorderableGroupProps<T> {
  items: T[];
  getItemId: (item: T) => string;
  onReorder: (items: T[]) => void;
  /** `handleProps` is provided only when `withHandle` is on — spread it onto your grip element. */
  renderItem: (item: T, handleProps?: DragHandleProps) => React.ReactNode;
  axis?: 'x' | 'y';
  /** Applied to the group container (use this to keep the existing flex/grid layout). */
  className?: string;
  /** Applied to every draggable item wrapper (sizing so it matches the original child). */
  itemClassName?: string;
  itemStyle?: React.CSSProperties;
  /** When true, items render statically without drag behaviour. */
  disabled?: boolean;
  /** Handle-only mode: dragging starts ONLY from the grip element the item renders with
   *  `handleProps`. Use for items that contain their own buttons/toggles/links. */
  withHandle?: boolean;
}

function ReorderableGroup<T>({
  items,
  getItemId,
  onReorder,
  renderItem,
  axis = 'x',
  className,
  itemClassName,
  itemStyle,
  disabled = false,
  withHandle = false,
}: ReorderableGroupProps<T>) {
  const ids = items.map(getItemId);
  const byId = new Map(items.map((it) => [getItemId(it), it]));

  const handleReorder = (newIds: string[]) => {
    onReorder(newIds.map((id) => byId.get(id)).filter(Boolean) as T[]);
  };

  if (disabled) {
    return (
      <div className={className}>
        {items.map((it) => (
          <div key={getItemId(it)} className={itemClassName} style={itemStyle}>
            {renderItem(it)}
          </div>
        ))}
      </div>
    );
  }

  return (
    <Reorder.Group
      as="div"
      axis={axis}
      values={ids}
      onReorder={handleReorder}
      className={className}
      style={{ listStyle: 'none', margin: 0, padding: 0 }}
    >
      {ids.map((id) => {
        const item = byId.get(id) as T;
        return (
          <ReorderableItem
            key={id}
            id={id}
            className={itemClassName}
            style={itemStyle}
            withHandle={withHandle}
            renderItem={(handleProps) => renderItem(item, handleProps)}
          />
        );
      })}
    </Reorder.Group>
  );
}

function ReorderableItem({
  id,
  className,
  style,
  withHandle,
  renderItem,
}: {
  id: string;
  className?: string;
  style?: React.CSSProperties;
  withHandle: boolean;
  renderItem: (handleProps?: DragHandleProps) => React.ReactNode;
}) {
  // Track whether the pointer interaction was a drag, so we can swallow the
  // synthetic click that fires right after a drag (prevents accidental clicks).
  const draggedRef = useRef(false);
  // Handle-only dragging: disable the item's own pointer listener and start drags from the grip.
  const controls = useDragControls();
  const handleProps: DragHandleProps | undefined = withHandle
    ? { onPointerDown: (e) => controls.start(e), style: { cursor: 'grab', touchAction: 'none' } }
    : undefined;

  return (
    <Reorder.Item
      as="div"
      value={id}
      className={className}
      style={{ ...style, cursor: withHandle ? 'default' : 'grab' }}
      dragListener={!withHandle}
      dragControls={withHandle ? controls : undefined}
      whileDrag={{ scale: 1.02, zIndex: 20, boxShadow: '0 12px 28px rgba(0,0,0,0.18)' }}
      transition={{ type: 'spring', stiffness: 600, damping: 40 }}
      onDragStart={() => { draggedRef.current = true; }}
      onDragEnd={() => { window.setTimeout(() => { draggedRef.current = false; }, 0); }}
      onClickCapture={(e: React.MouseEvent) => {
        if (draggedRef.current) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
    >
      {renderItem(handleProps)}
    </Reorder.Item>
  );
}

export default ReorderableGroup;
