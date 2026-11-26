import { DISPLAY_DATE_SEPARATOR } from "@/ds/ui/date-field"

const MINUTE_MS = 60_000
const MINUTES_PER_HOUR = 60
const MINUTES_PER_DAY = 1_440

export const plural = (count: number, one: string, many = `${one}s`) => `${count} ${count === 1 ? one : many}`

/** The company date format (YYYY.MM.DD) whatever the locale — the one the kit's date fields show. */
export const formatDate = (iso: string) => iso.slice(0, 10).split("-").join(DISPLAY_DATE_SEPARATOR)

export function formatRelative(iso: string | null, now: Date, never = "Never"): string {
  if (!iso) return never
  const minutes = Math.round((new Date(iso).getTime() - now.getTime()) / MINUTE_MS)
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" })
  if (Math.abs(minutes) < MINUTES_PER_HOUR) return rtf.format(minutes, "minute")
  if (Math.abs(minutes) < MINUTES_PER_DAY) return rtf.format(Math.round(minutes / MINUTES_PER_HOUR), "hour")
  return rtf.format(Math.round(minutes / MINUTES_PER_DAY), "day")
}

export const fixFieldsMessage = (count: number) => `Fix ${plural(count, "field")} before saving.`
