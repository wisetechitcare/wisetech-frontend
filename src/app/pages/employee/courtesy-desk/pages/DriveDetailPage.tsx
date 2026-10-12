import CourtesyDeskDetailShell from '../CourtesyDeskDetailShell';
import DriveDetail from '../components/DriveDetail';
import { GIFT_RUN_LABEL } from '../types';

export default function DriveDetailPage() {
  return (
    <CourtesyDeskDetailShell title={GIFT_RUN_LABEL}>
      <DriveDetail />
    </CourtesyDeskDetailShell>
  );
}
