import { CalendarDays, CheckCircle2, Clock, Gift, Plus, Receipt, Sparkles, UserPlus, Users, XCircle } from "lucide-react"
import { Button } from "@/ds/ui/button"
import { Badge } from "@/ds/ui/badge"
import { Avatar, AvatarFallback } from "@/ds/ui/avatar"
import { Progress } from "@/ds/ui/progress"
import { PageHeader } from "@/ds/patterns/page-header"
import { StatCard } from "@/ds/patterns/stat-card"
import { initials } from "./fixtures"

const APPROVALS = [
  { who: "Diya Nair", what: "Casual leave · 28–30 Oct", meta: "3 days · balance after 3.0", icon: <CalendarDays /> },
  { who: "Rohan Mehta", what: "Attendance correction · 24 Oct", meta: "Check-in 09:05 → 08:52", icon: <Clock /> },
  { who: "Meera Joshi", what: "Travel reimbursement", meta: "₹ 4,860 · 3 receipts", icon: <Receipt /> },
]

const ATTENDANCE = [
  { label: "Present", value: 212, cls: "bg-success" },
  { label: "Remote", value: 14, cls: "bg-primary" },
  { label: "On leave", value: 13, cls: "bg-info" },
  { label: "Late", value: 6, cls: "bg-warning" },
  { label: "Absent", value: 3, cls: "bg-destructive" },
]
const TOTAL = ATTENDANCE.reduce((s, a) => s + a.value, 0)

export function DashboardScreen() {
  return (
    <div className="space-y-6 p-6">
      <PageHeader
        eyebrow="Monday, 27 October"
        title="Good morning, Zakaullah"
        description="Here's what needs you today across WiseTech MEP Consultants."
        actions={
          <>
            <Button variant="outline">
              <CalendarDays /> Apply leave
            </Button>
            <Button>
              <UserPlus /> Add employee
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Headcount" value="248" icon={<Users />} trend={{ direction: "up", value: "4.2%", good: true }} hint="vs September" />
        <StatCard label="Present today" value="212" icon={<CheckCircle2 />} hint="85% of active staff" />
        <StatCard label="Pending approvals" value="17" icon={<Clock />} trend={{ direction: "up", value: "5 overdue", good: false }} />
        <StatCard label="Open roles" value="9" icon={<UserPlus />} hint="42 candidates in pipeline" />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        {/* Needs you */}
        <section className="rounded-xl border bg-card shadow-e1 xl:col-span-2">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <div>
              <h2 className="text-title font-semibold">Needs your decision</h2>
              <p className="text-label text-muted-foreground">Oldest first · decide without leaving the dashboard</p>
            </div>
            <Button variant="ghost" size="sm">
              View all 17
            </Button>
          </div>
          <ul className="divide-y">
            {APPROVALS.map((a) => (
              <li key={a.what} className="flex flex-wrap items-center gap-4 px-5 py-3.5 transition-colors hover:bg-muted/50">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground [&>svg]:size-4">
                  {a.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body font-medium">
                    {a.who} <span className="font-normal text-muted-foreground">· {a.what}</span>
                  </p>
                  <p className="text-label text-muted-foreground">{a.meta}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">
                    <XCircle /> Decline
                  </Button>
                  <Button size="sm">
                    <CheckCircle2 /> Approve
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Attendance */}
        <section className="rounded-xl border bg-card p-5 shadow-e1">
          <div className="flex items-baseline justify-between">
            <h2 className="text-title font-semibold">Attendance today</h2>
            <Badge variant="success" dot>
              Live
            </Badge>
          </div>
          <div className="mt-4 flex h-3 overflow-hidden rounded-full" role="img" aria-label="Attendance distribution">
            {ATTENDANCE.map((a) => (
              <span key={a.label} className={a.cls} style={{ width: `${(a.value / TOTAL) * 100}%` }} />
            ))}
          </div>
          <ul className="mt-4 space-y-2.5">
            {ATTENDANCE.map((a) => (
              <li key={a.label} className="flex items-center gap-2.5 text-body">
                <span className={`size-2.5 rounded-full ${a.cls}`} />
                <span className="flex-1 text-muted-foreground">{a.label}</span>
                <span className="tabular font-medium">{a.value}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="rounded-xl border bg-card p-5 shadow-e1">
          <h2 className="text-title font-semibold">Onboarding this week</h2>
          <ul className="mt-4 space-y-4">
            {[
              ["Ishaan Verma", "Site Engineer", 80],
              ["Tara Menon", "HR Associate", 45],
            ].map(([n, r, p]) => (
              <li key={n as string} className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback className="bg-accent text-accent-foreground">{initials(n as string)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body font-medium">{n}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <Progress value={p as number} className="h-1.5" aria-label={`${n} onboarding`} />
                    <span className="tabular text-label text-muted-foreground">{p}%</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border bg-card p-5 shadow-e1">
          <h2 className="text-title font-semibold">Coming up</h2>
          <ul className="mt-4 space-y-3 text-body">
            <li className="flex items-center gap-3">
              <span className="grid size-8 place-items-center rounded-lg bg-warning-soft text-warning-foreground">
                <Gift className="size-4" />
              </span>
              <span className="flex-1">Meera Joshi's birthday</span>
              <span className="text-label text-muted-foreground">Tomorrow</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="grid size-8 place-items-center rounded-lg bg-info-soft text-info-foreground">
                <CalendarDays className="size-4" />
              </span>
              <span className="flex-1">Diwali — office closed</span>
              <span className="text-label text-muted-foreground">1 Nov</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="grid size-8 place-items-center rounded-lg bg-success-soft text-success-foreground">
                <Receipt className="size-4" />
              </span>
              <span className="flex-1">October payroll run</span>
              <span className="text-label text-muted-foreground">31 Oct</span>
            </li>
          </ul>
        </section>

        <section className="relative overflow-hidden rounded-xl border bg-card p-5 shadow-e1">
          <div className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-primary/10 blur-2xl" />
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-2 py-0.5 text-label font-medium text-accent-foreground">
            <Sparkles className="size-3.5" /> Suggested
          </span>
          <h2 className="mt-3 text-title font-semibold">3 people near their leave cap</h2>
          <p className="mt-1 text-body text-muted-foreground">
            Encourage them to plan time off before year-end — unused leave over the carry-forward limit lapses.
          </p>
          <Button variant="outline" size="sm" className="mt-4">
            <Plus /> Send reminder
          </Button>
        </section>
      </div>
    </div>
  )
}
