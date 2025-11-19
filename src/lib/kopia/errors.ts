/**
 * Kopia Desktop Error Handling
 *
 * Handles structured errors from the Rust/Tauri backend.
 * Backend errors are serialized as: { "type": "ERROR_NAME", "data": {...} }
 */

import i18n from '@/lib/i18n/config';

/**
 * Error codes matching the Rust KopiaError enum
 * These match the SCREAMING_SNAKE_CASE serialization from the backend
 *
 * IMPORTANT: Keep this synchronized with src-tauri/src/error.rs
 */
export enum KopiaErrorCode {
  // ============================================================================
  // Server Lifecycle Errors
  // ============================================================================
  SERVER_START_FAILED = 'SERVER_START_FAILED',
  SERVER_STOP_FAILED = 'SERVER_STOP_FAILED',
  SERVER_NOT_RUNNING = 'SERVER_NOT_RUNNING',
  SERVER_ALREADY_RUNNING = 'SERVER_ALREADY_RUNNING',
  SERVER_NOT_READY = 'SERVER_NOT_READY',
  BINARY_NOT_FOUND = 'BINARY_NOT_FOUND',
  BINARY_EXECUTION_FAILED = 'BINARY_EXECUTION_FAILED',

  // ============================================================================
  // Repository Errors
  // ============================================================================
  REPOSITORY_CONNECTION_FAILED = 'REPOSITORY_CONNECTION_FAILED',
  REPOSITORY_NOT_CONNECTED = 'REPOSITORY_NOT_CONNECTED',
  REPOSITORY_CREATION_FAILED = 'REPOSITORY_CREATION_FAILED',
  REPOSITORY_OPERATION_FAILED = 'REPOSITORY_OPERATION_FAILED',
  REPOSITORY_ALREADY_EXISTS = 'REPOSITORY_ALREADY_EXISTS',
  INVALID_REPOSITORY_CONFIG = 'INVALID_REPOSITORY_CONFIG',

  // ============================================================================
  // Snapshot Errors
  // ============================================================================
  SNAPSHOT_CREATION_FAILED = 'SNAPSHOT_CREATION_FAILED',
  SNAPSHOT_NOT_FOUND = 'SNAPSHOT_NOT_FOUND',
  SNAPSHOT_DELETION_FAILED = 'SNAPSHOT_DELETION_FAILED',
  SNAPSHOT_EDIT_FAILED = 'SNAPSHOT_EDIT_FAILED',

  // ============================================================================
  // Policy Errors
  // ============================================================================
  POLICY_NOT_FOUND = 'POLICY_NOT_FOUND',
  POLICY_UPDATE_FAILED = 'POLICY_UPDATE_FAILED',
  INVALID_POLICY_CONFIG = 'INVALID_POLICY_CONFIG',

  // ============================================================================
  // Task Errors
  // ============================================================================
  TASK_NOT_FOUND = 'TASK_NOT_FOUND',
  TASK_CANCELLATION_FAILED = 'TASK_CANCELLATION_FAILED',

  // ============================================================================
  // Restore/Mount Errors
  // ============================================================================
  RESTORE_FAILED = 'RESTORE_FAILED',
  MOUNT_FAILED = 'MOUNT_FAILED',
  UNMOUNT_FAILED = 'UNMOUNT_FAILED',
  MOUNT_NOT_FOUND = 'MOUNT_NOT_FOUND',

  // ============================================================================
  // Maintenance Errors
  // ============================================================================
  MAINTENANCE_FAILED = 'MAINTENANCE_FAILED',

  // ============================================================================
  // WebSocket Errors
  // ============================================================================
  WEBSOCKET_CONNECTION_FAILED = 'WEBSOCKET_CONNECTION_FAILED',
  WEBSOCKET_ALREADY_CONNECTED = 'WEBSOCKET_ALREADY_CONNECTED',
  WEBSOCKET_NOT_CONNECTED = 'WEBSOCKET_NOT_CONNECTED',
  WEBSOCKET_MESSAGE_PARSE_FAILED = 'WEBSOCKET_MESSAGE_PARSE_FAILED',

  // ============================================================================
  // HTTP/API Errors
  // ============================================================================
  HTTP_REQUEST_FAILED = 'HTTP_REQUEST_FAILED',
  RESPONSE_PARSE_ERROR = 'RESPONSE_PARSE_ERROR',
  API_ERROR = 'API_ERROR',
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  UNAUTHORIZED = 'UNAUTHORIZED',
  NOT_FOUND = 'NOT_FOUND',

  // ============================================================================
  // File System Errors
  // ============================================================================
  FILE_IO_ERROR = 'FILE_IO_ERROR',
  INVALID_PATH = 'INVALID_PATH',
  PATH_NOT_FOUND = 'PATH_NOT_FOUND',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  PATH_RESOLUTION_FAILED = 'PATH_RESOLUTION_FAILED',

  // ============================================================================
  // Notification Errors
  // ============================================================================
  NOTIFICATION_PROFILE_CREATION_FAILED = 'NOTIFICATION_PROFILE_CREATION_FAILED',
  NOTIFICATION_PROFILE_DELETION_FAILED = 'NOTIFICATION_PROFILE_DELETION_FAILED',
  NOTIFICATION_TEST_FAILED = 'NOTIFICATION_TEST_FAILED',

