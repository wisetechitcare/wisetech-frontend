/**
 * The SERVER's decisions for an attendance row — the one place a screen asks "is this
 * row late / early / on a non-working day?".
 *
 * The backend stamps every row of the attendance boards (`GET attendance/all`, range
 * variants, the employee calendar) through one annotator, using the employee's OWN branch
 * calendar, shift, personal cutoff, late-night waiver, approved leave and the company's
 * master switch — the same engine payroll and KPI use:
 *
 *   row.lateMark       — { isLate, rule, reason, lateMinutes, thresholdLabel, … }
 *   row.earlyCheckout  — { isEarly, rule, reason, earlyMinutes, shiftEndLabel, … }
 *   row.dayKind        — 'working' | 'weekend' | 'holiday'
 *   row.lateWaived     — legacy flag (late-night waiver)
 *
 * Every accessor returns `undefined` when the row carries no verdict (an older response,
 * or a row that never went through the annotator), so a screen writes
 *
 *     serverIsLate(row) ?? localLateDerivation(row)
 *
 * and its own derivation stays ONLY as a fallback. Re-deriving in the browser — usually
 * from the VIEWING admin's branch calendar — is what made the dashboard, the admin
 * Overview and payroll disagree about the same punch.
 */

export type ServerDayKind = 'working' | 'weekend' | 'holiday';

export interface ServerLateMark {
  isLate: boolean;
  rule?: string;
  reason?: string;
  lateMinutes?: number;
  thresholdLabel?: string | null;
}

export interface ServerEarlyCheckout {
  isEarly: boolean;
  rule?: string;
  reason?: string;
  earlyMinutes?: number;
  shiftEndLabel?: string | null;
}

/** The verdict fields the server may put on a row. Every field is optional. */
export interface ServerVerdictRow {
  lateMark?: ServerLateMark | null;
  earlyCheckout?: ServerEarlyCheckout | null;
  dayKind?: ServerDayKind | string | null;
  lateWaived?: boolean | null;
}

const asVerdictRow = (row: unknown): ServerVerdictRow =>
  row && typeof row === 'object' ? (row as ServerVerdictRow) : {};

/** True/false when the server classified the row's day; undefined when it did not. */
export function serverIsNonWorkingDay(row: unknown): boolean | undefined {
  const kind = asVerdictRow(row).dayKind;
  return kind ? kind !== 'working' : undefined;
}

/** The server's late verdict; undefined when the row carries none. */
export function serverIsLate(row: unknown): boolean | undefined {
  const r = asVerdictRow(row);
  if (r.lateMark && typeof r.lateMark.isLate === 'boolean') return r.lateMark.isLate;
  // A waived row is never late, even from a response that predates `lateMark`.
  if (r.lateWaived === true) return false;
  return undefined;
}

/** The server's early-check-out verdict; undefined when the row carries none. */
export function serverIsEarlyCheckout(row: unknown): boolean | undefined {
  const verdict = asVerdictRow(row).earlyCheckout;
  return verdict && typeof verdict.isEarly === 'boolean' ? verdict.isEarly : undefined;
}

/** Minutes late per the server (the figure payroll uses), when known. */
export function serverLateMinutes(row: unknown): number | undefined {
  const minutes = asVerdictRow(row).lateMark?.lateMinutes;
  return typeof minutes === 'number' ? minutes : undefined;
}

/** Minutes before the shift end per the server, when known and early. */
export function serverEarlyMinutes(row: unknown): number | undefined {
  const verdict = asVerdictRow(row).earlyCheckout;
  return verdict?.isEarly && typeof verdict.earlyMinutes === 'number' ? verdict.earlyMinutes : undefined;
}

/** "1h 5m" / "45m" — the one way a late/early duration is written on a card. */
export function formatVerdictMinutes(minutes: number): string {
  const safe = Math.max(0, Math.round(minutes));
  const hours = Math.floor(safe / 60);
  const mins = safe % 60;
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
}
