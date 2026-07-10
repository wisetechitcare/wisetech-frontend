import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { VariableSizeList, type ListChildComponentProps } from 'react-window';
import type { AppNotification } from '../types';
import type { ListRow } from '../utils';
import { NotificationCard } from './NotificationCard';

const HEADER_HEIGHT = 28;
const ESTIMATED_ITEM = 62;

interface Handlers {
  onActivate: (n: AppNotification) => void;
  onDismiss: (id: string) => void;
  onMarkRead: (id: string) => void;
}

interface Props extends Handlers {
  rows: ListRow[];
}

interface RowData extends Handlers {
  rows: ListRow[];
  setSize: (index: number, size: number) => void;
}

/** A measured row — reports its natural height so the list can size itself. */
function Row({ index, style, data }: ListChildComponentProps<RowData>) {
  const { rows, setSize } = data;
  const row = rows[index];
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (ref.current) setSize(index, ref.current.getBoundingClientRect().height);
  });

  return (
    <div style={style}>
      <div ref={ref}>
        {row.kind === 'header' ? (
          <div className="wt-group-header">
            {row.label}
            {row.count > 0 && <span className="wt-group-header__count">{row.count}</span>}
          </div>
        ) : (
          <NotificationCard
            notification={row.notification}
            onActivate={data.onActivate}
            onDismiss={data.onDismiss}
            onMarkRead={data.onMarkRead}
          />
        )}
      </div>
    </div>
  );
}

/** Viewport-aware max height for the scroll area. */
function computeMaxHeight(): number {
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  return Math.max(200, Math.min(Math.round(vh * 0.52), 520));
}

/**
 * Virtualized notification list. Only visible rows are mounted, so a history of
 * thousands stays smooth. The list sizes itself to its content (capped to the
 * viewport) rather than relying on a flex parent — which avoids the zero-height
 * deadlock a measured flex container hits when the panel shrink-wraps.
 */
export function NotificationList({ rows, ...handlers }: Props) {
  const listRef = useRef<VariableSizeList>(null);
  const sizes = useRef<Record<number, number>>({});
  const [, bump] = useState(0);
  const [maxHeight, setMaxHeight] = useState(computeMaxHeight);

  useEffect(() => {
    const onResize = () => setMaxHeight(computeMaxHeight());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const setSize = useCallback((index: number, size: number) => {
    if (size > 0 && sizes.current[index] !== size) {
      sizes.current[index] = size;
      listRef.current?.resetAfterIndex(index);
      bump((v) => v + 1); // recompute total height once measured
    }
  }, []);

  const getSize = useCallback(
    (index: number) => {
      const cached = sizes.current[index];
      if (cached) return cached;
      return rows[index]?.kind === 'header' ? HEADER_HEIGHT : ESTIMATED_ITEM;
    },
    [rows],
  );

  // Reset cached sizes when the row set changes (filter/search/dismiss).
  useLayoutEffect(() => {
    sizes.current = {};
    listRef.current?.resetAfterIndex(0);
  }, [rows]);

  const itemKey = useCallback((index: number) => rows[index]?.id ?? index, [rows]);

  const totalHeight = rows.reduce((acc, _r, i) => acc + getSize(i), 0);
  const listHeight = Math.min(totalHeight, maxHeight);

  return (
    <div className="wt-panel__list">
      <VariableSizeList
        ref={listRef}
        className="wt-list-scroll"
        height={listHeight}
        width="100%"
        itemCount={rows.length}
        itemSize={getSize}
        estimatedItemSize={ESTIMATED_ITEM}
        itemKey={itemKey}
        itemData={{ rows, setSize, ...handlers }}
        overscanCount={4}
      >
        {Row}
      </VariableSizeList>
    </div>
  );
}
