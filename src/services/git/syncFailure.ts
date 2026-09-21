export type SyncFailureKind =
  | 'authentication'
  | 'permission'
  | 'saml'
  | 'conflict'
  | 'not_found'
  | 'network'
  | 'server'
  | 'unknown';

export interface SyncFailureResult {
  kind: SyncFailureKind;
  message?: string;
}

export interface HttpErrorDetails {
  message?: string;
  status?: number;
  headers?: Record<string, string>;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : undefined;
}

export function extractHttpErrorDetails(error: unknown): HttpErrorDetails {
  const root = asRecord(error);
  if (!root) return { message: String(error) };

  const response = asRecord(root.response) ?? root;
  const data = asRecord(response.data);
  const message = typeof root.message === 'string'
    ? root.message
    : typeof data?.message === 'string'
      ? data.message
      : typeof response.message === 'string'
        ? response.message
        : undefined;
  const status = typeof response.status === 'number'
    ? response.status
    : typeof response.statusCode === 'number'
      ? response.statusCode
      : typeof root.status === 'number'
        ? root.status
        : typeof root.statusCode === 'number'
          ? root.statusCode
          : undefined;
  const headers = typeof response.headers === 'object' && response.headers !== null
    ? response.headers as Record<string, string>
    : undefined;

  return { message, status, headers };
}

export function classifyGitHubSyncError(
  error: unknown,
  _syncStatus?: string | number,
): SyncFailureResult {
  const details = extractHttpErrorDetails(error);
  const status = details.status;
  const headers = details.headers;

  if (status === 401) {
    return { kind: 'authentication', message: details.message };
  }

  if (status === 403) {
    const ssoHeader = headers?.['x-github-sso'];
    if (ssoHeader !== undefined) {
      return { kind: 'saml', message: details.message ?? 'SAML single sign-on is required.' };
    }
    const acceptedPerms = headers?.['x-accepted-github-permissions'] ?? '';
    const lowerPerms = acceptedPerms.toLowerCase();
    if (!lowerPerms.includes('contents') && !lowerPerms.includes('repo')) {
      return { kind: 'permission', message: details.message ?? 'Token is missing the repo scope.' };
    }
    if (lowerPerms.includes('contents') && !/\bcontents\s*[:=]\s*write\b/i.test(acceptedPerms)) {
      return { kind: 'permission', message: details.message ?? 'Token is missing Contents: Read and write permission.' };
    }
    return { kind: 'permission', message: details.message ?? 'Access to this repository was denied.' };
  }

  if (status === 404) {
    return { kind: 'not_found', message: details.message };
  }

  if (status === 409) {
    return { kind: 'conflict', message: details.message };
  }

  if (status !== undefined && status >= 500) {
    return { kind: 'server', message: details.message };
  }

  return { kind: 'unknown', message: details.message };
}

export function isRetryableFailure(failure: SyncFailureResult): boolean {
  return failure.kind === 'network' || failure.kind === 'server';
}

export function syncStatusForError(error: unknown): string | undefined {
  const details = extractHttpErrorDetails(error);
  return details.status?.toString();
}