  // ============================================================================
  // General Errors
  // ============================================================================
  JSON_ERROR = 'JSON_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  ENVIRONMENT_ERROR = 'ENVIRONMENT_ERROR',
  TIMEOUT = 'TIMEOUT',
  CANCELLED = 'CANCELLED',
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
    return (
      this.is(KopiaErrorCode.REPOSITORY_NOT_CONNECTED) ||
      this.is(KopiaErrorCode.SERVER_NOT_RUNNING) ||
      this.is(KopiaErrorCode.WEBSOCKET_NOT_CONNECTED) ||
      this.statusCode === 0
    );
  }

  /**
   * Check if error is authentication-related
   */
  isAuthError(): boolean {
    return (
      this.is(KopiaErrorCode.AUTHENTICATION_FAILED) ||
      this.is(KopiaErrorCode.UNAUTHORIZED) ||
      this.statusCode === 401 ||
      this.statusCode === 403
    );
  }

  /**
   * Get user-friendly error message (translated)
   */
  getUserMessage(): string {
    // If no error code, return the message or generic error
    if (!this.code) {
      return this.message || i18n.t('errors.unknownError');
    }

    // Convert error code to camelCase translation key
    const errorKey = this.code
      .toLowerCase()
      .split('_')
      .map((word, index) => (index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)))
      .join('');

    const translationKey = `errors.kopia.${errorKey}`;
    const translated = i18n.t(translationKey);

    // If translation exists and is different from the key, use it
    if (translated && translated !== translationKey) {
      return translated;
    }

    // Fallback to original message or generic error
    return this.message || i18n.t('errors.unknownError');
  }
}

/**
 * Parse error from Tauri backend
 *
 * The Rust backend returns errors serialized as:
 * { "type": "ERROR_CODE", "data": { ... } }
 *
 * @example
 * ```typescript
 * try {
 *   await invoke('repository_connect', { config });
 * } catch (error) {
 *   const kopiaError = parseKopiaError(error);
 *   if (kopiaError.is(KopiaErrorCode.REPOSITORY_NOT_CONNECTED)) {
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

  // String error (common from Tauri)
  if (typeof error === 'string') {
    return new KopiaError(error);
  }

  // Tauri error format: { type: "ERROR_CODE", data: {...} } or object
  if (typeof error === 'object' && error !== null) {
    type TauriError = {
      type?: string;
      data?: {
        message?: string;
        details?: string;
        status_code?: number;
        [key: string]: unknown;
      } | null;
      message?: string;
    };

    const err = error as TauriError;

    // Extract error type (code) from Rust enum
    const code = err.type;

    // Extract message from data or use Display trait output
    let message: string;
    if (err.data && typeof err.data === 'object' && err.data.message) {
      message = err.data.message;
    } else if (err.message) {
      message = err.message;
    } else if (code) {
      // Fallback: convert SCREAMING_SNAKE_CASE to readable message
      message = code
        .split('_')
        .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
        .join(' ');
    } else {
      message = 'Unknown error';
    }

    // Extract status code if present
    const statusCode = err.data?.status_code;

    // Extract all data as details
    const details = err.data;

    return new KopiaError(message, code, statusCode, details);
  }

  // Complete fallback
  return new KopiaError('An unknown error occurred');
}

/**
 * Check if error is REPOSITORY_NOT_CONNECTED
 */
export function isNotConnectedError(error: unknown): boolean {
  const kopiaError = parseKopiaError(error);
  return kopiaError.is(KopiaErrorCode.REPOSITORY_NOT_CONNECTED);
}

/**
 * Check if error indicates server is not running
 */
export function isServerNotRunningError(error: unknown): boolean {
  const kopiaError = parseKopiaError(error);
  return kopiaError.is(KopiaErrorCode.SERVER_NOT_RUNNING) || kopiaError.statusCode === 0;
}

/**
 * Check if error is authentication failure
 */
export function isAuthenticationError(error: unknown): boolean {
  const kopiaError = parseKopiaError(error);
  return kopiaError.isAuthError();
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
 * Error handler that checks for REPOSITORY_NOT_CONNECTED and redirects
 *
 * @example
 * ```typescript
 * try {
 *   await invoke('snapshots_list');
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
  if (kopiaError.is(KopiaErrorCode.REPOSITORY_NOT_CONNECTED)) {
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
 *   const handleError = createErrorHandler(navigate);
 *
 *   const loadSnapshots = async () => {
 *     try {
 *       const data = await invoke('snapshots_list', { ... });
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
    if (kopiaError.is(KopiaErrorCode.REPOSITORY_NOT_CONNECTED)) {
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
 *   () => invoke('repository_status'),
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

      // Don't retry on auth errors, not connected, or invalid config
      if (
        lastError.isAuthError() ||
        lastError.is(KopiaErrorCode.REPOSITORY_NOT_CONNECTED) ||
        lastError.is(KopiaErrorCode.INVALID_REPOSITORY_CONFIG) ||
        lastError.is(KopiaErrorCode.INVALID_POLICY_CONFIG) ||
        lastError.is(KopiaErrorCode.INVALID_INPUT)
      ) {
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
