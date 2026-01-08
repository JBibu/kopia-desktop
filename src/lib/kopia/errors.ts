/**
 * Kopia Desktop Error Handling
 *
 * Handles structured errors from the Rust/Tauri backend.
 * Backend errors are serialized as: { "type": "ERROR_NAME", "data": {...} }
 */

import i18n from '@/lib/i18n/config';

/**
 * Convert SCREAMING_SNAKE_CASE to camelCase
 */
function snakeToCamel(str: string): string {
  return str
    .toLowerCase()
    .split('_')
    .map((word, index) => (index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)))
    .join('');
}

/**
 * Convert SCREAMING_SNAKE_CASE to readable text (e.g., "Server Not Running")
 */
function snakeToReadable(str: string): string {
  return str
    .split('_')
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Official Kopia API error codes
 * These match the official Kopia server API specification
 * See: https://github.com/kopia/kopia/blob/master/internal/serverapi/serverapi.go#L79-96
 */
export enum OfficialKopiaAPIErrorCode {
  INTERNAL = 'INTERNAL',
  ALREADY_CONNECTED = 'ALREADY_CONNECTED',
  ALREADY_INITIALIZED = 'ALREADY_INITIALIZED',
  INVALID_PASSWORD = 'INVALID_PASSWORD',
  INVALID_TOKEN = 'INVALID_TOKEN',
  MALFORMED_REQUEST = 'MALFORMED_REQUEST',
  NOT_CONNECTED = 'NOT_CONNECTED',
  NOT_FOUND = 'NOT_FOUND',
  NOT_INITIALIZED = 'NOT_INITIALIZED',
  PATH_NOT_FOUND = 'PATH_NOT_FOUND',
  STORAGE_CONNECTION = 'STORAGE_CONNECTION',
  ACCESS_DENIED = 'ACCESS_DENIED',
}

/**
 * Extended error codes for Kopia Desktop
 * These include official API codes plus additional application-specific codes
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
  REPOSITORY_ALREADY_CONNECTED = 'REPOSITORY_ALREADY_CONNECTED',
  REPOSITORY_NOT_INITIALIZED = 'REPOSITORY_NOT_INITIALIZED',
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
  UNSUPPORTED_PLATFORM = 'UNSUPPORTED_PLATFORM',
  IO_ERROR = 'IO_ERROR',
}

/**
 * Structured Kopia error
 */
export class KopiaError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number,
    public details?: unknown,
    public apiErrorCode?: string
  ) {
    super(message);
    this.name = 'KopiaError';
  }

  /**
   * Check if error is a specific code (checks both custom and API error codes)
   */
  is(code: KopiaErrorCode | OfficialKopiaAPIErrorCode): boolean {
    return this.code === code || this.apiErrorCode === code;
  }

  /**
   * Check if error is a specific official API error code
   */
  isAPIError(code: OfficialKopiaAPIErrorCode): boolean {
    return this.apiErrorCode === code;
  }

  /**
   * Check if error is connection-related
   */
  isConnectionError(): boolean {
    return (
      this.is(KopiaErrorCode.REPOSITORY_NOT_CONNECTED) ||
      this.is(OfficialKopiaAPIErrorCode.NOT_CONNECTED) ||
      this.is(OfficialKopiaAPIErrorCode.STORAGE_CONNECTION) ||
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
      this.is(OfficialKopiaAPIErrorCode.INVALID_PASSWORD) ||
      this.is(OfficialKopiaAPIErrorCode.INVALID_TOKEN) ||
      this.is(OfficialKopiaAPIErrorCode.ACCESS_DENIED) ||
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
    const errorKey = snakeToCamel(this.code);

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
        api_error_code?: string;
        [key: string]: unknown;
      } | null;
      message?: string;
    };

    const err = error as TauriError;

    // Extract error type (code) from Rust enum
    const code = err.type;

    // Extract original API error code if present (for API parity)
    const apiErrorCode = err.data?.api_error_code;

    // Extract message from data or use Display trait output
    let message: string;
    if (err.data && typeof err.data === 'object' && err.data.message) {
      message = err.data.message;
    } else if (err.message) {
      message = err.message;
    } else if (code) {
      // Fallback: convert SCREAMING_SNAKE_CASE to readable message
      message = snakeToReadable(code);
    } else {
      message = 'Unknown error';
    }

    // Extract status code if present
    const statusCode = err.data?.status_code;

    // Extract all data as details
    const details = err.data;

    return new KopiaError(message, code, statusCode, details, apiErrorCode);
  }

  // Complete fallback
  return new KopiaError('An unknown error occurred');
}

/**
 * Mapping from official Kopia API error codes to custom error codes
 * This maintains API parity while providing more granular error handling
 *
 * NOTE: Most official API errors return HTTP 400 Bad Request.
 * Only NOT_FOUND (404), ACCESS_DENIED (403), and INTERNAL (500) have specific status codes.
 */
export const API_ERROR_CODE_MAPPING: Record<OfficialKopiaAPIErrorCode, KopiaErrorCode> = {
  [OfficialKopiaAPIErrorCode.INTERNAL]: KopiaErrorCode.INTERNAL_ERROR,
  [OfficialKopiaAPIErrorCode.ALREADY_CONNECTED]: KopiaErrorCode.REPOSITORY_ALREADY_CONNECTED,
  [OfficialKopiaAPIErrorCode.ALREADY_INITIALIZED]: KopiaErrorCode.REPOSITORY_ALREADY_EXISTS,
  [OfficialKopiaAPIErrorCode.INVALID_PASSWORD]: KopiaErrorCode.AUTHENTICATION_FAILED,
  [OfficialKopiaAPIErrorCode.INVALID_TOKEN]: KopiaErrorCode.AUTHENTICATION_FAILED,
  [OfficialKopiaAPIErrorCode.MALFORMED_REQUEST]: KopiaErrorCode.INVALID_INPUT,
  [OfficialKopiaAPIErrorCode.NOT_CONNECTED]: KopiaErrorCode.REPOSITORY_NOT_CONNECTED,
  [OfficialKopiaAPIErrorCode.NOT_FOUND]: KopiaErrorCode.NOT_FOUND,
  [OfficialKopiaAPIErrorCode.NOT_INITIALIZED]: KopiaErrorCode.REPOSITORY_NOT_INITIALIZED,
  [OfficialKopiaAPIErrorCode.PATH_NOT_FOUND]: KopiaErrorCode.PATH_NOT_FOUND,
  [OfficialKopiaAPIErrorCode.STORAGE_CONNECTION]: KopiaErrorCode.REPOSITORY_CONNECTION_FAILED,
  [OfficialKopiaAPIErrorCode.ACCESS_DENIED]: KopiaErrorCode.PERMISSION_DENIED,
};

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
 * Helper to check if error is a repository not connected error
 * Supports both custom and official API error codes
 */
export function isNotConnectedError(error: unknown): boolean {
  const kopiaError = parseKopiaError(error);
  return (
    kopiaError.is(KopiaErrorCode.REPOSITORY_NOT_CONNECTED) ||
    kopiaError.is(OfficialKopiaAPIErrorCode.NOT_CONNECTED)
  );
}
