import { preflightGitHubRepoAccess } from '@/services/git/repoAccessPreflight';

describe('preflightGitHubRepoAccess', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('classifies a nested GitHub 403 response as no_access', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ message: 'Resource not accessible by integration' }), {
        status: 403,
        headers: { 'content-type': 'application/json' },
      }),
    );

    await expect(preflightGitHubRepoAccess('private-owner/private-repo', 'token')).resolves.toEqual({
      kind: 'no_access',
      message: 'This GitHub repository is not accessible with the current account.',
    });
  });
});
