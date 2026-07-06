/**
 * Lightweight word-level diff for short text values (titles, names, descriptions).
 *
 * Produces a list of segments tagged same / added / removed via a classic LCS
 * over whitespace-preserving tokens. Used by the diff viewer to highlight exactly
 * which words changed instead of striking the whole string.
 */

export type WordSeg = { value: string; type: 'same' | 'added' | 'removed' };

/** Split into tokens while keeping the whitespace runs as their own tokens. */
function tokenize(s: string): string[] {
  return s.match(/\s+|\S+/g) ?? [];
}

/** Longest-common-subsequence table over two token arrays. */
function lcs(a: string[], b: string[]): number[][] {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  return dp;
}

/**
 * Returns ordered segments describing how to turn `oldText` into `newText`.
 * Bails out (returns null) for very long inputs where a word diff isn't useful.
 */
export function diffWords(oldText: string, newText: string): WordSeg[] | null {
  if (oldText === newText) return null;
  const a = tokenize(oldText);
  const b = tokenize(newText);
  if (a.length + b.length > 400) return null; // too big to be worth a word diff

  const dp = lcs(a, b);
  const out: WordSeg[] = [];
  let i = 0;
  let j = 0;
  const push = (value: string, type: WordSeg['type']) => {
    const last = out[out.length - 1];
    if (last && last.type === type) last.value += value;
    else out.push({ value, type });
  };
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      push(a[i], 'same');
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      push(a[i], 'removed');
      i++;
    } else {
      push(b[j], 'added');
      j++;
    }
  }
  while (i < a.length) push(a[i++], 'removed');
  while (j < b.length) push(b[j++], 'added');
  return out;
}
