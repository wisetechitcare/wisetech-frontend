import { useEffect } from 'react';
import { getSocket } from '@utils/socketClient';
import eventBus from '@utils/EventBus';
import { EVENT_KEYS } from '@constants/eventKeys';

/**
 * Mounted once at the App root when authenticated.
 * Bridges backend socket events → eventBus so every subscribed
 * component refetches without a hard refresh.
 */
export function useRealtimeSync(employeeId: string | null | undefined) {
  useEffect(() => {
    if (!employeeId) return;

    const socket = getSocket();

    const onConnect = () => {
      socket.emit('joinRoom', employeeId);
    };

    // If already connected, join immediately
    if (socket.connected) {
      socket.emit('joinRoom', employeeId);
    }

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

    socket.on('connect', onConnect);
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
  }, [employeeId]);
}
