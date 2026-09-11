import { Stack } from '@mui/material';
import { TimeWheelField } from '@app/modules/common/components/TimeWheelField';
import { WtField } from '@app/modules/common/components/ui/WtField';
import { SegmentedControl } from '@app/modules/common/components/ui/SegmentedControl';
import type { SegmentedOption } from '@app/modules/common/components/ui/SegmentedControl';
import {
  KIND_LABEL,
  applyKind,
  wantsCheckIn,
  wantsCheckOut,
  type AttendanceRequestDraft,
  type RequestKind,
} from './attendanceRequest';

/**
 * The fields an attendance-correction request is made of — shared by the
 * employee's own correction in the calendar and the admin's raise-for-someone
 * modal.
 *
 * Only the fields. The two flows differ in what SURROUNDS them (an admin also
 * picks an employee and an approval status; an employee never does) and in
 * where they live (inline in a day panel, or in a dialog), so those stay with
 * the callers. What is shared is the part that was drifting: which times a kind
 * wants, what a working method looks like, and what the remark asks for.
 *
 * Built on the MUI kit — `WtField` for the labelled inputs, `TimeWheelField`
 * rather than `type="time"`, `SegmentedControl` for the kind. No Tailwind, no
 * bespoke label markup: `WtField` owns the label/field/message pairing for the
 * whole app, which is why a select and a text box on one row cannot disagree
 * about height, radius or focus ring.
 */
export interface AttendanceRequestFieldsProps {
  value: AttendanceRequestDraft;
  onChange: (next: AttendanceRequestDraft) => void;
  /** Working methods, already loaded by the caller. */
  methods: Array<{ value: string; label: string }>;
  /**
   * Which kinds may be chosen. Omit, or pass one, to hide the selector — a
   * choice of one is not a choice.
   */
  kinds?: readonly RequestKind[];
  /**
   * Why a kind cannot be chosen right now, or null when it can.
   *
   * The POLICY lives with the caller — whether a half is already awaiting
   * approval, or whether there is a check-in to anchor a check-out, is state
   * this component has no access to. It only renders the answer, so the segment
   * that is closed and the sentence explaining it can never come from two
   * different rules.
   */
  kindDisabled?: (kind: RequestKind) => string | null;
  /** Show a field as invalid. The message itself belongs to the caller's submit. */
  showErrors?: boolean;
  disabled?: boolean;
}

/**
 * "only" is added HERE, not in the shared label.
 *
 * In this selector the three sit side by side, so "Check-in only" is what
 * distinguishes it from "Both". Elsewhere — a heading, a chip — the same kind is
 * just "Check-in", and carrying "only" into those would read as a qualifier
 * nothing is qualifying.
 */
/**
 * The child controls below own their own value, so `WtField`'s onChange has
 * nothing to do for them. It is required by the frame, not by the control.
 */
const noop = () => undefined;

const SELECTOR_LABEL: Record<RequestKind, string> = {
  both: KIND_LABEL.both,
  checkin: `${KIND_LABEL.checkin} only`,
  checkout: `${KIND_LABEL.checkout} only`,
};

export function AttendanceRequestFields({
  value,
  onChange,
  methods,
  kinds,
  kindDisabled,
  showErrors = false,
  disabled = false,
}: AttendanceRequestFieldsProps) {
  const set = (patch: Partial<AttendanceRequestDraft>) => onChange({ ...value, ...patch });

  const segments: Array<SegmentedOption<RequestKind>> = (kinds ?? []).map((k) => {
    const reason = kindDisabled?.(k) ?? null;
    return {
      value: k,
      label: SELECTOR_LABEL[k],
      disabled: disabled || Boolean(reason),
      disabledReason: reason ?? undefined,
    };
  });

  return (
    <Stack spacing={1.75}>
      {/* Asked BEFORE the times, because it decides which of them the form
          needs — and asked HERE rather than on a step of its own, so switching
          to "Both" after seeing the times is one click, not a trip backwards. */}
      {segments.length > 1 && (
        <WtField label="What are you correcting?" required value={value.kind} onChange={noop}>
          <SegmentedControl
            options={segments}
            value={value.kind}
            onChange={(k) => onChange(applyKind(value, k))}
            ariaLabel="What are you correcting"
          />
        </WtField>
      )}

      {/* The wheel brings its own frame. `WtField` styles the controls it
          renders itself but leaves `children` untouched, so it contributes the
          label and the message here without drawing a second border. */}
      {wantsCheckIn(value.kind) && (
        <WtField
          label="Check-in time"
          required
          value={value.checkIn}
          onChange={(t: string) => set({ checkIn: t })}
          error={showErrors && !value.checkIn ? 'Pick a check-in time' : undefined}
        >
          <TimeWheelField
            value={value.checkIn}
            onChange={(t: string) => set({ checkIn: t })}
            disabled={disabled}
            invalid={showErrors && !value.checkIn}
          />
        </WtField>
      )}

      {wantsCheckOut(value.kind) && (
        <WtField
          label="Check-out time"
          required
          value={value.checkOut}
          onChange={(t: string) => set({ checkOut: t })}
          error={showErrors && !value.checkOut ? 'Pick a check-out time' : undefined}
        >
          <TimeWheelField
            value={value.checkOut}
            onChange={(t: string) => set({ checkOut: t })}
            disabled={disabled}
            invalid={showErrors && !value.checkOut}
          />
        </WtField>
      )}

      <WtField
        label="Working method"
        required
        value={value.workingMethodId}
        onChange={(v: string) => set({ workingMethodId: v })}
        options={methods}
        placeholder={methods.length ? 'Select…' : 'Loading…'}
        error={showErrors && !value.workingMethodId ? 'Pick a working method' : undefined}
        disabled={disabled || !methods.length}
      />

      <WtField
        label="Remarks"
        required
        value={value.remarks}
        onChange={(v: string) => set({ remarks: v })}
        placeholder="Why is this correction needed?"
        multiline
        minRows={2}
        error={showErrors && !value.remarks.trim() ? 'Say why this correction is needed' : undefined}
        disabled={disabled}
      />
    </Stack>
  );
}

export default AttendanceRequestFields;
