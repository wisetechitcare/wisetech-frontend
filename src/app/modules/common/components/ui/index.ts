// The app standardizes on Material UI (themed via src/app/theme/wisetechTheme.ts).
// Only the framework-agnostic survivors of the old kit remain here:
//   - tokens: the single source of truth for brand colors (also feeds the MUI theme)
//   - feedback: branded Swal helpers (toast / alertDialog / confirmDialog)
export { T, tonePair } from './tokens';
export type { SemanticTone } from './tokens';
export { toast, alertDialog, confirmDialog } from './feedback';
export type { FeedbackOptions } from './feedback';
