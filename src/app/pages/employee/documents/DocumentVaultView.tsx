import { useEffect, useMemo, useState } from "react";
import { Box, Skeleton, Typography } from "@mui/material";
import {
  AutoGrid,
  GlassCard,
  GlassSurface,
  ToneChip,
  toast,
  ViewModeSwitch,
  WtButton,
} from "@app/modules/common/components/ui";
import { formatDate } from "@utils/dateFormats";
import { downloadDocumentArchive, fetchDocumentVault } from "@services/employee";
import type { DocumentVault, VaultDocument, VaultDocumentCategory } from "@services/employee";
import { CATEGORY_ORDER, DOCUMENT_KINDS } from "./documentKinds";
import { saveBlob } from "./saveBlob";
import DocumentCard from "./components/DocumentCard";
import DocumentListRow from "./components/DocumentListRow";
import DocumentPreviewDialog from "./components/DocumentPreviewDialog";

type ViewMode = "grid" | "list";

const VIEW_MODE_KEY = "wt-documents-view-mode";

const VIEW_MODE_OPTIONS = [
  { value: "grid" as const, icon: "bi-grid-3x3-gap-fill", label: "Grid view" },
  { value: "list" as const, icon: "bi-list-ul", label: "List view" },
];

/**
 * Which layout the user last chose, remembered across visits.
 *
 * A view preference that resets on every navigation is worse than no choice at all —
 * this is the one setting a file explorer is expected to keep. localStorage (not
 * session) because the preference outlives the tab.
 */
const readStoredViewMode = (): ViewMode => {
  try {
    return localStorage.getItem(VIEW_MODE_KEY) === "list" ? "list" : "grid";
  } catch {
    return "grid";
  }
};

interface DocumentVaultViewProps {
  /**
   * Whose documents to load. Pass `"me"` for the signed-in employee's own view —
   * the backend resolves it from the token, so that path can never be pointed at
   * anyone else no matter what the client sends.
   */
  employeeId: string;
  /** Rendered above the header, e.g. a back link on the HR route. */
  leading?: React.ReactNode;
  /** Hide the person's identity block — redundant on "my documents". */
  showIdentity?: boolean;
  emptyMessage?: string;
}

/**
 * Category heading. Deliberately NOT the kit's `SectionHead`: that takes a `Trio`
 * from the theme palette and a KTIcon name, while a category here carries its own
 * colour and a Bootstrap icon — the same colour used on the card keyline and the
 * filter, which is what visually ties a heading to the cards beneath it.
 */
const CategoryHead: React.FC<{ category: VaultDocumentCategory; count: number }> = ({ category, count }) => {
  const kind = DOCUMENT_KINDS[category];
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: "11px",
          display: "grid",
          placeItems: "center",
          bgcolor: kind.tint,
          color: kind.color,
          flexShrink: 0,
        }}
      >
        <Box component="i" className={kind.icon} aria-hidden sx={{ fontSize: 17 }} />
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontSize: 15, fontWeight: 700, color: "text.primary", lineHeight: 1.25 }}>
          {kind.label}
        </Typography>
        <Typography sx={{ fontSize: 12.5, color: "text.secondary", lineHeight: 1.4 }}>
          {`${count} document${count === 1 ? "" : "s"}`}
        </Typography>
      </Box>
    </Box>
  );
};

const CountPill: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <Box sx={{ minWidth: 0 }}>
    <Typography sx={{ fontSize: 18, fontWeight: 800, lineHeight: 1.1, color: "text.primary" }}>
      {value}
    </Typography>
    <Typography sx={{ fontSize: 11, color: "text.secondary", letterSpacing: "0.04em" }}>
      {label}
    </Typography>
  </Box>
);

/**
 * Every document held on one person, grouped by where it came from.
 *
 * Both Documents screens render this: HR passes an employee id, the employee's own
 * page passes `"me"`. Sharing the view is what keeps the two consistent — the only
 * difference between them is who the server decides you are allowed to see.
 */
