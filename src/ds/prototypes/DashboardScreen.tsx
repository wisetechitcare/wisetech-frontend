import { CalendarDays, CheckCircle2, Clock, Gift, Plus, Receipt, Sparkles, UserPlus, Users, XCircle } from "lucide-react"
import { Button } from "@/ds/ui/button"
import { Badge } from "@/ds/ui/badge"
import { Avatar, AvatarFallback } from "@/ds/ui/avatar"
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/ds/ui/card"
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from "@/ds/ui/item"
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

const COMING_UP = [
  { label: "Meera Joshi's birthday", when: "Tomorrow", icon: <Gift />, tone: "bg-warning-soft text-warning-foreground" },
  { label: "Diwali — office closed", when: "1 Nov", icon: <CalendarDays />, tone: "bg-info-soft text-info-foreground" },
  { label: "October payroll run", when: "31 Oct", icon: <Receipt />, tone: "bg-success-soft text-success-foreground" },
]

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
              <CalendarDays data-icon="inline-start" /> Apply leave
            </Button>
            <Button>
              <UserPlus data-icon="inline-start" /> Add employee
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
        <Card className="xl:col-span-2">
          <CardHeader className="border-b">
            <CardTitle>
              <h2>Needs your decision</h2>
            </CardTitle>
            <CardDescription>Oldest first · decide without leaving the dashboard</CardDescription>
            <CardAction>
              <Button variant="ghost" size="sm">
                View all 17
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="px-2">
            {/* ItemGroup is role="list"; each Item is a listitem. */}
            <ItemGroup className="gap-1">
              {APPROVALS.map((a) => (
                <Item key={a.what} role="listitem" size="sm">
                  <ItemMedia variant="icon" className="size-9 rounded-xl bg-accent text-accent-foreground">
                    {a.icon}
                  </ItemMedia>
                  <ItemContent className="min-w-0">
                    <ItemTitle>
                      {a.who} <span className="font-normal text-muted-foreground">· {a.what}</span>
                    </ItemTitle>
                    <ItemDescription>{a.meta}</ItemDescription>
                  </ItemContent>
                  <ItemActions>
                    <Button size="sm" variant="outline">
                      <XCircle data-icon="inline-start" /> Decline
                    </Button>
                    <Button size="sm">
                      <CheckCircle2 data-icon="inline-start" /> Approve
                    </Button>
                  </ItemActions>
                </Item>
              ))}
            </ItemGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Attendance today</h2>
            </CardTitle>
            <CardAction>
              <Badge variant="success" dot>
                Live
              </Badge>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex h-3 overflow-hidden rounded-full" role="img" aria-label="Attendance distribution">
              {ATTENDANCE.map((a) => (
                <span key={a.label} className={a.cls} style={{ width: `${(a.value / TOTAL) * 100}%` }} />
              ))}
            </div>
            <ul className="space-y-2.5">
              {ATTENDANCE.map((a) => (
                <li key={a.label} className="flex items-center gap-2.5">
                  <span className={`size-2.5 rounded-full ${a.cls}`} />
                  <span className="flex-1 text-muted-foreground">{a.label}</span>
                  <span className="tabular font-medium">{a.value}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Onboarding this week</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ItemGroup className="gap-1">
              {(
                [
                  ["Ishaan Verma", 80],
                  ["Tara Menon", 45],
                ] as const
              ).map(([n, p]) => (
                <Item key={n} role="listitem" size="xs" className="px-0">
                  <ItemMedia>
                    <Avatar>
                      <AvatarFallback className="bg-accent text-accent-foreground">{initials(n)}</AvatarFallback>
                    </Avatar>
                  </ItemMedia>
                  <ItemContent>
                    <ItemTitle>{n}</ItemTitle>
                    <div className="flex items-center gap-2">
                      <Progress value={p} aria-label={`${n} onboarding`} className="flex-1" />
                      <span className="tabular text-xs text-muted-foreground">{p}%</span>
                    </div>
                  </ItemContent>
                </Item>
              ))}
            </ItemGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Coming up</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ItemGroup className="gap-1">
              {COMING_UP.map((c) => (
                <Item key={c.label} role="listitem" size="xs" className="px-0">
                  <ItemMedia variant="icon" className={`size-8 rounded-xl ${c.tone}`}>
                    {c.icon}
                  </ItemMedia>
                  <ItemContent>
                    <ItemTitle className="font-normal">{c.label}</ItemTitle>
                  </ItemContent>
                  <ItemActions className="text-xs text-muted-foreground">{c.when}</ItemActions>
                </Item>
              ))}
            </ItemGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>
              <Badge variant="brand">
                <Sparkles data-icon="inline-start" /> Suggested
              </Badge>
            </CardDescription>
            <CardTitle>
              <h2>3 people near their leave cap</h2>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            Encourage them to plan time off before year-end — unused leave over the carry-forward limit lapses.
          </CardContent>
          <CardFooter>
            <Button variant="outline" size="sm">
              <Plus data-icon="inline-start" /> Send reminder
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
