import { useState } from "react"
import { toast } from "sonner"
import { ArrowLeft, CalendarDays, Info, Send } from "lucide-react"
import { Button } from "@/ds/ui/button"
import { Badge } from "@/ds/ui/badge"
import { Input } from "@/ds/ui/input"
import { Label } from "@/ds/ui/label"
import { Switch } from "@/ds/ui/switch"
import { cn } from "@/ds/lib/utils"

const TYPES = [
  { id: "casual", label: "Casual", balance: 6, tone: "bg-primary" },
  { id: "sick", label: "Sick", balance: 4.5, tone: "bg-info" },
  { id: "earned", label: "Earned", balance: 12, tone: "bg-success" },
] as const

const REQUESTS = [
  { when: "28–30 Oct", type: "Casual · 3 days", status: { label: "Pending", variant: "warning" as const } },
  { when: "14 Oct", type: "Sick · ½ day", status: { label: "Approved", variant: "success" as const } },
  { when: "2 Sep", type: "Earned · 2 days", status: { label: "Approved", variant: "success" as const } },
]

export function LeaveMobileScreen() {
  const [type, setType] = useState<(typeof TYPES)[number]["id"]>("casual")
  const [half, setHalf] = useState(false)
  const t = TYPES.find((x) => x.id === type)!
  const days = half ? 2.5 : 3
  const after = t.balance - days

  return (
    <div className="flex justify-center py-6">
      {/* Phone frame */}
      <div className="w-[390px] overflow-hidden rounded-[2.25rem] border-[10px] border-foreground/90 bg-background shadow-e3">
        <div className="flex h-[780px] flex-col">
          <header className="surface-chrome flex items-center gap-2 border-b px-4 pb-3 pt-5">
            <Button variant="ghost" size="icon" aria-label="Back" className="-ml-2">
              <ArrowLeft />
            </Button>
            <h1 className="text-title font-semibold">Apply leave</h1>
          </header>

          <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
            <section aria-label="Balances" className="grid grid-cols-3 gap-2">
              {TYPES.map((x) => (
                <button
                  key={x.id}
                  type="button"
                  onClick={() => setType(x.id)}
                  aria-pressed={type === x.id}
                  className={cn(
                    "rounded-xl border bg-card p-3 text-left shadow-e1 transition-all duration-[var(--duration-base)]",
                    type === x.id && "border-primary ring-2 ring-primary/20",
                  )}
                >
                  <span className={cn("mb-2 block h-1 w-6 rounded-full", x.tone)} />
                  <p className="tabular text-headline font-semibold leading-none">{x.balance}</p>
                  <p className="mt-1 text-label text-muted-foreground">{x.label} left</p>
                </button>
              ))}
            </section>

            <section className="space-y-4 rounded-xl border bg-card p-4 shadow-e1">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="from">From</Label>
                  <div className="relative">
                    <CalendarDays className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="from" defaultValue="28 Oct" className="h-11 pl-8" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="to">To</Label>
                  <div className="relative">
                    <CalendarDays className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="to" defaultValue="31 Oct" className="h-11 pl-8" />
                  </div>
                </div>
              </div>
              <label className="flex items-center justify-between gap-3 text-body">
                <span>
                  Half day on last day
                  <span className="block text-label text-muted-foreground">Counts as 0.5</span>
                </span>
                <Switch checked={half} onCheckedChange={setHalf} />
              </label>
              <div className="space-y-1.5">
                <Label htmlFor="reason">Reason (optional)</Label>
                <textarea
                  id="reason"
                  rows={2}
                  placeholder="Family function"
                  className="w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-body shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                />
              </div>
            </section>

            <section aria-live="polite" className="rounded-xl bg-accent p-4 text-accent-foreground">
              <div className="flex items-baseline justify-between">
                <p className="text-body font-medium">You're requesting</p>
                <p className="tabular text-headline font-semibold">{days} days</p>
              </div>
              <p className="mt-1 flex items-center gap-1.5 text-label opacity-80">
                <Info className="size-3.5" /> 1 Nov (Diwali) excluded · weekends excluded
              </p>
              <div className="mt-3 flex items-center justify-between border-t border-current/15 pt-3 text-body">
                <span>{t.label} balance after</span>
                <span className={cn("tabular font-semibold", after < 0 && "text-destructive-foreground")}>{after.toFixed(1)}</span>
              </div>
            </section>

            <section>
              <h2 className="mb-2 text-label font-medium uppercase tracking-wider text-muted-foreground">Recent requests</h2>
              <ul className="divide-y rounded-xl border bg-card shadow-e1">
                {REQUESTS.map((r) => (
                  <li key={r.when} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-body font-medium">{r.when}</p>
                      <p className="text-label text-muted-foreground">{r.type}</p>
                    </div>
                    <Badge variant={r.status.variant} dot>
                      {r.status.label}
                    </Badge>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <footer className="surface-chrome border-t p-4">
            <Button
              size="lg"
              className="h-12 w-full text-body font-semibold"
              onClick={() => toast.success("Leave request sent", { description: `${days} days · goes to Neha Iyer for approval` })}
            >
              <Send /> Submit request
            </Button>
          </footer>
        </div>
      </div>
    </div>
  )
}
