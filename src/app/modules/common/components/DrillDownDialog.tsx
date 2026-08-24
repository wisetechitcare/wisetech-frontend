import { Dialog, DialogContent, DialogTitle, IconButton } from "@mui/material";
import type { Breakpoint } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import type { ReactNode } from "react";

export interface DrillDownDialogProps {
  open: boolean;
  onClose: () => void;
  /** Body content — typically a data table that brings its own white surface. */
  children: ReactNode;
  /** Max width of the dialog. Defaults to "lg". */
  maxWidth?: Breakpoint | false;
  /** Cap for the scrollable body height (CSS length). Defaults to "75vh". */
  maxBodyHeight?: string;
  /** Optional utility classes for padding around the body (e.g. "p-2"). */
  bodyClassName?: string;
}

/**
 * Stacking layer for drill-downs.
 *
 * A drill-down is usually opened FROM a chart, and a chart may itself be in a
 * fullscreen overlay (RankedBarChart uses z-index 2000). MUI's default modal
 * layer is 1300, so without this the table opened behind the very chart that
 * launched it — visible in the corner, unreachable, looking like nothing had
 * happened. A dialog opened from a surface must always outrank that surface.
 *
 * Kept below the app's toast/avatar layer (9999+) so feedback still wins.
 */
export const DRILLDOWN_Z_INDEX = 2100;

/**
 * Shared shell for chart drill-down modals.
 *
 * A single owner of the Dialog scaffolding so every drill-down renders on ONE
 * surface: the MUI Dialog Paper already supplies the white background, rounded
 * corners and elevation, so the body must NOT add its own card (a nested
 * `bg-white rounded shadow` produced the "double background") and must NOT
 * constrain its width (`max-w-*xl mx-auto` shrank the table and left gutters).
 * The body fills the Paper edge-to-edge and scrolls vertically within it.
 *
 * Presentational only — callers own their data, events and close logic.
 */
export const DrillDownDialog = ({
  open,
  onClose,
  children,
  maxWidth = "lg",
  maxBodyHeight = "75vh",
  bodyClassName,
}: DrillDownDialogProps) => (
  <Dialog
    open={open}
    onClose={onClose}
    maxWidth={maxWidth}
    fullWidth
    // Applies to the whole modal — Paper AND backdrop — so the dimmed layer
    // covers the fullscreen chart too instead of sliding between them.
    sx={{ zIndex: DRILLDOWN_Z_INDEX }}
  >
    <DialogTitle sx={{ m: 0, p: 0, position: "relative" }}>
      <IconButton
        aria-label="close"
        onClick={onClose}
        sx={{
          position: "absolute",
          right: 8,
          top: 8,
          // Keep the close affordance above the body toolbar once content fills width.
          zIndex: 1,
          color: (theme) => theme.palette.grey[500],
        }}
      >
        <CloseIcon />
      </IconButton>
    </DialogTitle>
    <DialogContent className="!p-0 !shadow-none">
      <div
        className={`w-full overflow-y-auto${bodyClassName ? ` ${bodyClassName}` : ""}`}
        style={{ maxHeight: maxBodyHeight }}
      >
        {children}
      </div>
    </DialogContent>
  </Dialog>
);

export default DrillDownDialog;
