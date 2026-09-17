import React from "react";
import { Box, Collapse, IconButton, Menu, MenuItem, Stack, Typography } from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import { ToneChip } from "@app/modules/common/components/ui";
import { formatCurrencyDecimal } from "@utils/currency";
import { formatDate, formatDateTime } from "@utils/dateFormats";
import { BillingStatusBadge } from "../components";
import type { ProformaNode, ProformaVersion } from "@services/proformas";

/**
 * One node of the repository tree: a proforma, with its revisions collapsed
 * underneath.
 *
 * Grouping is the point of the page. A flat list of every revision buries the
 * six proformas you care about under twenty rows of history, and makes "how many
 * proformas exist" unanswerable at a glance.
 */

export interface ProformaTreeRowProps {
  node: ProformaNode;
  expanded: boolean;
  onToggle: () => void;
  onOpen: (versionId?: string) => void;
  onAction: (action: VersionAction, version: ProformaVersion) => void;
}

export type VersionAction =
  | "preview" | "download" | "print" | "share" | "compare" | "delete";

const ACTIONS: { key: VersionAction; label: string; icon: string }[] = [
  { key: "preview", label: "Preview", icon: "eye" },
  { key: "download", label: "Download PDF", icon: "file-down" },
  { key: "print", label: "Print", icon: "printer" },
  { key: "share", label: "Copy share link", icon: "link" },
  { key: "compare", label: "Compare with previous", icon: "arrow-two-diagonals" },
  { key: "delete", label: "Delete draft", icon: "trash" },
];

const ProformaTreeRow: React.FC<ProformaTreeRowProps> = ({
  node, expanded, onToggle, onOpen, onAction,
}) => {
  const [menu, setMenu] = React.useState<{ el: HTMLElement; version: ProformaVersion } | null>(null);

  return (
    <Box
      sx={{
        borderRadius: "12px",
        border: (t) => `1px solid ${t.palette.divider}`,
        overflow: "hidden",
        opacity: node.archivedAt ? 0.65 : 1,
      }}
    >
      {/* ── Parent row ──────────────────────────────────────────────────── */}
      <Stack
        direction="row"
        alignItems="center"
        spacing={1.5}
        sx={{
          p: 1.5,
          cursor: "pointer",
          bgcolor: expanded ? "action.hover" : "transparent",
          "&:hover": { bgcolor: "action.hover" },
        }}
        onClick={onToggle}
      >
        <IconButton
          size="small"
          aria-label={expanded ? "Collapse revisions" : "Expand revisions"}
          sx={{ transform: expanded ? "rotate(90deg)" : "none", transition: "transform .15s" }}
        >
          <KTIcon iconName="right" className="fs-6" />
        </IconButton>

        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography sx={{ fontSize: 13.5, fontWeight: 700 }}>{node.documentNumber}</Typography>
            <ToneChip
              tone="indigo"
              label={`v${node.currentVersionNumber ?? node.versionCount} of ${node.versionCount}`}
              dense
            />
            {node.currentStatus && <BillingStatusBadge status={node.currentStatus} />}
            {node.archivedAt && <ToneChip tone="neutral" label="Archived" dense />}
          </Stack>
          <Typography sx={{ fontSize: 11.5, color: "text.secondary" }} noWrap>
            {node.projectName ?? "—"} · {node.clientName ?? "—"}
            {node.billingRequestNumber ? ` · ${node.billingRequestNumber}` : ""}
          </Typography>
        </Box>

        <Box sx={{ textAlign: "right", flexShrink: 0 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
            {formatCurrencyDecimal(Number(node.grandTotal))}
          </Typography>
          <Typography sx={{ fontSize: 11, color: "text.secondary" }}>
            {formatDate(node.issueDate)}
          </Typography>
        </Box>

        <IconButton
          size="small"
          aria-label="Open proforma"
          onClick={(event) => { event.stopPropagation(); onOpen(); }}
        >
          <KTIcon iconName="exit-right-corner" className="fs-5" />
        </IconButton>
      </Stack>

      {/* ── Revisions ───────────────────────────────────────────────────── */}
      <Collapse in={expanded} unmountOnExit>
        <Box sx={{ borderTop: (t) => `1px solid ${t.palette.divider}` }}>
          {node.versions.map((version) => (
            <Stack
              key={version.id}
              direction="row"
              alignItems="center"
              spacing={1.5}
              sx={{
                px: 1.5, py: 1,
                pl: 5.5,
                borderTop: (t) => `1px solid ${t.palette.divider}`,
                // The current revision is the one anybody acts on; the rest are
                // history and are visually recessive on purpose.
                bgcolor: version.isCurrent ? "action.selected" : "transparent",
                "&:first-of-type": { borderTop: 0 },
              }}
            >
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
                  <Typography sx={{ fontSize: 12.5, fontWeight: version.isCurrent ? 700 : 500 }}>
                    Version {version.versionNumber}
                  </Typography>
                  {version.isCurrent && <ToneChip tone="brand" label="Current" dense />}
                  <BillingStatusBadge status={version.status} />
                </Stack>
                <Typography sx={{ fontSize: 11, color: "text.secondary" }} noWrap>
                  {version.createdByName ?? "—"} · {formatDateTime(version.createdAt)}
                  {version.changeNote ? ` · ${version.changeNote}` : ""}
                </Typography>
              </Box>

              <Typography sx={{ fontSize: 12, color: "text.secondary", flexShrink: 0 }}>
                {formatCurrencyDecimal(Number(node.grandTotal))}
              </Typography>

              <IconButton
                size="small"
                aria-label={`Actions for version ${version.versionNumber}`}
                onClick={(event) => setMenu({ el: event.currentTarget, version })}
              >
                <KTIcon iconName="dots-vertical" className="fs-5" />
              </IconButton>
            </Stack>
          ))}
        </Box>
      </Collapse>

      <Menu
        anchorEl={menu?.el}
        open={!!menu}
        onClose={() => setMenu(null)}
        slotProps={{ paper: { sx: { minWidth: 200 } } }}
      >
        {ACTIONS.filter((action) => action.key !== "delete" || menu?.version.canDelete).map((action) => (
          <MenuItem
            key={action.key}
            sx={{ fontSize: 12.5, gap: 1 }}
            onClick={() => {
              if (menu) onAction(action.key, menu.version);
              setMenu(null);
            }}
          >
            <KTIcon iconName={action.icon} className="fs-6" />
            {action.label}
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
};

export default ProformaTreeRow;
