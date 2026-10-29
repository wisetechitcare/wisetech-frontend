import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  Building2,
  ChevronRight,
  Download,
  Folder,
  FolderPlus,
  HardHat,
  Image as ImageIcon,
  LayoutGrid,
  List,
  Search,
  Star,
  Trash2,
  Upload,
  Video,
  X,
} from "lucide-react";
import { Badge } from "@/ds/ui/badge";
import { Button } from "@/ds/ui/button";
import { Card } from "@/ds/ui/card";
import { Checkbox } from "@/ds/ui/checkbox";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/ds/ui/input-group";
import { Item, ItemActions, ItemContent, ItemTitle } from "@/ds/ui/item";
import { Tabs, TabsList, TabsTrigger } from "@/ds/ui/tabs";
import { EmptyState } from "@/ds/patterns/empty-state";
import { StatCard } from "@/ds/patterns/stat-card";
import { apiErrorMessage } from "@utils/apiError";
import { cn } from "@/ds/lib/utils";
import {
  MediaGrid,
  MediaTable,
  type MediaActions,
  type MediaRenderState,
} from "./MediaCard";
import { MediaViewer } from "./MediaViewer";
import { UploadMediaDialog, type UploadResult } from "./UploadMediaDialog";
import {
  ConfirmDeleteDialog,
  CoverPickerDialog,
  CreateAlbumDialog,
  EditDetailsDialog,
  GallerySelect,
} from "./GalleryDialogs";
import {
  DISCIPLINES,
  dayKey,
  formatDay,
  mediaLabel,
  mediaSource,
  type Albums,
  type GalleryApi,
  type GalleryView,
  type MediaItem,
  type ProjectInfo,
  type UploadSource,
} from "./media";

export type GalleryLayout = "grid" | "list";
type TypeFilter = "all" | "image" | "video";
const ALL = "all";

