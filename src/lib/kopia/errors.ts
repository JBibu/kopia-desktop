/**
 * Kopia Desktop Error Handling
 *
 * Handles structured errors from the Rust/Tauri backend.
 * Backend errors are serialized as: { "type": "ERROR_NAME", "data": {...} }
 */

/**
 * Error codes matching the Rust KopiaError enum
 * These match the SCREAMING_SNAKE_CASE serialization from the backend
 */
export enum KopiaErrorCode {
  // Server Lifecycle Errors
  SERVER_START_FAILED = 'SERVER_START_FAILED',
  SERVER_STOP_FAILED = 'SERVER_STOP_FAILED',
  SERVER_NOT_RUNNING = 'SERVER_NOT_RUNNING',
  SERVER_ALREADY_RUNNING = 'SERVER_ALREADY_RUNNING',
  SERVER_NOT_READY = 'SERVER_NOT_READY',
  BINARY_NOT_FOUND = 'BINARY_NOT_FOUND',
  BINARY_EXECUTION_FAILED = 'BINARY_EXECUTION_FAILED',

  // Repository Errors
  REPOSITORY_CONNECTION_FAILED = 'REPOSITORY_CONNECTION_FAILED',
  REPOSITORY_NOT_CONNECTED = 'REPOSITORY_NOT_CONNECTED',
  REPOSITORY_ALREADY_CONNECTED = 'REPOSITORY_ALREADY_CONNECTED',
  REPOSITORY_NOT_FOUND = 'REPOSITORY_NOT_FOUND',
  REPOSITORY_INITIALIZATION_FAILED = 'REPOSITORY_INITIALIZATION_FAILED',
  INVALID_PASSWORD = 'INVALID_PASSWORD',
  REPOSITORY_OPERATION_FAILED = 'REPOSITORY_OPERATION_FAILED',

  // Storage Errors
  STORAGE_CONNECTION_FAILED = 'STORAGE_CONNECTION_FAILED',
  INVALID_STORAGE_CONFIG = 'INVALID_STORAGE_CONFIG',
  STORAGE_ACCESS_DENIED = 'STORAGE_ACCESS_DENIED',

  // Snapshot Errors
  SNAPSHOT_CREATION_FAILED = 'SNAPSHOT_CREATION_FAILED',
  SNAPSHOT_NOT_FOUND = 'SNAPSHOT_NOT_FOUND',
  SNAPSHOT_OPERATION_FAILED = 'SNAPSHOT_OPERATION_FAILED',
  PATH_RESOLUTION_FAILED = 'PATH_RESOLUTION_FAILED',

  // Policy Errors
  POLICY_NOT_FOUND = 'POLICY_NOT_FOUND',
  POLICY_OPERATION_FAILED = 'POLICY_OPERATION_FAILED',
  INVALID_POLICY_CONFIG = 'INVALID_POLICY_CONFIG',

  // Task Errors
  TASK_NOT_FOUND = 'TASK_NOT_FOUND',
  TASK_OPERATION_FAILED = 'TASK_OPERATION_FAILED',

  // Restore Errors
  RESTORE_FAILED = 'RESTORE_FAILED',
  MOUNT_FAILED = 'MOUNT_FAILED',

  // WebSocket Errors
  WEBSOCKET_CONNECTION_FAILED = 'WEBSOCKET_CONNECTION_FAILED',
  WEBSOCKET_ALREADY_CONNECTED = 'WEBSOCKET_ALREADY_CONNECTED',
  WEBSOCKET_NOT_CONNECTED = 'WEBSOCKET_NOT_CONNECTED',

  // Network Errors
  HTTP_REQUEST_FAILED = 'HTTP_REQUEST_FAILED',
  TIMEOUT = 'TIMEOUT',
  CONNECTION_REFUSED = 'CONNECTION_REFUSED',

  // Validation Errors
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_FIELD = 'MISSING_FIELD',

  // Filesystem Errors
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  IO_ERROR = 'IO_ERROR',

  // System Errors
  CONFIG_ERROR = 'CONFIG_ERROR',
  ENVIRONMENT_ERROR = 'ENVIRONMENT_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',

