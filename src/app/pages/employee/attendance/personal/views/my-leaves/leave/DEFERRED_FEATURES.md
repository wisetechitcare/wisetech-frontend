# Leave modal — deferred features

These items are intentionally **not** implemented in the enterprise revamp (Wave A/B) because required APIs or HR sign-off are missing.

| Feature | Blocker | When to add |
|---------|---------|-------------|
| Team conflict indicator | No peer/team leave calendar API in frontend | Backend: `GET /team/leaves?from=&to=` or manager calendar scope |
| Manager name on submit preview | No `reportingManager` on employee Redux model | Expose approver from approval workflow or employee profile |
| Save as Draft | No leave draft status/API | Backend: draft status + `POST`/`PATCH` draft endpoints |
| LOP / half-day / comp-off | `ILeaveRequest` has no duration/type fields | HR rules + schema migration |
| Carry-forward line in SmartBalanceCard | Not in branch config response today | Add to leave options or branch settings when available |

Policy link in sandwich banner defaults to `#` until HR provides URL (e.g. company handbook section).
