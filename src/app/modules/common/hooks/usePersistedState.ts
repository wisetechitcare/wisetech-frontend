import { useEffect, useState } from "react";

/** useState that remembers its value in localStorage, so a period/tab selection
 *  survives navigating away and back. `allowed` guards against a stale key from
 *  an older build restoring a mode the page no longer renders. */
export function usePersistedState<T extends string = string>(
  storageKey: string,
  initial: string,
  allowed?: readonly string[]
) {
  const [value, setValue] = useState<T>(() => {
    const saved = localStorage.getItem(storageKey);
    if (!saved) return initial as T;
    return (!allowed || allowed.includes(saved) ? saved : initial) as T;
  });

  useEffect(() => {
    localStorage.setItem(storageKey, value);
  }, [storageKey, value]);

  return [value, setValue] as const;
}
