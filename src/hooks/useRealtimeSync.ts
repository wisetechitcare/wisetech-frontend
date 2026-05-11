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

    socket.on('connect', onConnect);
    socket.on('lead_project_synced', onLeadProjectSynced);
    socket.on('project_linked', onProjectLinked);
    socket.on('project_unlinked_deleted', onProjectUnlinkedDeleted);

    return () => {
      socket.off('connect', onConnect);
      socket.off('lead_project_synced', onLeadProjectSynced);
      socket.off('project_linked', onProjectLinked);
      socket.off('project_unlinked_deleted', onProjectUnlinkedDeleted);
    };
  }, [employeeId]);
}