  // Parsing Errors
  JSON_PARSE_ERROR = 'JSON_PARSE_ERROR',
  RESPONSE_PARSE_ERROR = 'RESPONSE_PARSE_ERROR',
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
      this.is(KopiaErrorCode.CONNECTION_REFUSED) ||
      this.is(KopiaErrorCode.WEBSOCKET_NOT_CONNECTED) ||
      this.is(KopiaErrorCode.STORAGE_CONNECTION_FAILED) ||
      this.statusCode === 0
    );
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
      // Server Lifecycle
      case KopiaErrorCode.SERVER_START_FAILED:
        return 'Failed to start Kopia server. Please check the logs.';
      case KopiaErrorCode.SERVER_STOP_FAILED:
        return 'Failed to stop Kopia server.';
      case KopiaErrorCode.SERVER_NOT_RUNNING:
        return 'Kopia server is not running. Please start the server first.';
      case KopiaErrorCode.SERVER_ALREADY_RUNNING:
        return 'Kopia server is already running.';
      case KopiaErrorCode.SERVER_NOT_READY:
        return 'Kopia server is not ready yet. Please wait a moment.';
      case KopiaErrorCode.BINARY_NOT_FOUND:
        return 'Kopia binary not found. Please ensure Kopia is properly installed.';
      case KopiaErrorCode.BINARY_EXECUTION_FAILED:
        return 'Failed to execute Kopia binary.';

      // Repository
      case KopiaErrorCode.REPOSITORY_CONNECTION_FAILED:
        return 'Failed to connect to repository. Please check your configuration.';
      case KopiaErrorCode.REPOSITORY_NOT_CONNECTED:
        return 'Not connected to repository. Please connect to a repository first.';
      case KopiaErrorCode.REPOSITORY_ALREADY_CONNECTED:
        return 'Already connected to a repository. Disconnect first to connect to another.';
      case KopiaErrorCode.REPOSITORY_NOT_FOUND:
        return 'Repository not found at the specified location.';
      case KopiaErrorCode.REPOSITORY_INITIALIZATION_FAILED:
        return 'Failed to initialize repository.';
      case KopiaErrorCode.INVALID_PASSWORD:
        return 'Invalid repository password. Please check your password and try again.';
      case KopiaErrorCode.REPOSITORY_OPERATION_FAILED:
        return 'Repository operation failed.';

      // Storage
      case KopiaErrorCode.STORAGE_CONNECTION_FAILED:
        return 'Failed to connect to storage. Please check your storage configuration.';
      case KopiaErrorCode.INVALID_STORAGE_CONFIG:
        return 'Invalid storage configuration.';
      case KopiaErrorCode.STORAGE_ACCESS_DENIED:
        return 'Access denied to storage. Please check your credentials.';

      // Snapshots
      case KopiaErrorCode.SNAPSHOT_CREATION_FAILED:
        return 'Failed to create snapshot.';
      case KopiaErrorCode.SNAPSHOT_NOT_FOUND:
        return 'Snapshot not found.';
      case KopiaErrorCode.SNAPSHOT_OPERATION_FAILED:
        return 'Snapshot operation failed.';
      case KopiaErrorCode.PATH_RESOLUTION_FAILED:
        return 'Failed to resolve path.';

      // Policies
      case KopiaErrorCode.POLICY_NOT_FOUND:
        return 'Policy not found.';
      case KopiaErrorCode.POLICY_OPERATION_FAILED:
        return 'Policy operation failed.';
      case KopiaErrorCode.INVALID_POLICY_CONFIG:
        return 'Invalid policy configuration.';

      // Tasks
      case KopiaErrorCode.TASK_NOT_FOUND:
        return 'Task not found.';
      case KopiaErrorCode.TASK_OPERATION_FAILED:
        return 'Task operation failed.';

      // Restore
      case KopiaErrorCode.RESTORE_FAILED:
        return 'Restore operation failed.';
      case KopiaErrorCode.MOUNT_FAILED:
        return 'Failed to mount snapshot.';

      // WebSocket
      case KopiaErrorCode.WEBSOCKET_CONNECTION_FAILED:
        return 'WebSocket connection failed.';
      case KopiaErrorCode.WEBSOCKET_ALREADY_CONNECTED:
        return 'WebSocket is already connected.';
      case KopiaErrorCode.WEBSOCKET_NOT_CONNECTED:
        return 'WebSocket is not connected.';

      // Network
      case KopiaErrorCode.HTTP_REQUEST_FAILED:
        return 'HTTP request failed.';
      case KopiaErrorCode.TIMEOUT:
        return 'Operation timed out.';
      case KopiaErrorCode.CONNECTION_REFUSED:
        return 'Connection refused. Please check the server is running.';

      // Validation
      case KopiaErrorCode.INVALID_INPUT:
        return 'Invalid input provided.';
      case KopiaErrorCode.MISSING_FIELD:
        return 'Required field is missing.';

      // Filesystem
      case KopiaErrorCode.FILE_NOT_FOUND:
        return 'File not found.';
      case KopiaErrorCode.PERMISSION_DENIED:
        return 'Permission denied. Please check file permissions.';
      case KopiaErrorCode.IO_ERROR:
        return 'Input/output error occurred.';

      // System
      case KopiaErrorCode.CONFIG_ERROR:
        return 'Configuration error.';
      case KopiaErrorCode.ENVIRONMENT_ERROR:
        return 'Environment error.';
      case KopiaErrorCode.INTERNAL_ERROR:
        return 'Internal error occurred.';

      // Parsing
      case KopiaErrorCode.JSON_PARSE_ERROR:
        return 'Failed to parse JSON response.';
      case KopiaErrorCode.RESPONSE_PARSE_ERROR:
        return 'Failed to parse API response.';

      default:
        return this.message || 'An unknown error occurred.';
    }
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
  return (
    kopiaError.is(KopiaErrorCode.SERVER_NOT_RUNNING) ||
    kopiaError.is(KopiaErrorCode.CONNECTION_REFUSED) ||
    kopiaError.statusCode === 0
  );
}

/**
 * Check if error is invalid password
 */
export function isInvalidPasswordError(error: unknown): boolean {
  const kopiaError = parseKopiaError(error);
  return kopiaError.is(KopiaErrorCode.INVALID_PASSWORD);
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
        lastError.is(KopiaErrorCode.INVALID_PASSWORD) ||
        lastError.is(KopiaErrorCode.INVALID_STORAGE_CONFIG) ||
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
