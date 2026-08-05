// Shared types for the redesigned KPI leaderboard podium.
// PodiumEntry mirrors the shape produced by `normalizeLeaderboardEmployee`
// in LeaderBoardCore.tsx (the `normalizedTopFive` element) so the new
// presentational components stay strictly typed (no `any`).
export interface PodiumEntry {
  id: string;
  name: string;
  designation?: string;
  avatar: string;
  score: number;
  maxScore: number | null;
  value: number | null;
  maxValue: number | null;
  /**
   * Optional "No Late" board fields. On that board the headline number is days
   * present, not a KPI score, so the metric is rendered as `25/25 DAYS` rather than
   * `1045.15 KPI SCORE`. Absent on the normal KPI board.
   */
  metricSuffix?: string;
  /** True when the employee used the 1-leave concession — rendered as a badge. */
  isConcession?: boolean;
  leaveDays?: number;
  /** No Late board lists everyone; `false` paints the row red. Undefined on the KPI board. */
  qualified?: boolean;
  /** Why they missed out — shown on red rows. */
  disqualifyReason?: string | null;
}
