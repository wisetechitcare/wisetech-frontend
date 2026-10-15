# Git hooks (WiseTech Frontend)

Simple local checks so everyday commits stay fast. Full tests run on GitHub CI.

**Full explanation (both repos, diagrams, every step):** [../GIT_HOOKS_GUIDE.md](../GIT_HOOKS_GUIDE.md)

## What runs when

| You run | What happens | Typical time |
|---------|----------------|--------------|
| `git commit` | Status board → checks **only staged files** (secrets + ESLint) + Conventional Commit message → **post-commit** summary card (hash, message, files) | ~5–15s |
| `git push` | Status board → block push to `main`/`develop` → **TypeScript** (incremental) | First time ~50–90s; later often ~15–30s |
| `pnpm verify` | Same idea as CI: guard self-test + lint changed files + vitest + task tests + TypeScript | Several minutes |
| GitHub CI on PR | Lint changed files, tests, typecheck, build, audit | Minutes on the server |

## Commands

```bash
pnpm run type-check   # TypeScript only
pnpm verify           # Local full confidence (like CI)
pnpm run hooks:test   # Guard self-test
pnpm run lint:fix    # Auto-fix many lint issues
```

## If a check fails

The terminal shows a **What to do** box with plain steps. Fix those, then retry.

Do **not** use `--no-verify` to skip secret checks.

## Status board

Hooks print a small checklist (`[OK]` / `[FAIL]` / `[...]`) so you can see which step is running.
