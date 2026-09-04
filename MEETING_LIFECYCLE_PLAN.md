# Meeting Lifecycle — Plan

Not built. This is the agreed shape for the next slice of meetings work, written down so the
decisions behind it survive the gap between now and starting.

Current state as of this document: meetings can be created (calendar, task board, project),
read (project / contact / employee, calendar + table), and deleted. Cost is computed at read
time from the invite list.

---

## 1. Editing a meeting

**Want:** clicking a meeting in the day modal opens the meeting dialog with that meeting
loaded, so it can be changed.

**State:** the API exists and is unused. `updateMeeting` has a service, a repository method
and a `PUT /meetings` route; nothing on the frontend calls any of it. `MeetingFormBody` is
create-only — no `meetingId`, no initial data, no edit mode.

**Constraint to settle first:** `MeetingsRepository.updateMeeting` refuses any caller who is
not the organizer. Either attendees get a read-only view of the dialog, or that rule changes.
It cannot be left implicit — an editable-looking form that 400s on save is worse than a form
that says it is read-only.

## 2. Cancellation as a state

**Want:** a cancelled meeting leaves the personal calendar but stays in the project's record,
because "how many meetings did this project schedule" is a different question from "what is on
my calendar this week".

**State:** impossible today. `Meetings` carries only `isActive`, and `deleteMeeting` is a hard
`prisma.meetings.delete` — the row is gone. Cancel and erase are currently the same act.

**Shape:** a real status on the meeting — `SCHEDULED` / `COMPLETED` / `CANCELLED`.

- Calendar / personal views read `SCHEDULED` + `COMPLETED`.
- The project's meeting record reads everything, and shows cancelled ones as such.
- Cancelling is a status write, not a delete. Deleting stays available for a mistake.

**Audit note:** every meeting query filters `isActive: true`, but nothing ever sets it false —
the hard delete got there first. That flag is dead weight. The status column should REPLACE
it, not sit beside it, or the next reader has two half-truths to reconcile.

## 3. Cost from timesheets, not from the invite list

The important one, and the reason the rest is worth doing.

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
| 1 | What marks a meeting `COMPLETED`? | Automatically once its end time passes. Less to forget than a button somebody has to press. |
| 2 | Where is time logged? | A "Log time" action on the meeting row — fewest clicks at the moment it matters. The alternative is a meeting picker in the existing timesheet screen. |
| 3 | Who may edit? | Organizer only, matching the API as it stands. Revisit if attendees complain. |
| 4 | Does cancelling need a reason? | Optional free text. Useful in a project record, friction if mandatory. |
| 5 | Finished meeting, no timesheets yet | "Awaiting timesheets", not ₹0. Zero reads as free; it is actually unrecorded, and the difference matters to whoever is reading the total. |

## Order of work

1. Schema: meeting `status`, `Timesheet.meetingId`. One migration.
2. Cancellation — status writes, and the read split between calendar and project record.
3. Edit mode on the meeting dialog.
4. Time logging against a meeting.
5. Rewire cost to timesheets, and delete the salary block it replaces.

Steps 1–3 stand alone. Step 5 must not land before step 4, or every meeting reads ₹0.
