import CourtesyDeskDetailShell from '../CourtesyDeskDetailShell';
import DriveCreate from '../components/DriveCreate';
import { GIFT_RUN_LABEL } from '../types';

export default function DriveCreatePage() {
  return (
    <CourtesyDeskDetailShell title={`New ${GIFT_RUN_LABEL}`}>
      <DriveCreate />
    </CourtesyDeskDetailShell>
  );
}
