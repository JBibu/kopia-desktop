/**
 * Error handling utilities
 */

/**
 * Extract a user-friendly error message from any error type
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unknown error occurred';
}

/**
 * Check if an error indicates a specific condition
 */
export function isErrorType(error: unknown, keywords: string[]): boolean {
  const message = getErrorMessage(error).toLowerCase();
  return keywords.some((keyword) => message.includes(keyword.toLowerCase()));
}
