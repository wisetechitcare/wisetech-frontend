import React, { useState } from "react";
import {
  Stack, Tooltip, Menu, MenuItem, ListItemIcon, ListItemText, Divider,
} from "@mui/material";
import { Button } from "@/ds/ui/button";
import DownloadIcon from "@mui/icons-material/Download";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import TableChartIcon from "@mui/icons-material/TableChart";
import GridOnIcon from "@mui/icons-material/GridOn";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import PrintIcon from "@mui/icons-material/Print";
import ExportButton, { exportXlsx, exportCsv, type ExportColumn } from "@app/modules/common/components/ExportButton";
import { getCurrencySymbol, getCurrencyLocale } from "@utils/currency";

/**
 * Export + print, shared by every report page.
 *
 * On a report with server-side pagination, `data` is only the rows on
 * screen — exporting that would silently drop everything outside the current
 * page even though the filters say otherwise. When a report passes
 * `fetchAll`, the toolbar calls it to pull every row the applied filters
 * match (uncapped page size) before handing off to the SAME `exportXlsx` /
 * `exportCsv` functions `ExportButton` uses — reused, not reimplemented — so
 * the styled workbook output is identical either way.
 */
export interface ReportExportToolbarProps<T> {
  data: T[];
  columns: ExportColumn<T>[];
  filename: string;
  title: string;
  subtitle?: string;
  showTotals?: boolean;
  /** Pulls the FULL filtered dataset (ignoring on-screen pagination) for export. */
  fetchAll?: () => Promise<T[]>;
}

async function exportPdf<T>(data: T[], columns: ExportColumn<T>[], filename: string, title: string, subtitle: string) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const doc = new jsPDF({ orientation: columns.length > 6 ? "landscape" : "portrait" });

  doc.setFontSize(16);
  doc.text(title, 14, 16);
  if (subtitle) {
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(subtitle, 14, 23);
  }

  const cols = columns.filter((c) => !c.xlsSkip);
  const getRaw = (row: T, col: ExportColumn<T>) =>
    col.key.split(".").reduce<any>((v, k) => v?.[k], row);

  autoTable(doc, {
    startY: subtitle ? 28 : 22,
    head: [cols.map((c) => c.header)],
    body: data.map((row) => cols.map((col) => {
      const raw = getRaw(row, col);
      if (col.format) return col.format(raw, row);
      if (raw === null || raw === undefined || raw === "") return "-";
      if (col.type === "currency") return `${getCurrencySymbol()}${Number(raw).toLocaleString(getCurrencyLocale(), { minimumFractionDigits: 2 })}`;
      return String(raw);
    })),
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [30, 58, 95] },
    alternateRowStyles: { fillColor: [248, 250, 253] },
  });

  doc.save(`${filename}.pdf`);
}

function ReportExportToolbar<T>({
  data, columns, filename, title, subtitle = "", showTotals, fetchAll,
}: ReportExportToolbarProps<T>) {
  const [loading, setLoading] = useState<"xlsx" | "csv" | "pdf" | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const resolveData = async (): Promise<T[]> => (fetchAll ? fetchAll() : data);

  const run = async (type: "xlsx" | "csv" | "pdf") => {
    setAnchorEl(null);
    setLoading(type);
    try {
      const rows = await resolveData();
      if (type === "xlsx") await exportXlsx(rows, columns, filename, title, subtitle, "Sheet1", !!showTotals, "TOTAL");
      else if (type === "csv") exportCsv(rows, columns, filename, title, !!showTotals, "TOTAL");
      else await exportPdf(rows, columns, filename, title, subtitle);
    } finally {
      setLoading(null);
    }
  };

  // No server-side "export everything" needed — the small, already-loaded
  // page is the whole dataset, so the app's existing ExportButton is enough.
  if (!fetchAll) {
    return (
      <Stack direction="row" spacing={0.75} alignItems="center">
        <ExportButton data={data} columns={columns} filename={filename} title={title} subtitle={subtitle} showTotals={showTotals} />
        <Tooltip title="Export PDF">
          <span>
            <Button
              variant="outline" size="icon-sm" aria-label="Export PDF"
              onClick={() => run("pdf")} disabled={loading !== null} loading={loading === "pdf"}
            >
              <PictureAsPdfIcon sx={{ fontSize: 18, color: "#dc2626" }} />
            </Button>
          </span>
        </Tooltip>
        <Tooltip title="Print">
          <Button variant="outline" size="icon-sm" aria-label="Print" onClick={() => window.print()}>
            <PrintIcon sx={{ fontSize: 18 }} />
          </Button>
        </Tooltip>
      </Stack>
    );
  }

  const exporting = !!loading && loading !== "pdf";

  return (
    <Stack direction="row" spacing={0.75} alignItems="center">
      {/* Split button: both halves open the same format menu. */}
      <div className="inline-flex">
        <Button
          variant="outline" size="sm" className="rounded-r-none"
          disabled={loading !== null} loading={exporting}
          onClick={(e) => setAnchorEl(e.currentTarget)}
        >
          {!exporting && <DownloadIcon data-icon="inline-start" sx={{ fontSize: 16 }} />}
          {exporting ? "Exporting…" : "Export"}
        </Button>
        <Button
          variant="outline" size="icon-sm" className="-ml-px rounded-l-none" aria-label="Choose export format"
          disabled={loading !== null}
          onClick={(e) => setAnchorEl(e.currentTarget)}
        >
          <ArrowDropDownIcon sx={{ fontSize: 20 }} />
        </Button>
      </div>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
        <MenuItem onClick={() => run("xlsx")}>
          <ListItemIcon><TableChartIcon sx={{ fontSize: 18, color: "#1d6f42" }} /></ListItemIcon>
          <ListItemText primary="Excel (.xlsx)" secondary="All filtered rows" />
        </MenuItem>
        <Divider sx={{ my: 0.25 }} />
        <MenuItem onClick={() => run("csv")}>
          <ListItemIcon><GridOnIcon sx={{ fontSize: 18, color: "#0369a1" }} /></ListItemIcon>
          <ListItemText primary="CSV (.csv)" secondary="All filtered rows" />
        </MenuItem>
      </Menu>
      <Tooltip title="Export PDF">
        <span>
          <Button
            variant="outline" size="icon-sm" aria-label="Export PDF"
            onClick={() => run("pdf")} disabled={loading !== null} loading={loading === "pdf"}
          >
            <PictureAsPdfIcon sx={{ fontSize: 18, color: "#dc2626" }} />
          </Button>
        </span>
      </Tooltip>
      <Tooltip title="Print">
        <Button variant="outline" size="icon-sm" aria-label="Print" onClick={() => window.print()}>
          <PrintIcon sx={{ fontSize: 18 }} />
        </Button>
      </Tooltip>
    </Stack>
  );
}

export default ReportExportToolbar;
