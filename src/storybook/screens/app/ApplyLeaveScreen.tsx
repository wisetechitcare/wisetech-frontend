import { useMemo, useState, type FormEvent } from "react"
import { toast } from "sonner"
import {
  DateFormatter,
  getLocalTimeZone,
  today as todayIn,
  type CalendarDate,
  type DateValue,
} from "@internationalized/date"
import { Calculator, CalendarDays, CalendarPlus, Paperclip, TriangleAlert, UserCheck, Wallet } from "lucide-react"
import type { DayState } from "@/ds/ui/calendar"
import { CalendarLegend, RangeCalendar } from "@/ds/ui/calendar"
import { Alert, AlertDescription, AlertTitle } from "@/ds/ui/alert"
import { Badge } from "@/ds/ui/badge"
import { Button } from "@/ds/ui/button"
import { Card, CardContent } from "@/ds/ui/card"
import { Checkbox } from "@/ds/ui/checkbox"
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet, FieldTitle } from "@/ds/ui/field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ds/ui/select"
import { Textarea } from "@/ds/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/ds/ui/toggle-group"
import { BreakdownBar, type BreakdownSegment } from "@/ds/patterns/breakdown-bar"
import { DescriptionList } from "@/ds/patterns/description-list"
import { FormDialog } from "@/ds/patterns/form-dialog"
import { PersonCell } from "@/ds/patterns/person"
import { SectionHeader } from "@/ds/patterns/section-header"
import { LEAVE_APPROVER, LEAVE_BALANCES, LEAVE_DAILY_RATE, LEAVE_HOLIDAYS, LEAVE_TEAM_OFF } from "./fixtures"

type Range = { start: CalendarDate; end: CalendarDate }
type Session = "full" | "first" | "second"

const PAID_ORDER = LEAVE_BALANCES.map((b) => b.label.replace(/ Leave$/, "")).join(" → ")
const PAID_LEFT = LEAVE_BALANCES.reduce((sum, b) => sum + b.balance, 0)
const USING = [
  { value: "auto", label: "Auto · Paid First" },
  ...LEAVE_BALANCES.map((b) => ({ value: b.id, label: b.label })),
]
const SESSIONS: Array<{ value: Session; label: string }> = [
  { value: "full", label: "Full Day" },
  { value: "first", label: "First Half" },
  { value: "second", label: "Second Half" },
]
// The legend reads the same tones the grid paints (see getDayState) — one list, never two.
const LEGEND = [
  { label: "Today", today: true },
  { label: "Charged", tone: "warning" },
  { label: "Team Off", tone: "cyan", pattern: "dashed" as const },
  { label: "Holiday", tone: "rose" },
  { label: "Saturday", tone: "slate" },
  { label: "Sunday", tone: "rose" },
  { label: "Sandwich · Unpaid", tone: "amber", marker: true },
]

// TODO(date-format): route through the tenant date-format setting once it lands (FUTURE_ENHANCEMENTS.md).
const dateFormat = new DateFormatter("en-GB", { day: "numeric", month: "short", year: "numeric" })
const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })
const fmt = (d: CalendarDate) => dateFormat.format(d.toDate(getLocalTimeZone()))
const daysLabel = (n: number) => `${n} ${n === 1 ? "day" : "days"}`
const weekday = (d: CalendarDate) => d.toDate("UTC").getUTCDay()
const isOff = (d: CalendarDate) => weekday(d) === 0 || weekday(d) === 6 || LEAVE_HOLIDAYS.has(d.toString())

/**
 * The leave rules, in one pure function: working days in the range are charged; days off strictly between
 * two working days are sandwiched (unpaid); days off at either edge are left out. "Auto" fills the paid
 * balances in order and books the rest as unpaid (LOP). The live app computes this on the server.
 */
