# Meeting Lifecycle — Plan

**Steps 1–3 are built.** Steps 4 and 5 are not. This document is kept as the record of why
the decisions were made, and of what is left.

| Step | State |
|------|-------|
| 1. Schema — meeting `status`, `Timesheet.meetingId` | **done** (`20260904090000_meeting_lifecycle`) |
| 2. Cancellation as a state | **done** |
| 3. Editing a meeting | **done** |
| 4. Logging time against a meeting | not started |
| 5. Cost from timesheets, deleting the salary block | not started — must not land before 4 |

Cost is still computed at read time from the invite list. That is wrong for the reasons in
§3 below, and stays wrong until steps 4 and 5 land together.

---

## 1. Editing a meeting — DONE

**Want:** clicking a meeting in the day modal opens the meeting dialog with that meeting
loaded, so it can be changed.

**State:** the API exists and is unused. `updateMeeting` has a service, a repository method
and a `PUT /meetings` route; nothing on the frontend calls any of it. `MeetingFormBody` is
create-only — no `meetingId`, no initial data, no edit mode.

**Settled:** organizer-only, matching the API as it stands. The dialog takes an `editing`
prop and the caller decides whether to offer it. A save the API refuses says so in the form's
own words rather than surfacing a raw 400.

## 2. Cancellation as a state — DONE

**Want:** a cancelled meeting leaves the personal calendar but stays in the project's record,
because "how many meetings did this project schedule" is a different question from "what is on
my calendar this week".

**State:** impossible today. `Meetings` carries only `isActive`, and `deleteMeeting` is a hard
`prisma.meetings.delete` — the row is gone. Cancel and erase are currently the same act.

**Shape:** a real status on the meeting — `SCHEDULED` / `COMPLETED` / `CANCELLED`.

- Calendar / personal views read `SCHEDULED` + `COMPLETED`.
- The project's meeting record reads everything, and shows cancelled ones as such.
- Cancelling is a status write, not a delete. Deleting stays available for a mistake.

**Audit note:** every meeting query filtered `isActive: true`, but nothing ever set it false —
the hard delete got there first. The column was dropped rather than deprecated, after
verifying all 15 rows were `is_active = 1`: it carried no information to migrate.

**Built differently from this plan in one place, deliberately.** `COMPLETED` is DERIVED from
the clock, never written. "A meeting is over once its end time passes" is a fact about the
time, so a stored flag could only be a cached copy of it — needing a cron to maintain, and
wrong until that cron next ran. The column holds only `SCHEDULED` or `CANCELLED`, and
`meetingLifecycle()` says which of the three a reader is looking at. Nothing to keep in step,
so nothing can drift.

## 3. Cost from timesheets, not from the invite list — NOT STARTED

The important one, and the reason the rest is worth doing. The schema for it is in place
(`Timesheet.meetingId`); nothing reads or writes it yet.

**Today:** cost is computed at read time as `duration × Σ(hourly rate of everyone invited)`.
Two things are wrong with that. Half an invited team does not attend, so the number is
fiction. And a meeting scheduled for next March already counts as money spent.

**Want:**

```
created (calendar | task board | project)
    ↓
happens
    ↓
whoever ATTENDED logs time against it
    ↓
cost = Σ(those timesheets)
```

So an upcoming meeting has no cost at all, and a finished one costs what its attendees
actually claimed. Attendance stops being a list anyone maintains — it is whoever logged time.

**State:** `Timesheet` already carries `leadId`, `projectId`, `taskId`, `employeeId`,
start/end, `billable` and h/m/s. It has no `meetingId`. That one nullable column plus its
relation is the whole schema change.

**What this DELETES.** The meeting analytics endpoint currently carries its own salary-history
lookup, its own rate derivation and its own working-hours resolution — the fourth copy of that
formula in the backend, flagged in a `ponytail:` comment when it was written. Sourcing cost
from timesheets removes all of it: the existing timesheet cost path already does hourly rates,
the `finance.view` gate and billable handling. Meeting cost becomes "sum the timesheets where
`meetingId = X`", and one formula serves both screens instead of two that can drift apart.

This requirement is a net subtraction. Build it that way — if the salary block is still there
afterwards, the job is not finished.

---

## Decisions still open

| # | Question | Recommended first cut |
|---|----------|----------------------|
| 1 | ~~What marks a meeting `COMPLETED`?~~ | **Settled:** derived from the end time at read. No stored flag, no cron. |
| 2 | Where is time logged? | A "Log time" action on the meeting row — fewest clicks at the moment it matters. The alternative is a meeting picker in the existing timesheet screen. |
| 3 | ~~Who may edit?~~ | **Settled:** organizer only, enforced server-side. |
| 4 | ~~Does cancelling need a reason?~~ | **Settled:** optional free text, prompted on cancel. |
| 5 | Finished meeting, no timesheets yet | "Awaiting timesheets", not ₹0. Zero reads as free; it is actually unrecorded, and the difference matters to whoever is reading the total. |

## Order of work

1. ~~Schema: meeting `status`, `Timesheet.meetingId`. One migration.~~ **done**
2. ~~Cancellation — status writes, and the read split between calendar and project record.~~ **done**
3. ~~Edit mode on the meeting dialog.~~ **done**
4. Time logging against a meeting.
5. Rewire cost to timesheets, and delete the salary block it replaces.

Step 5 must not land before step 4, or every meeting reads ₹0.

---

## Note for whoever does steps 4–5

`tsc` will NOT catch a removed or renamed Prisma field once the object literal carries at
least one other valid field:

```
{ isActive: true }                  -> error
{ isActive: true, projectId: 'x' }  -> NO error
{ nope: true }                      -> error
```

Every real query has other fields, so all four `isActive` filters compiled cleanly while
being broken at runtime. This is the same gap that shipped a `companyLogo` select against a
column actually named `logo`, and 500'd every lead fetch. When changing Prisma fields: grep
for the old name, and RUN the queries. A green typecheck proves nothing here.
