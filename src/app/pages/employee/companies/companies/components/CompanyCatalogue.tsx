import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  CalendarDays,
  Download,
  FileText,
  Image as ImageIcon,
  LayoutGrid,
  List,
  Pencil,
  Search,
  Share2,
  Trash2,
  Upload,
} from "lucide-react";
import { cn } from "@/ds/lib/utils";
import { Badge } from "@/ds/ui/badge";
import { Button } from "@/ds/ui/button";
import { Card } from "@/ds/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ds/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/ds/ui/field";
import { Input } from "@/ds/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/ds/ui/input-group";
import { Item } from "@/ds/ui/item";
import { Separator } from "@/ds/ui/separator";
import { Skeleton } from "@/ds/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ds/ui/table";
import { Tabs, TabsTrigger } from "@/ds/ui/tabs";
import { EmptyState } from "@/ds/patterns/empty-state";
import { toast } from "@app/modules/common/components/ui/feedback";
import { GallerySelect, ToggleList, TOGGLE_TAB } from "@app/modules/project-gallery/GalleryDialogs";
import { formatDateTime, formatSize } from "@app/modules/project-gallery/media";
import { ItemActionsMenu, shareLink } from "@app/modules/project-gallery/MediaCard";
import { UploadJobsPanel } from "@app/modules/project-gallery/UploadPanel";
import { ItemViewer, ViewerRow } from "@app/modules/project-gallery/MediaViewer";
import { apiErrorMessage } from "@utils/apiError";
import {
  CATALOGUE_ACCEPT,
  CATALOGUE_MAX_MB,
  CATALOGUE_NAME_MAX,
  defaultCatalogueName,
  deleteCompanyCatalogue,
  generatePreviews,
  getCompanyCatalogues,
  isCatalogueFile,
  needsPreviews,
  renameCompanyCatalogue,
  uploadCompanyCatalogue,
  type CompanyCatalogue as Catalogue,
} from "@services/companyCatalogues";

/**
 * Company → Catalogue tab, built from the Project Gallery's parts so the two read as one product:
 * the same card shell and header, the same search / type / sort / Grid-List toolbar (ToggleList +
 * TOGGLE_TAB + GallerySelect), cards and table in MediaCard's layout, and the same actions menu.
 */

const MAX_FILES = 50;
/** How long each page holds before the hover carousel moves on, and how long the slide itself takes. */
const PAGE_HOLD_MS = 2200;
const SLIDE_MS = 1100;
// Toolbar toggles: the gallery's pill look, compact so they sit level with search and sort.
const BAR_TAB = cn(TOGGLE_TAB, "px-3 py-1");

type Layout = "grid" | "list";
type KindFilter = "all" | "pdf" | "image";
type Sort = "new" | "old";

const kindLabel = (c: Catalogue) => (c.kind === "image" ? "Image" : "PDF");
const pagesLabel = (n: number) => `${n} ${n === 1 ? "page" : "pages"}`;
/** "PDF · 12 pages · 2.7 MB" / "Image · 1.2 MB" */
const metaLine = (c: Catalogue) =>
  [kindLabel(c), c.kind === "pdf" && pagesLabel(c.pageCount), formatSize(c.sizeBytes / 1048576)].filter(Boolean).join(" · ");

/* ---------- Cover (grid card) ---------- */

/**
 * Hovering (or focusing) a PDF's cover pages slowly through its stored page previews, like leafing through
 * the catalogue; leaving returns to page 1. Pages after the first load only once the cover is first hovered.
 * An image catalogue is a single still, with the gallery's gentle zoom on hover.
 */
