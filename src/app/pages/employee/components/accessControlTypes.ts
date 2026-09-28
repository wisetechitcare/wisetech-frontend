// Shared by the access editor's two views (AccessControlTable, AccessControlCards).

// Effective access per section. "none" = no access.
export type EffLevel = "view" | "edit" | "none";

/** The two per-employee record toggles a section may carry (Leads / Projects). */
export interface RecordCells {
  readAll: { checked: boolean; onChange: () => void; disabled?: boolean; title?: string };
  commercial: { checked: boolean; onChange: () => void; disabled?: boolean; title?: string };
}

export interface AccessControlProps {
  /** Desired effective level per leaf module (seeded from the employee's effective access). */
  levels: Record<string, EffLevel>;
  /** Modules whose staged state differs from the saved baseline (for highlight). */
  dirtyModules: Set<string>;
  onSetLevel: (module: string, level: EffLevel) => void;
  /**
   * "employee" (default): per-person override editor — Read / Read all / Write / Commercials, the
   * CUSTOM badge and "Reset to role". "role": role-level grant editor — Read / Write only.
   */
  variant?: "employee" | "role";
  /** Modules with an explicit override (CUSTOM badge). Only "employee" variant. */
  customModules?: Set<string>;
  onResetToRole?: (module: string) => void;
  /** Show the levels without letting them change (someone else's to set, e.g. a Super Admin's). */
  readOnly?: boolean;
  /** Read all / Commercials, keyed by module (Leads and Projects). */
  recordCells?: Record<string, RecordCells>;
  /** Tabs inside sections (Access → Advanced). Omit to hide the Advanced controls. */
  tabs?: TabControls;
}

/** Staged tab settings, keyed `<section>/<tab>` (see utils/sectionTabs). */
export interface TabControls {
  /** Tabs turned off. */
  denied: Set<string>;
  /** Tabs set for this person rather than by their roles (employee editor only). */
  custom?: Set<string>;
  /** `null` = follow their roles again (employee editor only). */
  onSet: (key: string, allowed: boolean | null) => void;
}
