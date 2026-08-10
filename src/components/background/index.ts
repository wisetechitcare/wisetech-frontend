/**
 * Ambient background — a procedural dot grid on a single canvas.
 *
 * Self-contained and independent of the navigation system: it knows nothing about routes,
 * applications or the workspace shell, and nothing knows about it. Removing the feature is
 * deleting this folder and one line in MasterLayout.
 *
 *   BackgroundEngine  — the React mount point (renders once, never re-renders)
 *   DotFieldEngine    — the framework-free renderer / loop / interaction / resize manager
 *   DOT_FIELD         — every tunable that sets the feel
 *   readPalette       — the theme adapter
 */
export { BackgroundEngine, default } from './BackgroundEngine';
export { DotFieldEngine } from './engine';
export { DOT_FIELD } from './config';
export type { DotFieldConfig } from './config';
export { readPalette, observeTheme } from './palette';
export type { DotPalette, Rgb } from './palette';
