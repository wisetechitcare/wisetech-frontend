import { TimeWheelField } from '@app/modules/common/components/TimeWheelField';
import { WtSelect } from '@app/modules/common/components/ui/WtSelect';
import { WtButton } from '@app/modules/common/components/ui/tw/Buttons';
import { cn } from '@app/modules/common/components/ui/tw/cn';
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
 * Built on the kit — `TimeWheelField` rather than `type="time"`, `WtSelect`
 * rather than a raw `<select>` — so both flows are theme-correct and dark-mode
 * correct without either handling it.
 */
export interface AttendanceRequestFieldsProps {
  value: AttendanceRequestDraft;
  onChange: (next: AttendanceRequestDraft) => void;
  /** Working methods, already loaded by the caller. */
  methods: Array<{ value: string; label: string }>;
  /**
   * Which kinds may be chosen. Omit the selector entirely by passing one — the
   * employee flow picks the kind in a step of its own and has nothing to offer
   * here.
   */
  kinds?: readonly RequestKind[];
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
  showErrors = false,
  disabled = false,
}: AttendanceRequestFieldsProps) {
  const set = (patch: Partial<AttendanceRequestDraft>) => onChange({ ...value, ...patch });

  return (
    <div className="flex flex-col gap-3">
      {/* Asked BEFORE the times, because it decides which of them the form
          needs. Hidden when there is only one possibility — a choice of one is
          not a choice. */}
      {kinds && kinds.length > 1 && (
        <Field label="What are you correcting?" required>
          <div className="flex flex-wrap gap-2">
            {kinds.map((k) => (
              <WtButton
                key={k}
                inverted={value.kind !== k}
                disabled={disabled}
                onClick={() => onChange(applyKind(value, k))}
                aria-pressed={value.kind === k}
              >
                {SELECTOR_LABEL[k]}
              </WtButton>
            ))}
          </div>
        </Field>
      )}

      {wantsCheckIn(value.kind) && (
        <Field label="Check-in time" required>
          <TimeWheelField value={value.checkIn} onChange={(t: string) => set({ checkIn: t })} />
        </Field>
      )}

      {wantsCheckOut(value.kind) && (
        <Field label="Check-out time" required>
          <TimeWheelField value={value.checkOut} onChange={(t: string) => set({ checkOut: t })} />
        </Field>
      )}

      <Field label="Working method" required>
        <WtSelect
          options={methods}
          value={methods.find((m) => m.value === value.workingMethodId) ?? null}
          onChange={(opt: { value: string } | null) => set({ workingMethodId: opt?.value ?? '' })}
          ariaLabel="Working method"
          placeholder="Select…"
          isLoading={!methods.length}
          error={showErrors && !value.workingMethodId}
          size="sm"
          isDisabled={disabled}
        />
      </Field>

      <Field label="Remarks" required>
        <textarea
          rows={2}
          value={value.remarks}
          disabled={disabled}
          onChange={(e) => set({ remarks: e.target.value })}
          className={cn(
            'w-full resize-y rounded-lg border bg-transparent px-2.5 py-2 text-[13px]',
            'text-slate-900 dark:text-slate-100 dark:border-[#30363d]',
            showErrors && !value.remarks.trim() ? 'border-rose-400' : 'border-slate-200',
          )}
          placeholder="Why is this correction needed?"
        />
      </Field>
    </div>
  );
}

/** Label + required marker, so every field in the group sits the same way. */
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-bold uppercase tracking-[0.05em] text-slate-500 dark:text-slate-400">
        {label}
        {required && <span className="ml-0.5 text-rose-500">*</span>}
      </span>
      {children}
    </label>
  );
}

export default AttendanceRequestFields;
