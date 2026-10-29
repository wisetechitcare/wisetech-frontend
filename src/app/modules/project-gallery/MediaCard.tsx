import {
  CalendarDays,
  Download,
  Eye,
  Folder,
  Image as ImageIcon,
  MapPin,
  MoreHorizontal,
  Pencil,
  Play,
  Star,
  Trash2,
  Video,
} from "lucide-react";
import { Badge } from "@/ds/ui/badge";
import { Button } from "@/ds/ui/button";
import { Card } from "@/ds/ui/card";
import { Checkbox } from "@/ds/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/ds/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/ds/ui/table";
import { cn } from "@/ds/lib/utils";
import {
  formatDateTime,
  formatSize,
  isRealVideo,
  mediaLabel,
  type MediaItem,
} from "./media";

export interface MediaActions {
  preview: (id: string) => void;
  download: (id: string) => void;
  edit: (id: string) => void;
  setCover: (id: string) => void;
  remove: (ids: string[]) => void;
  toggleSelect: (id: string) => void;
}

export interface MediaRenderState {
  coverId: string | null;
  selected: Set<string>;
  /** Set right after a cover change so the badge pops in once. */
  poppedId: string | null;
  newIds: Set<string>;
}

const DISCIPLINE_VARIANT: Record<
  string,
  "brand" | "info" | "warning" | "success" | "danger" | "neutral"
> = {
  MEP: "brand",
  HVAC: "info",
  Electrical: "warning",
  Plumbing: "success",
  "Fire Fighting": "danger",
  Interiors: "neutral",
};

export function MediaTags({ item }: { item: MediaItem }) {
  if (!item.discipline && !item.zone && !item.album) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {item.view === "site" && item.discipline && (
        <Badge variant={DISCIPLINE_VARIANT[item.discipline] ?? "neutral"}>
          {item.discipline}
        </Badge>
      )}
      {item.view === "site" && item.zone && (
        <Badge variant="outline">
          <MapPin data-icon="inline-start" aria-hidden /> {item.zone}
        </Badge>
      )}
      {item.album && (
        <Badge variant="outline">
          <Folder data-icon="inline-start" aria-hidden /> {item.album}
        </Badge>
      )}
    </div>
  );
}

/** Image thumbnail; a stored video shows its first frame (the browser reads just the metadata). */
export function MediaThumb({ item, className }: { item: Pick<MediaItem, "kind" | "src">; className?: string }) {
  return isRealVideo(item) ? (
    <video src={`${item.src}#t=0.1`} preload="metadata" muted playsInline className={className} />
  ) : (
    <img src={item.src} alt="" className={className} />
  );
}

export function CoverBadge({
  pop,
  compact,
}: {
  pop?: boolean;
  compact?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md bg-amber-400 font-bold tracking-wide text-amber-950 shadow-sm",
        compact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-[10.5px]",
        pop &&
          "motion-safe:animate-in motion-safe:zoom-in-50 motion-safe:fade-in motion-safe:duration-500",
      )}
    >
      <Star className="size-3 fill-current" aria-hidden /> PROJECT COVER
    </span>
  );
}

