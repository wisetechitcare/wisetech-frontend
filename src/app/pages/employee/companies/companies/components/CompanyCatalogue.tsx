import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { cn } from "@/ds/lib/utils";
import { AlertCircle, BookOpen, FileText, Trash2, Upload, X } from "lucide-react";
import { Button } from "@/ds/ui/button";
import { Progress } from "@/ds/ui/progress";
import { Skeleton } from "@/ds/ui/skeleton";
import { EmptyState } from "@/ds/patterns/empty-state";
import DocumentPreviewModal from "@pages/employee/reimbursement/components/DocumentPreviewModal";
import FileUpload from "@app/modules/common/components/FileUpload";
import { confirmDialog, toast } from "@app/modules/common/components/ui/feedback";
import { formatDateTime, formatSize } from "@app/modules/project-gallery/media";
import { apiErrorMessage } from "@utils/apiError";
import { formatDate } from "@utils/dateFormats";
import {
  CATALOGUE_MAX_MB,
  deleteCompanyCatalogue,
  generatePreviews,
  getCompanyCatalogues,
  isPdfFile,
  needsPreviews,
  uploadCompanyCatalogue,
  type CompanyCatalogue as Catalogue,
} from "@services/companyCatalogues";

const ACCEPT = { "application/pdf": [".pdf"] };
const MAX_FILES = 5;
/** The kit's row-action delete (Button stories → Tinted): danger pastel, deepens on hover. */
const DANGER_TINT = { "--tint": "var(--cta-danger)" } as CSSProperties;
/** How long each page holds before the carousel moves on, and how long the slide itself takes. */
const PAGE_HOLD_MS = 2200;
const SLIDE_MS = 1100;

/**
 * A catalogue's cover. Hovering (or focusing) it pages slowly through the stored page previews, like
 * leafing through the catalogue; leaving returns to the cover. Pages after the first are only fetched
 * once the cover is first hovered.
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
    <button
      type="button"
      onClick={onOpen}
      onMouseEnter={enter}
      onMouseLeave={leave}
      onFocus={enter}
      onBlur={leave}
      className="relative block aspect-[1/1.414] w-full overflow-hidden border-b bg-muted focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
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
              <img key={i} src={u} alt="" draggable={false} className="size-full shrink-0 object-cover object-top" loading={i === 0 ? "lazy" : undefined} />
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

      {/* Name comes from content (not aria-label) so it includes the visible page badge. */}
      <span className="sr-only">Preview {c.fileName}, </span>
      <span className="absolute bottom-2 left-2 rounded-full bg-background/90 px-2 py-0.5 text-xs font-medium tabular-nums shadow-sm">
        {active && loops ? `Page ${shown + 1} of ${c.pageCount}` : `${c.pageCount} ${c.pageCount === 1 ? "page" : "pages"}`}
      </span>
      {loops && (
        <span className="absolute right-2 bottom-2.5 flex gap-1" aria-hidden>
          {urls.map((u, i) => (
            <span
              key={u}
              className={cn("h-1.5 rounded-full bg-background/90 shadow-sm transition-all duration-500", i === shown ? "w-3.5" : "w-1.5 opacity-60")}
            />
          ))}
        </span>
      )}
    </button>
  );
}

type Job = { file: File; pct: number; status: "uploading" | "done" | "failed"; error?: string };

interface Props {
  companyId: string;
  canWrite: boolean;
  /** Raised by the tab bar's "Upload catalogue" button. */
  addRequested?: boolean;
  onAddHandled?: () => void;
}