function CatalogueCover({ catalogue: c, onOpen }: { catalogue: Catalogue; onOpen: () => void }) {
  const urls = c.previewUrls;
  const loops = urls.length > 1;
  // A copy of page 1 after the last page lets the strip keep moving forward; on arriving there it
  // snaps (without animation) back to the real page 1, so the loop never visibly rewinds.
  const slides = loops ? [...urls, urls[0]] : urls;
  const [active, setActive] = useState(false);
  const [warm, setWarm] = useState(false);
  const [index, setIndex] = useState(0);
  const [instant, setInstant] = useState(false);
  const shown = index % Math.max(1, urls.length);

  useEffect(() => {
    if (!active || !loops) {
      setIndex(0);
      return;
    }
    const timer = setInterval(() => setIndex((i) => i + 1), PAGE_HOLD_MS);
    return () => clearInterval(timer);
  }, [active, loops, urls.length]);

  // Once the slide onto the copy of page 1 has finished, jump to the real page 1 with transitions off.
  // A timer rather than transitionend: that event doesn't fire under reduced motion.
  useEffect(() => {
    if (!loops || index !== urls.length) return;
    const timer = setTimeout(() => {
      setInstant(true);
      setIndex(0);
    }, SLIDE_MS);
    return () => clearTimeout(timer);
  }, [index, loops, urls.length]);

  // Turn transitions back on two frames later, after the jump has been painted.
  useEffect(() => {
    if (!instant) return;
    let inner = 0;
    const outer = requestAnimationFrame(() => (inner = requestAnimationFrame(() => setInstant(false))));
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [instant]);

  const enter = () => {
    setWarm(true);
    setActive(true);
  };
  const leave = () => setActive(false);

  return (
    // Kit Item as a button: the documented clickable-card pattern (docs/BUTTONS.md), reshaped into a cover.
    <Item
      render={<button type="button" />}
      onClick={onOpen}
      onMouseEnter={enter}
      onMouseLeave={leave}
      onFocus={enter}
      onBlur={leave}
      className="relative block aspect-4/3 w-full flex-nowrap gap-0 overflow-hidden rounded-none border-0 bg-muted p-0 text-start"
    >
      {urls.length ? (
        <span
          className={cn(
            "flex h-full ease-[cubic-bezier(.45,0,.2,1)] motion-reduce:transition-none",
            !instant && "transition-transform",
          )}
          style={{ transform: `translateX(-${index * 100}%)`, transitionDuration: instant ? undefined : `${SLIDE_MS}ms` }}
        >
          {slides.map((u, i) =>
            i === 0 || warm ? (
              <img
                key={i}
                src={u}
                alt=""
                draggable={false}
                loading={i === 0 ? "lazy" : undefined}
                className={cn(
                  "size-full shrink-0 object-cover object-top",
                  c.kind === "image" && "transition-transform duration-300 group-hover/media:scale-[1.03]",
                )}
              />
            ) : (
              <span key={i} className="size-full shrink-0" />
            ),
          )}
        </span>
      ) : (
        <span className="grid size-full place-items-center text-muted-foreground">
          <FileText className="size-10" aria-hidden />
        </span>
      )}

      {/* The accessible name comes from content (not aria-label) so it includes the visible badge. */}
      <span className="sr-only">Preview {c.name}, </span>
      {c.kind === "pdf" && (
        <span className="tabular pointer-events-none absolute bottom-2.5 left-2.5 inline-flex items-center gap-1 rounded-md bg-black/75 px-2 py-0.5 text-xs font-semibold text-white">
          <FileText className="size-3.5" aria-hidden />
          {active && loops ? `Page ${shown + 1} of ${c.pageCount}` : pagesLabel(c.pageCount)}
        </span>
      )}
      {loops && (
        <span className="pointer-events-none absolute right-2.5 bottom-3 flex gap-1" aria-hidden>
          {urls.map((u, i) => (
            <span
              key={u}
              className={cn("h-1.5 rounded-full bg-white shadow-sm transition-all duration-500", i === shown ? "w-3.5" : "w-1.5 opacity-60")}
            />
          ))}
        </span>
      )}
    </Item>
  );
}

/* ---------- Actions (same menu as a gallery item) ---------- */

interface CatalogueActions {
  preview: (c: Catalogue) => void;
  /** Absent without edit access to the company. */
  rename?: (c: Catalogue) => void;
  remove?: (c: Catalogue) => void;
}

/** A signed link that answers "attachment": the browser saves "<name>.<ext>" instead of opening it. */
const downloadCatalogue = (c: Catalogue) => window.open(c.downloadUrl, "_blank", "noopener");
/** The file is private, so the shared link is a signed one with an expiry; the toast says so. */
const shareCatalogue = (c: Catalogue) => void shareLink(c.name, c.url, "The link works for 12 hours.");

/** The gallery's own ⋯ menu (ItemActionsMenu), so both screens offer the same actions in the same order. */
function CatalogueActionsMenu({ catalogue: c, actions }: { catalogue: Catalogue; actions: CatalogueActions }) {
  return (
    <ItemActionsMenu
      label={c.name}
      onPreview={() => actions.preview(c)}
      onDownload={() => downloadCatalogue(c)}
      onShare={() => shareCatalogue(c)}
      onEdit={actions.rename ? () => actions.rename?.(c) : undefined}
      editLabel="Edit name"
      onDelete={actions.remove ? () => actions.remove?.(c) : undefined}
    />
  );
}

/* ---------- Grid and list (MediaCard / MediaTable layouts) ---------- */

function CatalogueCard({ catalogue: c, isNew, actions }: { catalogue: Catalogue; isNew: boolean; actions: CatalogueActions }) {
  return (
    <Card className="group/media gap-0 py-0 transition-shadow hover:shadow-md">
      <div className="relative">
        <CatalogueCover catalogue={c} onOpen={() => actions.preview(c)} />
        {/* MediaCard's NEW pill. */}
        {isNew && (
          <span className="pointer-events-none absolute bottom-2.5 left-2.5 rounded-md bg-success px-1.5 py-0.5 text-[10.5px] font-bold text-white">
            NEW
          </span>
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-1 px-3 pt-2.5 pb-3">
        <div className="flex min-w-0 items-center gap-1">
          <p className="min-w-0 flex-1 truncate font-semibold" title={c.name}>
            {c.name}
          </p>
          <div className="-mr-1.5">
            <CatalogueActionsMenu catalogue={c} actions={actions} />
          </div>
        </div>
        <p className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
          {c.kind === "image" ? (
            <ImageIcon className="size-3.5 shrink-0" aria-label="Image" />
          ) : (
            <FileText className="size-3.5 shrink-0" aria-label="PDF" />
          )}
          <span className="truncate">{metaLine(c)}</span>
        </p>
        <p className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarDays className="size-3.5 shrink-0" aria-hidden />
          {/* Who uploaded it is in the preview's details panel and the list view, not on the card. */}
          <span className="truncate">{formatDateTime(c.createdAt)}</span>
        </p>
      </div>
    </Card>
  );
}

function CatalogueTable({ items, newIds, actions }: { items: Catalogue[]; newIds: Set<string>; actions: CatalogueActions }) {
  return (
    <Card className="gap-0 py-0">
      <Table className="min-w-200">
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead className="w-24">Preview</TableHead>
            <TableHead>Name / file</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Pages</TableHead>
            <TableHead>Uploaded by</TableHead>
            <TableHead>Date &amp; time</TableHead>
            <TableHead className="w-10">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((c) => (
            <TableRow key={c.id}>
              <TableCell>
                <Button
                  variant="ghost"
                  className="block h-14 w-20 overflow-hidden rounded-lg bg-muted p-0"
                  onClick={() => actions.preview(c)}
                  aria-label={`Preview ${c.name}`}
                >
                  {c.previewUrls[0] ? (
                    <img src={c.previewUrls[0]} alt="" loading="lazy" className="size-full object-cover object-top" />
                  ) : (
                    <span className="grid size-full place-items-center text-muted-foreground">
                      <FileText className="size-5" aria-hidden />
                    </span>
                  )}
                </Button>
              </TableCell>
              <TableCell>
                <p className="flex items-center gap-2 font-medium">
                  {c.name}
                  {newIds.has(c.id) && <Badge variant="success">New</Badge>}
                </p>
                <p className="text-xs text-muted-foreground">
                  {c.fileName} · {formatSize(c.sizeBytes / 1048576)}
                </p>
              </TableCell>
              <TableCell className="text-muted-foreground">{kindLabel(c)}</TableCell>
              <TableCell className="text-muted-foreground tabular-nums">{c.kind === "pdf" ? c.pageCount : "—"}</TableCell>
              <TableCell className="text-muted-foreground">{c.uploadedByName ?? "—"}</TableCell>
              <TableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(c.createdAt)}</TableCell>
              <TableCell>
                <CatalogueActionsMenu catalogue={c} actions={actions} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

/* ---------- Dialogs (the gallery's Create album / Delete dialogs, for a catalogue) ---------- */

function RenameDialog({ catalogue, onClose, onSave }: { catalogue: Catalogue | null; onClose: () => void; onSave: (name: string) => Promise<void> }) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setName(catalogue?.name ?? "");
    setError("");
  }, [catalogue]);

  const submit = async () => {
    const n = name.trim();
    if (!n) return setError("Enter a name for the catalogue.");
    setSaving(true);
    try {
      await onSave(n);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!catalogue} onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rename catalogue</DialogTitle>
          <DialogDescription>This is the name shown on its card. The file itself is unchanged.</DialogDescription>
        </DialogHeader>
        <Field className="gap-1.5" data-invalid={!!error || undefined}>
          <FieldLabel htmlFor="catalogue-rename">Catalogue name</FieldLabel>
          <Input
            id="catalogue-rename"
            maxLength={CATALOGUE_NAME_MAX}
            value={name}
            aria-invalid={!!error || undefined}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void submit()}
          />
          {error && <FieldError>{error}</FieldError>}
        </Field>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" disabled={saving} />}>Cancel</DialogClose>
          <Button onClick={() => void submit()} loading={saving}>
            Save name
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteDialog({ catalogue, onClose, onConfirm }: { catalogue: Catalogue | null; onClose: () => void; onConfirm: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={!!catalogue} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <span className="mb-2 grid size-11 place-items-center rounded-xl bg-destructive-soft text-destructive-foreground">
            <Trash2 className="size-5" aria-hidden />
          </span>
          <DialogTitle>Delete “{catalogue?.name}”?</DialogTitle>
          <DialogDescription>
            The file is removed from storage for everyone on this company. This can&apos;t be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" disabled={busy} />}>Cancel</DialogClose>
          <Button
            variant="destructive"
            loading={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm();
              } finally {
                setBusy(false);
              }
            }}
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Upload panel: the gallery's own (UploadJobsPanel) ---------- */

function UploadPanel({
  companyId,
  onUploaded,
  onClose,
}: {
  companyId: string;
  onUploaded: (row: Catalogue, file: File) => void;
  /** Gets how many catalogues were added; the panel closes by itself once all have uploaded. */
  onClose: (count: number) => void;
}) {
  return (
    <UploadJobsPanel
      title="Upload catalogues"
      description="Each one is named after its file; rename it from its ⋯ menu. Files are checked for damage and hidden scripts, then compressed."
      accept={CATALOGUE_ACCEPT}
      maxFiles={MAX_FILES}
      maxSizeMB={CATALOGUE_MAX_MB}
      noun="PDFs or images"
      hint={
        <p className="mt-2 text-sm text-gray-500">
          PDF, JPG, PNG or WebP, up to {CATALOGUE_MAX_MB} MB each, {MAX_FILES} at a time. Password-protected PDFs can&apos;t be uploaded.
        </p>
      }
      placeholderIcon={<FileText className="size-8" aria-hidden />}
      // One at a time: the server parses every PDF, and a burst of 100 MB bodies is no kinder to nginx.
      oneAtATime
      upload={async (file, onProgress) => {
        if (!(await isCatalogueFile(file))) throw new Error("This file isn't a valid PDF, JPG, PNG or WebP.");
        // Named after the file to start with; renamed afterwards from the card's menu.
        const row = await uploadCompanyCatalogue(companyId, file, defaultCatalogueName(file), onProgress);
        onUploaded(row, file);
      }}
      onClose={onClose}
    />
  );
}

/* ---------- The tab ---------- */

interface Props {
  companyId: string;
  canWrite: boolean;
  /** Raised by the tab bar's "Upload Catalogue" button. */
  addRequested?: boolean;
  onAddHandled?: () => void;
}

const CompanyCatalogue = ({ companyId, canWrite, addRequested, onAddHandled }: Props) => {
  const [items, setItems] = useState<Catalogue[] | null>(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  // By id, so the open preview survives a rename or re-sort; ← → step through the list as shown.
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<Catalogue | null>(null);
  const [deleting, setDeleting] = useState<Catalogue | null>(null);
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<KindFilter>("all");
  const [sort, setSort] = useState<Sort>("new");
  const [layout, setLayout] = useState<Layout>("grid");
  const [newIds, setNewIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setError("");
    try {
      setItems(await getCompanyCatalogues(companyId));
    } catch (err) {
      setError(apiErrorMessage(err, "Couldn't load catalogues."));
    }
  }, [companyId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (addRequested) {
      setUploading(true);
      onAddHandled?.();
    }
  }, [addRequested, onAddHandled]);

  const replace = useCallback((row: Catalogue) => setItems((xs) => xs?.map((x) => (x.id === row.id ? row : x)) ?? null), []);

  // PDF page previews are drawn by the browser. A queue keeps it to one PDF at a time; `tried` makes each
  // catalogue a once-per-visit attempt, so a PDF pdf.js can't draw isn't retried in a loop.
  const tried = useRef(new Set<string>());
  const queue = useRef(Promise.resolve());
  const queuePreviews = useCallback(
    (c: Catalogue, pdf?: Blob) => {
      tried.current.add(c.id);
      queue.current = queue.current.then(() =>
        generatePreviews(companyId, c, replace, pdf).catch((err) => console.warn(`Catalogue previews stopped for ${c.id}`, err)),
      );
    },
    [companyId, replace],
  );

  // Backfill: catalogues uploaded before previews existed, or whose previews stopped part-way.
  useEffect(() => {
    if (!canWrite || !items) return;
    items.filter((c) => needsPreviews(c) && !tried.current.has(c.id)).forEach((c) => queuePreviews(c));
  }, [items, canWrite, queuePreviews]);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (items ?? [])
      .filter((c) => kind === "all" || c.kind === kind)
      .filter((c) => !needle || c.name.toLowerCase().includes(needle) || c.fileName.toLowerCase().includes(needle))
      .sort((a, b) =>
        (sort === "new" ? -1 : 1) * (Date.parse(a.createdAt) - Date.parse(b.createdAt)),
      );
  }, [items, q, kind, sort]);

  // The gallery's viewer, over the list as it is shown (so ← → follow the current filter and sort).
  const viewerList = useMemo(
    () => list.map((c) => ({ id: c.id, name: c.fileName, src: c.url, kind: c.kind === "pdf" ? ("pdf" as const) : ("image" as const), size: c.sizeBytes / 1048576, c })),
    [list],
  );
  const viewIndex = viewingId ? viewerList.findIndex((v) => v.id === viewingId) : -1;

  const actions: CatalogueActions = {
    preview: (c) => setViewingId(c.id),
    ...(canWrite ? { rename: setRenaming, remove: setDeleting } : {}),
  };

  const resetFilters = () => {
    setQ("");
    setKind("all");
  };

  if (error) {
    return (
      <EmptyState
        className="mt-4"
        title="Couldn't load catalogues"
        description={error}
        action={<Button variant="outline" onClick={() => void load()}>Try again</Button>}
      />
    );
  }
  if (!items) return <Skeleton className="mt-4 h-96 w-full rounded-2xl" />;

  const pdfs = items.filter((c) => c.kind === "pdf").length;

  return (
    <Card className="mt-4 gap-0 overflow-visible border-t-[3px] border-t-primary py-0">
      {/* Header */}
      <div className="flex flex-wrap items-start gap-4 border-b px-5 pt-5 pb-4">
        <div className="flex min-w-0 flex-[1_1_320px] items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
            <BookOpen className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">Catalogues</h2>
            <p className="text-sm text-muted-foreground">
              {items.length
                ? `${pdfs} PDF${pdfs === 1 ? "" : "s"} and ${items.length - pdfs} image${items.length - pdfs === 1 ? "" : "s"} this company shares.`
                : "Product catalogues this company shares, as PDFs or images."}
            </p>
          </div>
        </div>
      </div>

      {uploading && canWrite && (
        <UploadPanel
          companyId={companyId}
          onClose={(count) => {
            setUploading(false);
            // The gallery's closing note, for catalogues.
            if (count) toast({ icon: "success", title: `${count} catalogue${count > 1 ? "s" : ""} added`, text: "Marked NEW below. Rename any of them from its ⋯ menu." });
          }}
          onUploaded={(row, file) => {
            setItems((xs) => [row, ...(xs ?? [])]);
            // Marked NEW until the page is reloaded, as in the gallery.
            setNewIds((s) => new Set(s).add(row.id));
            // Previews come from the local file (no download); the card shows a PDF glyph until page 1 lands.
            if (needsPreviews(row)) queuePreviews(row, file);
          }}
        />
      )}

      {/* Toolbar: the gallery's search, type, sort and Grid/List controls */}
      {items.length > 0 && (
        <div className="border-b bg-muted/40 px-5 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <InputGroup className="h-8 max-w-64 min-w-48 flex-1">
              <InputGroupAddon>
                <Search />
              </InputGroupAddon>
              <InputGroupInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or file" aria-label="Search catalogues" />
            </InputGroup>
            <Tabs value={kind} onValueChange={(v) => setKind(v as KindFilter)}>
              <ToggleList aria-label="Catalogue type" className="p-0.5">
                <TabsTrigger value="all" className={BAR_TAB}>All</TabsTrigger>
                <TabsTrigger value="pdf" className={BAR_TAB}>PDFs</TabsTrigger>
                <TabsTrigger value="image" className={BAR_TAB}>Images</TabsTrigger>
              </ToggleList>
            </Tabs>
            <div className="ml-auto flex items-center gap-2">
              <GallerySelect
                label="Sort"
                hideLabel
                size="sm"
                className="w-36"
                value={sort}
                onChange={(v) => setSort(v as Sort)}
                options={[
                  { value: "new", label: "Newest first" },
                  { value: "old", label: "Oldest first" },                ]}
              />
              <Tabs value={layout} onValueChange={(v) => setLayout(v as Layout)}>
                <ToggleList aria-label="Layout" className="p-0.5">
                  <TabsTrigger value="grid" className={BAR_TAB}>
                    <LayoutGrid /> Grid
                  </TabsTrigger>
                  <TabsTrigger value="list" className={BAR_TAB}>
                    <List /> List
                  </TabsTrigger>
                </ToggleList>
              </Tabs>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex min-h-80 flex-col px-5 pt-5 pb-6">
        {!items.length ? (
          !uploading && (
            <EmptyState
              icon={<BookOpen aria-hidden />}
              title="No catalogues yet"
              description="Upload the product catalogues this company shares, as PDFs or images, so anyone on the account can open the latest one."
              action={
                canWrite ? (
                  <Button onClick={() => setUploading(true)}>
                    <Upload data-icon="inline-start" /> Upload Catalogue
                  </Button>
                ) : undefined
              }
            />
          )
        ) : !list.length ? (
          <EmptyState
            icon={<Search aria-hidden />}
            title={q ? `No results for “${q}”` : "No catalogues match this filter"}
            description="Try a different word, or clear the filters to see every catalogue."
            action={<Button variant="outline" onClick={resetFilters}>Clear search and filters</Button>}
          />
        ) : layout === "grid" ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-4">
            {list.map((c) => (
              <CatalogueCard key={c.id} catalogue={c} isNew={newIds.has(c.id)} actions={actions} />
            ))}
          </div>
        ) : (
          <CatalogueTable items={list} newIds={newIds} actions={actions} />
        )}
      </div>

      {/* The gallery's viewer: the file on the dark stage, every detail from the card beside it.
          A deleted catalogue drops out of the list, which closes it here. */}
      <ItemViewer
        list={viewerList}
        index={viewIndex < 0 ? null : viewIndex}
        onIndexChange={(i) => setViewingId(viewerList[i]?.id ?? null)}
        onClose={() => setViewingId(null)}
        onShare={(v) => shareCatalogue(v.c)}
        onDownload={(v) => downloadCatalogue(v.c)}
        side={({ c }, { dims }) => ({
          eyebrow: `${kindLabel(c)} · Catalogue`,
          title: c.name,
          tags: newIds.has(c.id) ? <Badge variant="success">New</Badge> : undefined,
          body: (
            <div className="space-y-4 p-5">
              <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
                {c.kind === "pdf" && <ViewerRow k="Pages" v={c.pageCount} />}
                <ViewerRow k="Uploaded" v={formatDateTime(c.createdAt)} />
                <ViewerRow k="Uploaded by" v={c.uploadedByName ?? "—"} />
              </dl>
              <Separator />
              <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
                <ViewerRow k="File name" v={<span className="break-all">{c.fileName}</span>} />
                <ViewerRow k="Type" v={(c.fileName.split(".").pop() ?? "").toUpperCase() || kindLabel(c)} />
                <ViewerRow k="Size" v={formatSize(c.sizeBytes / 1048576)} />
                {dims && dims.w > 0 && <ViewerRow k="Resolution" v={`${dims.w} × ${dims.h} px`} />}
              </dl>
              <Separator />
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => downloadCatalogue(c)}>
                  <Download data-icon="inline-start" /> Download
                </Button>
                <Button variant="outline" onClick={() => shareCatalogue(c)}>
                  <Share2 data-icon="inline-start" /> Share
                </Button>
                {actions.rename && (
                  <Button variant="outline" className="col-span-2" onClick={() => actions.rename?.(c)}>
                    <Pencil data-icon="inline-start" /> Edit name
                  </Button>
                )}
                {actions.remove && (
                  <Button variant="destructive" className="col-span-2" onClick={() => actions.remove?.(c)}>
                    <Trash2 data-icon="inline-start" /> Delete
                  </Button>
                )}
              </div>
            </div>
          ),
        })}
      />
      <RenameDialog
        catalogue={renaming}
        onClose={() => setRenaming(null)}
        onSave={async (name) => {
          if (!renaming) return;
          try {
            replace(await renameCompanyCatalogue(companyId, renaming.id, name));
            setRenaming(null);
            toast({ icon: "success", title: "Catalogue renamed" });
          } catch (err) {
            toast({ icon: "error", title: "Couldn't rename the catalogue", text: apiErrorMessage(err, "Please try again.") });
          }
        }}
      />
      <DeleteDialog
        catalogue={deleting}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await deleteCompanyCatalogue(companyId, deleting.id);
            setItems((xs) => xs?.filter((x) => x.id !== deleting.id) ?? null);
            setDeleting(null);
            toast({ icon: "success", title: "Catalogue deleted" });
          } catch (err) {
            toast({ icon: "error", title: "Couldn't delete the catalogue", text: apiErrorMessage(err, "Please try again.") });
          }
        }}
      />
    </Card>
  );
};

export default CompanyCatalogue;
