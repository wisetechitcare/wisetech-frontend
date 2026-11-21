import React, { useEffect, useMemo, useState } from "react";
import { useFormikContext } from "formik";
import { getAllMeetingSchedules } from "@services/meetingSchedule";
import type { MeetingScheduleType, MeetingScheduleBracket } from "@models/leads";
import { Badge } from "@/ds/ui/badge";
import { EmptyState } from "@/ds/patterns/empty-state";
import { Field, FieldLabel } from "@/ds/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ds/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ds/ui/table";

/** Select has no empty value, so "no schedule" is this sentinel. */
const NONE = "__none__";

/**
 * Lead meeting-schedule step.
 *
 * The user picks a meeting-schedule type (project type). The lead's total commercial
 * area selects the matching area bracket, whose meetings are shown and whose
 * completion duration (years + months), added to the inquiry date, gives the expected
 * completion. Only `meetingScheduleTypeId` is persisted; the schedule is recomputed
 * from the type + area on load.
 */
export const MeetingScheduleSelector: React.FC = () => {
  const { values, setFieldValue } = useFormikContext<any>();
  const [types, setTypes] = useState<MeetingScheduleType[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await getAllMeetingSchedules();
        if (!cancelled && res?.meetingSchedules) setTypes(res.meetingSchedules);
      } catch {
        /* non-blocking */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Total commercial area = sum of the work-area rows' area (sqft).
  const totalArea = useMemo(
    () =>
      (values.projectAreas || []).reduce(
        (sum: number, a: any) => sum + (parseFloat(a?.projectArea) || 0),
        0,
      ),
    [values.projectAreas],
  );

  // Merge the lead's carried type (on edit) so an archived-but-selected type still renders.
  const options = useMemo(() => {
    const merged = [...types];
    const carried: MeetingScheduleType | null = values.meetingScheduleType || null;
    if (carried?.id && !merged.some((t) => t.id === carried.id)) {
      merged.unshift(carried);
    }
    return merged;
  }, [types, values.meetingScheduleType]);

  const selectedType = useMemo(
    () => options.find((t) => t.id === values.meetingScheduleTypeId) || null,
    [options, values.meetingScheduleTypeId],
  );

  // Find the bracket whose [minArea, maxArea] contains the total area. If none contains
  // it, fall back to the nearest band (below the smallest → first; above the largest →
  // last) so the user always sees a schedule once a type is chosen.
  const matchedBracket: MeetingScheduleBracket | null = useMemo(() => {
    if (!selectedType || !(selectedType.brackets || []).length) return null;
    const sorted = [...selectedType.brackets].sort(
      (a, b) => (Number(a.minArea) || 0) - (Number(b.minArea) || 0),
    );
    const hit = sorted.find(
      (b) => totalArea >= (Number(b.minArea) || 0) && totalArea <= (Number(b.maxArea) || 0),
    );
    if (hit) return hit;
    if (totalArea > 0) {
      if (totalArea < (Number(sorted[0].minArea) || 0)) return sorted[0];
      return sorted[sorted.length - 1];
    }
    return sorted[0];
  }, [selectedType, totalArea]);

  // Expected completion = inquiry date + bracket's completion (years + months).
  const inquiryDate: string = values.leadInquiryDate || values.inquiryDate || "";
  const expected = useMemo(() => {
    if (!matchedBracket || !inquiryDate) return null;
    const base = new Date(inquiryDate);
    if (isNaN(base.getTime())) return null;
    const years = parseInt(String(matchedBracket.completionYear ?? 0), 10) || 0;
    const months = parseInt(String(matchedBracket.completionMonth ?? 0), 10) || 0;
    const d = new Date(base);
    d.setFullYear(d.getFullYear() + years);
    d.setMonth(d.getMonth() + months);
    return { date: d, years, months };
  }, [matchedBracket, inquiryDate]);

  const handleSelect = (picked: string) => {
    const id = picked === NONE ? "" : picked;
    setFieldValue("meetingScheduleTypeId", id);
    const t = options.find((o) => o.id === id) || null;
    setFieldValue("meetingScheduleType", t);
  };

  const fmtArea = (n: number) => n.toLocaleString("en-IN");

  const typeItems = [
    { value: NONE, label: "— No meeting schedule —" },
    ...options.map((t) => ({ value: t.id, label: `${t.name}${t.isDefault ? " (Default)" : ""}` })),
  ];

  return (
    <div data-slot="meeting-schedule-selector" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <Field className="min-w-60 flex-1 md:max-w-xl">
          <FieldLabel>Meeting Type</FieldLabel>
          <Select
            items={typeItems}
            value={values.meetingScheduleTypeId || NONE}
            onValueChange={(v) => handleSelect(String(v))}
            disabled={loading && types.length === 0}
          >
            <SelectTrigger className="w-full" aria-label="Meeting Type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {typeItems.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <dl className="m-0 flex flex-col items-end">
          <dt className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">Total Commercial Area</dt>
          <dd className="m-0 text-lg font-bold text-primary tabular-nums">{fmtArea(totalArea)} sqft</dd>
        </dl>
      </div>

      {types.length === 0 && !loading && (
        <EmptyState
          size="sm"
          title="No meeting schedules yet"
          description="Create one under Lead Configuration → Meeting Schedules."
        />
      )}

      {selectedType && !matchedBracket && (
        <EmptyState size="sm" title="No area brackets" description="This schedule has no area brackets configured." />
      )}

      {selectedType && matchedBracket && (
        <>
          <div className="flex flex-wrap gap-2">
            <Badge variant="brand">
              Bracket: {fmtArea(Number(matchedBracket.minArea) || 0)}–{fmtArea(Number(matchedBracket.maxArea) || 0)} sqft
            </Badge>
            {expected && (
              <Badge variant="success">
                Expected Completion: {expected.date.getFullYear()}
                {(expected.years || expected.months) ? ` (${expected.years ? `${expected.years}y` : ""}${expected.months ? ` ${expected.months}m` : ""} from inquiry)` : ""}
              </Badge>
            )}
            {!inquiryDate && <Badge variant="warning">Set the inquiry date to compute expected completion</Badge>}
          </div>

          <div className="overflow-hidden rounded-2xl ring-1 ring-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14">Sr</TableHead>
                  <TableHead>Meeting</TableHead>
                  <TableHead className="w-32 text-center">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(matchedBracket.items || []).map((it, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="text-muted-foreground tabular-nums">{idx + 1}</TableCell>
                    <TableCell className="font-medium">{it.name}</TableCell>
                    <TableCell className="text-center font-semibold">
                      {it.value === undefined || it.value === null || String(it.value).trim() === "" ? "—" : String(it.value)}
                    </TableCell>
                  </TableRow>
                ))}
                {(matchedBracket.items || []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="py-4 text-center text-muted-foreground">
                      No meetings configured for this bracket.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
};

export default MeetingScheduleSelector;
