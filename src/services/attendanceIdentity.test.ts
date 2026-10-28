import { beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import { startAuthentication } from '@simplewebauthn/browser';
import { getAttendanceIdentityStatus, verifyAttendancePasskey } from './attendanceIdentity';

vi.mock('axios', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
vi.mock('@simplewebauthn/browser', () => ({ startAuthentication: vi.fn(), startRegistration: vi.fn() }));

describe('attendance identity client', () => {
  beforeEach(() => vi.clearAllMocks());

  it('reads whether identity verification is required', async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: { data: { required: true, faceEnrolled: false, passkeys: [] } } });
    await expect(getAttendanceIdentityStatus()).resolves.toMatchObject({ required: true });
  });

  it('binds a passkey proof to the requested punch action', async () => {
    vi.mocked(axios.post)
      .mockResolvedValueOnce({ data: { data: { challengeId: 'challenge-1', options: { challenge: 'abc' } } } })
      .mockResolvedValueOnce({ data: { data: { verificationId: 'proof-1' } } });
    vi.mocked(startAuthentication).mockResolvedValue({ id: 'credential-1' } as any);

    await expect(verifyAttendancePasskey('CHECK_OUT')).resolves.toBe('proof-1');
    expect(axios.post).toHaveBeenNthCalledWith(1, expect.stringContaining('/passkey/options'), { action: 'CHECK_OUT' });
    expect(axios.post).toHaveBeenNthCalledWith(2, expect.stringContaining('/passkey/verify'), expect.objectContaining({
      action: 'CHECK_OUT',
      challengeId: 'challenge-1',
    }));
  });
});