/** The Gallery tab of the project workspace: Project View / Site View, filters, upload, preview and one shared project cover. */
export function MediaGalleryScreen({
  items,
  albums,
  coverId,
  project,
  api,
  canEdit = true,
  now: nowProp,
  initialView = "project",
  initialLayout = "grid",
  demoSamples,
}: {
  items: MediaItem[];
  albums: Albums;
  coverId: string | null;
  project: ProjectInfo;
  /** Every change goes through here; the screen only shows the result. */
  api: GalleryApi;
  /** Without Projects write access the upload/album/cover controls are hidden (the API refuses them anyway). */
  canEdit?: boolean;
  /** Reference "now" for date filters and Today/Yesterday (fixed in Storybook). */
  now?: Date;
  initialView?: GalleryView;
  initialLayout?: GalleryLayout;
  demoSamples?: (seed: number) => UploadSource[];
}) {
  const [now] = useState(() => nowProp ?? new Date());
  const [view, setView] = useState<GalleryView>(initialView);
  const [type, setType] = useState<TypeFilter>("all");
  const [q, setQ] = useState("");
  const [album, setAlbum] = useState(ALL);
  const [zone, setZone] = useState(ALL);
  const [discipline, setDiscipline] = useState(ALL);
  const [sort, setSort] = useState<"new" | "old">("new");
  const [layout, setLayout] = useState<GalleryLayout>(initialLayout);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [poppedId, setPoppedId] = useState<string | null>(null);

  const [viewer, setViewer] = useState<{
    list: MediaItem[];
    index: number;
  } | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteIds, setDeleteIds] = useState<string[]>([]);
  const [albumDialog, setAlbumDialog] = useState(false);
  const [picker, setPicker] = useState(false);
  const [upload, setUpload] = useState<{
    album?: string;
    before: Set<string>;
  } | null>(null);

  const cover = items.find((m) => m.id === coverId) ?? null;
  const inView = useMemo(
    () => items.filter((m) => m.view === view),
    [items, view],
  );
  const zones = useMemo(
    () =>
      [
        ...new Set(items.map((m) => m.zone).filter((z): z is string => !!z)),
      ].sort(),
    [items],
  );
  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return inView
      .filter(
        (m) =>
          (type === "all" || m.kind === type) &&
          (!needle ||
            `${m.name} ${m.caption}`.toLowerCase().includes(needle)) &&
          (album === ALL || m.album === album) &&
          (view === "project" ||
            ((zone === ALL || m.zone === zone) &&
              (discipline === ALL || m.discipline === discipline))),
      )
      .sort((a, b) => {
        const d = new Date(b.at).getTime() - new Date(a.at).getTime();
        return sort === "new" ? d : -d;
      });
  }, [inView, type, q, album, zone, discipline, sort, view]);

  /** Runs one change; on failure the API's own message is shown and nothing else happens. */
  const attempt = async (work: () => Promise<void>, fallback: string) => {
    try {
      await work();
      return true;
    } catch (err) {
      toast.error(fallback, {
        description: apiErrorMessage(err, "Please try again."),
      });
      return false;
    }
  };

  const resetFilters = () => {
    setType("all");
    setQ("");
    setAlbum(ALL);
    setZone(ALL);
    setDiscipline(ALL);
  };
  const switchView = (v: GalleryView) => {
    if (v === view) return;
    setView(v);
    resetFilters();
    setSelected(new Set());
  };

  const setCover = async (id: string) => {
    const next = items.find((m) => m.id === id);
    if (!next || next.kind !== "image" || id === coverId) return;
    const prev = cover;
    if (!(await attempt(() => api.setCover(id), "Couldn't change the cover")))
      return;
    setPoppedId(id);
    toast("Project cover updated", {
      description: (
        <span className="mt-1 flex items-center gap-2.5">
          {prev ? (
            <img
              src={prev.src}
              alt=""
              className="h-8 w-11 shrink-0 rounded object-cover opacity-50 grayscale"
            />
          ) : (
            <span className="grid h-8 w-11 shrink-0 place-items-center rounded bg-accent text-[10px] font-bold text-accent-foreground">
              {project.initials}
            </span>
          )}
          <ChevronRight className="size-3.5 shrink-0" aria-hidden />
          <img
            src={next.src}
            alt=""
            className="h-8 w-11 shrink-0 rounded object-cover"
          />
          <span>
            “{mediaLabel(next)}” is now the project avatar.
            {prev && ` It replaces “${mediaLabel(prev)}”.`}
          </span>
        </span>
      ),
    });
  };

  const removeCover = async () => {
    if (await attempt(() => api.setCover(null), "Couldn't remove the cover"))
      toast("Cover removed", {
        description: "Project initials are shown instead.",
      });
  };

  const toggleSelect = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const openViewer = (id: string) => {
    const source = list.some((m) => m.id === id)
      ? list
      : items.filter((m) => m.id === id);
    setViewer({ list: source, index: source.findIndex((m) => m.id === id) });
  };

  const download = (id: string) => {
    const m = items.find((x) => x.id === id);
    if (!m) return;
    // A plain link: the bucket objects are public, so the browser fetches them directly.
    window.open(m.src, "_blank", "noopener");
  };

  const actions: MediaActions = {
    preview: openViewer,
    download,
    edit: setEditId,
    setCover: (id) => void setCover(id),
    remove: setDeleteIds,
    toggleSelect,
  };

  const confirmDelete = async () => {
    const ids = deleteIds;
    const hadCover = coverId !== null && ids.includes(coverId);
    setDeleteIds([]);
    if (!(await attempt(() => api.remove(ids), "Couldn't delete"))) return;
    setSelected((s) => new Set([...s].filter((id) => !ids.includes(id))));
    if (viewer) {
      const rest = viewer.list.filter((m) => !ids.includes(m.id));
      setViewer(
        rest.length
          ? { list: rest, index: Math.min(viewer.index, rest.length - 1) }
          : null,
      );
    }
    toast.success(`Deleted ${ids.length} item${ids.length > 1 ? "s" : ""}`, {
      description: hadCover
        ? "Project cover removed. Initials are shown."
        : "Removed from the gallery.",
    });
  };

  const onUploaded = (r: UploadResult) => {
    const before = upload?.before ?? new Set<string>();
    setUpload(null);
    if (!r.count) return;
    setNewIds(new Set(items.filter((m) => !before.has(m.id)).map((m) => m.id)));
    setView(r.dest);
    resetFilters();
    setAlbum(r.album || ALL);
    setSort("new");
    setSelected(new Set());
    toast.success(
      `${r.count} item${r.count > 1 ? "s" : ""} added to ${r.dest === "project" ? "Project" : "Site"} View`,
      {
        description:
          "Marked NEW in the gallery. Open any photo to set it as the project cover.",
      },
    );
  };

  const openUpload = (presetAlbum?: string) =>
    setUpload({ album: presetAlbum, before: new Set(items.map((m) => m.id)) });

  const renderState: MediaRenderState = { coverId, selected, poppedId, newIds };
  const photos = items.filter((m) => m.kind === "image").length;
  const viewerItems =
    viewer?.list.map((m) => items.find((x) => x.id === m.id) ?? m) ?? [];

  return (
    <Card className="gap-0 overflow-visible border-t-[3px] border-t-primary py-0">
      {/* Header */}
      <div className="flex flex-wrap items-start gap-4 border-b px-5 pt-5 pb-4">
        <div className="flex min-w-0 flex-[1_1_320px] items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
            <ImageIcon className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">Media Gallery</h2>
            <p className="text-sm text-muted-foreground">
              Manage project photos, site progress images and videos in one
              place.
            </p>
          </div>
        </div>
        {canEdit && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setAlbumDialog(true)}>
              <FolderPlus data-icon="inline-start" /> Create Album
            </Button>
            <Button onClick={() => openUpload()}>
              <Upload data-icon="inline-start" /> Upload Media
            </Button>
          </div>
        )}
      </div>

      {/* Cover + summary */}
      <div className="grid gap-4 border-b px-5 py-4 md:grid-cols-2 xl:grid-cols-[minmax(320px,1.2fr)_1fr_1fr]">
        <CoverCard
          cover={cover}
          initials={project.initials}
          canEdit={canEdit}
          onPreview={openViewer}
          onChange={() => setPicker(true)}
          onRemove={() => void removeCover()}
        />
        <StatCard label="Photos" value={photos} tone="info" icon={<ImageIcon aria-hidden />} />
        <StatCard label="Videos" value={items.length - photos} tone="warning" icon={<Video aria-hidden />} />
      </div>

      {/* View toggle + site */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 pt-4">
        <Tabs value={view} onValueChange={(v) => switchView(v as GalleryView)}>
          <TabsList aria-label="Gallery view" className="h-10">
            <TabsTrigger value="project" className="px-4">
              <Building2 /> Project View
              <Badge variant="neutral" className="tabular">
                {items.filter((m) => m.view === "project").length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="site" className="px-4">
              <HardHat /> Site View
              <Badge variant="neutral" className="tabular">
                {items.filter((m) => m.view === "site").length}
              </Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Albums */}
      <div
        className="flex gap-2 overflow-x-auto px-5 pt-3 pb-1"
        role="group"
        aria-label="Albums"
      >
        <AlbumChip
          active={album === ALL}
          onClick={() => setAlbum(ALL)}
          icon={<LayoutGrid />}
          label="All media"
          count={inView.length}
        />
        {albums[view].map((a) => (
          <AlbumChip
            key={a}
            active={album === a}
            onClick={() => setAlbum(a)}
            thumb={inView.find((m) => m.album === a && m.kind === "image")?.src}
            icon={<Folder />}
            label={a}
            count={inView.filter((m) => m.album === a).length}
          />
        ))}
      </div>

      {/* Toolbar or bulk bar */}
      <div className="mt-3 border-y bg-muted/40 px-5 py-3">
        {selected.size > 0 ? (
          <BulkBar
            count={selected.size}
            allSelected={
              list.length > 0 && list.every((m) => selected.has(m.id))
            }
            visible={list.length}
            single={
              selected.size === 1
                ? items.find((m) => m.id === [...selected][0])
                : undefined
            }
            coverId={coverId}
            onToggleAll={() =>
              setSelected((s) =>
                list.every((m) => s.has(m.id))
                  ? new Set()
                  : new Set(list.map((m) => m.id)),
              )
            }
            onCover={(id) => {
              setSelected(new Set());
              void setCover(id);
            }}
            // ponytail: one tab per file (the browser may ask to allow pop-ups); add a server ZIP if people bulk-download often.
            onDownload={() => selected.forEach(download)}
            onDelete={() => setDeleteIds([...selected])}
            onClear={() => setSelected(new Set())}
          />
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <InputGroup className="h-8 max-w-64 min-w-48 flex-1">
              <InputGroupAddon>
                <Search />
              </InputGroupAddon>
              <InputGroupInput
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search file name or caption"
                aria-label="Search media"
              />
            </InputGroup>
            <Tabs value={type} onValueChange={(v) => setType(v as TypeFilter)}>
              <TabsList aria-label="Media type">
                <TabsTrigger value="all">All media</TabsTrigger>
                <TabsTrigger value="image">Photos</TabsTrigger>
                <TabsTrigger value="video">Videos</TabsTrigger>
              </TabsList>
            </Tabs>
            {view === "site" && (
              <>
                <GallerySelect
                  label="Zone"
                  hideLabel
                  size="sm"
                  className="w-36"
                  value={zone}
                  onChange={setZone}
                  options={[
                    { value: ALL, label: "All zones" },
                    ...zones.map((z) => ({ value: z, label: z })),
                  ]}
                />
                <GallerySelect
                  label="Discipline"
                  hideLabel
                  size="sm"
                  className="w-40"
                  value={discipline}
                  onChange={setDiscipline}
                  options={[
                    { value: ALL, label: "All disciplines" },
                    ...DISCIPLINES.map((d) => ({ value: d, label: d })),
                  ]}
                />
              </>
            )}
            <div className="ml-auto flex items-center gap-2">
              <GallerySelect
                label="Sort"
                hideLabel
                size="sm"
                className="w-36"
                value={sort}
                onChange={(v) => setSort(v as "new" | "old")}
                options={[
                  { value: "new", label: "Newest first" },
                  { value: "old", label: "Oldest first" },
                ]}
              />
              <Tabs
                value={layout}
                onValueChange={(v) => setLayout(v as GalleryLayout)}
              >
                <TabsList aria-label="Layout">
                  <TabsTrigger value="grid">
                    <LayoutGrid /> Grid
                  </TabsTrigger>
                  <TabsTrigger value="list">
                    <List /> List
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex min-h-96 flex-col gap-6 px-5 pt-5 pb-6">
        {!inView.length ? (
          <EmptyState
            icon={view === "site" ? <HardHat /> : <ImageIcon />}
            title={
              view === "site"
                ? "No site media for this site yet"
                : "No project media yet"
            }
            description={
              view === "site"
                ? "Daily site photos and videos will appear here, grouped by the day they were taken."
                : "Upload renders, building photos and handover images. Any image can become the project cover."
            }
            action={
              <Button onClick={() => openUpload()}>
                <Upload data-icon="inline-start" /> Upload Media
              </Button>
            }
          />
        ) : !list.length ? (
          album !== ALL && !inView.some((m) => m.album === album) ? (
            <EmptyState
              icon={<Folder />}
              title={`“${album}” is empty`}
              description="Upload straight into this album, or move existing items here with Edit details."
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  <Button onClick={() => openUpload(album)}>
                    <Upload data-icon="inline-start" /> Upload to this album
                  </Button>
                  <Button variant="outline" onClick={() => setAlbum(ALL)}>
                    View all media
                  </Button>
                </div>
              }
            />
          ) : (
            <EmptyState
              icon={<Search />}
              title={
                q ? `No results for “${q}”` : "No media matches these filters"
              }
              description="Try a different word, or clear the filters to see everything in this view."
              action={
                <Button variant="outline" onClick={resetFilters}>
                  Clear search and filters
                </Button>
              }
            />
          )
        ) : view === "project" ? (
          layout === "grid" ? (
            <MediaGrid items={list} state={renderState} actions={actions} />
          ) : (
            <MediaTable items={list} state={renderState} actions={actions} />
          )
        ) : (
          groupByDay(list).map(([day, group]) => {
            const ph = group.filter((m) => m.kind === "image").length;
            const vd = group.length - ph;
            const zones = [
              ...new Set(group.map((m) => m.zone).filter(Boolean)),
            ].join(", ");
            return (
              <section
                key={day}
                className="space-y-3"
                aria-label={formatDay(day, now)}
              >
                <div className="flex flex-wrap items-center gap-2.5 after:h-px after:min-w-5 after:flex-1 after:bg-border">
                  <h3 className="text-sm font-semibold">
                    {formatDay(day, now)}
                  </h3>
                  <Badge variant="brand" className="tabular">
                    {group.length} item{group.length > 1 ? "s" : ""}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {[
                      ph && `${ph} photo${ph > 1 ? "s" : ""}`,
                      vd && `${vd} video${vd > 1 ? "s" : ""}`,
                      zones,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </div>
                {layout === "grid" ? (
                  <MediaGrid
                    items={group}
                    state={renderState}
                    actions={actions}
                  />
                ) : (
                  <MediaTable
                    items={group}
                    state={renderState}
                    actions={actions}
                  />
                )}
              </section>
            );
          })
        )}
      </div>

      {/* Dialogs */}
      <MediaViewer
        list={viewerItems}
        index={viewer ? viewer.index : null}
        coverId={coverId}
        coverLabel={cover ? mediaLabel(cover) : null}
        actions={actions}
        onIndexChange={(i) => setViewer((v) => (v ? { ...v, index: i } : v))}
        onClose={() => setViewer(null)}
      />
      <EditDetailsDialog
        item={items.find((m) => m.id === editId) ?? null}
        albums={albums}
        zones={zones}
        onClose={() => setEditId(null)}
        onSave={async (patch) => {
          const id = editId;
          if (!id) return;
          if (
            await attempt(
              () => api.saveDetails(id, patch),
              "Couldn't save the details",
            )
          ) {
            setEditId(null);
            toast.success("Details saved");
          }
        }}
      />
      <ConfirmDeleteDialog
        items={items.filter((m) => deleteIds.includes(m.id))}
        coverId={coverId}
        onCancel={() => setDeleteIds([])}
        onConfirm={confirmDelete}
      />
      <CreateAlbumDialog
        open={albumDialog}
        view={view}
        existing={albums[view]}
        onClose={() => setAlbumDialog(false)}
        onCreate={async (name) => {
          if (
            !(await attempt(
              () => api.createAlbum(view, name),
              "Couldn't create the album",
            ))
          )
            return;
          setAlbum(name);
          setAlbumDialog(false);
          toast.success(`Album “${name}” created`, {
            description: "It's empty for now. Upload into it from here.",
          });
        }}
      />
      <CoverPickerDialog
        open={picker}
        items={items}
        coverId={coverId}
        onClose={() => setPicker(false)}
        onPick={(id) => {
          setPicker(false);
          void setCover(id);
        }}
      />
      <UploadMediaDialog
        open={!!upload}
        initialView={view}
        initialAlbum={upload?.album}
        albums={albums}
        projectName={project.name}
        api={api}
        demoSamples={demoSamples}
        onClose={onUploaded}
      />
    </Card>
  );
}

function groupByDay(list: MediaItem[]) {
  const days = new Map<string, MediaItem[]>();
  for (const m of list) {
    const d = dayKey(m.at);
    days.set(d, [...(days.get(d) ?? []), m]);
  }
  return [...days.entries()];
}

function CoverCard({
  cover,
  initials,
  canEdit,
  onPreview,
  onChange,
  onRemove,
}: {
  cover: MediaItem | null;
  initials: string;
  canEdit: boolean;
  onPreview: (id: string) => void;
  onChange: () => void;
  onRemove: () => void;
}) {
  return (
    <Card
      size="sm"
      className="flex-row items-center gap-4 bg-muted/40 px-3 py-3"
      aria-label="Project cover"
    >
      {cover ? (
        <Button
          variant="ghost"
          className="h-18 w-26 shrink-0 overflow-hidden rounded-xl p-0"
          onClick={() => onPreview(cover.id)}
          aria-label={`Preview cover: ${mediaLabel(cover)}`}
        >
          <img src={cover.src} alt="" className="size-full object-cover" />
        </Button>
      ) : (
        <span className="grid h-18 w-26 shrink-0 place-items-center rounded-xl bg-accent text-xl font-semibold text-accent-foreground">
          {initials}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-warning-foreground uppercase">
          <Star className="size-3 fill-current" aria-hidden />{" "}
          {cover ? "Project cover" : "No project cover"}
        </p>
        <p className="truncate font-semibold" data-testid="cover-title">
          {cover ? mediaLabel(cover) : "Initials are shown across WISETECH"}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {cover
            ? `From ${mediaSource(cover)}`
            : "Pick any uploaded image as the cover."}
        </p>
        <div
          className={cn("mt-2 flex flex-wrap gap-1.5", !canEdit && "hidden")}
        >
          <Button
            size="xs"
            variant={cover ? "outline" : "default"}
            onClick={onChange}
          >
            <ImageIcon data-icon="inline-start" />{" "}
            {cover ? "Change Cover" : "Choose Cover"}
          </Button>
          {cover && (
            <Button size="xs" variant="ghost" onClick={onRemove}>
              Remove
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

function AlbumChip({
  active,
  onClick,
  thumb,
  icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  thumb?: string;
  icon: ReactNode;
  label: string;
  count: number;
}) {
  return (
    <Button
      variant={active ? "secondary" : "outline"}
      size="sm"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "h-10 shrink-0 gap-2 pl-1",
        active && "ring-2 ring-primary",
      )}
    >
      <span className="grid size-8 place-items-center overflow-hidden rounded-full bg-muted text-muted-foreground">
        {thumb ? (
          <img src={thumb} alt="" className="size-full object-cover" />
        ) : (
          icon
        )}
      </span>
      {label}
      <span className="tabular text-muted-foreground">{count}</span>
    </Button>
  );
}

function BulkBar({
  count,
  allSelected,
  visible,
  single,
  coverId,
  onToggleAll,
  onCover,
  onDownload,
  onDelete,
  onClear,
}: {
  count: number;
  allSelected: boolean;
  visible: number;
  single?: MediaItem;
  coverId: string | null;
  onToggleAll: () => void;
  onCover: (id: string) => void;
  onDownload: () => void;
  onDelete: () => void;
  onClear: () => void;
}) {
  return (
    <Item variant="muted" size="sm" className="bg-accent p-0">
      <ItemContent className="flex-row items-center gap-3 px-1">
        <Checkbox
          checked={allSelected}
          onCheckedChange={onToggleAll}
          aria-label="Select all in view"
        />
        <ItemTitle>{count} selected</ItemTitle>
        <Button
          variant="link"
          size="sm"
          className="h-auto p-0"
          onClick={onToggleAll}
        >
          {allSelected ? "Unselect all" : `Select all ${visible} in view`}
        </Button>
      </ItemContent>
      <ItemActions className="flex-wrap">
        {single && single.kind === "image" && single.id !== coverId && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onCover(single.id)}
          >
            <Star data-icon="inline-start" /> Set as Project Cover
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={onDownload}>
          <Download data-icon="inline-start" /> Download{count > 1 && " (ZIP)"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="text-destructive"
          onClick={onDelete}
        >
          <Trash2 data-icon="inline-start" /> Delete
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onClear}
          aria-label="Clear selection"
        >
          <X data-icon="inline-start" /> Cancel
        </Button>
      </ItemActions>
    </Item>
  );
}
