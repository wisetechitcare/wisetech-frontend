import { Box, MenuItem, Select, Typography, useMediaQuery, useTheme } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { KTIcon } from '@metronic/helpers';
import { ELLIPSIS, pageWindow } from './pageWindow';

/**
 * Numbered page control — `‹ 1 2 3 ›` with a per-page selector and a range
 * readout.
 *
 * The **standard pager for any view that is not a MaterialTable** (card grids,
 * tiles, timelines). MaterialTable draws its own footer; this is for everything
 * that pages server-side without the table engine, so those views get numbered
 * pages instead of MUI's stock "1–25 of 63 ‹ ›", which only walks one step at a
 * time and never tells you how many pages there are.
 *
 * Presentational and fully controlled — it owns no page state, does no fetching,
 * and is 0-INDEXED throughout (`pageIndex`), matching `useServerPagination`.
 * Page *labels* are 1-based; that conversion happens here and nowhere else.
 */

export interface PagerProps {
  /** 0-based. */
  pageIndex: number;
  pageSize: number;
  /** Total matching records across all pages — from the server, never `rows.length`. */
  totalRecords: number;
  /** Receives a 0-based index. */
  onPageChange: (pageIndex: number) => void;
  /**
   * Per-page selector. Omit either half to hide it.
   *
   * Keep the options within the API's own cap — a size the server clamps is worse
   * than one that is not offered, because the client then pages against a size it
   * never actually received.
   */
  pageSizeOptions?: readonly number[];
  onPageSizeChange?: (pageSize: number) => void;
  /** Plural noun for the readout, e.g. "employees". */
  itemNoun?: string;
  sx?: SxProps<Theme>;
}

const CELL = { xs: 30, sm: 34 };

const cellSx = {
  display: 'inline-grid',
  placeItems: 'center',
  width: CELL,
  height: CELL,
  flexShrink: 0,
  p: 0,
  border: 0,
  borderRadius: '9px',
  fontSize: { xs: 12.5, sm: 13 },
  fontWeight: 600,
  fontVariantNumeric: 'tabular-nums',
  lineHeight: 1,
} as const;

const StepButton = ({
  icon,
  label,
  disabled,
  onClick,
}: {
  icon: string;
  label: string;
  disabled: boolean;
  onClick: () => void;
}) => (
  <Box
    component="button"
    type="button"
    aria-label={label}
    title={label}
    disabled={disabled}
    onClick={onClick}
    sx={{
      ...cellSx,
      // Metronic's unlayered Bootstrap button rules outrank a utility class, so the
      // radius and background have to be stated in `sx` to hold.
      border: 1,
      borderColor: 'divider',
      bgcolor: 'background.paper',
      color: 'text.secondary',
      cursor: 'pointer',
      transition: 'background-color .12s ease, color .12s ease, border-color .12s ease',
      '&:hover:not(:disabled)': { bgcolor: 'action.hover', color: 'text.primary' },
      '&:disabled': { opacity: 0.4, cursor: 'not-allowed' },
    }}
  >
    <KTIcon iconName={icon} className="fs-5" />
  </Box>
);

export function Pager({
  pageIndex,
  pageSize,
  totalRecords,
  onPageChange,
  pageSizeOptions,
  onPageSizeChange,
  itemNoun = 'results',
  sx,
}: PagerProps) {
  // noSsr: otherwise the first render reports desktop and the pager visibly
  // re-lays-out from 5 pills to 7 the moment the effect corrects it.
  const isPhone = useMediaQuery(useTheme().breakpoints.down('sm'), { noSsr: true });
  const pageCount = Math.max(1, Math.ceil(totalRecords / Math.max(1, pageSize)));
  // One sibling on a phone keeps the row from wrapping at 360px; two on desktop.
  const pages = pageWindow(pageIndex, pageCount, isPhone ? 1 : 2);

  // Clamped so an over-fetched or stale index cannot print "showing 51–75 of 63".
  const first = totalRecords === 0 ? 0 : pageIndex * pageSize + 1;
  const last = Math.min((pageIndex + 1) * pageSize, totalRecords);

  const showSizes = Boolean(pageSizeOptions?.length && onPageSizeChange);

  return (
    <Box
      sx={[{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 1.5,
        mt: 2,
      }, ...(Array.isArray(sx) ? sx : [sx])] as SxProps<Theme>}
    >
      {/* Left: how much of what you are looking at. */}
      <Typography sx={{ fontSize: 12.5, color: 'text.secondary', order: { xs: 2, sm: 0 } }}>
        {totalRecords === 0
          ? `No ${itemNoun}`
          : <>Showing <Box component="strong" sx={{ color: 'text.primary' }}>{first}–{last}</Box> of{' '}
              <Box component="strong" sx={{ color: 'text.primary' }}>{totalRecords}</Box> {itemNoun}</>}
      </Typography>

      {/* Right: the control itself. */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', order: { xs: 1, sm: 0 } }}>
        {showSizes && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Typography component="label" htmlFor="pager-size" sx={{ fontSize: 12.5, color: 'text.secondary', whiteSpace: 'nowrap' }}>
              Per page
            </Typography>
            <Select
              id="pager-size"
              size="small"
              value={pageSize}
              onChange={(event) => onPageSizeChange?.(Number(event.target.value))}
              sx={{
                height: CELL.sm,
                borderRadius: '9px',
                fontSize: 13,
                fontWeight: 600,
                fontVariantNumeric: 'tabular-nums',
                '& .MuiSelect-select': { py: 0, pl: 1.25 },
              }}
            >
              {pageSizeOptions!.map((size) => (
                <MenuItem key={size} value={size} sx={{ fontSize: 13, fontWeight: 600 }}>
                  {size}
                </MenuItem>
              ))}
            </Select>
          </Box>
        )}

        <Box
          component="nav"
          aria-label={`${itemNoun} pages`}
          sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 0.75 } }}
        >
          <StepButton
            icon="black-left"
            label="Previous page"
            disabled={pageIndex <= 0}
            onClick={() => onPageChange(pageIndex - 1)}
          />

          {pages.map((page, slot) =>
            page === ELLIPSIS ? (
              <Box
                key={`gap-${slot}`}
                aria-hidden
                sx={{ ...cellSx, color: 'text.disabled', letterSpacing: '0.06em' }}
              >
                ···
              </Box>
            ) : (
              <Box
                key={page}
                component="button"
                type="button"
                // The selected page is otherwise signalled by fill alone — invisible
                // to a screen reader, and to anyone who cannot pick out the navy.
                aria-label={`Page ${page + 1}`}
                aria-current={page === pageIndex ? 'page' : undefined}
                onClick={() => onPageChange(page)}
                sx={{
                  ...cellSx,
                  cursor: 'pointer',
                  transition: 'background-color .12s ease, color .12s ease',
                  ...(page === pageIndex
                    ? {
                        // Brand navy, as the table footer marks its active page.
                        bgcolor: '#1E3A8A',
                        color: '#FFFFFF',
                        fontWeight: 700,
                        boxShadow: '0 2px 6px rgba(30, 58, 138, 0.30)',
                      }
                    : {
                        border: 1,
                        borderColor: 'divider',
                        bgcolor: 'background.paper',
                        color: 'text.primary',
                        '&:hover': { bgcolor: 'action.hover' },
                      }),
                }}
              >
                {page + 1}
              </Box>
            ),
          )}

          <StepButton
            icon="black-right"
            label="Next page"
            disabled={pageIndex >= pageCount - 1}
            onClick={() => onPageChange(pageIndex + 1)}
          />
        </Box>
      </Box>
    </Box>
  );
}

export default Pager;
