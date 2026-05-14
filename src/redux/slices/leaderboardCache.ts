import { createSlice, PayloadAction } from "@reduxjs/toolkit";

// ─────────────────────────────────────────────────────────────────────────────
// Leaderboard Cache Redux Slice
//
// WHY Redux instead of module-level Map:
//   • Survives component unmounts / route changes within the same session.
//   • Multiple components can share the same cached data without extra fetches.
//   • Redux DevTools makes cache state inspectable for debugging.
//   • A single source of truth prevents race conditions between concurrent
//     mounts of the same leaderboard component on different page tabs.
//
// Cache key format: "${startDate}_${endDate}_t${toggleChange}"
//   The toggleChange suffix ensures admin attendance edits always invalidate
//   the cache for that period, preventing stale score display.
//
// KPI factors are date-independent and cached once per session (kpiFactors).
// ─────────────────────────────────────────────────────────────────────────────

interface LeaderboardEntry {
  topFive: any[];
  fullList: any[];
}

interface LeaderboardCacheState {
  /** Leaderboard results keyed by date-range + toggle key */
  leaderboard: Record<string, LeaderboardEntry>;
  /** Module champion data keyed by the same date-range + toggle key */
  moduleChampions: Record<string, any[]>;
  /** Factor score maps: outer key = date-range key, inner key = factorId */
  factorRankings: Record<string, Record<string, any[]>>;
  /** KPI factor definitions — date-independent, cached once per session */
  kpiFactors: any[] | null;
}

const initialState: LeaderboardCacheState = {
  leaderboard: {},
  moduleChampions: {},
  factorRankings: {},
  kpiFactors: null,
};

const leaderboardCacheSlice = createSlice({
  name: "leaderboardCache",
  initialState,
  reducers: {
    cacheLeaderboard: (
      state,
      action: PayloadAction<{ key: string; topFive: any[]; fullList: any[] }>
    ) => {
      const { key, topFive, fullList } = action.payload;
      state.leaderboard[key] = { topFive, fullList };
    },
    cacheModuleChampions: (
      state,
      action: PayloadAction<{ key: string; data: any[] }>
    ) => {
      state.moduleChampions[action.payload.key] = action.payload.data;
    },
    cacheFactorRankings: (
      state,
      action: PayloadAction<{ key: string; map: Record<string, any[]> }>
    ) => {
      state.factorRankings[action.payload.key] = action.payload.map;
    },
    cacheKpiFactors: (state, action: PayloadAction<any[]>) => {
      state.kpiFactors = action.payload;
    },
  },
});

export const {
  cacheLeaderboard,
  cacheModuleChampions,
  cacheFactorRankings,
  cacheKpiFactors,
} = leaderboardCacheSlice.actions;

export default leaderboardCacheSlice.reducer;
