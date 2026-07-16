import React, { useEffect, useMemo, useState } from "react";
import { useFormikContext } from "formik";
import { Table } from "react-bootstrap";
import { getAllMeetingSchedules } from "@services/meetingSchedule";
import type { MeetingScheduleType, MeetingScheduleBracket } from "@models/leads";

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

  const handleSelect = (id: string) => {
    setFieldValue("meetingScheduleTypeId", id);
    const t = options.find((o) => o.id === id) || null;
    setFieldValue("meetingScheduleType", t);
  };

  const fmtArea = (n: number) => n.toLocaleString("en-IN");

  return (
    <div>
      <div className="row g-3 align-items-end mb-2">
        <div className="col-md-7">
          <label className="form-label fw-semibold text-gray-800 fs-7 mb-2">Meeting Type</label>
          <select
            className="form-select form-select-solid"
            value={values.meetingScheduleTypeId || ""}
            onChange={(e) => handleSelect(e.target.value)}
            disabled={loading && types.length === 0}
          >
            <option value="">— No meeting schedule —</option>
            {options.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
                {t.isDefault ? " (Default)" : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="col-md-5">
          <div className="d-flex flex-column align-items-md-end">
            <span className="text-gray-600 fs-8 fw-bold text-uppercase">Total Commercial Area</span>
            <span className="text-primary fs-5 fw-bolder">{fmtArea(totalArea)} sqft</span>
          </div>
        </div>
      </div>

      {types.length === 0 && !loading && (
        <div className="text-muted fs-7 text-center py-4 border border-dashed rounded mt-3">
          No meeting schedules configured yet. Create one under{" "}
          <span className="fw-semibold">Lead Configuration → Meeting Schedules</span>.
        </div>
      )}

      {selectedType && !matchedBracket && (
        <div className="text-muted fs-7 text-center py-4 border border-dashed rounded mt-3">
          This schedule has no area brackets configured.
        </div>
      )}

      {selectedType && matchedBracket && (
        <>
          <div className="d-flex flex-wrap gap-3 mt-3 mb-3">
            <div className="badge badge-light-primary fs-8 fw-bold px-3 py-2">
              Bracket: {fmtArea(Number(matchedBracket.minArea) || 0)}–{fmtArea(Number(matchedBracket.maxArea) || 0)} sqft
            </div>
            {expected && (
              <div className="badge badge-light-success fs-8 fw-bold px-3 py-2">
                Expected Completion: {expected.date.getFullYear()}
                {(expected.years || expected.months) ? (
                  <span className="text-muted ms-1">
                    ({expected.years ? `${expected.years}y` : ""}{expected.months ? ` ${expected.months}m` : ""} from inquiry)
                  </span>
                ) : null}
              </div>
            )}
            {!inquiryDate && (
              <div className="badge badge-light-warning fs-8 fw-bold px-3 py-2">
                Set the inquiry date to compute expected completion
              </div>
            )}
          </div>

          <div className="table-responsive">
            <Table bordered size="sm" className="bg-white align-middle gs-0 gy-2 mb-0">
              <thead className="bg-light">
                <tr className="fw-bolder text-muted fs-8 text-uppercase border-bottom border-gray-200">
                  <th className="ps-3 w-40px">Sr</th>
                  <th className="min-w-150px">Meeting</th>
                  <th className="w-120px text-center">Value</th>
                </tr>
              </thead>
              <tbody>
                {(matchedBracket.items || []).map((it, idx) => (
                  <tr key={idx}>
                    <td className="ps-3 fw-bold text-gray-600">{idx + 1}</td>
                    <td className="fw-semibold text-gray-800">{it.name}</td>
                    <td className="text-center fw-bolder text-dark">
                      {it.value === undefined || it.value === null || String(it.value).trim() === ""
                        ? "—"
                        : String(it.value)}
                    </td>
                  </tr>
                ))}
                {(matchedBracket.items || []).length === 0 && (
                  <tr>
                    <td colSpan={3} className="text-center text-muted fs-8 py-3">
                      No meetings configured for this bracket.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
};

export default MeetingScheduleSelector;
