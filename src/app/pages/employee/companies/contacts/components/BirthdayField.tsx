import { useEffect, useMemo, useState } from "react";
import { useField } from "formik";
import dayjs from "dayjs";
import { SearchSelect, type SearchSelectOption } from "@/ds/patterns/search-select";
import { daysInMonth, fromBirthdayValue, toBirthdayValue } from "@utils/birthday";

const MONTHS: SearchSelectOption[] = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: dayjs().month(i).format("MMMM"),
}));
const THIS_YEAR = new Date().getFullYear();
const YEARS: SearchSelectOption[] = Array.from({ length: THIS_YEAR - 1900 + 1 }, (_, i) => ({
  value: String(THIS_YEAR - i),
  label: String(THIS_YEAR - i),
}));

/**
 * Date of birth as Day + Month, with the YEAR OPTIONAL — a contact's birthday is often known
 * without it. Three SearchSelects. Writes the form's `YYYY-MM-DD` string; an unknown year is the
 * placeholder year from `@utils/birthday`, so greetings (day + month) keep working and every
 * screen shows such a birthday without a year.
 *
 * `label` names the date ("Birth" → "Birth day / month / year"); the anniversary uses the
 * same control with "Anniversary".
 */
export default function BirthdayField({ name, label = "Birth" }: { name: string; label?: string }) {
  const [field, , helpers] = useField<string>(name);
  const initial = fromBirthdayValue(field.value);
  const [day, setDay] = useState<number | null>(initial.day);
  const [month, setMonth] = useState<number | null>(initial.month);
  const [year, setYear] = useState<number | null>(initial.year);

  // Re-seed only when the form's value changed from OUTSIDE (another contact loaded, a reset).
  const ours = toBirthdayValue(day, month, year);
  useEffect(() => {
    if ((field.value || "") === ours) return;
    const p = fromBirthdayValue(field.value);
    setDay(p.day);
    setMonth(p.month);
    setYear(p.year);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `ours` follows local edits by design
  }, [field.value]);

  const days: SearchSelectOption[] = useMemo(
    () =>
      Array.from({ length: month ? daysInMonth(month, year) : 31 }, (_, i) => ({
        value: String(i + 1),
        label: String(i + 1),
      })),
    [month, year],
  );

  const write = (d: number | null, m: number | null, y: number | null) => {
    // A day past the month's end (31 → February) is pulled back rather than rejected.
    const safeDay = d && m ? Math.min(d, daysInMonth(m, y)) : d;
    setDay(safeDay);
    setMonth(m);
    setYear(y);
    helpers.setValue(toBirthdayValue(safeDay, m, y));
  };
  const num = (v: string | null) => (v ? Number(v) : null);

  return (
    <div>
      <div className="grid grid-cols-[minmax(104px,1fr)_minmax(132px,1.5fr)_minmax(112px,1.1fr)] gap-2">
        <SearchSelect id={`${name}-day`} label={`${label} day`} placeholder="Day" options={days} value={day ? String(day) : null} onValueChange={(v) => write(num(v), month, year)} />
        <SearchSelect id={`${name}-month`} label={`${label} month`} placeholder="Month" options={MONTHS} value={month ? String(month) : null} onValueChange={(v) => write(day, num(v), year)} />
        <SearchSelect id={`${name}-year`} label={`${label} year`} placeholder="Year" options={YEARS} limit={YEARS.length} value={year ? String(year) : null} onValueChange={(v) => write(day, month, num(v))} />
      </div>
      <p className="mt-1 px-1 text-xs text-muted-foreground">
        {(day || month) && !(day && month) ? "Pick both the day and the month." : "Year is optional."}
      </p>
    </div>
  );
}
