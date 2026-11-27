// TEMPORARY manual-test page for the DatePicker kit. Remove with the `dev/date-picker` route in AppRoutes.tsx.
import { useState } from 'react'

import { FiscalYearRangeField } from '@app/modules/common/components/ui'

import {
  DatePickerField,
  DateRangePickerField,
  type IsoDateRangePreset,
} from '@/ds/ui/date-picker-field'

import type { IsoDate, IsoDateRange } from '@/ds/lib/iso-date'
import type { FiscalYearRangeValue } from '@utils/fiscalYearRange'

const MIN_DATE: IsoDate = '2026-01-01'
const MAX_DATE: IsoDate = '2027-12-31'

const RANGE_PRESETS: IsoDateRangePreset[] = [
  { label: 'Q1 2027', value: { start: '2027-01-01', end: '2027-03-31' } },
  { label: 'Full 2026', value: { start: '2026-01-01', end: '2026-12-31' } },
]

const SECTION_CLASS = 'flex flex-col gap-3 rounded-xl border border-border bg-card p-5'
const READOUT_CLASS = 'rounded-md bg-muted p-3 text-xs text-foreground'

export function DatePickerTestPage() {
  const [singleDate, setSingleDate] = useState<IsoDate>('')
  const [constrainedDate, setConstrainedDate] = useState<IsoDate>('')
  const [range, setRange] = useState<IsoDateRange | null>(null)
  const [confirmRange, setConfirmRange] = useState<IsoDateRange | null>(null)
  const [noWeekendDate, setNoWeekendDate] = useState<IsoDate>('')
  const [noWeekendRange, setNoWeekendRange] = useState<IsoDateRange | null>(null)
  const [outsideDate, setOutsideDate] = useState<IsoDate>('')
  const [plainTitleDate, setPlainTitleDate] = useState<IsoDate>('')
  const [fiscalYear, setFiscalYear] = useState<FiscalYearRangeValue>('')
  const [clearableFiscalYear, setClearableFiscalYear] = useState<FiscalYearRangeValue>('2026-04-01 to 2027-03-31')

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-8">
      <h1 className="text-xl font-semibold text-foreground">DatePicker kit — manual test</h1>

      <section className={SECTION_CLASS}>
        <h2 className="text-base font-semibold text-foreground">DatePickerField (free)</h2>
        <DatePickerField label="Effective from" value={singleDate} onChange={setSingleDate} placeholderValue="2026-10-01" />
        <pre className={READOUT_CLASS}>{JSON.stringify({ value: singleDate })}</pre>
      </section>

      <section className={SECTION_CLASS}>
        <h2 className="text-base font-semibold text-foreground">DatePickerField (min {MIN_DATE} / max {MAX_DATE})</h2>
        <DatePickerField
          label="Constrained date"
          value={constrainedDate}
          onChange={setConstrainedDate}
          minValue={MIN_DATE}
          maxValue={MAX_DATE}
        />
        <pre className={READOUT_CLASS}>{JSON.stringify({ value: constrainedDate })}</pre>
      </section>

      <section className={SECTION_CLASS}>
        <h2 className="text-base font-semibold text-foreground">DateRangePickerField (with presets)</h2>
        <DateRangePickerField
          label="Date range"
          value={range}
          onChange={setRange}
          presets={RANGE_PRESETS}
        />
        <pre className={READOUT_CLASS}>{JSON.stringify({ value: range })}</pre>
      </section>

      <section className={SECTION_CLASS}>
        <h2 className="text-base font-semibold text-foreground">DateRangePickerField (confirm / cancel)</h2>
        <DateRangePickerField
          label="Confirmed range"
          value={confirmRange}
          onChange={setConfirmRange}
          confirmSelection
        />
        <pre className={READOUT_CLASS}>{JSON.stringify({ value: confirmRange })}</pre>
      </section>

      <section className={SECTION_CLASS}>
        <h2 className="text-base font-semibold text-foreground">Props: showWeekends=false</h2>
        <DatePickerField label="No weekends" value={noWeekendDate} onChange={setNoWeekendDate} showWeekends={false} />
        <DateRangePickerField label="No weekends (range)" value={noWeekendRange} onChange={setNoWeekendRange} showWeekends={false} />
      </section>

      <section className={SECTION_CLASS}>
        <h2 className="text-base font-semibold text-foreground">Props: hideOutsideDays=false (outside days shown)</h2>
        <DatePickerField label="Outside days shown" value={outsideDate} onChange={setOutsideDate} hideOutsideDays={false} />
      </section>

      <section className={SECTION_CLASS}>
        <h2 className="text-base font-semibold text-foreground">Props: showMonthYearSelect=false (plain title)</h2>
        <DatePickerField label="No month/year select" value={plainTitleDate} onChange={setPlainTitleDate} showMonthYearSelect={false} />
      </section>

      <section className={SECTION_CLASS}>
        <h2 className="text-base font-semibold text-foreground">FiscalYearRangeField (empty)</h2>
        <FiscalYearRangeField value={fiscalYear} onChange={setFiscalYear} />
        <pre className={READOUT_CLASS}>{JSON.stringify({ value: fiscalYear })}</pre>
      </section>

      <section className={SECTION_CLASS}>
        <h2 className="text-base font-semibold text-foreground">FiscalYearRangeField (clearable)</h2>
        <FiscalYearRangeField
          value={clearableFiscalYear}
          onChange={setClearableFiscalYear}
          clearable
        />
        <pre className={READOUT_CLASS}>{JSON.stringify({ value: clearableFiscalYear })}</pre>
      </section>
    </div>
  )
}
