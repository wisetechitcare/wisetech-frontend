# Frontend setup — after you pull

This project uses **pnpm**, not npm. If you last pulled before the switch, read
[Migrating an existing checkout](#migrating-an-existing-checkout) first — a stale
`node_modules` from npm is the single most common cause of "it worked yesterday".

---

## 1. Node 24

pnpm 11.20 **cannot start on Node 20** — it dies on `node:sqlite` before it
installs anything. CI and the Amplify build spec both pin 24. Vite 7's floor is
20.19, so 24 satisfies both.

```bash
nvm install 24
nvm use 24
node -v       # expect v24.x
```

## 2. pnpm, via corepack

Do **not** `npm install -g pnpm`. Corepack ships with Node and reads the
`packageManager` field in `package.json`, so you get the exact pnpm version the
lockfile was written with instead of whatever is newest.

```bash
corepack enable pnpm
pnpm -v       # expect 11.20.0
```

### Windows: `EPERM ... C:\Program Files\nodejs\pnpx`

Expect this. `corepack enable` defaults to writing its shims next to `node.exe`
in `C:\Program Files`, which is admin-only. **You do not need admin** — point it
at the per-user npm directory instead, which is already on `PATH`:

```powershell
corepack enable --install-directory "$env:APPDATA\npm" pnpm
```

Then **open a new terminal** (an existing one captured `PATH` at launch and won't
see the shim) and check `pnpm -v` → `11.20.0`.

If you'd rather not install shims at all, prefix commands with `corepack`, which
works with no setup:

```bash
corepack pnpm install --frozen-lockfile
```

Two things not to do:

- **Don't `npm install -g pnpm`.** It pins a version independent of
  `packageManager`, so it drifts from the lockfile — the exact bug class this
  migration cleaned up.
- **Don't `corepack use pnpm@…`.** It rewrites the `packageManager` field and
  reformats `pnpm-workspace.yaml`, producing diff noise you'll have to revert.

## 3. Install

```bash
pnpm install --frozen-lockfile
```

`--frozen-lockfile` fails rather than silently resolving new versions — that's
what you want on a fresh pull, and it's what CI runs. Use a plain `pnpm install`
only when you are deliberately changing dependencies. `prepare` → `husky` runs
afterwards and installs the git hooks.

### Adding or changing dependencies

```bash
pnpm add <pkg>              # runtime dependency
pnpm add -D <pkg>           # dev dependency
pnpm add <pkg>@<version>    # pin an exact version
pnpm remove <pkg>
pnpm update <pkg>           # respect the semver range in package.json
pnpm outdated               # what has newer versions
pnpm why <pkg>              # who pulled this in
pnpm audit --audit-level high
```

**Always commit `pnpm-lock.yaml` with the `package.json` change.** If they
disagree, CI fails with `ERR_PNPM_OUTDATED_LOCKFILE`.

Before adding a UI dependency, check the shared kit first —
`src/app/modules/common/components/ui/README.md`. Ant Design, Mantine and
react-bootstrap are all still installed as legacy; don't reach for them in new
code.

## 4. Environment

Copy `.env` from the team vault into the repo root. Vite only exposes variables
prefixed `VITE_`, and it reads them **at startup** — restart the dev server after
any edit.

| Variable | What it is |
|---|---|
| `VITE_APP_WISE_TECH_BACKEND` | Backend base URL, e.g. `http://localhost:9000` |
| `VITE_APP_API_URL` | API root the services layer calls |
| `VITE_APP_IDLE_TIMEOUT_MINUTES` | Idle-logout window |
| `VITE_APP_GOOGLE_MAP_KEY` | Maps; leave unset until you touch that screen |
| `VITE_APP_OPEN_CAGE_API_KEY` | Geocoding; same |
| `VITE_APP_PREVIEW_DOCS_URL` | Document preview host |

## 5. Run it

```bash
pnpm run dev
```

The backend needs to be running too — see `../wisetech-backend/SETUP.md`.

For LAN testing from a phone on the same network, use `pnpm run dev:host` and see
[README_LAN_SETUP.md](README_LAN_SETUP.md).

---

## Everyday commands

| Task | Command |
|---|---|
| Dev server | `pnpm run dev` |
| Dev on LAN | `pnpm run dev:host` |
| Build (**this is the typecheck gate**) | `pnpm run build` |
| Typecheck only | `pnpm exec tsc --noEmit` |
| Lint | `pnpm run lint` · fix: `pnpm run lint:fix` |
| Preview prod build | `pnpm run preview` |
| Tests | `pnpm test` |
| Audit | `pnpm audit --audit-level high` |

**Translation from npm**, if it isn't in the table:

| npm | pnpm |
|---|---|
| `npm install` | `pnpm install` |
| `npm ci` | `pnpm install --frozen-lockfile` |
| `npm install <pkg>` | `pnpm add <pkg>` |
| `npm install -D <pkg>` | `pnpm add -D <pkg>` |
| `npm uninstall <pkg>` | `pnpm remove <pkg>` |
| `npm update` | `pnpm update` |
| `npm ls <pkg>` | `pnpm why <pkg>` |
| `npx <tool>` | `pnpm exec <tool>` |
| `npm run <script>` | `pnpm run <script>` |
| `npm run <script> <args>` | `pnpm run <script> -- <args>` |

---

## Migrating an existing checkout

Run this once, after the first pull that brings pnpm in:

```bash
# Windows PowerShell: Remove-Item node_modules -Recurse -Force
rm -rf node_modules package-lock.json
nvm use 24
corepack enable pnpm
pnpm install --frozen-lockfile
pnpm exec tsc --noEmit                  # confirm the checkout is clean
```

`package-lock.json` is gitignored now. If yours reappears, you ran npm by
accident — delete it and re-run `pnpm install`.

---

## Where pnpm config lives

**`pnpm-workspace.yaml`, not `package.json`.** pnpm 11 moved settings there, so
that file is the first place to look when an install behaves oddly.

- **`overrides`** — security floors for transitive packages (9 entries, each
  pinned to the lowest patched version from its advisory). When `pnpm audit`
  flags something you don't import directly, pin it here rather than weakening
  the CI audit step. CI blocks on high/critical only.
- **`allowBuilds`** — pnpm blocks dependency install scripts by default. `esbuild`
  and `@swc/core` are listed because the Vite build genuinely breaks without
  them. If an install ends with `ERR_PNPM_IGNORED_BUILDS`, the named package
  needs an entry here — add it deliberately, that error is a supply-chain prompt.

### There is no `.npmrc`

It used to hold `node-options=--max-old-space-size=4096`. **pnpm does not read
that key**, so the flag silently evaporated and the Vite build started OOMing at
Node's default heap. The heap size now lives in the `build` script itself:

```json
"build": "tsc && cross-env NODE_OPTIONS=--max-old-space-size=4096 vite build"
```

If a build dies around ~2 GB, that `cross-env` prefix is what to check — not an
`.npmrc`.

---

## Deployment

The Amplify build spec is versioned in the repo as [amplify.yml](amplify.yml),
**not** configured in the Amplify console. The console spec ran `npm ci`, which
cannot work here because `package-lock.json` is gitignored — every build failed
at preBuild. Keeping the spec in the repo means the build instructions travel
with the code. Edit that file, not the console.

---

## Git hooks

Installed by `pnpm install`. Same checks CI runs, just earlier.

- **pre-commit** (<5s) — secret/hygiene scan on staged files, plus
  `eslint --quiet` on staged `.ts`/`.tsx`.
- **commit-msg** — Conventional Commits (`feat(scope): subject`). Merge and
  revert commits are exempt.
- **pre-push** (~90s) — blocks direct pushes to `main`, then `tsc --noEmit` and
  eslint on files changed against `origin/main` (a whole-repo lint gate would
  trip the legacy warning backlog).
- **post-merge / post-checkout** — prints a hint when `pnpm-lock.yaml` moved. It
  never installs for you; that's your cue to run `pnpm install`.

`--no-verify` turns off *every* check at once. For one intentional line, put
`guard:allow` in a comment on it instead.

---

## Troubleshooting

**`ERR_PNPM_OUTDATED_LOCKFILE`** — `package.json` and `pnpm-lock.yaml` disagree.
Usually a merge brought in a dependency the lockfile doesn't have. Run a plain
`pnpm install` and **commit the updated lockfile**; don't work around it with
`--no-frozen-lockfile` in CI.

**`ERR_PNPM_IGNORED_BUILDS`** — see `allowBuilds` above.

**Build OOMs around 2 GB** — see [There is no `.npmrc`](#there-is-no-npmrc).

**`pnpm: command not found` after `corepack enable`** — open a new terminal; the
shims land on `PATH` only for shells started afterwards.

**`No such built-in module: node:sqlite`** — you're on Node 20. `nvm use 24`.
