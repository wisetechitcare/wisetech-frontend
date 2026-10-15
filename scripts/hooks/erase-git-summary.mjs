#!/usr/bin/env node
/**
 * Git prints its default commit summary AFTER post-commit exits.
 * This tiny process waits, then erases those lines from the terminal
 * so only our summary card remains.
 *
 * Usage: node erase-git-summary.mjs <lineCount>
 */
const n = Math.max(0, Math.min(30, Number(process.argv[2]) || 0))
const delayMs = Math.max(50, Math.min(2000, Number(process.argv[3]) || 200))

await new Promise((resolve) => setTimeout(resolve, delayMs))

if (n > 0) {
  try {
    process.stdout.write(`\x1b[${n}A\x1b[0J`)
  } catch {
    /* ignore — no TTY / closed stdout */
  }
}
