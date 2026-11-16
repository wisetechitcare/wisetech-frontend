import { useEffect, useMemo, useState } from "react";
import { Box } from "@mui/material";
import { useField } from "formik";
import dayjs from "dayjs";
import { FloatingLabelFrame, WtSelect, type WtSelectOption } from "@app/modules/common/components/ui";
import { daysInMonth, fromBirthdayValue, toBirthdayValue } from "@utils/birthday";

const MONTHS: WtSelectOption[] = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: dayjs().month(i).format("MMMM"),
}));
const THIS_YEAR = new Date().getFullYear();
// Newest first; the kit windows the list, so ~125 rows open instantly.
const YEARS: WtSelectOption[] = Array.from({ length: THIS_YEAR - 1900 + 1 }, (_, i) => ({
  value: String(THIS_YEAR - i),
  label: String(THIS_YEAR - i),
}));

/**
 * Date of birth as Day + Month, with the YEAR OPTIONAL — a contact's birthday is often known
 * without it. Three of the app's own dropdowns (WtSelect in a FloatingLabelFrame, as
 * DropdownInput does). Writes the form's `YYYY-MM-DD` string; an unknown year is the
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

  const days: WtSelectOption[] = useMemo(
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
  const num = (opt: unknown) => ((opt as WtSelectOption | null)?.value ? Number((opt as WtSelectOption).value) : null);
  const pick = (opts: WtSelectOption[], v: number | null) => opts.find((o) => o.value === String(v)) ?? null;

  return (
    <Box>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "minmax(104px, 1fr) minmax(132px, 1.5fr) minmax(112px, 1.1fr)",
          gap: 1,
          // One line per dropdown: the value, then the arrow — never wrapped onto a second row.
          "& .react-select__control": { flexWrap: "nowrap" },
          "& .react-select__value-container": { flexWrap: "nowrap", minWidth: 0 },
          // The clear (×) appears on hover / focus only, so a short value keeps its room.
          "& .react-select__clear-indicator": { opacity: 0, width: 0, padding: 0, overflow: "hidden", transition: "opacity .12s ease" },
          "& .react-select__control:hover .react-select__clear-indicator, & .react-select__control--is-focused .react-select__clear-indicator": {
            opacity: 1,
            width: "auto",
            padding: "6px",
          },
        }}
      >
        <FloatingLabelFrame label={`${label} day`} filled={!!day}>
          <WtSelect
            options={days}
            value={pick(days, day)}
            isClearable
            isSearchable
            placeholder="Day"
            ariaLabel={`${label} day`}
            onChange={(o) => write(num(o), month, year)}
          />
        </FloatingLabelFrame>
        <FloatingLabelFrame label={`${label} month`} filled={!!month}>
          <WtSelect
            options={MONTHS}
            value={pick(MONTHS, month)}
            isClearable
            isSearchable
            placeholder="Month"
            ariaLabel={`${label} month`}
            onChange={(o) => write(day, num(o), year)}
          />
        </FloatingLabelFrame>
        <FloatingLabelFrame label={`${label} year`} filled={!!year}>
          <WtSelect
            options={YEARS}
            value={pick(YEARS, year)}
            isClearable
            isSearchable
            placeholder="Year"
            ariaLabel={`${label} year (optional)`}
            onChange={(o) => write(day, month, num(o))}
          />
        </FloatingLabelFrame>
      </Box>
      <Box sx={{ mt: 0.5, px: 1.75, fontSize: 12, color: "text.secondary" }}>
        {(day || month) && !(day && month) ? "Pick both the day and the month." : "Year is optional."}
      </Box>
    </Box>
  );
}
