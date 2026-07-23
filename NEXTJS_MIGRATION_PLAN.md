# Vite → Next.js Migration Plan — wisetech-frontend

> Status: **Planning / decision pending.** No code changes made yet.
> Author: engineering. Last updated: 2026-07-13.
> Companion docs: `DESIGN_SYSTEM.md`, `GIT_WORKFLOW.md`, `CLAUDE.md`.

This document (a) profiles what the app actually is today, (b) compares the two
real migration strategies **side by side** so we can pick one deliberately, and
(c) lays out the phased plan for the chosen path.

---

## 1. Why we're considering this

The long-term platform vision is a **Turborepo monorepo (NestJS + Next.js)**.
Next.js is the intended destination for the frontend. This doc decides *how* and
*when* — not *whether*. React Bits (the trigger for this discussion) is **not** a
reason to migrate: it runs identically on Vite and Next and its setup carries
over unchanged. The two decisions are independent.

---

## 2. What the app actually is today (repo profile)

Facts gathered from the current codebase — these drive every recommendation below.

| Dimension | Reality |
|---|---|
| Build tool | **Vite 7** (`@vitejs/plugin-react-swc`), `vite-tsconfig-paths` |
| Framework | React 18 + TypeScript (strict), SPA |
| Routing | **react-router-dom v6** — **147 `<Route>` across 140 files** |
| Rendering | **100% client-rendered.** No SSR anywhere today |
| Theme/UI shell | **Metronic** (vendored `src/_metronic`): SCSS chain, keenicons, `data-bs-theme`, splash screen + inline theme `<script>` reading `localStorage` in `index.html` |
| UI kits | **MUI + Antd + Mantine + Bootstrap + react-bootstrap** layered (legacy) |
| State | Redux Toolkit + React Query (`@tanstack/react-query`) |
| Realtime | `socket.io-client` |
| Auth | **JWT in httpOnly cookie** (dual-path w/ header fallback) — see `project_auth_cookie_migration` |
| Env usage | **49 files** read `import.meta.env` / `process.env`; single `.env` |
| Browser-only at module load | `Buffer`/`global` polyfills for `@react-pdf`; `localStorage` auth bootstrap in `main.tsx`; `window.matchMedia` in `index.html` |
| Heavy client-only libs | `@react-pdf/renderer`, `leaflet`/`react-leaflet`, google maps, `apexcharts`/`echarts`/`chart.js`, `jspdf`, `pdfmake`, `react-signature-canvas`, **`puppeteer`** (must be server/build-only) |
| Path aliases | `@ @app @components @hooks @services @utils @redux @models @constants @metronic @pages @modules` (in `vite.config.ts` + tsconfig) |
| Dev proxy | `/api`, `/socket.io` (ws), `/uploads` → `http://localhost:9000` |
| Verification gate | `tsc --noEmit` clean (0 errors); PostToolUse auto-typecheck hook |

**One-line summary:** a large, mature, entirely client-side admin dashboard on a
vendored theme, with several libraries that only run in the browser.

---

## 3. The two strategies, compared deeply

There are exactly two honest paths. Everything else is a variant of these.