const CompanyCatalogue = ({ companyId, canWrite, addRequested, onAddHandled }: Props) => {
  const [items, setItems] = useState<Catalogue[] | null>(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<File[]>([]);
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [viewing, setViewing] = useState<Catalogue | null>(null);
  const closeViewer = useCallback(() => setViewing(null), []);

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

  const replace = useCallback((row: Catalogue) => setItems((xs) => xs?.map((x) => (x.id === row.id ? row : x)) ?? null), []);

  // Previews are drawn by the browser. A queue keeps it to one PDF at a time; `tried` makes each
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

  useEffect(() => {
    if (addRequested) {
      setOpen(true);
      onAddHandled?.();
    }
  }, [addRequested, onAddHandled]);

  const busy = jobs?.some((j) => j.status === "uploading") ?? false;
  const close = () => {
    setOpen(false);
    setPicked([]);
    setJobs(null);
  };

  const patch = (i: number, next: Partial<Job>) => setJobs((js) => js && js.map((j, k) => (k === i ? { ...j, ...next } : j)));

  const run = async (file: File, i: number) => {
    patch(i, { status: "uploading", pct: 0, error: undefined });
    if (!(await isPdfFile(file))) {
      patch(i, { status: "failed", error: "This is not a valid PDF file." });
      return;
    }
    try {
      const row = await uploadCompanyCatalogue(companyId, file, (pct) => patch(i, { pct: Math.min(99, Math.round(pct)) }));
      patch(i, { status: "done", pct: 100 });
      // Previews come from the local file (no download); the card shows a PDF glyph until page 1 lands.
      queuePreviews(row, file);
      setItems((xs) => [row, ...(xs ?? [])]);
    } catch (err) {
      patch(i, { status: "failed", error: apiErrorMessage(err, "Upload failed.") });
    }
  };

  const start = () => {
    setJobs(picked.map((file) => ({ file, pct: 0, status: "uploading" })));
    // One at a time: each file is parsed server-side, and a 25 MB burst ×5 is no kinder to nginx.
    void picked.reduce((p, f, i) => p.then(() => run(f, i)), Promise.resolve());
  };

  const remove = async (c: Catalogue) => {
    const yes = await confirmDialog({
      danger: true,
      title: "Delete catalogue",
      text: `Delete “${c.fileName}”? The PDF is removed from storage and can't be recovered.`,
      confirmText: "Delete",
    });
    if (!yes) return;
    setDeleting(c.id);
    try {
      await deleteCompanyCatalogue(companyId, c.id);
      setItems((xs) => xs?.filter((x) => x.id !== c.id) ?? null);
      toast({ icon: "success", title: "Catalogue deleted" });
    } catch (err) {
      toast({ icon: "error", title: "Couldn't delete the catalogue", text: apiErrorMessage(err, "Please try again.") });
    } finally {
      setDeleting(null);
    }
  };

  if (error) {
    return <EmptyState title="Couldn't load catalogues" description={error} action={<Button variant="outline" onClick={() => void load()}>Try again</Button>} />;
  }
  if (!items) return <Skeleton className="h-64 w-full rounded-2xl" />;

  const uploadPanel = open && canWrite && (
    <section aria-label="Upload catalogues" className="space-y-4 rounded-2xl border bg-muted/30 p-5">
      <div className="flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-xl bg-accent text-accent-foreground">
          <Upload className="size-4" aria-hidden />
        </span>
        <div className="mr-auto">
          <h3 className="font-semibold">Upload catalogues</h3>
          <p className="text-xs text-muted-foreground">Each PDF is checked for damage and hidden scripts, then compressed before it's stored.</p>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={close} disabled={busy} aria-label="Close upload">
          <X />
        </Button>
      </div>

      {!jobs ? (
        <FileUpload
          acceptTypes={ACCEPT}
          maxFiles={MAX_FILES}
          maxSizeMB={CATALOGUE_MAX_MB}
          noun="PDFs"
          onFilesChange={setPicked}
          hint={<p className="mt-2 text-sm text-gray-500">PDF only, up to {CATALOGUE_MAX_MB} MB each, {MAX_FILES} at a time. Password-protected PDFs can't be uploaded.</p>}
        />
      ) : (
        <ul className="space-y-2" aria-label="Upload progress">
          {jobs.map((j, i) => (
            <li key={`${j.file.name}-${i}`} className="flex items-center gap-3 rounded-xl border bg-background px-3 py-2.5">
              <FileText className="size-5 shrink-0 text-muted-foreground" aria-hidden />
              <div className="min-w-0 flex-1 space-y-1">
                <p className="truncate text-sm font-medium" title={j.file.name}>{j.file.name}</p>
                {j.status === "uploading" && <Progress value={j.pct} aria-label={`Uploading ${j.file.name}`} />}
                {j.status === "done" && <p className="text-xs text-success-foreground">Uploaded</p>}
                {j.status === "failed" && (
                  <p className="flex items-start gap-1 text-xs text-destructive-foreground">
                    <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden /> {j.error}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex justify-end gap-3">
        {jobs && !busy ? (
          <Button onClick={close}>Done</Button>
        ) : (
          <>
            <Button variant="outline" onClick={close} disabled={busy}>Cancel</Button>
            <Button onClick={start} disabled={!picked.length || busy}>
              <Upload data-icon="inline-start" /> {busy ? "Uploading…" : `Upload ${picked.length || ""} PDF${picked.length === 1 ? "" : "s"}`}
            </Button>
          </>
        )}
      </div>
    </section>
  );

  return (
    <div className="space-y-4 pt-4">
      {uploadPanel}

      {items.length === 0 ? (
        !open && (
          <EmptyState
            icon={<BookOpen aria-hidden />}
            title="No catalogues yet"
            description="Upload the product catalogues this company shares, so anyone on the account can open the latest one."
            action={canWrite ? <Button size="sm" onClick={() => setOpen(true)}><Upload aria-hidden /> Upload catalogue</Button> : undefined}
          />
        )
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-4" aria-label="Catalogues">
          {items.map((c) => (
            <li key={c.id} className="flex flex-col overflow-hidden rounded-2xl border bg-background">
              <CatalogueCover catalogue={c} onOpen={() => setViewing(c)} />
              <div className="flex items-start gap-1 p-3">
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="line-clamp-2 text-sm font-medium break-words" title={c.fileName}>{c.fileName}</p>
                  <p className="text-xs text-muted-foreground tabular-nums" title={formatDateTime(c.createdAt)}>
                    {formatSize(c.sizeBytes / 1048576)}, {formatDate(c.createdAt)}
                  </p>
                  {c.uploadedByName && <p className="truncate text-xs text-muted-foreground">by {c.uploadedByName}</p>}
                </div>
                {canWrite && (
                  <Button
                    variant="tinted"
                    size="icon-sm"
                    style={DANGER_TINT}
                    className="shrink-0"
                    onClick={() => void remove(c)}
                    loading={deleting === c.id}
                    aria-label={`Delete ${c.fileName}`}
                  >
                    <Trash2 />
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Opens in the page; the viewer's own "Open in tab" button is there for a full-window read. */}
      {viewing && <DocumentPreviewModal url={viewing.url} title={viewing.fileName} onClose={closeViewer} />}
    </div>
  );
};

export default CompanyCatalogue;
