/**
 * Kopia API Error Handling
 *
 * Based on patterns from official Kopia HTMLui:
 * - Error code checking (NOT_CONNECTED, etc.)
 * - Structured error extraction
 * - User-friendly error messages
 */

/**
 * Known Kopia error codes
 */
export enum KopiaErrorCode {
  NOT_CONNECTED = 'NOT_CONNECTED',
  INVALID_PASSWORD = 'INVALID_PASSWORD',
  REPOSITORY_NOT_FOUND = 'REPOSITORY_NOT_FOUND',
  ALREADY_CONNECTED = 'ALREADY_CONNECTED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  STORAGE_ERROR = 'STORAGE_ERROR',
  MAINTENANCE_IN_PROGRESS = 'MAINTENANCE_IN_PROGRESS',
}

/**
 * Structured Kopia error
 */
export class KopiaError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'KopiaError';
    Object.setPrototypeOf(this, KopiaError.prototype);
  }

  /**
   * Check if error is a specific code
   */
  is(code: KopiaErrorCode): boolean {
    return this.code === code;
  }

  /**
   * Check if error is connection-related
   */
  isConnectionError(): boolean {
    return this.is(KopiaErrorCode.NOT_CONNECTED) || this.statusCode === 0;
  }

  /**
   * Check if error is authentication-related
   */
  isAuthError(): boolean {
    return (
      this.is(KopiaErrorCode.INVALID_PASSWORD) || this.statusCode === 401 || this.statusCode === 403
    );
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage(): string {
    switch (this.code) {
      case KopiaErrorCode.NOT_CONNECTED:
        return 'Not connected to repository. Please connect to a repository first.';
      case KopiaErrorCode.INVALID_PASSWORD:
        return 'Invalid repository password. Please check your password and try again.';
      case KopiaErrorCode.REPOSITORY_NOT_FOUND:
        return 'Repository not found at the specified location.';
      case KopiaErrorCode.ALREADY_CONNECTED:
        return 'Already connected to a repository. Disconnect first to connect to another.';
      case KopiaErrorCode.PERMISSION_DENIED:
        return 'Permission denied. Please check file permissions.';
      case KopiaErrorCode.STORAGE_ERROR:
        return 'Storage error occurred. Please check your storage configuration.';
      case KopiaErrorCode.MAINTENANCE_IN_PROGRESS:
        return 'Repository maintenance is in progress. Please wait.';
      default:
        return this.message || 'An unknown error occurred.';
    }
  }
}

/**
 * Parse error from API response
 *
 * Pattern from official HTMLui: uiutil.jsx errorAlert()
 *
 * @example
 * ```typescript
 * try {
 *   await kopiaAPI.createSnapshot(path);
 * } catch (error) {
 *   const kopiaError = parseKopiaError(error);
 *   if (kopiaError.is(KopiaErrorCode.NOT_CONNECTED)) {
 *     navigate('/repo');
 *   } else {
 *     toast.error(kopiaError.getUserMessage());
 *   }
 * }
 * ```
 */
export function parseKopiaError(error: unknown): KopiaError {
  // Already a KopiaError
  if (error instanceof KopiaError) {
    return error;
  }

  // Standard Error
  if (error instanceof Error) {
    return new KopiaError(error.message);
  }

  // Axios/Fetch error with response
  if (typeof error === 'object' && error !== null) {
    type ErrorWithResponse = {
      response?: {
        data?: {
          code?: string;
          error?: string;
        };
        status?: number;
      };
      message?: string;
    };

    const err = error as ErrorWithResponse;

    // Extract error code (pattern from HTMLui)
    const code = err.response?.data?.code;

    // Extract error message (pattern from HTMLui)
    const message = err.response?.data?.error || err.message || 'Unknown error';

    // Extract status code
    const statusCode = err.response?.status;

    // Extract details
    const details = err.response?.data;

    return new KopiaError(message, code, statusCode, details);
  }

  // Fallback
  return new KopiaError('An unknown error occurred');
}

/**
 * Check if error is NOT_CONNECTED
 *
 * Pattern from official HTMLui: uiutil.jsx redirect()
 */
