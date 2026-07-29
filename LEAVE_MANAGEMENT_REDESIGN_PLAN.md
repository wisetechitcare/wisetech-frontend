# Leave Management System — Glassmorphism Redesign Migration Plan

> **Goal:** migrate the entire leave-management UI onto the existing glassmorphism design
> kit (the "Sandwich Leave Rules" benchmark look) — **mobile-first**, consistent, reusable,
> and safe — one component per commit. This doc is the executable blueprint; nothing here
> changes app logic, only presentation.
>
> **Status legend:** ✅ done · 🟡 in progress · ⬜ todo

---

## 0. How to run this plan

1. Do **Phase 0** (extract the shared `patterns (app-wide UI kit)`) — the one prerequisite that makes every later step DRY.
2. Migrate **one surface per commit**, in the phase order below (mobile-critical first).
3. Each surface must pass the **Definition of Done** (§6) before moving on.
4. **Never take a file the user is actively editing** — hand-off first, to avoid clobbering.
5. Re-verify the full file set anytime with the discovery commands in §7.

---

## 1. Foundation — the kit already exists (REUSE, don't rebuild)

Everything below is already built and proven (Sandwich Leave + the 4 settings modals). Import, don't re-declare.

**Barrel:** `@app/modules/common/components/ui`
- `GlassDialog` — MUI Dialog, frosted `regular` Paper + blurred scrim + Apple scale-in, **full-screen on phones**.
- `GlassHeader` — gradient navy band (`#172554→#1E3A8A`) + 3px `#C0392B` accent stripe + icon tile + title/subtitle + close.
- `GlassSurface` — `variant="regular"` (real backdrop-filter) or `variant="thin"` (tint only).
- `GlassCard` — thin card w/ `preset`/`interactive`/`accentEdge`.
- `WtButton` (`tone`/`ghost`/`inverted`), `WtIconButton` (tinted, `color`+`title`).

**Tokens:** `@app/theme/tokens` (re-exported as `T`)
- `T.color.brand` `#1E3A8A` · `accent` `#C0392B` · `line` `#E6E9EE` · `vivid.{blue,green,purple,amber,rose,cyan,slate}`
- `T.glass`, `T.shadow`, `T.font`, `label(mode, tier)`

**The `TRIO` accent palette** (per tone `{c: fg, bg: fill, bd: border}`):
```
blue {c:'#2563eb',bg:'#eff6ff',bd:'#dbeafe'}  green {c:'#16a34a',bg:'#f0fdf4',bd:'#dcfce7'}
purple {c:'#7c3aed',bg:'#f5f3ff',bd:'#ede9fe'} amber {c:'#d97706',bg:'#fffbeb',bd:'#fde68a'}
rose {c:'#e11d48',bg:'#fff1f2',bd:'#fecdd3'}    cyan {c:'#0891b2',bg:'#ecfeff',bd:'#cffafe'}
slate {c:'#64748b',bg:'#f8fafc',bd:'#e2e8f0'}
```
Semantics: green=success/active · rose=danger/derived · amber=warning · blue=info · slate=neutral/inactive · purple=category.

---

## 2. Phase 0 (PREREQUISITE) — extract the shared `patterns (app-wide UI kit)`

`IconBox`, `StatusBadge`, `StatTile`, `Eyebrow`, `TRIO`, and the `EASE_200 / SHADOW_REST / SHADOW_HOVER`
constants are **copy-pasted** in `LeavePolicyModal`, `LeaveTypesBalanceModal`, `AddonLeavesModal`.
Extract them ONCE and export from the barrel, then have every leave surface import them.

- **New file:** `src/app/modules/common/components/ui/patterns (app-wide UI kit).tsx` exporting
  `TRIO`, `EASE_200`, `SHADOW_REST`, `SHADOW_HOVER`, `IconBox`, `StatusBadge`, `StatTile`, `Eyebrow`, `SectionHead`.
- Re-export from `ui/index.ts`.
- Refactor the 4 done modals to import from it (as each is handed off) — removes ~120 duplicated lines.

**Why first:** single source of truth = consistency across 45 components + one place to tune the look.

---

