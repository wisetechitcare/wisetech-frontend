/**
 * Workspace shell domain types.
 *
 * ─── THE TWO-LEVEL RULE, ENFORCED BY THE TYPE SYSTEM ─────────────────────────
 * The shell owns exactly TWO levels: an App (the dock) and a Module (the workspace).
 * Anything deeper belongs to the page that renders it.
 *
 * `WorkspaceModule` therefore has NO `children`, and `WorkspaceCluster` holds modules but
 * cannot hold another cluster. A third navigation level is not representable, so it cannot
 * be added by accident — which is the only way a rule like this survives contact with a
 * roadmap. Without it, "just one more level" slowly regrows the drill-in dialog this whole
 * architecture exists to delete.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** A destination. The leaf of the entire shell — nothing nests below it. */
export interface WorkspaceModule {
  id: string;
  title: string;
  /** Absolute app route, e.g. '/employees'. Module routes stay FLAT — never nested under
   *  the workspace path — so every existing bookmark, redirect and deep link keeps working. */
  to: string;
  /** Bootstrap Icons class from the nav tree; mapped to a Material icon at render time. */
  fontIcon?: string;
  /** Pending-approval alert. Not an item count. */
  badgeCount?: number;
  /** NavLink `end` — set when another module nests beneath this path. */
  exact: boolean;
}

/** A labelled group of modules — rendered as a titled cluster INSIDE the workspace,
 *  never as a second dialog level. This is what replaces NavSectionDialog's drill-in. */
export interface WorkspaceCluster {
  id: string;
  title: string;
  fontIcon?: string;
  /** Some groups carry a route of their own (a linked heading), some do not. */
  to?: string;
  modules: WorkspaceModule[];
}

/** One application — one dock tile, one workspace. */
export interface WorkspaceApp {
  /** Navigation section id, e.g. 'hr-section'. Internal. */
  id: string;
  /** URL slug, e.g. 'hr'. Public. */
  slug: string;
  /** '/workspace/hr' */
  path: string;
  title: string;
  /** Bootstrap Icons class; mapped via navIcon(). */
  icon: string;
  /** Top-level modules, in nav-tree order. */
  modules: WorkspaceModule[];
  /** Grouped modules, in nav-tree order. Rendered below `modules`. */
  clusters: WorkspaceCluster[];
  /** Total modules including cluster children. */
  moduleCount: number;
  /** Rolled-up pending approvals, so an alert is never hidden one level down. */
  badgeTotal: number;
}

/**
 * Shell layout state.
 *
 * Deliberately only two values. 'home' is the centred launcher; 'docked' is the rail +
 * workspace. Every other apparent state (which app, which module, loading) is derived
 * from the URL or the data, never stored — see WorkspaceShellContext.
 */
export type ShellMode = 'home' | 'docked';

/**
 * What the DOCK is allowed to know about an application.
 *
 * ─── NAVIGATION IS INDEPENDENT OF CONTENT, ENFORCED BY THE TYPE ──────────────
 * The dock renders launchers. It must never know which modules exist, which one is open, or
 * what the workspace is displaying — that is the workspace's business. Passing it a full
 * `WorkspaceApp` would hand it `modules` and `clusters` and make the rule a matter of
 * discipline; a narrow projection makes it a matter of the compiler.
 *
 * Note `path` is a fully-resolved string. The dock never constructs a route, so route shape
 * can change without the dock knowing it exists.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export interface DockApp {
  id: string;
  slug: string;
  /** Resolved destination, e.g. '/workspace/hr'. */
  path: string;
  title: string;
  /** Bootstrap Icons class; mapped to a Material icon at render time. */
  icon: string;
  /** Rolled-up pending approvals. An aggregate number, NOT module data. */
  badgeTotal: number;
  /**
   * How many modules this application contains. Also an AGGREGATE — the dock renders "8
   * modules" as a meta line and still cannot name, reach or reason about a single one of
   * them. The boundary being enforced is that navigation never depends on content, not that
   * it may never count it.
   */
  moduleCount: number;
}

/** The module the current URL is inside, if any. Resolved by the shell, consumed by the
 *  workspace header/strip — never by the dock. */
export interface ActiveModuleRef {
  to: string;
  title: string;
}