export function isNotConnectedError(error: unknown): boolean {
  if (typeof error === 'object' && error !== null) {
    type ErrorWithResponse = {
      response?: {
        data?: {
          code?: string;
        };
      };
    };
    const err = error as ErrorWithResponse;
    return err.response?.data?.code === 'NOT_CONNECTED';
  }
  return false;
}

/**
 * Check if error indicates server is not running
 */
export function isServerNotRunningError(error: unknown): boolean {
  const kopiaError = parseKopiaError(error);
  return (
    kopiaError.message.includes('server is not running') ||
    kopiaError.message.includes('connection refused') ||
    kopiaError.statusCode === 0
  );
}

/**
 * Check if error is invalid password
 */
export function isInvalidPasswordError(error: unknown): boolean {
  const kopiaError = parseKopiaError(error);
  return (
    kopiaError.is(KopiaErrorCode.INVALID_PASSWORD) ||
    kopiaError.message.toLowerCase().includes('invalid password') ||
    kopiaError.message.toLowerCase().includes('incorrect password')
  );
}

/**
 * Extract user-friendly error message
 *
 * Pattern from official HTMLui: errorAlert()
 */
export function getErrorMessage(error: unknown, prefix?: string): string {
  const kopiaError = parseKopiaError(error);
  const message = kopiaError.getUserMessage();
  return prefix ? `${prefix}: ${message}` : message;
}

/**
 * Error handler that checks for NOT_CONNECTED and redirects
 *
 * Pattern from official HTMLui: uiutil.jsx redirect()
 *
 * @example
 * ```typescript
 * try {
 *   await kopiaAPI.listSnapshots(...);
 * } catch (error) {
 *   handleKopiaError(error, navigate);
 * }
 * ```
 */
export function handleKopiaError(
  error: unknown,
  navigate: (path: string) => void,
  onError?: (err: KopiaError) => void
): void {
  const kopiaError = parseKopiaError(error);

  // Redirect to repo connection page if not connected
  if (kopiaError.is(KopiaErrorCode.NOT_CONNECTED)) {
    navigate('/repo');
    return;
  }

  // Call custom error handler
  if (onError) {
    onError(kopiaError);
  }
}

/**
 * Create error handler for React components
 *
 * @example
 * ```typescript
 * function SnapshotList() {
 *   const navigate = useNavigate();
 *   const handleError = useErrorHandler(navigate);
 *
 *   const loadSnapshots = async () => {
 *     try {
 *       const data = await listSnapshots(...);
 *       setSnapshots(data.snapshots);
 *     } catch (error) {
 *       handleError(error, 'Failed to load snapshots');
 *     }
 *   };
 * }
 * ```
 */
export function createErrorHandler(navigate: (path: string) => void) {
  return (error: unknown, context?: string) => {
    const kopiaError = parseKopiaError(error);

    // Redirect if not connected
    if (kopiaError.is(KopiaErrorCode.NOT_CONNECTED)) {
      navigate('/repo');
      return;
    }

    // Log error
    console.error(context || 'Error:', kopiaError);

    // Show user-friendly message (would use toast in real app)
    const message = context
      ? `${context}: ${kopiaError.getUserMessage()}`
      : kopiaError.getUserMessage();

    alert(message); // Replace with toast/notification system
  };
}

/**
 * Retry helper for transient errors
 *
 * @example
 * ```typescript
 * const data = await retryOnError(
 *   () => kopiaAPI.getRepositoryStatus(),
 *   { maxRetries: 3, delay: 1000 }
 * );
 * ```
 */
export async function retryOnError<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    delay?: number;
    shouldRetry?: (error: KopiaError) => boolean;
  } = {}
): Promise<T> {
  const { maxRetries = 3, delay = 1000, shouldRetry } = options;

  let lastError: KopiaError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = parseKopiaError(error);

      // Don't retry if custom condition says no
      if (shouldRetry && !shouldRetry(lastError)) {
        throw lastError;
      }

      // Don't retry on auth errors or NOT_CONNECTED
      if (lastError.isAuthError() || lastError.is(KopiaErrorCode.NOT_CONNECTED)) {
        throw lastError;
      }

      // Last attempt - throw error
      if (attempt === maxRetries) {
        throw lastError;
      }

      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}