function planLeave(range: Range, using: string, firstHalf: Session, lastHalf: Session) {
  const days: CalendarDate[] = []
  for (let d = range.start; d.compare(range.end) <= 0; d = d.add({ days: 1 })) days.push(d)
  const working = days.map((d, i) => (isOff(d) ? -1 : i)).filter((i) => i !== -1)
  const firstWork = working[0] ?? -1
  const lastWork = working[working.length - 1] ?? -1
  const charged = new Set<string>()
  const sandwiched = new Set<string>()
  days.forEach((d, i) => {
    if (!isOff(d)) charged.add(d.toString())
    else if (i > firstWork && i < lastWork) sandwiched.add(d.toString())
  })
  const singleDay = firstWork !== -1 && firstWork === lastWork
  const halves = (firstHalf !== "full" ? 0.5 : 0) + (!singleDay && lastHalf !== "full" ? 0.5 : 0)
  const chargeable = Math.max(0, charged.size - (charged.size ? halves : 0))

  let remaining = chargeable
  const allocation: BreakdownSegment[] = LEAVE_BALANCES.filter((b) => using === "auto" || b.id === using).flatMap((b) => {
    const take = Math.min(b.balance, remaining)
    remaining -= take
    return take > 0 ? [{ label: b.label, value: take, tone: b.tone, display: daysLabel(take) }] : []
  })
  if (remaining > 0) {
    allocation.push({ label: "Unpaid (LOP)", value: remaining, tone: "danger", display: daysLabel(remaining), emphasis: true })
  }
  const unpaid = remaining + sandwiched.size
  return {
    calendarDays: days.length,
    excluded: days.length - charged.size - sandwiched.size,
    chargeable,
    singleDay,
    charged,
    sandwiched,
    allocation,
    paid: chargeable - remaining,
    unpaid,
    deduction: unpaid * LEAVE_DAILY_RATE,
  }
}

/** Fiscal year label for a date: April to March. */
function fiscalYear(d: CalendarDate) {
  const from = d.month >= 4 ? d.year : d.year - 1
  return `FY ${from}–${String(from + 1).slice(2)}`
}

