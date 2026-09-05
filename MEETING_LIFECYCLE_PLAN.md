# Meeting Lifecycle — Plan

**All five steps are built.** This document is kept as the record of why the decisions were
made.

| Step | State |
|------|-------|
| 1. Schema — meeting `status`, `Timesheet.meetingId` | **done** (`20260904090000_meeting_lifecycle`) |
| 2. Cancellation as a state | **done** |
| 3. Editing a meeting | **done** |
| 4. Logging time against a meeting | **done** |
| 5. Cost from timesheets, deleting the salary block | **done** — landed together with 4 |
| 6. Reminders to log time | **done** (added later, see §7) |

Cost now comes from timesheets. An upcoming meeting has no cost; a held meeting nobody has
logged reads **Awaiting timesheets**, not ₹0 — zero says "free" when the truth is
"unrecorded", and the difference matters to whoever is reading the total.

Everything below the line in §6 was NOT in the original plan. It came out of using the thing
and is recorded so the next reader knows why it exists.

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

## 3. Cost from timesheets, not from the invite list — DONE

The important one, and the reason the rest was worth doing.

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

**Built, and it did subtract.** The salary-history resolution, the per-date rate derivation and
the working-hours lookup are gone from the analytics endpoint; cost is the sum of timesheets
carrying that `meetingId`. Attendance is no longer a list anybody maintains: whoever logs time
was there.

Two rules the implementation settled:

- **One timesheet per person per meeting**, updated on a re-log rather than appended. A second
  entry for the same person in the same meeting can only be a correction, and treating a
  correction as extra attendance would double what the meeting cost.
- **Only people ON the meeting may log against it.** Somebody uninvited claiming time is either
  a mistake or a story the project's cost should not have to carry.

---

## Decisions still open

| # | Question | Recommended first cut |
|---|----------|----------------------|
| 1 | ~~What marks a meeting `COMPLETED`?~~ | **Settled:** derived from the end time at read. No stored flag, no cron. |
| 2 | ~~Where is time logged?~~ | **Settled:** a "Log time" action on the meeting row, in both the table and the day modal. The form opens pre-filled with the meeting's scheduled length, so the ordinary case is one button. |
| 3 | ~~Who may edit?~~ | **Settled:** organizer only, enforced server-side. |
| 4 | ~~Does cancelling need a reason?~~ | **Settled:** optional free text, prompted on cancel. |
| 5 | ~~Finished meeting, no timesheets yet~~ | **Settled:** "Awaiting timesheets", not ₹0 — an amber tag on the meeting, a count on the cost card, and a line under it saying those meetings are not in the total. |

## Order of work

1. ~~Schema: meeting `status`, `Timesheet.meetingId`. One migration.~~ **done**
2. ~~Cancellation — status writes, and the read split between calendar and project record.~~ **done**
3. ~~Edit mode on the meeting dialog.~~ **done**
4. ~~Time logging against a meeting.~~ **done**
5. ~~Rewire cost to timesheets, and delete the salary block it replaces.~~ **done**

Steps 4 and 5 landed together, as the plan required.

---

## 7. Reminders to log time

Added after the plan: an in-app notification asking people to log the time they spent.

**"Notify whoever attended" cannot be taken literally**, because attendance is DERIVED from
the timesheets the notice exists to collect — nobody has attended until somebody logs. So it
goes to the people who were ON the meeting, and whoever answers by logging is thereby recorded
as having been there. Anyone who has already logged is skipped: a reminder to do what you have
done is noise.

**It cannot send twice.** The notification's own `path` carries the meeting id, so "has this
person already been asked about this meeting" is a query, not a flag somebody maintains. The
whole sweep is therefore safe to re-run — a crash halfway, or two workers racing, can only
produce the notices that were missing.

Daily at 19:00 IST, bounded to meetings that ended in the last 30 days. A reminder landing
mid-afternoon competes with the work it is asking you to account for, and a meeting nobody
logged two months ago will not be logged because of a notification — asking forever is how
people learn to dismiss this app's notices unread.

---

## 6. Built after the plan was written

None of this was planned; all of it came from using the feature. Recorded because the reasons
are not obvious from the diff.

**The notice says what it is.** An update used to send the invitation template, so somebody who
already had the meeting got a second "MEETING INVITATION" and had to compare times to work out
what changed. Now INVITATION / RESCHEDULED / UPDATED, subject and body from one source.
RESCHEDULED is reserved for a change of TIME — telling somebody their meeting moved when only
its title changed is the same disservice pointed the other way.

**Sending is a decision, and so is the audience.** Every save mailed every participant. A new
meeting still defaults to sending; an EDIT defaults to not, because fixing a typo should not
mail five people. Recipients are chosen from the meeting's own people (internal and external —
excluding the externals would mean the one group who cannot opt out is the one outside the
company), and travel as ids, never addresses.

**Who may change a meeting: organizer OR a manager of its project.** Organizer-only was too
tight to use — a project manager rearranging their own project's week could not touch a single
one of its meetings. A meeting on a project belongs to the project, not to whoever typed it in.
A meeting with no project stays organizer-only. Deleting is deliberately still organizer-only:
cancelling exists so that destroying a record stays rare.

**Drag a meeting to another day.** The DAY moves, the clock never does — a month cell says
nothing about the hour, so reading one out of the drop would be inventing it. Duration is
preserved rather than the end pinned to the same day, so a meeting running past midnight keeps
its length, and the shift is computed in whole days so DST cannot move the time. No email on a
drag: it is a quick correction, and mailing on every nudge is how people learn to ignore
meeting mail.

**Cards read earliest-first.** The server returns a lane hand-arranged with newest-created as
the tie-break, which answers "what did somebody drag where", not "what is next" — so a Monday
task sat under a Wednesday one. Ordering is client-side and a control in the filter drawer
(Earliest / Latest / As arranged). Undated cards sink; ties are stable. Within-lane dragging is
withdrawn unless the order is "As arranged", because a hand-arrangement a date sort overrides
is a gesture that lies.

**The same actions in every view.** Edit / cancel / delete existed only in the table, and the
project's Meetings tab had no actions at all — so what a meeting could do depended on which
screen you were looking at it from. One list component, one set of actions, both screens.

**Project scoping asks the right question.** The picker was using the task board's project
endpoint, which is gated behind a `tasks.view` scope and also includes projects of tasks merely
assigned to you — so it hid projects from people without task permissions and offered ones they
are not on. Its own endpoint now: internal-team member, or project manager.

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

**Do not run `prisma migrate dev` here.** This schema carries pre-existing drift, so Prisma's
diff captures unrelated changes (a `lead_sequences` enum, FULLTEXT indexes it re-emits, a
case-only rename that generates a DROP TABLE) and files them under whatever name you gave your
migration. Hand-author the SQL and apply with `migrate deploy`, as every migration in this repo
already does and says.

**Transport fields must not reach Prisma.** Both meeting write paths spread their payload
straight into `data`, so a field that is not a column throws "Unknown argument" and surfaces as
a 500 reading "Bad request" — naming neither the field nor the cause. `splitMeetingPayload`
strips them in one place; add new ones there.

**A catch-all error message is a lie waiting to happen.** A reschedule failure was reported as
"Only the organizer can" for every possible cause, which sent an afternoon chasing a permission
bug that was actually the Prisma one above. The server states why it refused; repeat that.
