/**
 * AttendanceSyncConflicts
 *
 * When a biometric sync (push / pull / manual backfill) proposes a value for a
 * check-in/out that a HUMAN already entered in the app, the backend does NOT
 * overwrite it — it queues the change here for review. This panel lists those
 * pending conflicts and lets an admin see the difference (app value vs device
 * value) and explicitly Accept (apply the device value) or Reject (keep the app
 * value). Live-updates via the attendanceSyncConflict socket bridge.
 */
import { useCallback, useEffect, useState } from 'react';
import { KTIcon } from '@metronic/helpers';
// Tailwind UI kit (tw/) — the re-platformed glass design system, zero MUI.
import { GlassCard, WtButton, StatusBadge, IconBox, Spinner, TRIO } from '@app/modules/common/components/ui/tw';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { MUMBAI_TZ } from '@utils/date';
import {
  fetchAttendanceConflicts,
  resolveAttendanceConflict,
  IAttendanceSyncConflict,
} from '@services/biometric';
import { successConfirmation, errorConfirmation } from '@utils/modal';
import { useEventBus } from '@hooks/useEventBus';
import { EVENT_KEYS } from '@constants/eventKeys';

dayjs.extend(utc);
dayjs.extend(timezone);

const fmt = (iso: string) => dayjs(iso).tz(MUMBAI_TZ).format('DD MMM YYYY, hh:mm A');
const fmtDay = (iso: string) => dayjs(iso).tz(MUMBAI_TZ).format('DD MMM YYYY');

function AttendanceSyncConflicts() {
  const [conflicts, setConflicts] = useState<IAttendanceSyncConflict[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchAttendanceConflicts();
      setConflicts(data);
    } catch (err) {
      console.error('Failed to load attendance sync conflicts', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  // Refresh live when a new conflict is queued by a sync.
  useEventBus(EVENT_KEYS.attendanceSyncConflict, () => { load(); });

  const resolve = async (id: string, action: 'accept' | 'reject') => {
    try {
      setProcessingId(id);
      const { message } = await resolveAttendanceConflict(id, action);
      successConfirmation(message || `Conflict ${action}ed`);
      setConflicts(prev => prev.filter(c => c.id !== id));
    } catch (err: any) {
      console.error(`Failed to ${action} conflict`, err);
      errorConfirmation(err?.response?.data?.message || `Failed to ${action} the conflict. Try again.`);
    } finally {
      setProcessingId(null);
    }
  };

  // Nothing to review → render nothing (keeps the page clean when all is well).
  if (!loading && conflicts.length === 0) return null;

  return (
    <GlassCard preset="section" className="mt-6 mb-6 p-4 sm:p-6">
      <div className="flex items-center gap-3 mb-3">
        <IconBox icon="information-5" trio={TRIO.amber} size={40} fs="fs-2" />
        <div className="flex items-center gap-2">
          <span className="font-bold text-[18px] text-slate-900">Attendance Sync Conflicts</span>
          {conflicts.length > 0 && <StatusBadge trio={TRIO.amber} label={String(conflicts.length)} />}
        </div>
      </div>
      <p className="text-[13px] text-slate-500 mb-5 leading-normal m-0">
        The biometric device reported a different time for a check-in/out that was already
        recorded in the app. Nothing was overwritten — review each and choose whether to
        apply the device's value or keep the existing one.
      </p>

      {loading && conflicts.length === 0 ? (
        <div className="flex items-center gap-2 text-slate-500 text-[13px]">
          <Spinner size={16} /> Loading…
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-[760px] w-full text-[13px] border-collapse">
            <thead>
              <tr className="bg-slate-50 [&>th]:text-[11px] [&>th]:font-bold [&>th]:text-slate-500 [&>th]:uppercase [&>th]:tracking-[0.04em] [&>th]:text-left [&>th]:p-2 [&>th]:border-b [&>th]:border-slate-200">
                <th>Employee</th>
                <th>Day</th>
                <th>Field</th>
                <th>Current (in app)</th>
                <th>Device says</th>
                <th className="!text-right">Action</th>
              </tr>
            </thead>
            <tbody className="[&>tr>td]:p-2 [&>tr>td]:border-b [&>tr>td]:border-slate-100">
              {conflicts.map((c) => {
                const name = `${c.employee?.users?.firstName ?? ''} ${c.employee?.users?.lastName ?? ''}`.trim() || '—';
                const busy = processingId === c.id;
                return (
                  <tr key={c.id}>
                    <td>
                      <p className="font-bold text-[13px] text-slate-900 m-0">{name}</p>
                      <p className="text-[11px] text-slate-500 m-0">{c.employee?.employeeCode ?? ''}</p>
                    </td>
                    <td>{c.attendance?.attendanceDate ? fmtDay(c.attendance.attendanceDate) : fmtDay(c.existingValue)}</td>
                    <td>
                      <StatusBadge trio={TRIO.blue} label={c.field === 'checkIn' ? 'Check-In' : 'Check-Out'} />
                    </td>
                    <td className="font-semibold" style={{ color: TRIO.green.c }}>{fmt(c.existingValue)}</td>
                    <td className="font-semibold" style={{ color: TRIO.rose.c }}>{fmt(c.proposedValue)}</td>
                    <td className="!text-right">
                      <div className="flex gap-1.5 justify-end">
                        <WtButton tone="success" disabled={busy} title="Apply the device's value" onClick={() => resolve(c.id, 'accept')}
                          className="text-[12px] py-1 px-2.5 min-w-0"
                          startIcon={busy ? <Spinner size={13} color="#fff" /> : undefined}>
                          Accept device
                        </WtButton>
                        <WtButton ghost disabled={busy} title="Keep the value already in the app" onClick={() => resolve(c.id, 'reject')}
                          className="text-[12px] py-1 px-2.5 min-w-0">
                          Keep app
                        </WtButton>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </GlassCard>
  );
}

export default AttendanceSyncConflicts;
