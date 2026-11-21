import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleCheck, FileText, RefreshCw, Save, SlidersHorizontal } from "lucide-react";
import { cn } from "@/ds/lib/utils";
import { Tabs, TabsTrigger, ToggleList, TOGGLE_TAB } from "@/ds/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/ds/ui/alert";
import { Badge } from "@/ds/ui/badge";
import { Button } from "@/ds/ui/button";
import { Skeleton } from "@/ds/ui/skeleton";
import { toast, confirmDialog } from "@app/modules/common/components/ui";
import {
  getDocument, saveDocumentDraft, refreshDocumentDraft, previewDocumentDraft, publishDocument,
  PAPER_SIZES, type PaperSize,
} from "@services/documents";
import DocumentEditorHeader from "./DocumentEditorHeader";
import { usePaperPreference } from "./usePaperPreference";
import { ZOOMS } from "./zooms";
import { EDIT_BLUE } from "./theme";
import { MiniSelect } from "./controls";
import DocumentSheet from "./DocumentSheet";
import DocumentPropertiesPanel from "./DocumentPropertiesPanel";
import { fieldMeta, isSectionOff } from "./fields";
import type { DocumentProfile } from "./types";

/** The server's own words for a refusal live in `detail`; `message` is only "Bad request". */
const errorText = (error: any): string | undefined =>
  error?.response?.data?.detail ?? error?.response?.data?.message;

const NONE: readonly string[] = [];

/**
 * Template-based document editor — the "edit the actual document" screen.
 *
 * Left: the editable properties this TEMPLATE exposes. Right: the real page, on
 * the chosen paper size,
 * rendered from the server's merged HTML, updating on every keystroke without a
 * round-trip or a re-render.
 *
 * Draft state is local until Save Draft. That is deliberate: the preview is
 * already truthful, so autosaving every keystroke would only add write traffic and
 * a stream of pointless "saved" states — and an accidental edit stays undoable by
 * simply not saving.
 */

/**
 * Works as a page (id from the route) or embedded in a dialog (`documentId` + `onBack`).
 * Everything about the kind of document comes from `profile`.
 */
export interface DocumentEditorProps {
  profile: DocumentProfile;
  documentId?: string;
  onBack?: () => void;
  /**
   * The document is no longer a draft — just published, or opened after it was. The host shows its published view.
   * Left out = navigate to `profile.detailPath` (or `backPath`).
   */
  onPublished?: (documentId: string) => void;
}

