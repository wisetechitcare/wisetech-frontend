import type React from "react";
import type { QueryKey } from "@tanstack/react-query";
import type { GeneratedDocument } from "@services/documents";

/** How one merge field is shown in the properties panel. Presentation only: the server's field policy decides what is editable. */
export interface FieldMeta {
  label: string;
  group: string;
  multiline?: boolean;
  hint?: string;
  /** Never listed in the side panel — it is edited on the page itself. */
  hidden?: boolean;
  /** Renders as a Yes/No toggle instead of a text input; this is the value when unset. */
  toggleDefault?: "Yes" | "No";
  /** The on/off switch of the section this group IS: shown in the group's header, not as a row. */
  headerSwitch?: boolean;
}

/** A part of the printed page that follows a Yes/No field in the live preview, before the server re-renders. */
export interface PreviewToggle {
  selector: string;
  field: string;
  /** "display" removes it from the layout; "visibility" leaves its space. */
  hide: "display" | "visibility";
}

/**
 * Everything the editor needs to know about one kind of document. The editor itself is kind-agnostic;
 * a module (billing, MOM, offer letter…) describes its documents with one of these.
 * Every key is optional except `backPath`: an unknown field still shows, title-cased, under "Details".
 */
export interface DocumentProfile {
  /** Where Back goes when the editor is a page rather than embedded with `onBack`. */
  backPath: string;
  /**
   * Where a document goes once it is no longer a draft (just published, or opened after it was). The editor only edits
   * drafts; viewing, downloading, revising and emailing a published one happen there. Left out = `backPath`.
   */
  detailPath?: (documentId: string) => string;
  fields?: Record<string, FieldMeta>;
  /** Panel group order; groups not listed come last. */
  groupOrder?: readonly string[];
  /** Keenicon per panel group. */
  groupIcons?: Record<string, string>;
  /**
   * Fields that change what the page prints beyond their own text — the Yes/No section switches, and pickers such as
   * Bill To's company — so changing one re-renders the page on the server.
   */
  sectionSwitches?: readonly string[];
  /** A required field inside a switchable section is not required while that section is off (mirror the server). */
  requiredSection?: Record<string, string>;
  /**
   * Groups whose name + address can be filled from the document's `source_*` reference data
   * (Contact / Company / Project) instead of typed by hand.
   */
  /**
   * `partyKey`, when set, is the editable field that records which company (`source_parties`) the group bills; picking
   * a company there re-resolves the record's own fields for it (GSTIN, state). Without it, a pick only fills the text.
   */
  addressGroups?: Record<string, { nameKey: string; addressKey: string; partyKey?: string }>;
  /** Fields typed only on the page (table cells and the like), never listed in the panel. */
  isPageOnlyField?: (key: string) => boolean;
  /** Fields the server works out together (e.g. amount ⇄ share): leaving one asks the server for a fresh page. */
  connectedFields?: readonly string[];
  /** Hover text for a field typed on the page. Default: "Click to edit". */
  fieldTitle?: (field: string) => string | undefined;
  previewToggles?: readonly PreviewToggle[];
  renderStatus?: (status: string) => React.ReactNode;
  /** One extra fact in the header's title block (e.g. the total). */
  headerFigure?: (document: GeneratedDocument) => { label: string; value: string } | null;
  /** Caches to refresh after a save/publish/revise, besides the document's own. */
  invalidateKeys?: readonly QueryKey[];
  /** Explains, under the locked fields, where they come from. */
  lockedNote?: string;
  /** What "Refresh from record" re-pulls, for its confirmation. */
  refreshNote?: string;
}
