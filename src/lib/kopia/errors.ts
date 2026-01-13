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
 *
 * Includes official API codes (12) plus essential application-specific codes (5)
 * that drive different UI behaviors.
 *
 * IMPORTANT: Keep this synchronized with src-tauri/src/error.rs
 */
export enum KopiaErrorCode {
  // ============================================================================
  // Active Desktop Codes (checked in business logic)
  // ============================================================================
  SERVER_NOT_RUNNING = 'SERVER_NOT_RUNNING', // Suppressed during polling
  SERVER_ALREADY_RUNNING = 'SERVER_ALREADY_RUNNING', // Suppressed during startup
  REPOSITORY_NOT_CONNECTED = 'REPOSITORY_NOT_CONNECTED', // Specific error message
  REPOSITORY_ALREADY_EXISTS = 'REPOSITORY_ALREADY_EXISTS', // Specific error message
  POLICY_NOT_FOUND = 'POLICY_NOT_FOUND', // Treated as "new policy"
  HTTP_REQUEST_FAILED = 'HTTP_REQUEST_FAILED', // Policy load fallback
  RESPONSE_PARSE_ERROR = 'RESPONSE_PARSE_ERROR', // Policy load fallback
  NOT_FOUND = 'NOT_FOUND', // Policy load fallback

  // ============================================================================
  // Generic fallback for all other errors
  // ============================================================================
  OPERATION_FAILED = 'OPERATION_FAILED', // Replaces all unused specific codes
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
   * Check if error is authentication-related
   */
  isAuthError(): boolean {
    return (
      this.is(OfficialKopiaAPIErrorCode.INVALID_PASSWORD) ||
      this.is(OfficialKopiaAPIErrorCode.INVALID_TOKEN) ||
      this.is(OfficialKopiaAPIErrorCode.ACCESS_DENIED) ||
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
 * Extract user-friendly error message
 *
 * Pattern from official HTMLui: errorAlert()
 */
export function getErrorMessage(error: unknown, prefix?: string): string {
  const kopiaError = parseKopiaError(error);
  const message = kopiaError.getUserMessage();
  return prefix ? `${prefix}: ${message}` : message;
}