### Strategy A — "Client SPA on App Router"
Run the **existing React tree as one big client app** under Next's App Router: a
single catch-all route (`app/[[...slug]]/page.tsx`, `"use client"`) renders the
current `<BrowserRouter><AppRoutes/></BrowserRouter>`. Next provides the
toolchain, build, env model, routing shell, and monorepo-readiness. Routes are
converted to native Next file-routes **incrementally, later**. This is the
officially documented [Vite→Next migration path](https://nextjs.org/docs/app/guides/migrating/from-vite).

### Strategy B — "Full SSR rewrite"
Convert pages to **React Server Components** with **server-side data fetching**
from the start: each page becomes a server component that fetches on the server,
passing data to client leaves. Requires reworking the data layer (React Query /
axios-in-components → server fetches or RSC-friendly patterns), auth on the
server, and per-page client/server boundary design.

### Side-by-side

| Criterion | **A: Client SPA** | **B: Full SSR rewrite** |
|---|---|---|
| **Effort** | ~3–5 weeks, parallelizable | **2–4+ months** |
| **Risk to existing features** | **Low** — same runtime tree, behavior preserved | **High** — every page's data/auth path reworked |
| **First-paint / SEO** | No better than today (still client-rendered) | **Significantly better** (server HTML, streaming) |
| **Metronic compatibility** | **Clean** — it's a client theme, stays client | Friction — theme assumes client; needs careful boundaries |
| **MUI/Antd/Mantine SSR setup** | **Not needed** (client only) | **Required** — emotion cache, style registries, hydration-flash handling for each kit |
| **Browser-only libs (`@react-pdf`, maps, `puppeteer`)** | Isolate with `ssr:false` — straightforward | Same isolation **plus** must guarantee they never enter a server component |
| **Auth (httpOnly cookie)** | Middleware guard, minimal change | Cookie read on server for data fetches — more surface, still doable |
| **Data layer (React Query)** | **Unchanged** | Reworked toward server fetching / RSC hydration |
| **Reversibility** | **High** — keep Vite until cutover; fall back easily | Low — deep changes, hard to unwind |
| **Payoff** | Toolchain + monorepo-ready **now**; SSR later, incrementally | Full SSR benefits up front |
| **Best when** | App is internal, auth-gated, data-dense (**this app**) | App is public, SEO/first-paint-critical, content-heavy |

### The deciding question

**Who sees these pages, and does first-paint speed / SEO matter?**

This is an **internal, login-gated HRMS admin**. There is **no SEO surface** and
first-paint behind auth matters far less than for a marketing site. The primary
benefits of Strategy B (server HTML for crawlers, fast anonymous first paint)
**do not apply** to most of this app. Meanwhile Strategy B's costs (rewriting the
data layer for 147 routes, SSR-configuring 4 UI kits, guarding every browser-only
lib against the server) are paid in full.

**Therefore: Strategy A is the correct first move.** It reaches the Next.js /
monorepo destination with weeks of low-risk work instead of months of high-risk
rewrite, and it does **not** foreclose Strategy B — server components can be
adopted page-by-page afterward, exactly where they pay off (a future public
careers/login page, a shareable report, etc.).

> **Recommendation: Strategy A now; adopt RSC/SSR incrementally later where it earns its keep.**

The phased plan below implements Strategy A and flags where a Strategy B path
would diverge.

---

## 4. Phased plan (Strategy A)

### Phase 1 — Scaffold & de-risk (no behavior change)
**Goal:** Next.js boots the app; nothing looks different.

