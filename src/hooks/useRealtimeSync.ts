import { useEffect } from 'react';
import { getSocket } from '@utils/socketClient';
import eventBus from '@utils/EventBus';
import { EVENT_KEYS } from '@constants/eventKeys';

/**
 * Mounted once at the App root when authenticated.
 * Bridges backend socket events → eventBus so every subscribed
 * component refetches without a hard refresh.
 *
 * ─── TWO IDs, TWO ROOMS ──────────────────────────────────────────────────────
 * The parameter was historically the logged-in USER id, but every targeted emit on the server
 * addresses the room by EMPLOYEE id — `notificationRepo.createNotification`, the email worker's
 * `triggeredBy`, and `SocketGateway.toEmployee` all do. Those are different uuids on different
 * tables, so a client that joined only the user room received none of them: the notification row
 * was written correctly and simply never arrived until the next refetch, which is exactly what
 * "I got no notification" looks like from the outside.
 *
 * Both are joined now. Joining a room nobody emits to costs nothing; missing the one that
 * carries every personal notification costs the whole feature.
 */
export function useRealtimeSync(
  userId: string | null | undefined,
  employeeId?: string | null,
) {
  useEffect(() => {
    const rooms = [userId, employeeId].filter(Boolean) as string[];
    if (!rooms.length) return;

    const socket = getSocket();

    const join = () => rooms.forEach((room) => socket.emit('joinRoom', room));
    const onConnect = () => join();

    // If already connected, join immediately — `connect` has already fired and will not fire
    // again for this socket.
    if (socket.connected) join();

    // lead ↔ project data synced (field update propagated)
    // Emit both leadUpdated AND projectUpdated so both tables refresh.
    // sourceType tells us which side was the initiator; targetType/targetId is the other side.
    const onLeadProjectSynced = (payload: {
      sourceType?: string;
      sourceId?: string;
      targetType?: string;
      targetId?: string;
    }) => {
      const leadId    = payload.sourceType === 'lead'    ? payload.sourceId : payload.targetId;
      const projectId = payload.sourceType === 'project' ? payload.sourceId : payload.targetId;
      if (leadId)    eventBus.emit(EVENT_KEYS.leadUpdated,    { id: leadId });
      if (projectId) eventBus.emit(EVENT_KEYS.projectUpdated, { id: projectId });
    };

    // lead status → Received: project was auto-created and linked
    const onProjectLinked = (payload: { leadId?: string; projectId?: string }) => {
      if (payload.leadId)    eventBus.emit(EVENT_KEYS.leadUpdated,   { id: payload.leadId });
      if (payload.projectId) eventBus.emit(EVENT_KEYS.projectCreated, { id: payload.projectId });
    };

    // lead status changed away from Received: project deleted
    const onProjectUnlinkedDeleted = (payload: { leadId?: string; projectId?: string }) => {
      if (payload.leadId)    eventBus.emit(EVENT_KEYS.leadUpdated,   { id: payload.leadId });
      if (payload.projectId) eventBus.emit(EVENT_KEYS.projectDeleted, { id: payload.projectId });
    };

    // biometric device sync-status / CRUD change (broadcast). Carries the affected
    // branch ids so an open Devices modal refetches only when relevant.
    const onBiometricDeviceUpdated = (payload: { branchIds?: string[] }) => {
      eventBus.emit(EVENT_KEYS.biometricDeviceUpdated, { branchIds: payload?.branchIds });
    };

    // reimbursement mutations (create / update / delete / approve / payment)
    const onReimbursementChanged = (payload: { action: string; employeeId?: string }) => {
      eventBus.emit(EVENT_KEYS.reimbursementChanged, payload);
      // Also wake up table views that listen to the legacy event key
      eventBus.emit(EVENT_KEYS.reimbursementRecords, { records: [] });
    };

    // attendance changed (biometric push/pull, manual admin edit, or self check-in/out).
    // Live "today" boards subscribe via useAttendanceRealtime and debounce-refetch.
    const onAttendanceUpdated = (payload: { date?: string; employeeId?: string; branchIds?: string[]; source?: string }) => {
      eventBus.emit(EVENT_KEYS.attendanceUpdated, payload || {});
    };

    // a biometric sync queued a conflict (proposed overwrite of human-entered
    // check-in/out) → refresh the pending-conflicts review panel/badge live.
    const onAttendanceSyncConflict = (payload: { employeeId?: string; branchIds?: string[] }) => {
      eventBus.emit(EVENT_KEYS.attendanceSyncConflict, payload || {});
    };

    // leave mutations (apply/edit/delete/per-segment) + approval decisions/cancellations. The
    // Balance board (BalanceProgress) subscribes to the eventBus leaveRequestUpdated key but NOT to
    // sockets directly, so without this bridge the balance card stayed stale after an approver acted
    // while the leave list beside it updated live. One bridge covers it.
    const onLeaveChanged = () => {
      eventBus.emit(EVENT_KEYS.leaveRequestUpdated, { leaveId: '' });
    };

    // Attendance-request queue changed somewhere (raised, approved, rejected). The
    // eventBus key already existed and OpenAttendanceRequests already subscribed to it,
    // but nothing ever emitted it from a SOCKET — only the acting component emitted it
    // locally. So an approver saw their own action instantly while every other open
    // board stayed stale until a full reload. This bridge closes that.
    const onAttendanceRequestChanged = (payload: any) => {
      eventBus.emit(EVENT_KEYS.attendanceRequestUpdated, { id: payload?.id ?? '' });
    };

    // FAQ content changed (HR/admin created, edited or deleted one). Bridges to
    // the faq* eventBus keys that already existed but were only ever emitted
    // locally by the acting component — so before this, an HR edit reached
    // nobody else's screen until they reloaded.
    const onFaqsUpdated = (payload: { action?: string; id?: string }) => {
      const key =
        payload?.action === 'created' ? EVENT_KEYS.faqCreated :
        payload?.action === 'deleted' ? EVENT_KEYS.faqDeleted :
        EVENT_KEYS.faqUpdated;
      eventBus.emit(key, { id: payload?.id ?? '' });
    };

    socket.on('connect', onConnect);
    socket.on('faqs_updated', onFaqsUpdated);
    socket.on('attendanceRequests:updated', onAttendanceRequestChanged);
    socket.on('lead_project_synced', onLeadProjectSynced);
    socket.on('project_linked', onProjectLinked);
    socket.on('project_unlinked_deleted', onProjectUnlinkedDeleted);
    socket.on('biometric_device_updated', onBiometricDeviceUpdated);
    socket.on('reimbursement_changed', onReimbursementChanged);
    socket.on('attendance_updated', onAttendanceUpdated);
    socket.on('attendance_sync_conflict', onAttendanceSyncConflict);
    socket.on('leaveRequests:updated', onLeaveChanged);
    socket.on('approval:updated', onLeaveChanged);
    socket.on('approval:cancelled', onLeaveChanged);

    return () => {
      socket.off('connect', onConnect);
      socket.off('faqs_updated', onFaqsUpdated);
      socket.off('attendanceRequests:updated', onAttendanceRequestChanged);
      socket.off('lead_project_synced', onLeadProjectSynced);
      socket.off('project_linked', onProjectLinked);
      socket.off('project_unlinked_deleted', onProjectUnlinkedDeleted);
      socket.off('biometric_device_updated', onBiometricDeviceUpdated);
      socket.off('reimbursement_changed', onReimbursementChanged);
      socket.off('attendance_updated', onAttendanceUpdated);
      socket.off('attendance_sync_conflict', onAttendanceSyncConflict);
      socket.off('leaveRequests:updated', onLeaveChanged);
      socket.off('approval:updated', onLeaveChanged);
      socket.off('approval:cancelled', onLeaveChanged);
    };
  }, [userId, employeeId]);
}