function MediaActionsMenu({
  item,
  isCover,
  actions,
}: {
  item: MediaItem;
  isCover: boolean;
  actions: MediaActions;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Actions for ${mediaLabel(item)}`}
          />
        }
      >
        <MoreHorizontal />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuItem onClick={() => actions.preview(item.id)}>
          <Eye /> Preview
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => actions.download(item.id)}>
          <Download /> Download
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => actions.edit(item.id)}>
          <Pencil /> Edit caption &amp; details
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {item.kind === "video" ? (
          <DropdownMenuItem disabled>
            <Star /> Videos can't be covers yet
          </DropdownMenuItem>
        ) : isCover ? (
          <DropdownMenuItem disabled>
            <Star /> Current project cover
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={() => actions.setCover(item.id)}>
            <Star /> Set as Project Cover
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={() => actions.remove([item.id])}
        >
          <Trash2 /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function MediaCard({
  item,
  state,
  actions,
}: {
  item: MediaItem;
  state: MediaRenderState;
  actions: MediaActions;
}) {
  const isCover = item.id === state.coverId;
  const selected = state.selected.has(item.id);
  const label = mediaLabel(item);
  return (
    <Card
      className={cn(
        "group/media gap-0 py-0 transition-shadow hover:shadow-md",
        isCover && "ring-2 ring-amber-400",
        selected && "ring-2 ring-primary",
      )}
    >
      <div className="relative aspect-4/3 overflow-hidden bg-muted">
        <Button
          variant="ghost"
          className="block size-full rounded-none p-0 hover:bg-transparent"
          onClick={() => actions.preview(item.id)}
          aria-label={`Preview ${label}`}
        >
          <MediaThumb
            item={item}
            className="size-full object-cover transition-transform duration-300 group-hover/media:scale-[1.03]"
          />
        </Button>
        <div
          className={cn(
            "absolute top-2.5 left-2.5 grid size-7 place-items-center rounded-lg bg-background/95 shadow-sm transition-opacity",
            selected || state.selected.size > 0
              ? "opacity-100"
              : "opacity-0 group-hover/media:opacity-100 focus-within:opacity-100",
          )}
        >
          <Checkbox
            checked={selected}
            onCheckedChange={() => actions.toggleSelect(item.id)}
            aria-label={`Select ${label}`}
          />
        </div>
        <div className="pointer-events-none absolute top-2.5 right-2.5">
          {isCover && <CoverBadge pop={state.poppedId === item.id} />}
        </div>
        {item.kind === "video" && (
          <>
            <span className="pointer-events-none absolute top-1/2 left-1/2 grid size-12 -translate-1/2 place-items-center rounded-full bg-black/60 text-white">
              <Play className="ml-0.5 size-5 fill-current" aria-hidden />
            </span>
            <span className="tabular pointer-events-none absolute right-2.5 bottom-2.5 inline-flex items-center gap-1 rounded-md bg-black/75 px-2 py-0.5 text-xs font-semibold text-white">
              <Video className="size-3.5" aria-hidden /> {item.duration ?? "Video"}
            </span>
          </>
        )}
        {state.newIds.has(item.id) && (
          <span className="pointer-events-none absolute bottom-2.5 left-2.5 rounded-md bg-success px-1.5 py-0.5 text-[10.5px] font-bold text-white">
            NEW
          </span>
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-1 px-3 pt-2.5 pb-3">
        <div className="flex min-w-0 items-center gap-1">
          <p className="min-w-0 flex-1 truncate font-semibold" title={label}>
            {label}
          </p>
          <div className="-mr-1.5">
            <MediaActionsMenu item={item} isCover={isCover} actions={actions} />
          </div>
        </div>
        <p className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
          {item.kind === "video" ? (
            <Video className="size-3.5 shrink-0" aria-label="Video" />
          ) : (
            <ImageIcon className="size-3.5 shrink-0" aria-label="Photo" />
          )}
          <span className="truncate">{item.name}</span>
        </p>
        <p className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarDays className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">
            {formatDateTime(item.at)}
            {item.view === "site" && ` · ${item.by.split(" ")[0]}`}
          </span>
        </p>
        <div className="mt-1">
          <MediaTags item={item} />
        </div>
      </div>
    </Card>
  );
}

export function MediaGrid({
  items,
  state,
  actions,
}: {
  items: MediaItem[];
  state: MediaRenderState;
  actions: MediaActions;
}) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-4">
      {items.map((m) => (
        <MediaCard key={m.id} item={m} state={state} actions={actions} />
      ))}
    </div>
  );
}

export function MediaTable({
  items,
  state,
  actions,
}: {
  items: MediaItem[];
  state: MediaRenderState;
  actions: MediaActions;
}) {
  const site = items[0]?.view === "site";
  const allChecked =
    items.length > 0 && items.every((m) => state.selected.has(m.id));
  return (
    <Card className="gap-0 py-0">
      <Table className="min-w-215">
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead className="w-10">
              <Checkbox
                checked={allChecked}
                onCheckedChange={() =>
                  items.forEach(
                    (m) =>
                      (allChecked || !state.selected.has(m.id)) &&
                      actions.toggleSelect(m.id),
                  )
                }
                aria-label="Select all in this list"
              />
            </TableHead>
            <TableHead className="w-24">Preview</TableHead>
            <TableHead>Caption / file</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>{site ? "Discipline · Zone" : "Album"}</TableHead>
            {site && <TableHead>Album</TableHead>}
            <TableHead>Uploaded by</TableHead>
            <TableHead>Date &amp; time</TableHead>
            <TableHead className="w-10">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((m) => {
            const isCover = m.id === state.coverId;
            const label = mediaLabel(m);
            return (
              <TableRow
                key={m.id}
                data-state={state.selected.has(m.id) ? "selected" : undefined}
              >
                <TableCell>
                  <Checkbox
                    checked={state.selected.has(m.id)}
                    onCheckedChange={() => actions.toggleSelect(m.id)}
                    aria-label={`Select ${label}`}
                  />
                </TableCell>
                <TableCell>
                  <div className="relative w-20">
                    <Button
                      variant="ghost"
                      className={cn(
                        "block h-14 w-20 overflow-hidden rounded-lg p-0",
                        isCover && "ring-2 ring-amber-400",
                      )}
                      onClick={() => actions.preview(m.id)}
                      aria-label={`Preview ${label}`}
                    >
                      <MediaThumb item={m} className="size-full object-cover" />
                    </Button>
                    {m.kind === "video" && (
                      <span className="tabular pointer-events-none absolute right-1 bottom-1 rounded bg-black/75 px-1 text-[10px] text-white">
                        ▶ {m.duration ?? "Video"}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="min-w-0">
                      <p className="font-medium">{label}</p>
                      <p className="text-xs text-muted-foreground">
                        {m.name} · {formatSize(m.size)}
                      </p>
                    </div>
                    {isCover && <CoverBadge compact />}
                    {state.newIds.has(m.id) && (
                      <Badge variant="success">New</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {m.kind === "video" ? "Video" : "Photo"}
                </TableCell>
                <TableCell>
                  {site ? (
                    <MediaTags item={{ ...m, album: "" }} />
                  ) : (
                    m.album || <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                {site && (
                  <TableCell>
                    {m.album || (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                )}
                <TableCell className="text-muted-foreground">{m.by}</TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {formatDateTime(m.at)}
                </TableCell>
                <TableCell>
                  <MediaActionsMenu
                    item={m}
                    isCover={isCover}
                    actions={actions}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}
