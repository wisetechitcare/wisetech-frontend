import { getCourtesyDeskState } from "../store/courtesyDeskStore";
import type { CourtesyDrive, CourtesyRecipient } from "../types";
import {
  deliveryStatusLabel,
  DELIVERY_MODE_LABELS,
  type CourtesyConfig,
} from "../types";

export type ExportScope = "ALL" | "PENDING" | "DELIVERED";

export interface ExportRow {
  name: string;
  source: string;
  company: string;
  areaAddress: string;
  gift: string;
  quantity: number;
  status: string;
  mode: string;
  assignee: string;
  remark: string;
}

function filterRecipients(
  drive: CourtesyDrive,
  scope: ExportScope,
): CourtesyRecipient[] {
  switch (scope) {
    case "ALL":
      return drive.recipients;
    case "PENDING":
      return drive.recipients.filter((r) => r.status === "PENDING");
    case "DELIVERED":
      return drive.recipients.filter((r) => r.status === "DELIVERED");
    default: {
      const _exhaustive: never = scope;
      return _exhaustive;
    }
  }
}

export function buildExportRows(
  drive: CourtesyDrive,
  scope: ExportScope = "ALL",
  config?: CourtesyConfig,
): ExportRow[] {
  const cfg = config;
  return filterRecipients(drive, scope).map((r) => ({
    name: r.fullName,
    source: r.memberType === "CONTACT" ? "Contact" : "Employee",
    company: r.companyName || "—",
    areaAddress: [r.area, r.address].filter(Boolean).join(" · ") || "—",
    gift: drive.giftItem,
    quantity: r.quantity ?? 1,
    status: cfg ? deliveryStatusLabel(cfg, r.status) : r.status,
    mode: DELIVERY_MODE_LABELS[r.mode],
    assignee: r.assigneeName || "—",
    remark: r.remark || "—",
  }));
}

export function exportFilename(drive: CourtesyDrive) {
  const safe = drive.title
    .replace(/[^\w\-]+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 60);
  const day = (drive.driveDate || drive.createdAt).slice(0, 10);
  return `${safe}_${day}`;
}

export function downloadCsv(drive: CourtesyDrive, scope: ExportScope = "ALL") {
  const rows = buildExportRows(drive, scope, getCourtesyDeskState().config);
  const headers = [
    "Name",
    "Source",
    "Company",
    "Area/Address",
    "Gift",
    "Qty",
    "Status",
    "Mode",
    "Assignee",
    "Remark",
  ];
  const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const lines = [
    headers.join(","),
    ...rows.map((r) =>
      [
        r.name,
        r.source,
        r.company,
        r.areaAddress,
        r.gift,
        r.quantity,
        r.status,
        r.mode,
        r.assignee,
        r.remark,
      ]
        .map(escape)
        .join(","),
    ),
  ];
  const blob = new Blob([lines.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${exportFilename(drive)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadPdf(
  drive: CourtesyDrive,
  scope: ExportScope = "ALL",
) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const rows = buildExportRows(drive, scope, getCourtesyDeskState().config);
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(14);
  doc.text(drive.title, 14, 16);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(
    `${drive.giftItem} · ${drive.sourceGroupName} · ${(drive.driveDate || "").slice(0, 10)}`,
    14,
    23,
  );

  autoTable(doc, {
    startY: 28,
    head: [
      [
        "Name",
        "Source",
        "Company",
        "Area/Address",
        "Qty",
        "Status",
        "Mode",
        "Assignee",
        "Remark",
      ],
    ],
    body: rows.map((r) => [
      r.name,
      r.source,
      r.company,
      r.areaAddress,
      String(r.quantity),
      r.status,
      r.mode,
      r.assignee,
      r.remark,
    ]),
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [16, 128, 98] },
    alternateRowStyles: { fillColor: [245, 250, 248] },
  });

  doc.save(`${exportFilename(drive)}.pdf`);
}
