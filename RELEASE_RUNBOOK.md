# Release & Cleanup Runbook

Operational command sheets for rolling out the trunk-based workflow. Covers **both** `wisetech-backend` and `wisetech-frontend`. See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for the rules and [`ENGINEERING_PRINCIPLES.md`](./ENGINEERING_PRINCIPLES.md) for the why.

> Branch lists below are point-in-time (captured 2026-06-15). **Always re-vet** with the "review first" commands before deleting — state changes as branches merge.

## Order of operations
1. PR/merge `webhook` → `main` (both repos).
2. Turn on branch protection on `main` + squash-only merges (GitHub console).
3. Point AWS Amplify at `main`, fail build on error.
4. **Sheet B** — first tagged release, to validate immutable deploy + rollback.
5. **Sheet A** — branch cleanup.
6. PII history purge (`git filter-repo`/BFG on backend `uploads/`) — coordinated, separate task.

---

## Sheet A — Branch cleanup

### Safe to delete (fully merged into `origin/main`)
```bash
# BACKEND
cd wisetech-backend
git push origin --delete conveyance develop irfan-test labbai \
  labbai-backup2 labbai-backup3 lead-error-resolve lead-features \
  leave-management remove-leave-features sallu_conveyance

# FRONTEND
cd ../wisetech-frontend
git push origin --delete irfan-frontend-branch labbai labbai-backup2 \
  labbai-backup3 labbai-test lead-error-resolve lead-project-features \
  leave-management salman_conveyance
```

### Review first (unique commits not in `main` — vet, then keep/rescue/delete)
```bash
# BACKEND
for b in irfan-backend-clean irfan-branch irfan-shaikh labbai-backup lead-project-features; do
  echo "== $b =="; git log --oneline origin/main..origin/$b; done

# FRONTEND
for b in conveyance irfan-branch labbai-backup remove-leave-features; do
  echo "== $b =="; git log --oneline origin/main..origin/$b; done
```
- Real work in a branch → rescue: `git switch -c feat/<slug> origin/<branch>` then open a PR.
- Otherwise delete: `git push origin --delete <branch>`.
- Do **not** delete `main` or `webhook`.

---

## Sheet B — First tagged release (run AFTER `webhook` is merged into `main`)
```bash
# Do in BOTH repos, same tag, same day
git checkout main && git pull --ff-only        # main must already contain the release code
git tag -a v2026.06.15 -m "Release 2026.06.15"
git push origin v2026.06.15
```
- **Backend:** tag push triggers `.github/workflows/github.yml` → SSH → `deploy.sh v2026.06.15` (immutable `git checkout --detach` + `/api/test` healthcheck + auto-rollback to previous ref on failure).
- **Frontend:** Amplify deploys on push to `main`, so its release happens at the merge; the matching tag is for version coordination/record. Confirm the Amplify build is green.
- **Rollback:** re-run the backend deploy workflow (`workflow_dispatch`) with the previous tag; for frontend, redeploy the previous successful Amplify build.

### Tag naming
`vYYYY.MM.DD` (add `-hotfixN` for same-day hotfixes, e.g. `v2026.06.15-hotfix1`). Keep backend and frontend tags in lockstep so EC2 and Amplify always ship compatible versions.
