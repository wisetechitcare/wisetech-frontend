# Attendance Overview — Performance Plan (Frontend)

**For:** the frontend team. **Pages:** Admin → Attendance → Overview (all employees) and Employee → Attendance → Overview (personal).
**Goal:** pages that open fast and switch tabs/periods without spinners.
**Backend side:** being done separately (see "What the backend is changing"). Nothing here needs to wait for it, except where noted.

---

## 1. Why the pages feel slow today

Measured on 2026-11-19, one month of data, local server:

| API | Time | Size | Used by |
|---|---|---|---|
| `POST /api/employee/attendance/classification/batch` | **1.49 s** | 9.8 KB | Admin weekly/monthly summary |
| `GET /api/employee/attendance/all?from=&to=` | **574 ms** | **447 KB** | Admin weekly/monthly board |
| `GET /api/employee/all?isActive=true` | 61 ms | **113 KB** | Admin roster |

Two kinds of problem:

1. **Slow APIs** — the backend is fixing these (section 4).
2. **The page asks for the same thing many times, and waits for everything before showing anything** — this part is ours.

What the code does today:

| File | What it does |
|---|---|
| `admin/views/overview/DailyAttendance.tsx` | 8 `useEffect`s, 12 awaited API calls |
| `admin/views/overview/Overview.tsx` | 7 `useEffect`s, 7 awaited API calls |
| `personal/views/overview/MarkAttendance.tsx` | 12 `useEffect`s, 19 awaited API calls |
| `GET /attendance/stats` (`fetchEmpAttendanceStatistics`) | called from 5 components on the personal page |
| `GET /api/feature/config` (`fetchConfiguration`, "leave management") | fetched separately by ~6 components (`MyAttendanceView`, `Rules`, `Daily`, `Monthly`, `Custom`, …) |

Every `useEffect` fetch starts from zero on every mount: no sharing between components, no memory between tabs, and a spinner each time.

---

## 2. The idea, in plain words

- **Ask once, share the answer.** If five components need this month's stats, one request is made and all five read it.
- **Remember answers.** Coming back to a tab or period you already saw should show it instantly, and quietly refresh in the background.
- **Show what is ready.** Each card shows its own skeleton and fills in when its data arrives. One slow API should not hold the whole page.
- **Ask for less.** Don't download all employees with every field to draw a name list.

React Query already gives us the first two. It is set up app-wide in `src/main.tsx` (data stays fresh 5 minutes, cached 1 hour, no refetch on window focus). The Overview pages just don't use it yet.

---

## 3. What to change

### Template to copy: `src/hooks/useAttendanceCalendar.ts`
It already does it right for the personal calendar: **one** request, `useQuery`, `keepPreviousData` so switching months shows the old month until the new one lands, and the socket invalidates the cache when attendance changes. Build the hooks below the same way.

### 3.1 One hook per piece of data (both pages)

Create shared hooks in `src/hooks/` (or one `useAttendanceOverviewQueries.ts`):

| Hook | API | Query key |
|---|---|---|
| `useAttendanceStats(employeeId, from, to)` | `GET /attendance/stats` | `['attendance', 'stats', employeeId, from, to]` |
| `useAttendanceBoard(from, to)` / `(date)` | `GET /attendance/all` | `['attendance', 'board', from, to]` |
| `useAttendanceClassifications(ids, from, to)` | `POST /attendance/classification/batch` | `['attendance', 'classification', from, to, ids]` |
| `useRangeCalendar(from, to)` | `GET /attendance/range-calendar` | `['attendance', 'range-calendar', from, to]` |
| `useOnLeave(from?, to?)` | `GET /employee-on-leaves` | `['attendance', 'on-leave', from, to]` |
| `useLeaveManagementConfig()` | `GET /api/feature/config?module=leave management` | `['config', 'leave management']` |

Rules:
- **Same data → same key.** Five components calling `useAttendanceStats` with the same arguments make **one** request.
- Use `placeholderData: keepPreviousData` for anything that changes with the selected period, so the old numbers stay visible while the new ones load (no flash, no spinner).
- Remove the matching `useEffect` + `useState` + `await fetchX()` blocks from the components; they read from the hook instead.
- `hooks/useConfiguration.ts` is a toggle-and-save hook with its own local state. Leave it for settings screens, and give the Overview pages the read-only cached `useLeaveManagementConfig`.

### 3.2 Keep the cache correct (realtime)
The backend already emits socket events when attendance changes (`emitAttendanceUpdate`, `attendanceRequests:updated`). `useAttendanceRealtime.ts` / `useAttendanceCalendar.ts` listen to them. On those events call
`queryClient.invalidateQueries({ queryKey: ['attendance'] })` so every Overview card refreshes itself. Do this once in a shared place, not per component.

### 3.3 Show each section on its own
- Each card (stats tiles, daily board, period summary, request queues) renders its own skeleton from its own `isLoading`.
- No page-level "loading everything" state. The slow classification summary must not block the board.
- Requests that don't depend on each other run in parallel. React Query does this automatically when each card has its own hook.

