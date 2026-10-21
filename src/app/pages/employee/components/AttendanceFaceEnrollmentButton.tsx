import { lazy, Suspense, useState } from 'react';
import { Modal } from 'react-bootstrap';
import { Amplify } from 'aws-amplify';
import { toast } from 'react-toastify';
import { beginAttendanceFace, finishAttendanceFace, type AttendanceIdentityStatus } from '@services/attendanceIdentity';
import '@aws-amplify/ui-react-liveness/styles.css';
import { AppIcon, WtButton } from '@app/modules/common/components/ui';

const FaceLivenessDetector = lazy(async () => {
  const module = await import('@aws-amplify/ui-react-liveness');
  return { default: module.FaceLivenessDetector };
});

const identityPoolId = import.meta.env.VITE_ATTENDANCE_COGNITO_IDENTITY_POOL_ID;
if (identityPoolId) Amplify.configure({ Auth: { Cognito: { identityPoolId, allowGuestAccess: true } } });

export function AttendanceFaceEnrollmentButton({ employeeId, onEnrolled }: {
  employeeId: string;
  onEnrolled: (status: AttendanceIdentityStatus) => void;
}) {
  const [session, setSession] = useState<{ challengeId: string; sessionId: string; region: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const start = async () => {
    if (!identityPoolId) {
      toast.error('Configure VITE_ATTENDANCE_COGNITO_IDENTITY_POOL_ID before face enrollment.');
      return;
    }
    try {
      setBusy(true);
      setSession(await beginAttendanceFace('ENROLL_FACE', employeeId));
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || error?.message || 'Could not start face enrollment');
    } finally {
      setBusy(false);
    }
  };

  const finish = async () => {
    if (!session) return;
    try {
      setBusy(true);
      onEnrolled(await finishAttendanceFace('ENROLL_FACE', session.challengeId, employeeId));
      setSession(null);
      toast.success('Attendance face enrolled');
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || error?.message || 'Face enrollment failed');
      setSession(null);
    } finally {
      setBusy(false);
    }
  };

  return <>
    <WtButton
      disabled={busy}
      onClick={start}
      startIcon={<AppIcon name="bi-person-bounding-box" />}
    >
      Enroll face
    </WtButton>
    <Modal show={Boolean(session)} onHide={() => setSession(null)} centered size="lg">
      <Modal.Header closeButton><Modal.Title>Enroll attendance face</Modal.Title></Modal.Header>
      <Modal.Body>
        {session && <Suspense fallback={<div className="text-center p-10">Loading camera…</div>}>
          <FaceLivenessDetector
            sessionId={session.sessionId}
            region={session.region}
            onAnalysisComplete={finish}
            onUserCancel={() => setSession(null)}
            onError={(error) => { toast.error(error.error.message); setSession(null); }}
          />
        </Suspense>}
      </Modal.Body>
    </Modal>
  </>;
}
