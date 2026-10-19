/**
 * Legacy detail URL — everything now lives on Meetings → Agenda (master–detail).
 */
import { Navigate, useParams, useSearchParams } from 'react-router-dom';

export default function MeetingDetailPage() {
  const { meetingId = '' } = useParams();
  const [searchParams] = useSearchParams();
  const tab = searchParams.get('tab');
  const qs = new URLSearchParams();
  if (meetingId) qs.set('meeting', meetingId);
  if (tab === 'mom' || tab === 'minutes') qs.set('panel', 'mom');
  else if (tab === 'agenda') qs.set('panel', 'agenda');
  const q = qs.toString();
  return <Navigate to={`/employees/meetings/agenda${q ? `?${q}` : ''}`} replace />;
}
