# Contributing — WiseTech Team Working Agreement

> Audience: all developers + lead, across **both** `wisetech-backend` and `wisetech-frontend`.
> These rules come from real failures in this codebase (features disappearing after merges/deploys), not generic advice.
> The *why* behind them lives in [`ENGINEERING_PRINCIPLES.md`](./ENGINEERING_PRINCIPLES.md). Most of this is enforced automatically by branch protection + CI + tag-based deploy; the rest is shared discipline.

## 0. The 10 non-negotiables (read this even if you read nothing else)
1. **`main` is the only source of truth.** Never push to it directly, never `reset`/force-push it, never deploy anything that isn't on it.
2. **Never merge a stale branch.** Rebase onto latest `main` *before* every PR. ("Require branches up to date" enforces this.)
3. **No "backup" branches.** A snapshot is a tag (`git tag backup/x`), never a branch you later merge back — backup-branch merges are what deleted features here.
4. **Small, short-lived branches.** One ticket = one branch = one squash-merged PR, ideally < 2–3 days old.
5. **CI must be green to merge.** A red `tsc`/build/lint never reaches `main`.
6. **Never commit secrets or user data.** No `.env`, no `uploads/`, no PII.
7. **No patch files / no `*.labbai.*` copies.** Integrate via branches + PRs, never by swapping files or applying `.patch`.
8. **Frontend + backend ship together.** Coordinate releases so the API contract never skews.
9. **Deploy only immutable release tags**, never a moving branch. Rollback = redeploy the previous tag.
10. **If a feature "disappears," use the Incident checklist (§11) — `git revert`, never hand-edit production.**

## 1. Branching model (trunk-based)
- `main` — protected, always-deployable, the only long-lived branch.
- `feat/<ticket>-<slug>`, `fix/<ticket>-<slug>`, `chore/<slug>` — short-lived, branched from latest `main`, deleted after merge.
- **Forbidden:** personal long-lived branches, `*-backup*`, and parallel trunks (`develop`/`development`/`webhook`). One trunk only.

## 2. Daily workflow (every dev, every day)
```bash
# start a task — always branch from fresh main
git checkout main && git pull --ff-only
git checkout -b feat/1234-org-rename

# during work — commit small and often, push your branch daily
git add -p && git commit -m "feat: rename company to organization in nav"
git push -u origin feat/1234-org-rename

# before opening/refreshing a PR — get current, rebase, resolve conflicts in YOUR branch
git fetch origin
git rebase origin/main
git push --force-with-lease   # safe force; refuses if a teammate also pushed
```
- Pull `main` at least once a day so you never drift far.
- Never develop directly on `main` or a shared branch.

## 3. Pull requests
- Required for every change. **1 approval** from another dev, **CI green**, **branch up to date**.
- Keep PRs small (ideally < ~400 lines). Big PRs hide regressions and stall review.
- Description: what changed, why, how to test — and **call out any deletions/removals explicitly**.
- **Squash merge only** → one clean, revertable commit per feature on `main`.

## 4. Merging & conflict discipline
- Resolve conflicts **in your feature branch** (via rebase), never on `main`.
- If your branch is behind, rebase — do **not** merge an old branch forward (that reverts newer work).
- Don't merge a teammate's branch into yours to "get their code" — wait for it to land on `main`, then rebase.

## 5. Releases & deployment
- Release = tag green `main`: `git tag vYYYY.MM.DD && git push origin vYYYY.MM.DD` in **both** repos at the same logical point.
- Frontend Amplify builds from `main` and must **fail the build on `tsc`/build error**. Backend deploys the tag to EC2 via `deploy.sh <tag>` (immutable checkout + `/api/test` healthcheck + auto-rollback).
- **Rollback** = redeploy the previous tag. Never SSH in / hand-edit a built bundle.
- Backend DB migrations are forward-only — coordinate so the frontend tolerates both old and new shapes during a release.

## 6. Code-quality gates
- Frontend: `npx tsc --noEmit` + `npm run build` must pass, and lint clean on the files you changed. Backend: `npx tsc --noEmit` + `npm run build`.
- Don't add new ESLint errors (config flags real bugs only; ~61 legacy errors are tracked for cleanup — don't grow that number).
- Keep API calls in services (`src/services/`), type responses (`src/models/`, `src/types/`). Match the library a module already uses (MUI/Antd/Mantine/Bootstrap all exist — don't add a new one).

## 7. Security & secrets (hard rules)
- `.env` stays git-ignored. Secrets live in Amplify env / the backend server, never in the repo.
- **No user uploads or PII in git.** Serve/store documents via the backend + S3.
- If a secret is ever committed, **rotate it immediately** — removing the file is not enough; git history keeps it.

## 8. Repo hygiene
- Never commit build output (`dist/`), `node_modules`, scratch files, or stray files.
- Keep `package.json` and `package-lock.json` in sync; commit the lockfile (CI uses `npm ci`).
- Delete your branch after it merges. Prune weekly: `git fetch --prune`.

## 9. Cross-repo coordination
- A feature spanning both repos = two PRs that reference each other; merge backend first when the frontend depends on a new endpoint.
- Treat backend `src/routes/**` and frontend `src/services/**` as the shared API contract — changing one without the other is the top cause of "it stopped working."

## 10. Team cadence & ownership
- **One release owner per week** cuts the tags and watches both deploys.
- Daily 10-min sync: who's touching what, to avoid two people rewriting the same module.
- PR review turnaround target: same day. Small PRs make this easy.
- Definition of Done: merged to `main` via green PR, deployed via tag, verified in the running app.

## 11. Incident checklist (when a feature vanishes)
1. **Where is prod really?** Amplify console deployed commit; backend EC2 `git rev-parse HEAD`. Compare to `origin/main`.
2. **Is prod behind?** `git log --oneline <prod-sha>..origin/main`.
3. **Find the commit that removed it:**
   ```bash
   git log --oneline -S"<symbol/string>" -- <path>   # when code appeared/vanished
   git log --diff-filter=D --oneline -- <path>        # when a file was deleted
   git log --oneline --first-parent main              # feature timeline
   ```
4. **Inspect the suspect merge/squash:** `git show <sha>` / `git show --remerge-diff <merge-sha>`.
5. **Check contract skew:** frontend `src/services/**` vs deployed backend `src/routes/**`.
6. **Restore fast:** `git revert <sha>` → PR → CI green → tag → deploy. **Never hand-patch prod.**
7. **Post-incident:** which guardrail would have caught it? Add it.

## Per-developer onboarding checklist (one-time)
- [ ] `git remote -v` shows a single `origin`.
- [ ] Local `main` tracks `origin/main` and is current (`git pull --ff-only`).
- [ ] Delete local copies of retired branches; never recreate `*-backup*`.
- [ ] `.env` present locally and **ignored** (`git check-ignore .env`).
- [ ] Read this file and [`ENGINEERING_PRINCIPLES.md`](./ENGINEERING_PRINCIPLES.md).

---
**Enforced by:** branch protection on `main` (PR + review + up-to-date + required CI), squash-only merges, the CI gate (`.github/workflows/ci.yml`), and Amplify fail-on-error builds. Rules tooling can't enforce (release owner, daily sync, no PII) are our shared discipline.
