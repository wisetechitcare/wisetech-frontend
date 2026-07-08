# WiseTech Frontend

HRMS web client (Metronic-based admin theme). React 18 + TypeScript + Vite. Pairs with `../wisetech-backend`.

## Commands
- Dev: `npm run dev` (Vite) · LAN: `npm run dev:host`
- Build: `npm run build` (`tsc && vite build`) — **the build typechecks; it fails on any TS error.**
- Typecheck only: `npx tsc --noEmit` — **primary verification gate; the project typechecks clean (0 errors), keep it that way.**
- Lint: `npm run lint` (config in `.eslintrc.cjs`) · auto-fix: `npm run lint:fix`. The config is deliberately lean — style noise (`no-explicit-any`, unused vars, etc.) is OFF; only genuine-bug rules are errors (`react-hooks/rules-of-hooks`, unsafe optional chaining, `no-debugger`). `src/_metronic/**` is ignored as vendored. There are ~61 pre-existing real-bug errors in ~29 legacy files; don't add new ones.
- Preview prod build: `npm run preview`

## Architecture
- Entry `src/main.tsx`. App code under `src/app/` (pages in `src/app/pages/`), shared `components/`, `hooks/`, `contexts/`.
- Theme/scaffolding is `src/_metronic/` (vendored Metronic) — treat as third-party; prefer composing over editing it.
- State: Redux Toolkit (`src/redux/`) + React Query (`@tanstack/react-query`) for server state. Use React Query for data fetching/caching; Redux for client/UI state.
- API calls go through `src/services/` (axios). Don't call axios directly from components — add/extend a service.
- Path aliases (in `vite.config.ts` + tsconfig): `@ @app @pages @components @hooks @services @utils @redux @models @constants @metronic`.

## Conventions
- TypeScript strict. No `any`; type API responses (`src/models/`, `src/types/`). Zod/Yup available for runtime validation — validate external data.
- Forms: Formik or react-hook-form (both present) — match whatever the surrounding page already uses; don't mix within one form.
- UI: MUI + Ant Design + Mantine + Bootstrap all exist (legacy layering). **Match the component library the rest of the page/module uses** rather than introducing a new one.
- Notifications: react-toastify / sonner / sweetalert2 are all present — follow the module's existing choice.
- Heavy libs (PDF, charts, maps, xlsx) are code-split via `manualChunks` in `vite.config.ts`. Prefer lazy-loading heavy routes/components; don't import a vendor bundle into a hot common path.

## Before saying a change is done
Run `npx tsc --noEmit` (or a full `npm run build`) — it must pass clean. Run `npm run lint` on files you touched (warnings are informational; don't introduce new errors).

## Auto-verify hook
A `PostToolUse` hook (`../.claude/settings.local.json` → `../.claude/hooks/typecheck.sh`) runs after any Edit/Write to a `.ts`/`.tsx` file in this project, in the background: whole-project `npx tsc --noEmit` plus `npx eslint --quiet` on just the edited file. Any type error or lint **error** (warnings excluded) is surfaced automatically.
