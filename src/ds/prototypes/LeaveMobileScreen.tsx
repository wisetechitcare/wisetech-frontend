import { useState } from "react"
import { toast } from "sonner"
import { ArrowLeft, CalendarDays, Info, Send } from "lucide-react"
import { Button } from "@/ds/ui/button"
import { Badge } from "@/ds/ui/badge"
import { Card, CardContent } from "@/ds/ui/card"
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet, FieldTitle } from "@/ds/ui/field"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/ds/ui/input-group"
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemTitle } from "@/ds/ui/item"
import { RadioGroup, RadioGroupItem } from "@/ds/ui/radio-group"
import { Switch } from "@/ds/ui/switch"
import { Textarea } from "@/ds/ui/textarea"
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
      <div className="w-[390px] overflow-hidden rounded-[2.25rem] border-[10px] border-foreground/90 bg-background shadow-lg">
        <div className="flex h-[780px] flex-col">
          <header className="surface-chrome flex items-center gap-2 border-b px-4 pb-3 pt-5">
            <Button variant="ghost" size="icon" aria-label="Back" className="-ml-2">
              <ArrowLeft />
            </Button>
            <h1 className="text-base font-semibold">Apply leave</h1>
          </header>

          <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
            <FieldSet>
              <FieldLegend variant="label">Leave type</FieldLegend>
              <RadioGroup value={type} onValueChange={(v) => setType(v as typeof type)} className="grid grid-cols-3 gap-2">
                {TYPES.map((x) => (
                  <FieldLabel key={x.id} htmlFor={`type-${x.id}`}>
                    <Field>
                      <div className="flex items-start justify-between">
                        <span className={cn("mt-1 block h-1 w-6 rounded-full", x.tone)} />
                        <RadioGroupItem value={x.id} id={`type-${x.id}`} />
                      </div>
                      <FieldContent>
                        <FieldTitle className="tabular text-2xl font-semibold">{x.balance}</FieldTitle>
                        <FieldDescription>{x.label} left</FieldDescription>
                      </FieldContent>
                    </Field>
                  </FieldLabel>
                ))}
              </RadioGroup>
            </FieldSet>

            <Card size="sm">
              <CardContent>
                <FieldGroup>
                  <div className="grid grid-cols-2 gap-3">
                    <Field>
                      <FieldLabel htmlFor="from">From</FieldLabel>
                      <InputGroup>
                        <InputGroupAddon>
                          <CalendarDays />
                        </InputGroupAddon>
                        <InputGroupInput id="from" defaultValue="28 Oct" />
                      </InputGroup>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="to">To</FieldLabel>
                      <InputGroup>
                        <InputGroupAddon>
                          <CalendarDays />
                        </InputGroupAddon>
                        <InputGroupInput id="to" defaultValue="31 Oct" />
                      </InputGroup>
                    </Field>
                  </div>
                  <Field orientation="horizontal">
                    <FieldContent>
                      <FieldLabel htmlFor="half">Half day on last day</FieldLabel>
                      <FieldDescription>Counts as 0.5</FieldDescription>
                    </FieldContent>
                    <Switch id="half" checked={half} onCheckedChange={setHalf} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="reason">Reason (optional)</FieldLabel>
                    <Textarea id="reason" rows={2} placeholder="Family function" />
                  </Field>
                </FieldGroup>
              </CardContent>
            </Card>

            <Card size="sm" aria-live="polite">
              <CardContent className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <p className="font-medium">You're requesting</p>
                  <p className="tabular text-2xl font-semibold">{days} days</p>
                </div>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Info className="size-3.5" /> 1 Nov (Diwali) excluded · weekends excluded
                </p>
                <div className="flex items-center justify-between border-t pt-3">
                  <span>{t.label} balance after</span>
                  <span className={cn("tabular font-semibold", after < 0 && "text-destructive")}>{after.toFixed(1)}</span>
                </div>
              </CardContent>
            </Card>

            <section className="space-y-2">
              <h2 className="text-xs font-medium text-muted-foreground">Recent requests</h2>
              <ItemGroup className="gap-2">
                {REQUESTS.map((r) => (
                  <Item key={r.when} role="listitem" variant="outline" size="sm">
                    <ItemContent>
                      <ItemTitle>{r.when}</ItemTitle>
                      <ItemDescription>{r.type}</ItemDescription>
                    </ItemContent>
                    <ItemActions>
                      <Badge variant={r.status.variant} dot>
                        {r.status.label}
                      </Badge>
                    </ItemActions>
                  </Item>
                ))}
              </ItemGroup>
            </section>
          </div>

          <footer className="surface-chrome border-t p-4">
            <Button
              size="lg"
              className="w-full"
              onClick={() => toast.success("Leave request sent", { description: `${days} days · goes to Neha Iyer for approval` })}
            >
              <Send data-icon="inline-start" /> Submit request
            </Button>
          </footer>
        </div>
      </div>
    </div>
  )
}
