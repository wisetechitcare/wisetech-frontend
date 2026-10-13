import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { GIFT_MANAGEMENT_BASE } from '../giftPaths';

/** Legacy route — opens the create modal on the Gift Runs tab. */
export default function DriveCreatePage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  useEffect(() => {
    const groupId = params.get('groupId');
    const q = new URLSearchParams({ new: '1' });
    if (groupId) q.set('groupId', groupId);
    navigate(`${GIFT_MANAGEMENT_BASE}/drives?${q.toString()}`, { replace: true });
  }, [navigate, params]);

  return null;
}
