import { lazy, Suspense, useRef, useState } from 'react';
import { Alert, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Stack } from '@mui/material';
import { Amplify } from 'aws-amplify';
import {
  beginAttendanceFace,
  finishAttendanceFace,
  getAttendanceIdentityStatus,
  verifyAttendancePasskey,
  type AttendanceIdentityStatus,
  type AttendancePunchAction,
} from '@services/attendanceIdentity';
import '@aws-amplify/ui-react-liveness/styles.css';
import { WtButton } from '@app/modules/common/components/ui/buttons';

const FaceLivenessDetector = lazy(async () => {
  const module = await import('@aws-amplify/ui-react-liveness');
  return { default: module.FaceLivenessDetector };
});

const identityPoolId = import.meta.env.VITE_ATTENDANCE_COGNITO_IDENTITY_POOL_ID;
if (identityPoolId) {
  Amplify.configure({ Auth: { Cognito: { identityPoolId, allowGuestAccess: true } } });
}

type Pending = {
  action: AttendancePunchAction;
  status: AttendanceIdentityStatus;
  resolve: (verificationId?: string) => void;
  reject: (error: Error) => void;
};

const messageOf = (error: any) =>
  error?.response?.data?.detail || error?.response?.data?.message || error?.message || 'Identity verification failed';

/** One-shot identity proof. The server still owns enforcement and consumes the proof atomically. */
export function usePunchIdentity() {
  const pendingRef = useRef<Pending | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [face, setFace] = useState<{ challengeId: string; sessionId: string; region: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const close = (failure?: Error) => {
    const current = pendingRef.current;
    pendingRef.current = null;
    setPending(null);
    setFace(null);
    setBusy(false);
    setError('');
    if (failure) current?.reject(failure);
  };

  const verify = async (action: AttendancePunchAction): Promise<string | undefined> => {
    const status = await getAttendanceIdentityStatus();
    if (!status.required) return undefined;
    if (!status.passkeys.length && !status.faceEnrolled) {
      throw new Error('No attendance identity is enrolled. Ask HR to enroll a passkey or face, or raise an attendance request.');
    }
    return new Promise((resolve, reject) => {
      const request = { action, status, resolve, reject };
      pendingRef.current = request;
      setPending(request);
    });
  };

  const succeed = (verificationId: string) => {
    const current = pendingRef.current;
    close();
    current?.resolve(verificationId);
  };

  const passkey = async () => {
    if (!pending) return;
    try {
      setBusy(true);
      setError('');
      succeed(await verifyAttendancePasskey(pending.action));
    } catch (e) {
      setBusy(false);
      setError(`${messageOf(e)} You can retry or raise an attendance request.`);
    }
  };

  const startFace = async () => {
    if (!pending) return;
    if (!identityPoolId) {
      setError('Face verification is not configured on this deployment. Use a passkey or raise an attendance request.');
      return;
    }
    try {
      setBusy(true);
      setError('');
      setFace(await beginAttendanceFace(pending.action));
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  };

  const finishFace = async () => {
    if (!pending || !face) return;
    try {
      setBusy(true);
      const result = await finishAttendanceFace(pending.action, face.challengeId);
      if (!result.verificationId) throw new Error('Face verification did not return a proof');
      succeed(result.verificationId);
    } catch (e) {
      setBusy(false);
      setFace(null);
      setError(`${messageOf(e)} You can retry or raise an attendance request.`);
    }
  };

  const dialog = (
    <Dialog open={Boolean(pending)} onClose={() => close(new Error('Identity verification was cancelled'))} fullWidth maxWidth="sm">
      <DialogTitle>Verify it’s you</DialogTitle>
      <DialogContent>
        {error && <Alert severity="warning" sx={{ mb: 2 }}>{error}</Alert>}
        {face ? (
          <Suspense fallback={<Stack alignItems="center" p={4}><CircularProgress /></Stack>}>
            <FaceLivenessDetector
              sessionId={face.sessionId}
              region={face.region}
              onAnalysisComplete={finishFace}
              onUserCancel={() => setFace(null)}
              onError={(e) => { setFace(null); setError(e.error.message); }}
            />
          </Suspense>
        ) : (
          <Stack spacing={2} pt={1}>
            <p className="mb-0">Confirm your identity before this attendance punch is accepted.</p>
            {pending?.status.passkeys.length ? <WtButton variant="contained" disabled={busy} onClick={passkey}>Use device passkey</WtButton> : null}
            {pending?.status.faceEnrolled ? <WtButton variant="outlined" disabled={busy} onClick={startFace}>Use face verification</WtButton> : null}
            {busy && <Stack alignItems="center"><CircularProgress size={24} /></Stack>}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <WtButton variant="text" onClick={() => close(new Error('Identity verification was cancelled'))}>Cancel</WtButton>
      </DialogActions>
    </Dialog>
  );

  return { verify, dialog };
}

