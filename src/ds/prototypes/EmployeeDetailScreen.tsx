import type { ReactNode } from "react"
import { ArrowLeft, Briefcase, Building2, CalendarDays, Mail, MapPin, MessageSquare, Pencil, Phone, ShieldCheck, Wallet } from "lucide-react"
import { Button } from "@/ds/ui/button"
import { Badge } from "@/ds/ui/badge"
import { Avatar, AvatarFallback } from "@/ds/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ds/ui/tabs"
import { Card, CardAction, CardContent, CardFooter, CardHeader, CardTitle } from "@/ds/ui/card"
import { EmptyState } from "@/ds/patterns/empty-state"
import { initials, STATUS_META, type Person } from "./fixtures"

function InfoCard({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <Card size="sm">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2.5">
          <span className="grid size-7 place-items-center rounded-xl bg-accent text-accent-foreground [&>svg]:size-4">{icon}</span>
          <h2>{title}</h2>
        </CardTitle>
        <CardAction>
          <Button variant="ghost" size="icon-sm" aria-label={`Edit ${title}`}>
            <Pencil />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <dl className="divide-y">{children}</dl>
      </CardContent>
    </Card>
  )
}

function Row({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="text-right font-medium">{v || <span className="font-normal text-muted-foreground">Not provided</span>}</dd>
    </div>
  )
}

const TIMELINE = [
  { when: "Today, 09:12", what: "Checked in at Mumbai HQ", dot: "bg-success" },
  { when: "24 Oct", what: "Casual leave approved by Neha Iyer", dot: "bg-info" },
  { when: "01 Oct", what: "Salary revision effective · CTC updated", dot: "bg-primary" },
  { when: "12 Mar 2022", what: "Joined as MEP Engineer", dot: "bg-muted-foreground" },
]

export function EmployeeDetailScreen({ person, onBack }: { person: Person; onBack: () => void }) {
  const status = STATUS_META[person.status]
  return (
    <div className="space-y-6 p-6">
      <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2 text-muted-foreground">
        <ArrowLeft data-icon="inline-start" /> Employees
      </Button>

      <Card className="relative">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-r from-primary/15 via-primary/5 to-transparent" />
        <CardContent className="relative flex flex-wrap items-center gap-5">
          <Avatar size="lg" className="size-20 ring-4 ring-card">
            <AvatarFallback className="bg-primary text-2xl font-semibold text-primary-foreground">{initials(person.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold">{person.name}</h1>
              <Badge variant={status.variant} dot>
                {status.label}
              </Badge>
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {person.role} · {person.department} · <span className="tabular">{person.id}</span>
            </p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Mail className="size-3.5" /> {person.email}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Phone className="size-3.5" /> +91 98xxx xx210
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-3.5" /> {person.location}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <MessageSquare data-icon="inline-start" /> Message
            </Button>
            <Button>
              <Pencil data-icon="inline-start" /> Edit profile
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="leave">Leave</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="payroll">Payroll</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-5">
          <div className="grid gap-6 xl:grid-cols-3">
            <div className="grid gap-6 md:grid-cols-2 xl:col-span-2">
              <InfoCard title="Employment" icon={<Briefcase />}>
                <Row k="Date of joining" v={person.joined} />
                <Row k="Reporting manager" v={person.manager} />
                <Row k="Employment type" v="Full-time" />
                <Row k="Work mode" v="Office" />
              </InfoCard>
              <InfoCard title="Organisation" icon={<Building2 />}>
                <Row k="Department" v={person.department} />
                <Row k="Branch" v={`${person.location} HQ`} />
                <Row k="Designation" v={person.role} />
                <Row k="Grade" v="" />
              </InfoCard>
              <InfoCard title="Leave" icon={<CalendarDays />}>
                <Row k="Balance" v={<span className="tabular">{person.leave.toFixed(1)} days</span>} />
                <Row k="Taken this year" v={<span className="tabular">8.5 days</span>} />
                <Row k="Next holiday" v="Diwali · 1 Nov" />
              </InfoCard>
              <InfoCard title="Compensation" icon={<Wallet />}>
                <Row k="Pay cycle" v="Monthly" />
                <Row k="Last payslip" v="September 2026" />
                <Row k="Bank" v="Verified" />
              </InfoCard>
            </div>

            <Card size="sm">
              <CardHeader>
                <CardTitle>
                  <h2>Activity</h2>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-4">
                  {TIMELINE.map((t) => (
                    <li key={t.what} className="flex gap-3">
                      <span className={`mt-1.5 size-2.5 shrink-0 rounded-full ${t.dot}`} aria-hidden />
                      <div>
                        <p>{t.what}</p>
                        <p className="text-xs text-muted-foreground">{t.when}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </CardContent>
              <CardFooter className="gap-2 border-t text-xs text-muted-foreground">
                <ShieldCheck className="size-4 text-success" /> Profile 92% complete · 1 field missing
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
        {["attendance", "leave", "documents", "payroll"].map((t) => (
          <TabsContent key={t} value={t} className="mt-5">
            <EmptyState title={`${t[0].toUpperCase()}${t.slice(1)}`} description="This tab uses the same List template as Employees." />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
