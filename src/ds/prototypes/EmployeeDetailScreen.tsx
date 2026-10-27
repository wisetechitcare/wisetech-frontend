import type { ReactNode } from "react"
import { ArrowLeft, Briefcase, Building2, CalendarDays, Mail, MapPin, MessageSquare, Pencil, Phone, ShieldCheck, Wallet } from "lucide-react"
import { Button } from "@/ds/ui/button"
import { Badge } from "@/ds/ui/badge"
import { Avatar, AvatarFallback } from "@/ds/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ds/ui/tabs"
import { Separator } from "@/ds/ui/separator"
import { initials, STATUS_META, type Person } from "./fixtures"

function InfoCard({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-xl border bg-card shadow-e1">
      <div className="flex items-center gap-2.5 border-b px-5 py-3.5">
        <span className="grid size-7 place-items-center rounded-md bg-accent text-accent-foreground [&>svg]:size-4">{icon}</span>
        <h2 className="text-body font-semibold">{title}</h2>
        <Button variant="ghost" size="icon" className="ml-auto size-7" aria-label={`Edit ${title}`}>
          <Pencil className="size-3.5" />
        </Button>
      </div>
      <dl className="divide-y px-5">{children}</dl>
    </section>
  )
}

function Row({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 text-body">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="text-right font-medium">{v || <span className="font-normal text-subtle-foreground">Not provided</span>}</dd>
    </div>
  )
}

const TIMELINE = [
  { when: "Today, 09:12", what: "Checked in at Mumbai HQ", tone: "success" as const },
  { when: "24 Oct", what: "Casual leave approved by Neha Iyer", tone: "info" as const },
  { when: "01 Oct", what: "Salary revision effective · CTC updated", tone: "brand" as const },
  { when: "12 Mar 2022", what: "Joined as MEP Engineer", tone: "neutral" as const },
]

export function EmployeeDetailScreen({ person, onBack }: { person: Person; onBack: () => void }) {
  const status = STATUS_META[person.status]
  return (
    <div className="space-y-6 p-6">
      <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2 text-muted-foreground">
        <ArrowLeft /> Employees
      </Button>

      <header className="relative overflow-hidden rounded-2xl border bg-card p-6 shadow-e1">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-r from-primary/15 via-primary/5 to-transparent" />
        <div className="relative flex flex-wrap items-center gap-5">
          <Avatar className="size-20 ring-4 ring-card">
            <AvatarFallback className="bg-primary text-headline font-semibold text-primary-foreground">{initials(person.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-headline font-semibold">{person.name}</h1>
              <Badge variant={status.variant} dot>
                {status.label}
              </Badge>
            </div>
            <p className="mt-0.5 text-body text-muted-foreground">
              {person.role} · {person.department} · <span className="tabular">{person.id}</span>
            </p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-label text-muted-foreground">
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
              <MessageSquare /> Message
            </Button>
            <Button>
              <Pencil /> Edit profile
            </Button>
          </div>
        </div>
      </header>

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

            <section className="rounded-xl border bg-card p-5 shadow-e1">
              <h2 className="text-body font-semibold">Activity</h2>
              <ol className="mt-4 space-y-4">
                {TIMELINE.map((t) => (
                  <li key={t.what} className="relative flex gap-3">
                    <Badge variant={t.tone} className="mt-0.5 size-2.5 shrink-0 rounded-full p-0" aria-hidden />
                    <div>
                      <p className="text-body">{t.what}</p>
                      <p className="text-label text-muted-foreground">{t.when}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <Separator className="my-4" />
              <div className="flex items-center gap-2 text-label text-muted-foreground">
                <ShieldCheck className="size-4 text-success" /> Profile 92% complete · 1 field missing
              </div>
            </section>
          </div>
        </TabsContent>
        {["attendance", "leave", "documents", "payroll"].map((t) => (
          <TabsContent key={t} value={t} className="mt-5">
            <div className="rounded-xl border border-dashed p-10 text-center text-body text-muted-foreground">
              The {t} tab uses the same List template as Employees.
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
