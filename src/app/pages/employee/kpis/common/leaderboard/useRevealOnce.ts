import { useCallback, useState } from "react";

/**
 * Gates the podium "lucky draw" reveal so it auto-plays ONCE per session, then
 * always renders the static (points-based) leaderboard. A manual Replay forces a
 * single re-run.
 *
 * - `shouldPlay`  : true until the reveal has been shown this session.
 * - `nonce`       : bump-on-replay counter (forces a fresh re-run downstream).
 * - `markPlayed()`: records the reveal as shown (call from the completion callback).
 * - `replay()`    : re-triggers the animation once.
 *
 * All sessionStorage access is wrapped in try/catch: in private mode or on quota
 * errors we treat the reveal as already-played (never throw, never loop).
 */
const PREFIX = "kpiReveal:";

function hasSeen(key: string): boolean {
  try {
    return sessionStorage.getItem(PREFIX + key) === "1";
  } catch {
    return true; // storage unavailable → behave as already-seen
  }
}

export function useRevealOnce({ storageKey }: { storageKey: string }) {
  // `played` persists within the mount AND initialises from sessionStorage, so a
  // filter change (which can re-render or remount) never replays the animation.
  const [played, setPlayed] = useState<boolean>(() => hasSeen(storageKey));
  const [nonce, setNonce] = useState(0);

  const markPlayed = useCallback(() => {
    setPlayed(true);
    try {
      sessionStorage.setItem(PREFIX + storageKey, "1");
    } catch {
      /* ignore storage failures */
    }
  }, [storageKey]);

  const replay = useCallback(() => {
    setPlayed(false);
    setNonce((n) => n + 1);
  }, []);

  return { shouldPlay: !played, nonce, markPlayed, replay };
}