/** One session row: the same Toggle Group for a single day and for each end of a range. */
function SessionRow({ id, title, value, onChange }: { id: string; title: string; value: Session; onChange: (s: Session) => void }) {
  return (
    <Field orientation="horizontal" className="flex-wrap justify-between gap-y-2">
      <FieldTitle id={id}>{title}</FieldTitle>
      <ToggleGroup
        aria-labelledby={id}
        variant="outline"
        size="sm"
        spacing={0}
        value={[value]}
        onValueChange={(v) => v[0] && onChange(v[0] as Session)}
      >
        {SESSIONS.map((s) => (
          <ToggleGroupItem key={s.value} value={s.value}>
            {s.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </Field>
  )
}

/**
 * Apply Leave, rebuilt from the kit: the live screen's layout and rules (paid-first allocation, sandwich,
 * half-day boundaries, unpaid acknowledgement, approval chain) on v2 parts. The calendar is the shared engine;
 * this screen only maps its rules to day tones through `getDayState`.
 */
export function ApplyLeaveScreen({
  open,
  onOpenChange,
  defaultRange = null,
  today = todayIn(getLocalTimeZone()),
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultRange?: Range | null
  /** Injected so stories stay stable; the app passes nothing. */
  today?: CalendarDate
}) {
  const [range, setRange] = useState<Range | null>(defaultRange)
  const [focused, setFocused] = useState<CalendarDate>(defaultRange?.start ?? today)
  const [using, setUsing] = useState("auto")
  const [firstHalf, setFirstHalf] = useState<Session>("full")
  const [lastHalf, setLastHalf] = useState<Session>("full")
  const [ack, setAck] = useState(false)
  const [remarks, setRemarks] = useState("")

  const plan = useMemo(
    () => (range ? planLeave(range, using, firstHalf, lastHalf) : null),
    [range, using, firstHalf, lastHalf],
  )

  // A new range starts clean: half days and the unpaid acknowledgement belong to the old one.
  const choose = (next: Range) => {
    setRange(next)
    setFocused(next.start)
    setFirstHalf("full")
    setLastHalf("full")
    setAck(false)
  }

  const getDayState = (date: DateValue): DayState | undefined => {
    const iso = date.toString()
    if (plan?.sandwiched.has(iso)) return { tone: "amber", marker: true, label: "Sandwich · Unpaid" }
    if (plan?.charged.has(iso)) return { tone: "warning", label: "Charged" }
    if (LEAVE_HOLIDAYS.has(iso)) return { tone: "rose", label: LEAVE_HOLIDAYS.get(iso) }
    if (LEAVE_TEAM_OFF.has(iso)) return { tone: "cyan", pattern: "dashed", label: LEAVE_TEAM_OFF.get(iso) }
    const dow = weekday(date as CalendarDate)
    if (dow === 0) return { tone: "rose", label: "Sunday" }
    if (dow === 6) return { tone: "slate", label: "Saturday" }
    return undefined
  }

  const hasDays = !!plan && plan.chargeable + plan.sandwiched.size > 0
  const needsAck = !!plan && plan.unpaid > 0
  const dates = !range ? null : range.start.compare(range.end) === 0 ? fmt(range.start) : `${fmt(range.start)} → ${fmt(range.end)}`

  function submit(event: FormEvent) {
    event.preventDefault()
    toast.success("Leave request submitted", { description: `${dates} · ${daysLabel(plan!.chargeable)}` })
    onOpenChange(false)
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      size="xl"
      icon={<CalendarPlus />}
      title="Apply for Leave"
      description={`${fiscalYear(today)} · April to March`}
      formId="apply-leave"
      submitLabel="Submit Request"
      submitDisabled={!hasDays || (needsAck && !ack)}
      dirty={!!range || remarks !== ""}
    >
      <form id="apply-leave" onSubmit={submit} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,21rem)]">
        <FieldGroup className="min-w-0">
          <Field>
            <FieldLabel id="apply-using-label">Apply Using</FieldLabel>
            <Select items={USING} value={using} onValueChange={(v) => v && setUsing(v as string)}>
              <SelectTrigger className="w-full" aria-labelledby="apply-using-label">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {USING.map((u) => (
                  <SelectItem key={u.value} value={u.value}>
                    {u.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldDescription>
              {using === "auto"
                ? `Fills ${PAID_ORDER} · ${daysLabel(PAID_LEFT)} paid left`
                : `${daysLabel(LEAVE_BALANCES.find((b) => b.id === using)!.balance)} left · the rest is unpaid`}
            </FieldDescription>
          </Field>

          <Card variant="panel" size="sm">
            <CardContent className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
                  {plan
                    ? `${daysLabel(plan.calendarDays)} · ${plan.chargeable} chargeable` +
                      (plan.excluded ? ` · ${plan.excluded} off excluded` : "")
                    : "Pick a start date, then an end date."}
                </p>
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => choose({ start: today, end: today })}>
                    Today
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => choose({ start: today.add({ days: 1 }), end: today.add({ days: 1 }) })}
                  >
                    Tomorrow
                  </Button>
                </div>
              </div>
              <RangeCalendar
                aria-label="Leave dates"
                size="lg"
                rangeStyle="outline"
                firstDayOfWeek="mon"
                value={range}
                onChange={(next) => next && choose(next as Range)}
                focusedValue={focused}
                onFocusChange={(d) => setFocused(d as CalendarDate)}
                getDayState={getDayState}
              />
              <CalendarLegend items={LEGEND} className="px-1" />
            </CardContent>
          </Card>

          {plan && plan.chargeable > 0 && (
            <FieldSet>
              <FieldLegend variant="label">{plan.singleDay ? "Session" : "Half-Day Boundary"}</FieldLegend>
              <FieldDescription>
                {plan.singleDay ? "Take the whole day or half of it." : "Optional: a half day on the first or last day."}
              </FieldDescription>
              {plan.singleDay ? (
                <SessionRow id="session-single" title="This Day" value={firstHalf} onChange={setFirstHalf} />
              ) : (
                <>
                  <SessionRow id="session-first" title="First Day" value={firstHalf} onChange={setFirstHalf} />
                  <SessionRow id="session-last" title="Last Day" value={lastHalf} onChange={setLastHalf} />
                </>
              )}
            </FieldSet>
          )}

          <Field>
            <FieldLabel htmlFor="leave-remarks">Remarks</FieldLabel>
            <Textarea id="leave-remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
          </Field>
          <Button type="button" variant="outline" className="w-fit">
            <Paperclip aria-hidden /> Attach Document
          </Button>
        </FieldGroup>

        <aside aria-label="Leave summary" className="space-y-3">
          <h3 className="heading-case text-xs text-muted-foreground">Leave Summary</h3>

          <Card size="sm">
            <CardContent className="space-y-4">
              <SectionHeader as="h3" title="Dates & Duration" icon={<CalendarDays />} />
              <DescriptionList
                columns={1}
                rows={[
                  { label: "Dates", value: dates },
                  { label: "Chargeable Days", value: plan ? daysLabel(plan.chargeable) : null, strong: true },
                ]}
              />
              {plan && plan.sandwiched.size > 0 && (
                <Alert variant="warning">
                  <TriangleAlert aria-hidden />
                  <AlertTitle>{daysLabel(plan.sandwiched.size)} sandwiched</AlertTitle>
                  <AlertDescription>
                    Weekend or holiday between your dates — unpaid under the sandwich rule. Not taken from your balance.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card size="sm">
            <CardContent className="space-y-4">
              <SectionHeader as="h3" title="How This Applies" icon={<Calculator />} />
              {plan && plan.chargeable > 0 ? (
                <BreakdownBar segments={plan.allocation} />
              ) : (
                <p className="text-sm text-muted-foreground">Select dates to see how this applies.</p>
              )}
            </CardContent>
          </Card>

          <Card size="sm" tone={needsAck ? "danger" : "success"}>
            <CardContent className="space-y-4">
              <SectionHeader
                as="h3"
                title="Financial Impact"
                icon={<Wallet />}
                tone={needsAck ? "danger" : "success"}
                description={!plan ? "Select dates to see impact" : needsAck ? `${daysLabel(plan.unpaid)} not covered` : "Fully covered by paid leave"}
              />
              <DescriptionList
                rows={[
                  { label: "Paid Days", value: plan ? plan.paid : null },
                  { label: "Unpaid Days", value: plan ? plan.unpaid : null },
                  { label: "Est. Salary Deduction", value: plan ? money.format(plan.deduction) : null, strong: true, wide: true },
                ]}
              />
              {needsAck && (
                <Field orientation="horizontal">
                  <Checkbox id="lop-ack" checked={ack} onCheckedChange={(v) => setAck(v === true)} />
                  {/* A sentence, not a title: the span opts out of the kit's Title Case. */}
                  <FieldLabel htmlFor="lop-ack">
                    <span>I understand {daysLabel(plan!.unpaid)} will be unpaid</span>
                  </FieldLabel>
                </Field>
              )}
            </CardContent>
          </Card>

          <Card size="sm">
            <CardContent className="space-y-4">
              <SectionHeader as="h3" title="Approval Flow" description="1 level" icon={<UserCheck />} />
              <div className="flex items-center justify-between gap-3">
                <PersonCell name={LEAVE_APPROVER.name} subtitle={LEAVE_APPROVER.role} />
                <Badge variant="info" className="shrink-0">Next to Review</Badge>
              </div>
            </CardContent>
          </Card>
        </aside>
      </form>
    </FormDialog>
  )
}
