import { useState, type FormEvent } from "react"
import { CalendarRange } from "lucide-react"
import { toast } from "sonner"
import type { DateValue } from "@internationalized/date"
import type { RangeValue } from "react-aria-components"

import { FormDialog } from "@/ds/patterns/form-dialog"
import { DateRangePicker } from "@/ds/ui/date-picker"

import type { IBiometricDevice } from "@/models/biometric"
import { formatDate } from "@/ds/prototypes/utils/common/format"

const FORM_ID = "backfill-form"

interface BackfillDialogProps {
  device: IBiometricDevice
  onOpenChange: (open: boolean) => void
}

/** Pull punches for past days the scheduled sync missed (pull-capable devices only). */
export function BackfillDialog({ device, onOpenChange }: BackfillDialogProps) {
  const [range, setRange] = useState<RangeValue<DateValue> | null>(null)

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!range) return
    toast.success(`Backfill started for ${device.name}: ${formatDate(range.start.toString())} to ${formatDate(range.end.toString())}.`)
    onOpenChange(false)
  }

  return (
    <FormDialog
      open
      onOpenChange={onOpenChange}
      title="Backfill past dates"
      description={device.name}
      icon={<CalendarRange />}
      tone="info"
      size="sm"
      formId={FORM_ID}
      submitLabel="Start backfill"
      submitDisabled={!range}
      dirty={!!range}
    >
      <form id={FORM_ID} noValidate onSubmit={submit} className="space-y-3">
        <DateRangePicker label="Dates" value={range} onChange={setRange} isRequired />
        <p className="text-sm text-muted-foreground">Punches already imported are skipped, so it is safe to overlap.</p>
      </form>
    </FormDialog>
  )
}
