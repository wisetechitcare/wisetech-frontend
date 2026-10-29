import { useRef, useState, type DragEvent } from "react";
import {
  AlertCircle,
  Check,
  File as FileIcon,
  Image as ImageIcon,
  RefreshCw,
  Upload,
  Video,
  X,
} from "lucide-react";
import { Button } from "@/ds/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ds/ui/dialog";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from "@/ds/ui/field";
import { Input } from "@/ds/ui/input";
import { Progress } from "@/ds/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/ds/ui/radio-group";
import { cn } from "@/ds/lib/utils";
import { apiErrorMessage } from "@utils/apiError";
import {
  GallerySelect,
  NONE,
  optionsWithNone,
} from "./GalleryDialogs";
import {
  DISCIPLINES,
  IMAGE_MAX_MB,
  VIDEO_MAX_MB,
  formatSize,
  type Albums,
  type GalleryApi,
  type GalleryView,
  type MediaKind,
  type UploadSource,
} from "./media";

type Status = "ready" | "invalid" | "uploading" | "done" | "failed";
interface UploadFile {
  fid: number;
  source: UploadSource;
  kind: MediaKind | null;
  status: Status;
  pct: number;
  error?: string;
}

export interface UploadResult {
  dest: GalleryView;
  album: string;
  count: number;
}

// What the server pipeline accepts: images are sniffed and re-encoded (JPEG/PNG/WEBP/GIF),
// videos are verified as MP4/MOV. HEIC is not readable by the pipeline, so it is refused here.
const IMAGE_EXT = ["jpg", "jpeg", "png", "webp", "gif"];
const VIDEO_EXT = ["mp4", "mov"];
const ACCEPT = [...IMAGE_EXT, ...VIDEO_EXT].map((e) => `.${e}`).join(",");

function classify(name: string): MediaKind | null {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (IMAGE_EXT.includes(ext)) return "image";
  if (VIDEO_EXT.includes(ext)) return "video";
  return null;
}

function validate(kind: MediaKind | null, mb: number): string | undefined {
  if (!kind)
    return "Unsupported file type. Use JPG, PNG, WEBP, GIF, MP4 or MOV.";
  if (kind === "image" && mb > IMAGE_MAX_MB)
    return `${formatSize(mb)} is over the ${IMAGE_MAX_MB} MB limit for images.`;
  if (kind === "video" && mb > VIDEO_MAX_MB)
    return `${formatSize(mb)} is over the ${VIDEO_MAX_MB} MB limit for videos.`;
}

/**
 * Multi-file upload: pick a view (and optionally an album / discipline). Captions and zones are set per item after upload.
 * Each file goes through `api.upload` and appears in the gallery as soon as it finishes.
 */
