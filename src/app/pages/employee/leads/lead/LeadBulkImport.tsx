import React, { useCallback, useState } from "react";
import {
  Box,
  CircularProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import {
  GlassDialog,
  GlassHeader,
  GlassSurface,
  ToneChip,
  WtButton,
  WtStepper,
  toneAlpha,
} from "@app/modules/common/components/ui";
import { tonePair } from "@app/theme/tokens";
import { formatDate } from "@utils/dateFormats";
import {
  previewLeadImport,
  executeLeadImport,
  ImportPreviewResult,
  ImportExecuteResult,
} from "@services/LeadImportService";
import { errorConfirmation } from "@utils/modal";
import eventBus from "@utils/EventBus";
import { EVENT_KEYS } from "@constants/eventKeys";
import CsvUploadStep, { type UploadColumn } from "./CsvUploadStep";
import ImportModeSelector, {
  type ImportMode,
} from "./legacy-migration/ImportModeSelector";
import LegacyMigrationWizard from "./legacy-migration/LegacyMigrationWizard";
import { Count, MICRO, NUM } from "./legacy-migration/summaryChrome";

/**
 * Standard bulk lead import — upload, preview, write.
 * Built on the same pieces as the legacy migration wizard next door: GlassDialog +
 * GlassHeader for the shell, the shared CsvUploadStep for file selection, and the same
 * Count-in-a-sentence vocabulary for every number. The two open from one button a click
 * apart and used to be two different designs — react-bootstrap Modal, Bootstrap button
 * classes and light-mode-only hex on this side, the MUI kit on the other.
 * Two invented progress animations are gone with it: a checklist that counted to 100%
 * over a fixed 4.2s regardless of the server, and a cycling "Creating companies…" label.
 * Neither endpoint reports progress, so both screens now show an honest spinner.
 */

interface Props {
  show: boolean;
  onHide: () => void;
}

type Screen = "upload" | "loading" | "preview" | "importing" | "done";

// Grouped the way an operator fills a row in: who/what, then money, then the rest.
// The money group is exactly four columns with no overlap — area, rateType, rate,
// totalCost. There used to be a fifth, `fees`, which wrote to the same database column
// as `rate`; and `cost` sat next to `rate` with nothing saying which was per-unit.
const OPTIONAL_COLS = [
  "prefix",
  "companyName",
  "statusName",
  "category",
  "subcategory",
  "service",
  "assignedTo",
  "inquiryDate",
  "area",
  "rateType",
  "rate",
  "totalCost",
  "poNumber",
  "poDate",
  "country",
  "city",
  "state",
  "notes",
  "description",
  "createdBy",
  "editedBy",
];

/** Labels are the literal CSV headers the parser accepts, so the template matches them. */
const COLUMNS: UploadColumn[] = [
  { key: "title", label: "title", required: true, matchSignal: true },
  ...OPTIONAL_COLS.map((key) => ({ key, label: key })),
];

const RULES = [
  {
    icon: "arrows-circle",
    title: "Update vs Create",
    body: "Rows with a matching Prefix/ID or Title update the existing lead. Rows with no match create a new one.",
  },
  {
    icon: "abstract-26",
    title: "Auto-create entities",
    body: "Unknown Company, Status, Category, or Service values are created automatically during import.",
  },
  {
    icon: "calendar-8",
    title: "Date formats",
    body: "Use DD-MM-YYYY or YYYY-MM-DD for all date columns (Inquiry Date, PO Date, etc.).",
  },
  {
    icon: "chart-simple",
    title: "Rate type decides the total",
    body: "rateType RATE (the default) means totalCost = area × rate, recalculated even if you also supply totalCost. rateType LUMPSUM means you enter totalCost yourself and rate is stored as 0.",
  },
  {
    icon: "receipt-square",
    title: "One column per figure",
    body: "area, rateType, rate and totalCost are the only money columns. A 'Fees' header is read as rate.",
  },
  {
    icon: "information-5",
    title: "Error handling",
    body: "Rows with validation errors are skipped. All valid rows still import successfully.",
  },
];

/** Column headers for the preview table, in render order. */
const PREVIEW_HEADS = [
  "Action",
  "Title",
  "Inquiry date",
  "Category / sub",
  "Company",
  "Status",
  "Assigned to",
  "Area / cost",
];

/** "NEW" marker next to an entity the import will create on the fly. */
function NewMark({ show }: { show?: boolean }) {
  return show ? (
    <ToneChip tone="success" label="NEW" dense sx={{ mt: 0.5, alignSelf: "flex-start" }} />
  ) : null;
}

const LeadBulkImport: React.FC<Props> = ({ show, onHide }) => {
  // null = the mode has not been chosen yet for this opening of the modal.
  const [mode, setMode] = useState<ImportMode | null>(null);
  const [legacyOrganizationId, setLegacyOrganizationId] = useState("");
  const [currentScreen, setCurrentScreen] = useState<Screen>("upload");
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null);
  const [showRules, setShowRules] = useState(false);
  const [importResult, setImportResult] = useState<ImportExecuteResult | null>(
    null,
  );

  const brand = tonePair("brand").fg;
  const success = tonePair("success").fg;
  const danger = tonePair("danger").fg;

  const resetState = useCallback(() => {
    setCurrentScreen("upload");
    setPreview(null);
    setShowRules(false);
    setImportResult(null);
    // Reopening the modal asks which mode again rather than silently reusing
    // whatever was chosen last time.
    setMode(null);
    setLegacyOrganizationId("");
  }, []);

  const handleHide = () => {
    // If we just finished an import, notify the parent to refresh the list
    if (currentScreen === "done") {
      eventBus.emit(EVENT_KEYS.leadCreated, { id: "bulk" });
    }
    resetState();
    onHide();
  };

  const handlePreview = async (file: File) => {
    setCurrentScreen("loading");
    try {
      const result = await previewLeadImport(file);
      setPreview(result);
      setCurrentScreen("preview");
    } catch (err: unknown) {
      setCurrentScreen("upload");
      errorConfirmation(
        err instanceof Error ? err.message : "Failed to parse CSV",
      );
    }
  };

  const handleImport = async () => {
    if (!preview || preview.validRows.length === 0) return;
    setCurrentScreen("importing");
    try {
      const result: any = await executeLeadImport(preview.validRows);
      // Backend returns { message, result: { count, created, updated } }
      setImportResult(result.result || result);
      setCurrentScreen("done");
      // The parent is notified on close, not here — refreshing the list under an
      // open modal reshuffles what the summary is describing.
    } catch (err: unknown) {
      // Back to preview so the table is still there to look at.
      setCurrentScreen("preview");
      errorConfirmation(
        err instanceof Error ? err.message : "Failed to execute import",
      );
    }
  };

  // 0 = Upload, 1 = Validate & preview, 2 = Import
  const stepIndex =
    currentScreen === "upload"
      ? 0
      : currentScreen === "loading" || currentScreen === "preview"
        ? 1
        : 2;

  const newLeads =
    preview?.validRows.filter((r) =>
      r.importAction?.includes("Create new lead"),
    ).length ?? 0;
  const updates =
    preview?.validRows.filter((r) => r.importAction?.includes("Update"))
      .length ?? 0;

  /** "3 new leads and 2 existing leads" — only the halves that actually happen. */
  const previewClauses: JSX.Element[] = [];
  if (newLeads > 0) {
    previewClauses.push(
      <Box component="span" key="create">
        <Count value={newLeads} tone="success" /> new {newLeads === 1 ? "lead" : "leads"}
      </Box>,
    );
  }
  if (updates > 0) {
    previewClauses.push(
      <Box component="span" key="update">
        <Count value={updates} tone="brand" /> existing {updates === 1 ? "lead" : "leads"}
      </Box>,
    );
  }

  /** The same sentence again on the receipt, from what the server actually wrote. */
  const doneClauses: JSX.Element[] = [];
  if ((importResult?.created ?? 0) > 0) {
    doneClauses.push(
      <Box component="span" key="created">
        <Count value={importResult!.created} tone="success" /> new{" "}
        {importResult!.created === 1 ? "lead" : "leads"}
      </Box>,
    );
  }
  if ((importResult?.updated ?? 0) > 0) {
    doneClauses.push(
      <Box component="span" key="updated">
        <Count value={importResult!.updated} tone="brand" /> existing{" "}
        {importResult!.updated === 1 ? "lead" : "leads"}
      </Box>,
    );
  }

  // Build new-entity summary
  const entitySummary: string[] = preview
    ? preview.newEntitySummary?.length
      ? preview.newEntitySummary
      : [
          ...(preview.newEntities?.companies?.map((c) => `New company: ${c}`) ??
            []),
          ...(preview.newEntities?.statuses?.map((s) => `New status: ${s}`) ??
            []),
          ...(preview.newEntities?.categories?.map(
            (c) => `New category: ${c}`,
          ) ?? []),
          ...(preview.newEntities?.subCategories?.map(
            (s) => `New subcategory: ${s}`,
          ) ?? []),
          ...(preview.newEntities?.services?.map((s) => `New service: ${s}`) ??
            []),
        ]
    : [];

  // ── Import mode gate ─────────────────────────────────────────────────────────
  // Placed after every hook above so hook order is unconditional. The standard
  // flow below is unchanged; legacy migration is a separate wizard entirely.
  if (show && mode === null) {
    return (
      <ImportModeSelector
        open
        onClose={handleHide}
        onSelect={(nextMode, orgId) => {
          setLegacyOrganizationId(orgId);
          setMode(nextMode);
        }}
      />
    );
  }

  if (mode === "legacy") {
    return (
      <LegacyMigrationWizard
        show={show}
        organizationId={legacyOrganizationId}
        onHide={() => {
          setMode(null);
          onHide();
        }}
        onCompleted={() => eventBus.emit(EVENT_KEYS.leadCreated, { id: "bulk" })}
      />
    );
  }

  const header = (
    <GlassHeader
      title="Bulk lead import"
      subtitle="Add or update leads from a CSV"
      icon={<KTIcon iconName="file-up" className="fs-1" />}
      onClose={handleHide}
    />
  );

  return (
    // xl to match the migration wizard: the preview is an eight-column table and
    // anything narrower makes every cell a two-line wrap.
    <GlassDialog open={show} onClose={handleHide} header={header} maxWidth="xl" fullWidth>
      <Box sx={{ p: { xs: 1.5, sm: 2.5 } }}>
        <Box sx={{ mb: 2 }}>
          <WtStepper
            steps={[
              { label: "Upload" },
              { label: "Validate & preview" },
              { label: "Import" },
            ]}
            activeStep={stepIndex}
          />
        </Box>

        {currentScreen === "upload" && (
          <CsvUploadStep
            columns={COLUMNS}
            onSubmit={handlePreview}
            intro="Upload a CSV whose headers match the column names below. Nothing is written until you review the preview and confirm."
            primaryLabel="Required column"
            secondaryLabel="Other supported columns"
            submitLabel="Preview data →"
            readyVerb="preview"
            templateFileName="lead-import-template.csv"
          >
            <Box sx={{ mt: 2 }}>
              <WtButton
                size="small"
                ghost
                onClick={() => setShowRules((prev) => !prev)}
                startIcon={
                  <KTIcon iconName={showRules ? "minus-square" : "plus-square"} className="fs-4" />
                }
              >
                {showRules ? "Hide import rules" : "Show import rules"}
              </WtButton>

              {showRules && (
                <Box
                  sx={{
                    mt: 1.5,
                    display: "grid",
                    gap: 1.5,
                    gridTemplateColumns: {
                      xs: "1fr",
                      md: "repeat(2, minmax(0, 1fr))",
                    },
                  }}
                >
                  {RULES.map((rule) => (
                    <GlassSurface
                      key={rule.title}
                      variant="thin"
                      sx={{ p: 1.5, borderRadius: "12px", borderColor: "divider" }}
                    >
                      <Stack direction="row" spacing={1.25} alignItems="flex-start">
                        <Box sx={{ color: brand, flexShrink: 0, mt: "1px" }}>
                          <KTIcon iconName={rule.icon} className="fs-3" />
                        </Box>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography
                            sx={{ fontSize: 13, fontWeight: 700, color: "text.primary" }}
                          >
                            {rule.title}
                          </Typography>
                          <Typography
                            sx={{ fontSize: 12.5, color: "text.secondary", lineHeight: 1.6 }}
                          >
                            {rule.body}
                          </Typography>
                        </Box>
                      </Stack>
                    </GlassSurface>
                  ))}
                </Box>
              )}
            </Box>
          </CsvUploadStep>
        )}

        {currentScreen === "loading" && (
          <Stack alignItems="center" spacing={1.5} sx={{ py: 6 }}>
            <CircularProgress />
            {/* Honest state: this really is the server working, with no fake timeline. */}
            <Typography sx={{ color: "text.secondary" }}>
              Reading the file, validating rows and matching companies…
            </Typography>
          </Stack>
        )}

        {currentScreen === "preview" && preview && (
          <Stack spacing={2}>
            <GlassSurface
              variant="thin"
              sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: "16px", borderColor: "divider" }}
            >
              <Typography sx={{ fontSize: 17, color: "text.primary", lineHeight: 1.5 }}>
                {previewClauses.length === 0 ? (
                  "This file has no rows that can be imported."
                ) : (
                  <>
                    Importing{" "}
                    {previewClauses.length === 2 ? (
                      <>
                        {previewClauses[0]} and {previewClauses[1]}
                      </>
                    ) : (
                      previewClauses[0]
                    )}
                    .
                  </>
                )}
              </Typography>
            </GlassSurface>

            <Box
              sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: "14px",
                maxHeight: 460,
                overflow: "auto",
              }}
            >
              <Table size="small" stickyHeader sx={{ minWidth: 1100 }}>
                <TableHead>
                  <TableRow>
                    {PREVIEW_HEADS.map((head, i) => (
                      <TableCell
                        key={head}
                        align={i === PREVIEW_HEADS.length - 1 ? "right" : "left"}
                        sx={{ ...MICRO, bgcolor: "background.paper" }}
                      >
                        {head}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {preview.validRows.map((row, i) => {
                    const isUpdate =
                      row.importAction?.includes("Update") ||
                      !row.importAction?.includes("Create new lead");
                    return (
                      <TableRow key={i} hover>
                        <TableCell>
                          <ToneChip
                            tone={isUpdate ? "warning" : "brand"}
                            label={isUpdate ? "Update (replace)" : "Create new"}
                            dense
                          />
                        </TableCell>
                        <TableCell>
                          <Typography sx={{ fontSize: 13, fontWeight: 700, color: "text.primary" }}>
                            {row.title}
                          </Typography>
                          <Typography sx={{ fontSize: 11.5, color: "text.secondary", ...NUM }}>
                            {row.prefix || "Auto-generated ID"}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography sx={{ fontSize: 13, color: "text.secondary", ...NUM }}>
                            {formatDate(row.inquiryDate)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Stack sx={{ minWidth: 0 }}>
                            <Typography sx={{ fontSize: 13, fontWeight: 600, color: "text.primary" }}>
                              {row.category || "General"}
                            </Typography>
                            <NewMark show={row.isNewCategory} />
                            <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                              {row.subcategory || "—"}
                            </Typography>
                            <NewMark show={row.isNewSubCategory} />
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Stack sx={{ minWidth: 0 }}>
                            <Typography sx={{ fontSize: 13, fontWeight: 600, color: "text.primary" }}>
                              {row.companyName || "—"}
                            </Typography>
                            <NewMark show={row.isNewCompany} />
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Stack sx={{ minWidth: 0 }}>
                            <Typography sx={{ fontSize: 13, color: "text.primary" }}>
                              {row.statusName || "—"}
                            </Typography>
                            <NewMark show={row.isNewStatus} />
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
                            {row.assignedTo || "Unassigned"}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography sx={{ fontSize: 13, fontWeight: 700, color: "text.primary", ...NUM }}>
                            {row.area ? `${row.area} sqft` : "—"}
                          </Typography>
                          <Typography sx={{ fontSize: 11.5, color: "text.secondary", ...NUM }}>
                            {row.cost ? `AED ${Number(row.cost).toLocaleString()}` : "—"}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Box>

            {preview.errors.length > 0 && (
              <GlassSurface
                variant="thin"
                sx={{
                  p: 2,
                  borderRadius: "14px",
                  borderColor: toneAlpha(danger, 0.4),
                  bgcolor: toneAlpha(danger, 0.05),
                }}
              >
                <Typography sx={{ ...MICRO, color: "text.primary", mb: 1.5 }}>
                  {preview.errors.length}{" "}
                  {preview.errors.length === 1 ? "row will be skipped" : "rows will be skipped"}
                </Typography>
                <Stack spacing={1} sx={{ maxHeight: 160, overflowY: "auto" }}>
                  {preview.errors.map((err, i) => (
                    <Stack key={i} direction="row" spacing={1.25} alignItems="baseline">
                      <Typography
                        sx={{
                          fontSize: 11,
                          fontWeight: 800,
                          color: "text.disabled",
                          flex: "none",
                          width: 46,
                          ...NUM,
                        }}
                      >
                        ROW {err.row}
                      </Typography>
                      <Typography sx={{ fontSize: 13, color: "text.primary", lineHeight: 1.45 }}>
                        {err.errors.join(", ")}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              </GlassSurface>
            )}

            {entitySummary.length > 0 && (
              <Stack
                direction="row"
                spacing={1.25}
                alignItems="flex-start"
                sx={{
                  p: 1.5,
                  borderRadius: "12px",
                  bgcolor: toneAlpha(brand, 0.06),
                  border: `1px solid ${toneAlpha(brand, 0.2)}`,
                }}
              >
                <Box sx={{ color: brand, mt: "1px", flexShrink: 0 }}>
                  <KTIcon iconName="plus-square" className="fs-4" />
                </Box>
                <Typography sx={{ fontSize: 13, lineHeight: 1.55, color: "text.secondary" }}>
                  These will be created during the import: {entitySummary.join(", ")}.
                </Typography>
              </Stack>
            )}

            <Stack direction="row" justifyContent="space-between">
              <WtButton ghost onClick={() => setCurrentScreen("upload")}>
                Back to upload
              </WtButton>
              <WtButton
                disabled={preview.validRows.length === 0}
                onClick={handleImport}
                sx={{ minWidth: 170 }}
              >
                {`Import ${preview.validRows.length} ${preview.validRows.length === 1 ? "lead" : "leads"}`}
              </WtButton>
            </Stack>
          </Stack>
        )}

        {currentScreen === "importing" && (
          <Stack alignItems="center" spacing={1.5} sx={{ py: 6 }}>
            <CircularProgress />
            <Typography sx={{ color: "text.secondary" }}>
              Writing your rows…
            </Typography>
            <Typography sx={{ fontSize: 12.5, color: "text.disabled" }}>
              Rows already written are committed. Closing this now will not undo them.
            </Typography>
          </Stack>
        )}

        {currentScreen === "done" && importResult && (
          <Stack spacing={2}>
            <GlassSurface
              variant="thin"
              sx={{
                p: { xs: 2, sm: 2.5 },
                borderRadius: "16px",
                borderColor: toneAlpha(success, 0.35),
                bgcolor: toneAlpha(success, 0.04),
              }}
            >
              {/* One sentence, each number set into it. Outcomes that did not happen
                  are told by their absence, not by a box containing 0. */}
              <Typography sx={{ fontSize: 17, color: "text.primary", lineHeight: 1.5 }}>
                {doneClauses.length === 0 ? (
                  "Finished without writing anything."
                ) : (
                  <>
                    Imported{" "}
                    {doneClauses.length === 2 ? (
                      <>
                        {doneClauses[0]} and {doneClauses[1]}
                      </>
                    ) : (
                      doneClauses[0]
                    )}
                    .
                  </>
                )}
              </Typography>

              {(preview?.errors.length ?? 0) > 0 && (
                <Typography
                  sx={{ fontSize: 13.5, color: "text.secondary", lineHeight: 1.6, mt: 1 }}
                >
                  <Count value={preview!.errors.length} tone="danger" />{" "}
                  {preview!.errors.length === 1 ? "row was" : "rows were"} skipped because they
                  could not be read.
                </Typography>
              )}
            </GlassSurface>

            <Stack direction="row" justifyContent="flex-end">
              <WtButton onClick={handleHide}>Close</WtButton>
            </Stack>
          </Stack>
        )}
      </Box>
    </GlassDialog>
  );
};

export default LeadBulkImport;
