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
    <div className="card mb-6 mt-6">
      <div className="card-header border-0 pt-6">
        <div className="card-title d-flex align-items-center gap-2">
          <KTIcon iconName="information-5" className="fs-2 text-warning" />
          <h3 className="fw-bold m-0">
            Attendance Sync Conflicts
            {conflicts.length > 0 && (
              <span className="badge badge-warning ms-2 fs-7">{conflicts.length}</span>
            )}
          </h3>
        </div>
      </div>
      <div className="card-body pt-3">
        <p className="text-muted fs-7 mb-5">
          The biometric device reported a different time for a check-in/out that was already
          recorded in the app. Nothing was overwritten — review each and choose whether to
          apply the device's value or keep the existing one.
        </p>

        {loading && conflicts.length === 0 ? (
          <div className="text-muted fs-7">Loading…</div>
        ) : (
          <div className="table-responsive">
            <table className="table table-row-dashed align-middle gs-0 gy-3">
              <thead>
                <tr className="fw-semibold text-muted fs-7 text-uppercase">
                  <th className="min-w-150px">Employee</th>
                  <th className="min-w-120px">Day</th>
                  <th className="min-w-90px">Field</th>
                  <th className="min-w-160px">Current (in app)</th>
                  <th className="min-w-160px">Device says</th>
                  <th className="min-w-140px text-end">Action</th>
                </tr>
              </thead>
              <tbody>
                {conflicts.map((c) => {
                  const name = `${c.employee?.users?.firstName ?? ''} ${c.employee?.users?.lastName ?? ''}`.trim() || '—';
                  const busy = processingId === c.id;
                  return (
                    <tr key={c.id}>
                      <td>
                        <span className="fw-bold text-dark d-block">{name}</span>
                        <span className="text-muted fs-8">{c.employee?.employeeCode ?? ''}</span>
                      </td>
                      <td className="fs-7">{c.attendance?.attendanceDate ? fmtDay(c.attendance.attendanceDate) : fmtDay(c.existingValue)}</td>
                      <td>
                        <span className="badge badge-light-primary text-uppercase">
                          {c.field === 'checkIn' ? 'Check-In' : 'Check-Out'}
                        </span>
                      </td>
                      <td className="fs-7 text-success fw-semibold">{fmt(c.existingValue)}</td>
                      <td className="fs-7 text-danger fw-semibold">{fmt(c.proposedValue)}</td>
                      <td className="text-end">
                        <button
                          className="btn btn-sm btn-light-success me-2"
                          disabled={busy}
                          title="Apply the device's value"
                          onClick={() => resolve(c.id, 'accept')}
                        >
                          {busy ? <span className="spinner-border spinner-border-sm" /> : 'Accept device'}
                        </button>
                        <button
                          className="btn btn-sm btn-light-secondary"
                          disabled={busy}
                          title="Keep the value already in the app"
                          onClick={() => resolve(c.id, 'reject')}
                        >
                          Keep app
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default AttendanceSyncConflicts;