export function UploadMediaDialog({
  open,
  initialView,
  initialAlbum,
  albums,
  projectName,
  api,
  demoSamples,
  onClose,
}: {
  open: boolean;
  initialView: GalleryView;
  initialAlbum?: string;
  albums: Albums;
  projectName: string;
  api: Pick<GalleryApi, "upload">;
  /** Storybook only: adds an "Add sample files" shortcut. */
  demoSamples?: (seed: number) => UploadSource[];
  onClose: (result: UploadResult) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={() => undefined}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[92vh] grid-rows-[auto_minmax(0,1fr)_auto] sm:max-w-2xl"
      >
        {open && (
          <UploadForm
            initialView={initialView}
            initialAlbum={initialAlbum}
            albums={albums}
            projectName={projectName}
            api={api}
            demoSamples={demoSamples}
            onClose={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function UploadForm({
  initialView,
  initialAlbum,
  albums,
  projectName,
  api,
  demoSamples,
  onClose,
}: Omit<Parameters<typeof UploadMediaDialog>[0], "open">) {
  const [dest, setDest] = useState<GalleryView>(initialView);
  const [album, setAlbum] = useState(
    initialAlbum && albums[initialView].includes(initialAlbum)
      ? initialAlbum
      : NONE,
  );
  const [discipline, setDiscipline] = useState(NONE);
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [started, setStarted] = useState(false);
  const [over, setOver] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const fid = useRef(0);

  const isSite = dest === "site";
  const ready = files.filter((f) => f.status === "ready").length;
  const busy = files.some((f) => f.status === "uploading");
  const done = files.filter((f) => f.status === "done").length;
  const finished = started && !busy;

  const addSources = (list: UploadSource[]) =>
    setFiles((prev) => [
      ...prev,
      ...list.map((source) => {
        const kind = classify(source.name);
        const error = validate(kind, source.mb);
        return {
          fid: ++fid.current,
          source,
          kind,
          status: error ? "invalid" : "ready",
          pct: 0,
          error,
        } as UploadFile;
      }),
    ]);

  const addReal = (list: FileList | null) => {
    if (!list) return;
    addSources(
      [...list].map((file) => ({
        name: file.name,
        mb: file.size / 1048576,
        mime: file.type,
        file,
        src: classify(file.name) === "image" ? URL.createObjectURL(file) : null,
      })),
    );
  };

  const patch = (id: number, p: Partial<UploadFile>) =>
    setFiles((prev) => prev.map((f) => (f.fid === id ? { ...f, ...p } : f)));

  const run = (f: UploadFile) => {
    patch(f.fid, { status: "uploading", pct: 0, error: undefined });
    const clean = (v: string) => (v === NONE ? "" : v);
    const meta = {
      view: dest,
      album: clean(album),
      discipline: isSite ? clean(discipline) : "",
    };
    api
      .upload(f.source, meta, (pct) =>
        patch(f.fid, { pct: Math.min(99, Math.round(pct)) }),
      )
      .then(() => patch(f.fid, { status: "done", pct: 100 }))
      .catch((err) =>
        patch(f.fid, {
          status: "failed",
          error: apiErrorMessage(
            err,
            (err as Error)?.message || "Upload failed. Try again.",
          ),
        }),
      );
  };

  const start = () => {
    setStarted(true);
    files.filter((f) => f.status === "ready").forEach(run);
  };

  const close = () =>
    onClose({ dest, album: album === NONE ? "" : album, count: done });

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    if (!started) addReal(e.dataTransfer.files);
  };

  return (
    <>
      <DialogHeader>
        <span className="grid size-14 place-items-center rounded-2xl bg-accent text-accent-foreground">
          <Upload className="size-6" aria-hidden />
        </span>
        <DialogTitle className="text-xl">Upload media</DialogTitle>
        <DialogDescription>
          Add photos and videos to {projectName}.
        </DialogDescription>
        <Button
          variant="ghost"
          size="icon-sm"
          className="absolute top-4 right-4"
          onClick={close}
          disabled={busy}
          aria-label="Close upload"
        >
          <X />
        </Button>
      </DialogHeader>

      <div className="-mx-6 flex min-h-0 flex-col gap-5 overflow-y-auto px-6">
        <RadioGroup
          value={dest}
          onValueChange={(v) => {
            const next = v as GalleryView;
            setDest(next);
            if (!albums[next].includes(album)) setAlbum(NONE);
          }}
          aria-label="Upload to"
          className="grid gap-3 sm:grid-cols-2"
          disabled={started}
        >
          {(
            [
              [
                "project",
                "Project View",
                "Renders, building photos, approved and handover images",
              ],
              [
                "site",
                "Site View",
                "Daily site progress, grouped by the day it was taken",
              ],
            ] as const
          ).map(([v, title, desc]) => (
            <FieldLabel key={v} htmlFor={`dest-${v}`}>
              <Field orientation="horizontal">
                <FieldContent>
                  <FieldTitle>{title}</FieldTitle>
                  <FieldDescription>{desc}</FieldDescription>
                </FieldContent>
                <RadioGroupItem value={v} id={`dest-${v}`} />
              </Field>
            </FieldLabel>
          ))}
        </RadioGroup>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (!started) setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={onDrop}
          className={cn(
            "grid place-items-center gap-1.5 rounded-2xl border-2 border-dashed bg-muted/40 px-4 py-6 text-center text-sm text-muted-foreground transition-colors",
            over && "border-primary bg-accent",
          )}
        >
          <span className="grid size-11 place-items-center rounded-xl bg-accent text-accent-foreground">
            <Upload className="size-5" aria-hidden />
          </span>
          <p className="font-semibold text-foreground">
            Drag and drop photos or videos here
          </p>
          <p>
            or{" "}
            <Button
              variant="link"
              className="h-auto p-0"
              disabled={started}
              onClick={() => fileInput.current?.click()}
            >
              browse files
            </Button>{" "}
            · many files at once
          </p>
          <p className="text-xs">
            Images up to {IMAGE_MAX_MB} MB (JPG, PNG, WEBP, GIF) · Videos up to{" "}
            {VIDEO_MAX_MB} MB (MP4, MOV)
          </p>
          {demoSamples && (
            <Button
              variant="link"
              size="xs"
              className="h-auto p-0"
              disabled={started}
              onClick={() => addSources(demoSamples(700 + fid.current))}
            >
              No files handy? Add sample files
            </Button>
          )}
          <Input
            ref={fileInput}
            type="file"
            multiple
            accept={ACCEPT}
            className="sr-only"
            tabIndex={-1}
            aria-label="Choose files"
            onChange={(e) => {
              addReal(e.target.files);
              e.target.value = "";
            }}
          />
        </div>

        {files.length > 0 && (
          <ul className="divide-y rounded-2xl border" aria-label="Files">
            {files.map((f) => (
              <li
                key={f.fid}
                className={cn(
                  "grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5",
                  f.status === "invalid" && "bg-destructive-soft",
                )}
              >
                <span
                  className="grid h-8.5 w-11 place-items-center rounded-md bg-muted bg-cover bg-center text-muted-foreground"
                  style={
                    f.source.src && f.kind === "image"
                      ? { backgroundImage: `url("${f.source.src}")` }
                      : undefined
                  }
                >
                  {!(f.source.src && f.kind === "image") &&
                    (f.kind === "video" ? (
                      <Video className="size-4" aria-hidden />
                    ) : f.kind ? (
                      <ImageIcon className="size-4" aria-hidden />
                    ) : (
                      <FileIcon className="size-4" aria-hidden />
                    ))}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {f.source.name}
                  </p>
                  {f.status === "uploading" ? (
                    <div className="mt-1 space-y-1">
                      <p className="tabular text-xs text-muted-foreground">
                        {f.pct}% of {formatSize(f.source.mb)}
                      </p>
                      <Progress
                        value={f.pct}
                        aria-label={`Uploading ${f.source.name}`}
                      />
                    </div>
                  ) : (
                    <p
                      className={cn(
                        "flex items-center gap-1.5 text-xs",
                        f.status === "invalid" || f.status === "failed"
                          ? "text-destructive-foreground"
                          : f.status === "done"
                            ? "text-success-foreground"
                            : "text-muted-foreground",
                      )}
                    >
                      {(f.status === "invalid" || f.status === "failed") && (
                        <AlertCircle
                          className="size-3.5 shrink-0"
                          aria-hidden
                        />
                      )}
                      {f.status === "done" && (
                        <Check className="size-3.5 shrink-0" aria-hidden />
                      )}
                      {f.status === "invalid" || f.status === "failed"
                        ? f.error
                        : f.status === "done"
                          ? `Uploaded · ${formatSize(f.source.mb)}`
                          : `${f.kind === "video" ? "Video" : "Photo"} · ${formatSize(f.source.mb)} · Ready`}
                    </p>
                  )}
                </div>
                <div>
                  {f.status === "failed" && (
                    <Button variant="outline" size="sm" onClick={() => run(f)}>
                      <RefreshCw data-icon="inline-start" /> Retry
                    </Button>
                  )}
                  {(f.status === "ready" || f.status === "invalid") &&
                    !started && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() =>
                          setFiles((p) => p.filter((x) => x.fid !== f.fid))
                        }
                        aria-label={`Remove ${f.source.name}`}
                      >
                        <X />
                      </Button>
                    )}
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <GallerySelect
            label="Album (optional)"
            value={album}
            onChange={setAlbum}
            options={optionsWithNone("No album", albums[dest])}
            disabled={started}
          />
          {isSite && (
            <GallerySelect
              label="Discipline (optional)"
              value={discipline}
              onChange={setDiscipline}
              options={optionsWithNone("Not set", DISCIPLINES)}
              disabled={started}
            />
          )}
        </div>
      </div>

      <DialogFooter>
        {finished ? (
          <Button onClick={close}>
            <Check data-icon="inline-start" /> Done
            {done > 0 &&
              ` · view in ${dest === "project" ? "Project" : "Site"} View`}
          </Button>
        ) : (
          <>
            <Button variant="outline" onClick={close} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={start} disabled={!ready || busy}>
              <Upload data-icon="inline-start" /> Upload {ready || ""} file
              {ready === 1 ? "" : "s"}
            </Button>
          </>
        )}
      </DialogFooter>
    </>
  );
}
