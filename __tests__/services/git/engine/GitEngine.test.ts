import { requireNativeModule } from 'expo-modules-core';

jest.mock('expo-modules-core', () => ({
  requireNativeModule: jest.fn(() => ({
    pull: jest.fn(),
    getCredential: jest.fn(),
    setCredential: jest.fn(),
  })),
}));

jest.mock('@/services/AuthService', () => ({
  AuthService: {
    getToken: jest.fn(),
  },
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

import * as GitEngine from '@/services/git/engine/GitEngine';
import { AuthService } from '@/services/AuthService';

const nativeModule = (requireNativeModule as jest.Mock).mock.results[0].value as {
  pull: jest.Mock;
  getCredential: jest.Mock;
  setCredential: jest.Mock;
};

describe('GitEngine.pull', () => {
  beforeEach(() => {
    nativeModule.pull.mockReset();
    nativeModule.getCredential.mockReset();
    nativeModule.setCredential.mockReset();
    jest.mocked(AuthService.getToken).mockReset();
    nativeModule.pull.mockResolvedValue({ kind: 'UpToDate', message: 'up to date', conflicts: [] });
    nativeModule.getCredential.mockResolvedValue(null);
    nativeModule.setCredential.mockResolvedValue(undefined);
    jest.mocked(AuthService.getToken).mockResolvedValue('new-token');
  });

  it('maps a native fast-forward result to the facade success contract', async () => {
    nativeModule.pull.mockResolvedValue({ kind: 'FastForward', message: 'updated', conflicts: [] });

    const result = await GitEngine.pull('/repo', 'origin');

    expect(result).toEqual({ ok: true });
  });

  it('maps a native conflict result to the facade failure contract', async () => {
    nativeModule.pull.mockResolvedValue({
      kind: 'Conflict',
      message: 'merge conflict',
      conflicts: [{ path: 'notes/example.md', ours: null, theirs: null, ancestor: null, status: 'both' }],
    });

    const result = await GitEngine.pull('/repo', 'origin');

    expect(result).toEqual({ ok: false, error: 'merge conflict' });
  });

  it('refreshes a cached HTTPS credential from the active token', async () => {
    nativeModule.getCredential.mockResolvedValue({
      kind: 'userpass',
      username: 'x-access-token',
      password: 'old-token',
    });

    await GitEngine.pull('/repo', 'origin', 'repo-1');

    expect(nativeModule.setCredential).toHaveBeenCalledWith('repo-1', {
      kind: 'userpass',
      username: 'x-access-token',
      password: 'new-token',
    });
  });

  it('keeps a cached SSH credential instead of replacing it with the active token', async () => {
    const sshCredential = {
      kind: 'ssh',
      username: 'git',
      privateKey: 'private-key',
      publicKey: 'public-key',
      passphrase: null,
    };
    nativeModule.getCredential.mockResolvedValue(sshCredential);

    await GitEngine.pull('/repo', 'origin', 'repo-1');

    expect(nativeModule.setCredential).not.toHaveBeenCalled();
  });
});