1. Add `next` **alongside** Vite (don't delete Vite yet). Bump React to 18.3+. Keep `react-router-dom`.
2. App Router shell: `app/layout.tsx` (server) + `app/[[...slug]]/page.tsx` (client catch-all) rendering the existing `<BrowserRouter><AppRoutes/></BrowserRouter>`.
3. Port `index.html` into `app/layout.tsx`: `<head>` (fonts, favicon, splash CSS), `#root-modals` div, and the inline theme-mode `<script>` — it reads `localStorage`, so run it `beforeInteractive` to avoid a theme flash.
4. `app/providers.tsx` (`"use client"`): Redux `<Provider>`, `<QueryClientProvider>`, `<MetronicI18nProvider>`, `<ToastContainer>`, plus the axios/auth bootstrap currently in `main.tsx`.
5. Move the Metronic SCSS import chain into `layout.tsx` (Next supports `sass` natively).

**Exit check:** `next dev` renders; login → dashboard works.

### Phase 2 — Environment & browser globals
1. Codemod `import.meta.env.VITE_X` → `process.env.NEXT_PUBLIC_X` across the 49 files (reuse the existing `codemods/` harness). Rename `.env` keys `VITE_*` → `NEXT_PUBLIC_*`. `import.meta.env.DEV/PROD` → `process.env.NODE_ENV`.
2. `Buffer`/`global` polyfills → into client providers (guarded by `typeof window !== 'undefined'`) or `next.config.js` webpack fallback. `@react-pdf/renderer` → `ssr:false` dynamic import.
3. Any `window`/`document`/`localStorage` at module scope → guard or move into `useEffect`. The `main.tsx` `localStorage` auth-bootstrap → client provider effect.

### Phase 3 — Routing translation (the bulk, incremental)
- The Phase-1 catch-all means routes migrate **gradually**: anything not yet moved to `app/` keeps working under the client `<AppRoutes>`.
- Mechanical mapping: `<Route path>` → `app/**/page.tsx`; nested layout routes → nested `layout.tsx`; `useNavigate/useParams/Link` → `next/navigation` + `next/link`; route guards (`<PrivateRoutes>`) → `middleware.ts` reading the httpOnly JWT cookie (**clean because auth is already cookie-based**).
- 147 routes — largest effort, parallelizable, each moved route independently testable.

### Phase 4 — Client/server boundaries & heavy libs
1. `"use client"` on interactive components (most of the app initially).
2. `ssr:false` dynamic imports for `@react-pdf`, `leaflet`/maps, charts, signature canvas. **`puppeteer` must remain server/build-only — never imported client-side.**
3. `socket.io-client` init in `useEffect` (client only).
4. Drop Vite `manualChunks`; use `next/dynamic` for lazy-loading intent.

### Phase 5 — Dev proxy, build, cutover
1. Dev proxy (`/api`, `/socket.io` ws, `/uploads` → `:9000`) → `next.config.js` `rewrites()`. **Do not create `app/api/*`** — it would shadow the proxied backend `/api`.
2. Path aliases → `tsconfig.json` `paths` (Next reads these; drop `vite-tsconfig-paths`).
3. `npm run build` → `next build`. Keep the `tsc --noEmit` gate and the auto-typecheck hook.
4. Delete Vite (`vite.config.ts`, `index.html`, plugins) **only after** `next build` + full smoke pass are green.

---

## 5. Risk register (repo-specific)

| Risk | Why it bites here | Mitigation |
|---|---|---|
| Metronic client-only + theme flash | Inline `localStorage` theme script, `data-bs-theme` | Client-SPA mode; theme script `beforeInteractive` |
| `puppeteer` in deps | Would bloat/break client bundle | Keep server/build-only; never client-imported |
| `@react-pdf` + Buffer/global | Needs Node globals at load | `ssr:false` dynamic import + guarded polyfills |
| 147 routes | Largest effort; easy to miss auth guards | Middleware auth + incremental migration behind catch-all |
| `import.meta.env` in 49 files | Build-breaking en masse | One codemod pass, verify with `tsc` |
| 4 UI kits | SSR style flash / emotion setup | Not needed in client-SPA mode; only if/when SSR adopted |
| Dev proxy `/api` vs Next route handlers | `app/api` shadows backend | Use `rewrites()`, no `app/api` folder |

---

## 6. Effort estimate

| Scope | Strategy A (recommended) | Strategy B |
|---|---|---|
| Scaffold + env + boot (Ph 1–2) | ~2–4 days | ~1–2 weeks |
| Routing (Ph 3) | 2–4 weeks (parallelizable) | 6–12 weeks (with data-layer rework) |
| Boundaries + build + cutover (Ph 4–5) | ~1 week | ~2–3 weeks |
| Data-layer / RSC rewrite | deferred | included, largest cost |
| **Total** | **~3–5 weeks** | **~2–4+ months** |

---

## 7. Explicitly deferred (adopt later, incrementally)

Server components, SSR/streaming data fetching, `next/image` optimization sweep,
RSC-based data loading, MUI/Antd SSR style registries. All fit cleanly **after**
cutover, page-by-page, only where they pay off.

---

## 8. Decision log

- **2026-07-13:** Plan drafted. Strategy comparison presented; **recommendation = Strategy A (client SPA on App Router), RSC later**. Awaiting sign-off before Phase 1.
- React Bits registry wiring intentionally decoupled — portable across Vite/Next, can proceed independently.