const DocumentVaultView: React.FC<DocumentVaultViewProps> = ({
  employeeId,
  leading,
  showIdentity = true,
  emptyMessage = "No documents on file yet.",
}) => {
  const [vault, setVault] = useState<DocumentVault | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<VaultDocument | null>(null);
  const [activeCategory, setActiveCategory] = useState<VaultDocumentCategory | "all">("all");
  const [viewMode, setViewMode] = useState<ViewMode>(readStoredViewMode);

  const [archiving, setArchiving] = useState(false);

  /**
   * Pull every document down as one zip.
   *
   * Built server-side and returned as a blob, so this only has to turn it into a
   * save. An object URL is used rather than a direct link because the request is
   * authenticated — a plain `<a href>` to the endpoint would carry no auth header.
   */
  const downloadAll = async () => {
    if (archiving || !vault) return;
    setArchiving(true);
    try {
      const blob = await downloadDocumentArchive(employeeId);
      saveBlob(blob, `${vault.employee.name || "Employee"} - Documents.zip`);
    } catch {
      toast({
        icon: "error",
        title: "Download failed",
        text: "Could not prepare the archive. Please try again.",
      });
    } finally {
      setArchiving(false);
    }
  };

  const changeViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    try {
      localStorage.setItem(VIEW_MODE_KEY, mode);
    } catch {
      // A blocked storage write must not stop the view from switching.
    }
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetchDocumentVault(employeeId);
        if (cancelled) return;
        setVault(response?.data ?? null);
      } catch (err: any) {
        if (cancelled) return;
        setError(
          err?.response?.status === 403
            ? "You do not have access to this employee's documents."
            : err?.response?.data?.detail || "Could not load documents. Please try again."
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [employeeId]);

  const documents = vault?.documents ?? [];

  // Only categories that actually have something — an empty "Bank" heading is noise,
  // and a filter chip for a category with nothing behind it is a dead end.
  const grouped = useMemo(() => {
    return CATEGORY_ORDER.map((category) => ({
      category,
      items: documents.filter((doc) => doc.category === category),
    })).filter((group) => group.items.length > 0);
  }, [documents]);

  const visibleGroups = useMemo(
    () => (activeCategory === "all" ? grouped : grouped.filter((g) => g.category === activeCategory)),
    [grouped, activeCategory]
  );

  const lastUpdated = useMemo(() => {
    const stamps = documents
      .map((doc) => doc.uploadedAt)
      .filter(Boolean)
      .map((d) => new Date(d as string).getTime())
      .filter((t) => Number.isFinite(t));
    return stamps.length ? new Date(Math.max(...stamps)) : null;
  }, [documents]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Skeleton variant="rounded" height={96} />
        <AutoGrid min={220}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} variant="rounded" height={210} />
          ))}
        </AutoGrid>
      </Box>
    );
  }

  if (error) {
    return (
      <GlassCard preset="section" sx={{ textAlign: "center", py: 5 }}>
        <Box component="i" className="bi bi-shield-exclamation" aria-hidden sx={{ fontSize: 32, color: "text.disabled" }} />
        <Typography sx={{ fontSize: 14, fontWeight: 600, mt: 1 }}>{error}</Typography>
      </GlassCard>
    );
  }

  const employee = vault?.employee;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {leading}

      {showIdentity && employee && (
        <GlassSurface
          variant="thin"
          radius={16}
          sx={{
            p: { xs: 1.5, sm: 2 },
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: { xs: 1.5, sm: 2.5 },
          }}
        >
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              overflow: "hidden",
              flexShrink: 0,
              bgcolor: "action.hover",
              display: "grid",
              placeItems: "center",
            }}
          >
            {employee.avatar ? (
              <Box
                component="img"
                src={employee.avatar}
                alt=""
                sx={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <Box component="i" className="bi bi-person" aria-hidden sx={{ fontSize: 24, color: "text.disabled" }} />
            )}
          </Box>

          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography sx={{ fontSize: { xs: 15, sm: 17 }, fontWeight: 700, lineHeight: 1.25 }}>
              {employee.name || "Employee"}
            </Typography>
            {/* Employee code and job profile only. Branch, sub-organization and joining
                date were four more chips saying things HR already knows from the row
                they clicked — the code is the one identifier that disambiguates two
                people with the same name. */}
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mt: 0.75 }}>
              {employee.employeeCode && <ToneChip label={employee.employeeCode} tone="neutral" dense />}
              {employee.jobProfile && <ToneChip label={employee.jobProfile} tone="brand" dense />}
            </Box>
          </Box>

          <Box sx={{ display: "flex", gap: { xs: 2, sm: 3 }, flexShrink: 0 }}>
            <CountPill label="ON FILE" value={documents.length} />
            <CountPill label="CATEGORIES" value={grouped.length} />
            <CountPill label="LAST ADDED" value={lastUpdated ? formatDate(lastUpdated) : "—"} />
          </Box>
        </GlassSurface>
      )}

      {/* Toolbar: category filter on the left, layout switch on the right. The switch
          shows whenever there is anything to lay out; the filter only once there is
          more than one group to choose between. */}
      {documents.length > 0 && (
        <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 0.75 }}>
          {grouped.length > 1 && (
            <>
              <WtButton
                size="small"
                ghost={activeCategory !== "all"}
                onClick={() => setActiveCategory("all")}
              >
                {`All (${documents.length})`}
              </WtButton>
              {grouped.map(({ category, items }) => (
                <WtButton
                  key={category}
                  size="small"
                  ghost={activeCategory !== category}
                  startIcon={<i className={DOCUMENT_KINDS[category].icon} aria-hidden />}
                  onClick={() => setActiveCategory(category)}
                >
                  {`${DOCUMENT_KINDS[category].label} (${items.length})`}
                </WtButton>
              ))}
            </>
          )}

          <Box sx={{ flex: 1 }} />

          <WtButton
            size="small"
            disabled={archiving}
            startIcon={
              <i className={archiving ? "bi bi-hourglass-split" : "bi bi-file-earmark-zip"} aria-hidden />
            }
            onClick={downloadAll}
          >
            {archiving ? "Preparing…" : `Download All (${documents.length})`}
          </WtButton>

          <ViewModeSwitch<ViewMode>
            options={VIEW_MODE_OPTIONS}
            value={viewMode}
            onChange={changeViewMode}
            ariaLabel="Document layout"
          />
        </Box>
      )}

      {documents.length === 0 ? (
        <GlassCard preset="section" sx={{ textAlign: "center", py: 6 }}>
          <Box component="i" className="bi bi-folder2-open" aria-hidden sx={{ fontSize: 36, color: "text.disabled" }} />
          <Typography sx={{ fontSize: 14, fontWeight: 600, mt: 1.5 }}>{emptyMessage}</Typography>
          <Typography sx={{ fontSize: 12.5, color: "text.secondary", mt: 0.5 }}>
            Documents appear here as they are uploaded during onboarding or added to the profile.
          </Typography>
        </GlassCard>
      ) : (
        visibleGroups.map(({ category, items }) => (
          <Box key={category} sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
            <CategoryHead category={category} count={items.length} />

            {viewMode === "grid" ? (
              <AutoGrid
                min={210}
                // `auto-FILL`, not AutoGrid's default `auto-fit`. With auto-fit the
                // browser collapses the empty tracks and the surviving ones absorb the
                // width, so a category holding a single document rendered one card
                // across the entire page — a full-width tile with a postage-stamp icon
                // floating in it. auto-fill keeps the empty tracks, so every card stays
                // the size of a card no matter how few there are.
                sx={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(210px, 100%), 1fr))" }}
              >
                {items.map((doc) => (
                  <DocumentCard key={doc.id} employeeId={employeeId} document={doc} onOpen={setPreview} />
                ))}
              </AutoGrid>
            ) : (
              <GlassCard preset="section" sx={{ p: 0, overflow: "hidden" }}>
                {items.map((doc) => (
                  <DocumentListRow key={doc.id} employeeId={employeeId} document={doc} onOpen={setPreview} />
                ))}
              </GlassCard>
            )}
          </Box>
        ))
      )}

      <DocumentPreviewDialog employeeId={employeeId} document={preview} onClose={() => setPreview(null)} />
    </Box>
  );
};

export default DocumentVaultView;
