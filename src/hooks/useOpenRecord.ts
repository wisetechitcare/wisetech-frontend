import { useCallback } from 'react';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { LEAD_PROJECT_COMPANY } from '@constants/api-endpoint';
import { canSection } from '@utils/can';

const API_BASE_URL = import.meta.env.VITE_APP_WISE_TECH_BACKEND || '';

/**
 * Company and contact pages list every related lead and project, so counts and graphs are true —
 * but a person opens only their own: a lead assigned to them, or a project they're on the team of
 * (the server's by-id rule, which still refuses the rest). `openRecord` goes there, or says why not.
 * The list is refetched when an admin changes this person's access (useRealtimeSync).
 */
export const useOpenRecord = () => {
  const navigate = useNavigate();
  const { data } = useQuery({
    queryKey: ['openable-leads'],
    queryFn: async () => (await axios.get(`${API_BASE_URL}/${LEAD_PROJECT_COMPANY.GET_OPENABLE_LEADS}`)).data?.data as { all: boolean; ids: string[] },
    staleTime: 60_000,
  });

  const ids = new Set(data?.ids ?? []);
  // A received lead is a project: open it on the project page if the Leads section is closed.
  const routeFor = (id: string, isProject?: boolean) =>
    canSection('crm.leads') ? `/leads/${id}` : isProject && canSection('projects') ? `/project/${id}` : null;

  const canOpen = (id?: string | null, isProject?: boolean) =>
    !!id && !!data && (data.all || ids.has(id)) && !!routeFor(id, isProject);

  const openRecord = useCallback((id?: string | null, isProject?: boolean, preferred?: string) => {
    if (!id) return;
    if (!canOpen(id, isProject)) {
      toast.info(`You're not authorized to open this ${isProject ? 'project' : 'lead'}. It isn't assigned to you and you're not on its team — ask an admin if you need access.`, { toastId: 'record-not-authorized' });
      return;
    }
    navigate(preferred && (preferred.startsWith('/leads') ? canSection('crm.leads') : canSection('projects')) ? preferred : routeFor(id, isProject)!);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, navigate]);

  return { canOpen, openRecord };
};