const DocumentEditor: React.FC<DocumentEditorProps> = ({ profile, documentId, onBack, onPublished }) => {
  const params = useParams();
  const id = documentId ?? params.id ?? "";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const connected = profile.connectedFields ?? NONE;
  const switches = profile.sectionSwitches ?? NONE;

  const [zoom, setZoom] = useState(0);
  const [paper, setPaper] = usePaperPreference();
  // Below lg only one of the two shows; the page first, since it is the thing being made.
  const [pane, setPane] = useState<"page" | "settings">("page");

  // The sticky top block (header + the phone's Page/Settings switch) changes height with the screen width; measured,
  // it becomes `--editor-head`, which the inspector uses to stick just under it and size itself to what is left.
  const rootRef = useRef<HTMLDivElement | null>(null);
  const headRef = useRef<HTMLDivElement | null>(null);
  const [headReady, setHeadReady] = useState(false);
  useEffect(() => {
    const head = headRef.current;
    const root = rootRef.current;
    if (!head || !root) return;
    const publish = () => root.style.setProperty("--editor-head", `${Math.round(head.getBoundingClientRect().height)}px`);
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(head);
    return () => observer.disconnect();
  }, [headReady]);
  const [draft, setDraft] = useState<Record<string, string> | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["document", id],
    queryFn: () => getDocument(id),
    enabled: !!id,
    // A draft can print live data read on the server; the app-wide 5-minute freshness would show an older copy.
    staleTime: 0,
    refetchOnMount: "always",
  });

  // Seed the local draft from the server once, and re-seed whenever the server's
  // own copy changes (save, publish, revise) so the panel never shows stale text.
  // The page as the connected edit would make it; null = the server's saved render.
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  // The last connected values the server accepted — what a refused edit falls back to.
  const lastGood = useRef<Record<string, string>>({});
  const renderedSig = useRef<string | null>(null);
  useEffect(() => {
    if (!data) return;
    setDraft(data.editable);
    setPreviewHtml(null);
    lastGood.current = Object.fromEntries(connected.map((key) => [key, data.editable[key] ?? ""]));
    renderedSig.current = switches.map((key) => data.editable[key] ?? "").join("|");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-seed only when the server's copy changes, not on every refetch
  }, [data?.version.id, data?.version.createdAt, data?.document.status, data?.html]);

  const preview = useMutation({
    mutationFn: (editable: Record<string, string>) => previewDocumentDraft(id, editable),
    onSuccess: (result) => {
      lastGood.current = result.connected;
      setPreviewHtml(result.html);
      setDraft((prev) => ({ ...(prev ?? {}), ...result.connected }));
    },
    onError: (error: any) => {
      toast({ icon: "error", title: errorText(error) ?? "Could not update the page" });
      setDraft((prev) => ({ ...(prev ?? {}), ...lastGood.current }));
    },
  });

  const values = useMemo(() => draft ?? data?.editable ?? {}, [draft, data?.editable]);
  const valuesRef = useRef(values);
  valuesRef.current = values;

  // A section switch changes what the page PRINTS (the section is left out and the rest re-flows), so the server
  // re-renders it; the other edits typed so far travel along and are kept.
  const sectionSig = switches.map((key) => values[key] ?? "").join("|");
  useEffect(() => {
    if (!data) return;
    if (renderedSig.current === null) { renderedSig.current = sectionSig; return; }
    if (renderedSig.current === sectionSig) return;
    renderedSig.current = sectionSig;
    preview.mutate(values);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionSig]);
  // Leaving a connected field: the server works out the others from whichever one changed.
  const { mutate: runPreview } = preview;
  const commitField = useCallback((field: string) => {
    const current = valuesRef.current;
    if (!connected.includes(field) || current[field] === lastGood.current[field]) return;
    runPreview(current);
  }, [runPreview, connected]);
  // One writer for both surfaces — the page (typed in place) and the left panel.
  const setField = useCallback(
    (field: string, value: string) => setDraft((prev) => ({ ...(prev ?? {}), [field]: value })),
    [],
  );
  // The fields the page prints as tinted, in-place-editable spans (the server marks
  // them `data-field`). The panel leaves their text inputs out.
  const inlineFields = useMemo(
    () => new Set([...(data?.html ?? "").matchAll(/data-field="([^"]+)"/g)].map((m) => m[1])),
    [data?.html],
  );
  const multilineFields = useMemo(
    () => (data?.policy.editable ?? []).filter((key) => fieldMeta(profile, key).multiline),
    [data?.policy.editable, profile],
  );
  const dirty = useMemo(
    () => !!data && Object.entries(values).some(([key, value]) => (data.editable[key] ?? "") !== value),
    [data, values],
  );

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["document", id] });
    profile.invalidateKeys?.forEach((queryKey) => queryClient.invalidateQueries({ queryKey }));
  }, [queryClient, id, profile]);

  const save = useMutation({
    mutationFn: () => saveDocumentDraft(id, values),
    onSuccess: () => { toast({ icon: "success", title: "Draft saved" }); refresh(); },
    onError: (error: any) =>
      toast({ icon: "error", title: errorText(error) ?? "Could not save the draft" }),
  });

  const refreshFromRecord = useMutation({
    mutationFn: () => refreshDocumentDraft(id),
    onSuccess: (result) => {
      // Same version row is updated in place, so the seeding effect won't fire.
      setDraft(result.editable);
      toast({ icon: "success", title: "Refreshed from the record" });
      refresh();
    },
    onError: (error: any) =>
      toast({ icon: "error", title: errorText(error) ?? "Could not refresh the draft" }),
  });

  // The editor only edits drafts. A published document is viewed, downloaded, revised and emailed on its own page.
  const leave = useCallback(() => {
    if (onPublished) onPublished(id);
    else navigate(profile.detailPath?.(id) ?? profile.backPath, { replace: true });
  }, [onPublished, navigate, profile, id]);
  const isDraft = data?.isEditable;
  useEffect(() => {
    if (isDraft === false) leave();
  }, [isDraft, leave]);

  const publish = useMutation({
    mutationFn: () => publishDocument(id),
    onSuccess: () => {
      toast({ icon: "success", title: "Published — PDF generated" });
      refresh();
      leave();
    },
    onError: (error: any) =>
      toast({ icon: "error", title: errorText(error) ?? "Could not publish" }),
  });

  if (isLoading || !data || !data.isEditable) {
    return (
      <div className="mx-auto flex max-w-[1800px] flex-col gap-2 pb-4">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[62px]" />)}
      </div>
    );
  }

  const { document: doc, policy, html } = data;
  const missingRequired = policy.required.filter((key) => !isSectionOff(profile, values, key) && !String(values[key] ?? "").trim());

  const askRefresh = async () => {
    const confirmed = await confirmDialog({
      title: "Refresh from the record?",
      text:
        (profile.refreshNote ?? "Details taken from the record are re-pulled as they are now, replacing what this draft shows for them.")
        + (dirty ? " Unsaved changes on this page are discarded." : ""),
      confirmText: "Refresh",
    });
    if (confirmed) refreshFromRecord.mutate();
  };

  // Labels shrink with the screen, never the buttons' order: icon-only Refresh / Save on a phone (named for screen
  // readers and on hover), "Publish" short below lg. Defined once: a phone shows Refresh / Save beside the Page/Settings
  // switch, everything else shows them in the title bar — the same elements, so they cannot drift.
  const refreshButton = (
    <Button
      variant="outline" size="sm"
      disabled={refreshFromRecord.isPending || save.isPending}
      aria-label="Refresh from record"
      title="Re-pull the details this document takes from its record"
      onClick={askRefresh}
    >
      <RefreshCw data-icon="inline-start" className={refreshFromRecord.isPending ? "animate-spin" : undefined} />
      {/* One flex item, so the button's own gap is not added to the space inside the label. */}
      <span className="hidden sm:inline">
        {refreshFromRecord.isPending ? "Refreshing…" : <>Refresh<span className="hidden 2xl:inline"> from record</span></>}
      </span>
    </Button>
  );
  const saveButton = (
    <Button
      variant="outline" size="sm"
      disabled={!dirty || save.isPending || preview.isPending}
      aria-label="Save draft"
      title={dirty ? "Save your changes to this draft" : "No unsaved changes"}
      onClick={() => save.mutate()}
    >
      <Save data-icon="inline-start" />
      <span className="hidden sm:inline">{save.isPending ? "Saving…" : dirty ? "Save draft" : "Saved"}</span>
    </Button>
  );

  /** One rail of actions, so the bar has exactly one primary at any moment. */
  const actions = (
    <>
      <div className="contents max-sm:hidden">{refreshButton}{saveButton}</div>
      <Button
        size="sm"
        loading={publish.isPending}
        disabled={dirty || missingRequired.length > 0}
        title={
          dirty ? "Save the draft first"
            : missingRequired.length ? `Fill in ${missingRequired.length} required field(s) first`
            : "Freeze this version and render its PDF"
        }
        onClick={() => publish.mutate()}
      >
        <CircleCheck data-icon="inline-start" />
        <span>{publish.isPending ? "Publishing…" : <>Publish<span className="hidden lg:inline"> &amp; generate PDF</span></>}</span>
      </Button>
    </>
  );

  return (
    <div ref={rootRef} className="pb-3">
      <div
        ref={(node) => { headRef.current = node; if (node && !headReady) setHeadReady(true); }}
        className="sticky top-0 z-[5]"
      >
      <DocumentEditorHeader
        documentNumber={doc.documentNumber}
        status={profile.renderStatus?.(doc.status) ?? <Badge variant="neutral">{doc.status}</Badge>}
        templateName={doc.template?.name ?? doc.templateCode}
        versionCount={doc.versionCount}
        figure={profile.headerFigure?.(doc) ?? null}
        onBack={() => (onBack ? onBack() : navigate(profile.backPath))}
        actions={actions}
        actionsInline
      />

      {/* Below lg there is room for one thing at a time, so the page and its settings are two views of one screen,
          switched here — not stacked, where the page sat below every setting and editing meant scrolling blind.
          Both stay mounted (CSS hides one), so switching keeps typing, scroll and zoom. */}
      <div className="flex items-center gap-2 border-b border-border bg-background px-3 py-1.5 sm:px-4 sm:py-2 lg:hidden">
        <Tabs value={pane} onValueChange={(v) => setPane(v as typeof pane)} className="min-w-0 flex-1">
          <ToggleList aria-label="Editor view" className="w-full">
            <TabsTrigger value="page" className={cn(TOGGLE_TAB, "flex-1 py-1 max-sm:text-[13px]")}>
              <FileText data-icon="inline-start" /> Page
            </TabsTrigger>
            <TabsTrigger value="settings" className={cn(TOGGLE_TAB, "flex-1 py-1 max-sm:text-[13px]")}>
              <SlidersHorizontal data-icon="inline-start" /> Settings
              {missingRequired.length > 0 && (
                <Badge variant="danger" className="ml-1 h-5 min-w-5 px-1.5 tabular-nums" aria-label={`${missingRequired.length} required fields empty`}>
                  {missingRequired.length}
                </Badge>
              )}
            </TabsTrigger>
          </ToggleList>
        </Tabs>
        {/* Phone: the two secondary actions ride beside the switch (the title row keeps just Publish). */}
        <div className="flex shrink-0 gap-2 sm:hidden">{refreshButton}{saveButton}</div>
      </div>
      </div>

      {/* An A4 page is 794px wide and never renders past 100%, so a workspace that stretches to a 2560px monitor is
          guaranteed empty desk; capping it keeps the sheet and the inspector within one eye movement. */}
      <div className="mx-auto mt-3 grid max-w-[1600px] grid-cols-[minmax(0,1fr)] items-start gap-3 px-3 sm:mt-4 sm:gap-4 sm:px-4 lg:px-5 lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[360px_minmax(0,1fr)] 2xl:grid-cols-[400px_minmax(0,1fr)]">
        {/* ── the inspector ─────────────────────────────────────────────────── */}
        {/* lg+: sticky and bounded by the viewport (dvh, so a phone's URL bar can't hide its end); it scrolls itself
            and the card always shows its bottom edge. */}
        {/* No card around the section cards (a card of cards drew a double border); the sections stand on their own.
            The heading row is the same height as the page's toolbar row, so both columns start on one line. */}
        <aside
          aria-label="Document settings"
          className={cn(
            "flex min-w-0 flex-col lg:sticky lg:top-[calc(var(--editor-head,64px)+1rem)] lg:max-h-[calc(100dvh-var(--editor-head,64px)-2rem)]",
            pane !== "settings" && "max-lg:hidden",
          )}
        >
          <div className="mb-2 flex h-9 shrink-0 items-center justify-between gap-2 px-1 max-lg:hidden">
            <span className="text-sm font-semibold text-foreground">Document settings</span>
            {missingRequired.length > 0 && (
              <Badge variant="danger" className="tabular-nums">{missingRequired.length} to fill</Badge>
            )}
          </div>
          {/* Scrolls itself on lg+; the right padding keeps the scrollbar off the cards' edges. */}
          <div className="min-h-0 overscroll-contain lg:-mr-2 lg:flex-1 lg:overflow-y-auto lg:pr-2 lg:pb-2">
            {missingRequired.length > 0 && (
              <Alert variant="warning" className="mb-4">
                <AlertTitle>
                  {missingRequired.length} required field{missingRequired.length === 1 ? "" : "s"} still empty
                </AlertTitle>
                <AlertDescription>They are marked red on the page. Publishing stays disabled until each is filled.</AlertDescription>
              </Alert>
            )}
            <DocumentPropertiesPanel
              profile={profile}
              policy={policy}
              values={values}
              disabled={false}
              onChange={setField}
              mergeData={data.version.mergeData}
              inlineFields={inlineFields}
            />
          </div>
        </aside>

        {/* THE WORK SURFACE. `DocumentSheet` paints its own desk around the page, so there is no panel behind it. */}
        <div className={cn("min-w-0", pane !== "page" && "max-lg:hidden")}>
          <div className="mb-2 flex h-9 items-center justify-between gap-2 px-1">
            <div className="flex min-w-0 items-center gap-1.5">
              <span aria-hidden className="size-2.5 shrink-0 rounded-[2px]" style={{ backgroundColor: EDIT_BLUE }} />
              <span className="min-w-0 truncate text-xs text-muted-foreground">
                <span className="sm:hidden">Tap a tinted area to type.</span>
                <span className="hidden sm:inline">This is the page that prints. Click any tinted area to type into it.</span>
              </span>
            </div>
            <div className="flex shrink-0 gap-1.5">
              <MiniSelect
                ariaLabel="Paper size"
                className="w-33 max-sm:w-24"
                value={paper}
                options={PAPER_SIZES.map((option) => ({ value: option.key, label: option.label }))}
                onChange={(next) => setPaper(next as PaperSize)}
              />
              <MiniSelect
                ariaLabel="Zoom"
                className="w-23 max-sm:w-20"
                value={String(zoom)}
                options={ZOOMS.map((option) => ({ value: String(option.value), label: option.label }))}
                onChange={(next) => setZoom(Number(next))}
              />
            </div>
          </div>
          <DocumentSheet
            html={previewHtml ?? html}
            editable={values}
            zoom={zoom || null}
            paper={paper}
            onFieldEdit={setField}
            onFieldCommit={commitField}
            paginator={data.paginator}
            previewToggles={profile.previewToggles}
            fieldTitle={profile.fieldTitle}
            multilineFields={multilineFields}
            requiredFields={policy.required.filter((key) => !isSectionOff(profile, values, key))}
          />
        </div>
      </div>
    </div>
  );
};

export default DocumentEditor;