## 3. Design invariants — apply to EVERY surface

- **Glass rule (#1):** exactly ONE `regular` frosted surface per view (the Dialog Paper, or a page-level shell).
  Every card/row/tile/banner/footer is `variant="thin"` — **never a second `backdrop-filter`** (they stack, killing GPU perf, worst of all on mobile). Never hand-roll `backdropFilter`.
- **Mobile-first** (majority of users are mobile):
  - Dialogs: rely on `GlassDialog` `mobileFullScreen`.
  - Every size/padding/columns prop uses MUI breakpoint objects `{xs, sm, md}`.
  - Footers: full-width **stacked** buttons on `xs` (`flexDirection:{xs:'column-reverse',sm:'row'}`, button `width:{xs:'100%',sm:'auto'}`).
  - Prefer **tappable ± steppers** over raw number typing; ≥40px tap targets.
  - KPI/stat strips: avoid value truncation — 1-up or 2-up on `xs`, never a cramped 4-up.
  - Tables → **cards on `xs`, table on `md+`** (never horizontal-scroll a data table on a phone).
  - Content-first: don't push the primary action below a tall hero/stat block on small screens.
- **Tokens only** — `T.color` / `text.primary|secondary` / `divider` / `TRIO`. No ad-hoc hex.
- **A11y** — reduced-motion + reduced-transparency handled by `glassSx`; keep focus-visible on interactives; `WtIconButton title=` doubles as aria-label.
- **Logic is sacred** — restyle presentation ONLY. Do not change data fetching, mutations, Formik/React-Query wiring, validation, permissions/`readOnly`, or emitted events. (Leave + money integrity.)

---

## 4. Full inventory by area (with status)

### A. Settings — ✅ mostly done (the reference implementations)
| Component | Status |
|---|---|
| `AttendanceConfig/component/LeavePolicyModal.tsx` | ✅ (polished) |
| `AttendanceConfig/component/LeaveTypesBalanceModal.tsx` | ✅ (polished, mobile footer) |
| `AttendanceConfig/component/AddonLeavesModal.tsx` | ✅ |
| `company/settings/SandwhichLeave.tsx` | ✅ (benchmark) |
| `company/settings/LeavePolicy.tsx`, `AttendanceConfig/component/LeaveTypesBalance.tsx` | ✅ (shims) |
| `modules/common/components/AddonLeavesAllowanceCard.tsx` | ✅ **done** — `KTCard`/`card-custom`/`symbol`/`badge`/`alert`/`ki-duotone`/bootstrap-grid → `GlassCard`/`IconBox`/`StatusBadge`/responsive CSS grid |
| `company/settings/LeavesAndBlance.tsx` | ✅ **done** — react-bootstrap `Row`/`Col`/`Form.Control` → MUI grid + `TextField` + `WtButton`/`WtIconButton` |
| `company/organisationInfo/rule/components/LeaveAllowanceTable.tsx` | ⬜ (table→responsive) |

### B. Employee · My Leaves — Phase 1 (highest mobile traffic)
Dir: `employee/attendance/personal/views/my-leaves/` (+ `personal/MyLeaveView.tsx`, `personal/views/overview/LeaveOverview.tsx`)
| Component | Kind | Notes |
|---|---|---|
| `ApplyLeave.tsx` | flow | ✅ **ASSESSED — no migration needed.** Already fully on-benchmark (0 Bootstrap classes; navy gradient header, `#1E3A8A` accent, PJK display font, bespoke calendar). Full glass-kit rewrite = high risk / low upside; skipped per user decision. |
| `MyLeaveView.tsx` | shell/nav | ✅ **done** — `WtButton` + `IconBox`/`Eyebrow` header, dead commented blocks removed |
| `Leaves.tsx`, `PersonalLeaves.tsx` | shell/nav | ⬜ tabs/shell |
| `BalanceProgress.tsx` | balance viz | ✅ **done** — `GlassCard`/`SectionHead`/`WtButton` + TRIO tones; logic untouched |
| `LeaveBalanceItem.tsx` | balance viz | ✅ **done** — react-bootstrap `OverlayTrigger`/`Tooltip` + `bi` icon → MUI `Tooltip` + `KTIcon` |
| `BalanceGauge.tsx`, `Balances.tsx` | balance viz | ⬜ (0 Bootstrap classes — already non-laggard; optional polish) |
| `LeaveUsageGraph.tsx`, `MonthlyHeatmap.tsx`, `SmartInsightsPanel.tsx` | analytics | ⚰️ **DEAD CODE** (100% commented out, imports commented in `MyLeaveView`) — **skip, do not migrate** |
| `RangeStatBar.tsx` | analytics | ⚰️ **DEAD CODE** (0 importers) — **skip** |
| `MyLeaveManagementRequests.tsx` | list | ✅ **done** — `StatusBadge` type/status cells + `IconBox` header |
| `ConvertLeavesModal.tsx`, `EncashTransferLeavesModal.tsx` | modals | ✅ **done** — react-bootstrap `Modal` shell → `GlassDialog` (bodies already modern; responsive padding) |
| `MeetingsForm.tsx` | modal | 🚫 **OUT OF SCOPE** — it's a *meetings/calendar* form (used by `calendar/Meetings.tsx` + `CustomCalendar.tsx`), only lives in this folder by file-org accident; already partly on the kit (`T` tokens). Not a leave surface. |
| `Holidays.tsx` ✅, `Rules.tsx` ✅ | info | **done** — `KTCard` → `GlassCard` + `Divider` list |
| `FAQs.tsx` | info | ⬜ glass sections |
| `LeaveOverview.tsx` | page | overview shell |

### C. My-Team · Approvals — Phase 2 (managers on mobile)
Dirs: `my-team/Approvals/`, `approvals/`
| Component | Kind |
|---|---|
| `DomainApprovalQueue.tsx` ✅ | queue/shell — **done** (reject `Modal` → `GlassDialog`; react-bootstrap fully dropped from file) |
| `LeaveApprovals.tsx`, `Approvals/index.tsx` | queue/shell (0 Bootstrap classes — non-laggard) |
| `domains/LeaveDetail.tsx` | detail → `GlassDialog`/panel |
| `approvals/ApprovalStatusTracker.tsx` ✅ | tracker — **done** (loading `spinner-border` → MUI `CircularProgress`; renders inside the migrated glass dialogs) |
| `approvals/ApprovalAuditPanel.tsx` | ⚰️ **DEAD CODE** (0 importers) — **skip** |
| `AttendanceApprovals.tsx`, `ReimbursementApprovals.tsx`, `TaskApprovals.tsx`, `OtherApprovals.tsx`, `domains/ReimbursementDetail.tsx` | siblings (parity) |

### D. Admin · Overview — Phase 3
Dir: `employee/attendance/admin/views/overview/`
| Component | Kind |
|---|---|
| `Overview.tsx` | shell |
| `HRPendingLeaveRequests.tsx` ✅, `AllLeaveRequest.tsx` ✅, `LeaveManagementRequests.tsx` ✅ | **done** — `StatusBadge`/`WtIconButton`/`IconBox` cells, react-bootstrap `Modal`→`GlassDialog`, tinted type pills; `MaterialTable` + all logic untouched |
| `OpenLeaveRequests.tsx` ✅ | leave table — **done** (tinted type pills, `StatusBadge` "Awaiting Manager", `WtIconButton` approve/reject, `IconBox` header) |
| (attendance siblings for parity: `HRPendingAttendanceRequests`, `OpenAttendanceRequests`, `DailyAttendance`, `EditAttendanceRequest`, `AttendanceSyncConflicts`, `AttendanceRequestLimitReset`) | |

### E. Wizard / Rules — Phase 4
| Component | Kind |
|---|---|
| `employee/wizard/forms/LeaveAllocationStep.tsx` | wizard step | ✅ **done** — MUI `Table` + `GlassCard` banners + `StatusBadge`/`WtButton`; Formik wiring untouched |
| `employee/personal-rules/components/LeavesAllowanceSection.tsx`, `LeavesSection.tsx` | rule sections |

---

## 5. Per-surface recipe (the repeatable pattern)

**Modal/dialog surface**
```tsx
<GlassDialog open={open} onClose={onClose} maxWidth="md" fullWidth
  PaperProps={{ sx: { maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' } }}>
  <GlassHeader title="…" subtitle="…" icon={<KTIcon iconName="…" className="fs-1 text-white" />} onClose={onClose} />
  <Box sx={{ p: { xs: 2, sm: 3 }, overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
    <Grid container spacing={2}>{/* StatTile KPI strip — xs=12/6, md=3 */}</Grid>
    <Stack spacing={2.5}>{/* thin GlassSurface/GlassCard sections, TRIO-accented IconBox headers */}</Stack>
  </Box>
  <Box sx={{ px:{xs:2,sm:3}, py:2, borderTop:`1px solid ${T.color.line}`, display:'flex',
    justifyContent:'flex-end', gap:1.25, flexDirection:{xs:'column-reverse',sm:'row'} }}>
    <WtButton ghost onClick={onClose} sx={{ width:{xs:'100%',sm:'auto'} }}>Cancel</WtButton>
    <WtButton onClick={save} sx={{ width:{xs:'100%',sm:'auto'} }}>Save</WtButton>
  </Box>
</GlassDialog>
```

**Page surface** → one page-level `GlassSurface variant="regular"` shell (or a plain frosted panel), `Eyebrow`+title sections, `thin` `GlassCard`s inside.

**Table** → `useMediaQuery(down('md'))`: render a stack of `thin` cards on mobile, the MUI table on `md+`.

**Controls** → MUI `TextField/Select/Switch size="small"`; `WtButton` (primary/ghost/inverted); `WtIconButton` (tinted). Field label = `Typography` 13/600 above the control.

---

## 6. Definition of Done (per surface)

- [ ] Uses the glass kit + `patterns (app-wide UI kit)` helpers (no duplicated `IconBox`/`StatusBadge`/`TRIO`).
- [ ] Exactly one `regular` surface; everything else `thin`; zero hand-rolled `backdrop-filter`.
- [ ] Mobile pass: full-screen/stacked, `{xs,sm,md}` props, ≥40px targets, no truncated KPIs, tables→cards on `xs`.
- [ ] Tokens only; a11y (focus-visible, icon-button labels) intact.
- [ ] **Logic byte-for-byte unchanged** — same fetches/mutations/events/validation/permissions.
- [ ] Feature parity: all actions + loading/empty/error states + `readOnly`.
- [ ] `npx tsc --noEmit` clean **and** `npm run build` green.
- [ ] Verified in a mobile viewport (≤400px) and a desktop viewport.
- [ ] One focused commit.

---

## 7. Discovery — re-verify the full file set anytime

```bash
# every leave/approval component
npx tsc --noEmit   # baseline must be clean before starting
# enumerate surfaces:
#   my-leaves:  src/app/pages/employee/attendance/personal/views/my-leaves/*.tsx
#   approvals:  src/app/pages/my-team/Approvals/**/*.tsx  +  src/app/pages/approvals/*.tsx
#   admin:      src/app/pages/employee/attendance/admin/views/overview/*.tsx
#   settings:   src/app/pages/company/settings/*.tsx  +  AttendanceConfig/component/*Modal.tsx
# find any surface still on Bootstrap/Metronic classes (migration candidates):
grep -rlE "className=\"[^\"]*(btn |card |KTCard|badge |row |col-)" src/app/pages | grep -iE "leave|approv"
```

---

## 8. Rollout & safety

- **Order:** Phase 0 → A (finish settings) → B (My Leaves) → C (Approvals) → D (Admin) → E (Wizard/Rules).
- **One commit per surface**, message `redesign(leave): <surface> → glass (mobile-first)`; `tsc`+build green each.
- **Hand-off discipline:** only migrate a file the user has confirmed they're not editing.
- **No logic drift:** if a surface's data/permission wiring is unclear, migrate presentation only and leave the data path exactly as found.
- **Rollback:** each commit is self-contained and revertible; the kit change (Phase 0) is additive.

---

_Generated as the execution blueprint for the leave-management glassmorphism redesign. Update the
status column as surfaces land._
