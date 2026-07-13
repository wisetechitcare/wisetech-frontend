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
}