### 3.4 Ask for less
- **Pickers and name lists** should not use the full `GET /employee/all` (113 KB of complete employee records). Until the backend's lean roster view lands (section 4), use `GET /employee/all-employees-selected-data`, which is already lighter. Then switch to the lean view.
- Screens that pick people for **new** work should send `isActive=true` (13 of 21 `fetchAllEmployees()` calls fetch everyone today). Screens that show history keep the full list.
- `src/utils/activeEmployee.ts` decides "active" in the browser. Prefer the server's `isActive` filter, which uses joining/exit dates and rejoin history.

### 3.5 Reuse what is already loaded across Daily / Monthly / All time

When a wider range is already in the cache, a narrower one must come from it instead of the network. How depends on **what kind of data** the card shows:

| Kind of data | Examples | Can a narrower range be cut from a wider one? |
|---|---|---|
| **Rows** (one item per punch / leave / request) | board punches, on-leave list, request list | **Yes.** Filter the cached rows by date. Every row already carries the server's verdict (`lateMark`, day kind), so nothing is recalculated in the browser. |
| **Totals** (numbers already added up by the server) | classification summary (late count, working days), stats tiles, all-time records | **No.** "Late check-ins in March" can't be read out of "late check-ins all time". These come from the server per range, and are cached per range. |

**Rows — cache by month, build every range from months.**
- The cache unit is **one month**: key `['attendance', 'board', 'month', 'YYYY-MM']`.
- **Daily** = the day's rows filtered out of its month (if the month is cached, zero requests).
- **Monthly** = one month bucket.
- **Weekly / custom** = the 1–2 month buckets it touches, filtered to the exact days.
- **All time** = all month buckets. Load only the months the screen actually shows; don't fetch years of punches up front for everyone.
- So: open "This month" → then "Today" is instant. Open "All time" (months loaded) → then any month or day inside it is instant.
- Implementation: a `useAttendanceRows(from, to)` hook works out the months in the range, uses `useQueries` for those month keys (React Query skips the cached ones), then filters to `from..to`. One place, reused by every card that draws rows.

**Totals — cache by exact range, and get cheap "all time" from the server.**
- Key includes the range: `['attendance', 'classification', from, to, ids]`. Daily, Monthly and All time are three separate cached answers; switching back to one already seen is instant.
- For all-time totals the server should return the totals (`GET /attendance/records`), never "all punches ever" for the browser to count. The backend is moving that endpoint to SQL `COUNT`/`SUM` (see section 4).

**Things that would break this, so don't do them:**
- Recalculating late/absent in the browser from raw times. Use the server's per-row verdict, or a filtered list and the server's totals will disagree.
- Storing the same data under two different key shapes (e.g. one card keys by `from/to`, another by month): they will never share. Use the shared hooks only.
- Forgetting realtime: a check-in today must refresh today's month bucket. The socket handler invalidates `['attendance']`, which covers every month bucket.

### 3.6 Prefetch the next likely view (optional, after 3.1)
When the user is on "This week", prefetch "This month" with `queryClient.prefetchQuery` after the page settles, so the tab switch is instant.

---

## 4. What the backend is changing (no frontend work needed unless noted)

| Change | Effect for you |
|---|---|
| Classification batch loads each kind of data once for the whole list (was ~10 database queries per employee) | Same request and response; much faster |
| gzip compression on API responses | Transparent: the browser decompresses automatically |
| Short cache for branch settings / shifts / work calendar | Every attendance API gets faster |
| Index check on attendance and leave date filters | Faster range queries |
| Lean board response (fewer nested objects per punch) | **Response shape may change:** will be announced with the exact fields before it ships |
| Lean roster view (`fields=summary`) | **New option:** use it for name lists when it lands |
| `GET /attendance/records` (all-time totals) computed in SQL instead of loading the whole history | Same response; all-time totals stay cheap, so "All time" never needs every punch in the browser |
| Board rows keep the server's per-row verdict (`lateMark`, day kind) | Lets the browser filter a month bucket into a day without recalculating anything (section 3.5) |
| `GET /employee/all/filter-options` (old name `/all/facets` kept for now) | **Rename:** switch `constants/api-endpoint.ts` to the new path |

---

## 5. How to check the result

The backend repo has a Postman collection that times every Overview API:
`wisetech-backend/docs/postman/attendance-overview-bench.postman_collection.json` (+ the matching environment). Run it with 5 iterations before and after.

For the frontend changes, also check:
- **Network tab** on page load: count requests. Target: no URL appears twice for the same arguments.
- **Switch tabs/periods back and forth:** the second visit should show data immediately (served from cache), with at most a quiet background refresh.
- **Lighthouse / Performance panel:** time until the first card shows real data.

## 6. Order of work

1. `useLeaveManagementConfig` + `useAttendanceStats` (removes most duplicate calls on the personal page).
2. Admin board + range calendar + on-leave hooks, each card with its own skeleton; rows cached **by month** (section 3.5).
3. Classification summary hook with `keepPreviousData`.
4. Socket invalidation in one shared place.
5. Lean roster / `isActive=true` for pickers, then prefetching.

Housekeeping noticed while auditing: `personal/views/my-attendance/Daily.tsx.tmp.23824.db0eebc75b60` is a stray editor temp file and can be deleted.
