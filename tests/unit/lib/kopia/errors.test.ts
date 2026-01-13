/**
 * Unit tests for Kopia error handling (simplified error system)
 */

import { describe, expect, it, vi } from 'vitest';
import {
  KopiaError,
  KopiaErrorCode,
  OfficialKopiaAPIErrorCode,
  parseKopiaError,
  getErrorMessage,
} from '@/lib/kopia/errors';

// Mock i18n for testing
vi.mock('@/lib/i18n/config', () => ({
  default: {
    t: (key: string) => {
      // Simple mock translations
      const translations: Record<string, string> = {
        'errors.unknownError': 'Unknown error',
        'errors.kopia.serverNotRunning': 'Server is not running',
        'errors.kopia.repositoryNotConnected': 'Repository is not connected',
        'errors.kopia.operationFailed': 'Operation failed',
      };
      return translations[key] || key;
    },
  },
}));

describe('KopiaError', () => {
  describe('constructor', () => {
    it('creates basic error', () => {
      const error = new KopiaError('Test error');
      expect(error.message).toBe('Test error');
      expect(error.name).toBe('KopiaError');
      expect(error.code).toBeUndefined();
      expect(error.statusCode).toBeUndefined();
      expect(error.details).toBeUndefined();
    });

    it('creates error with code', () => {
      const error = new KopiaError('Test error', KopiaErrorCode.SERVER_NOT_RUNNING);
      expect(error.message).toBe('Test error');
      expect(error.code).toBe(KopiaErrorCode.SERVER_NOT_RUNNING);
    });

    it('creates error with status code', () => {
      const error = new KopiaError('Test error', KopiaErrorCode.NOT_FOUND, 404);
      expect(error.statusCode).toBe(404);
    });

    it('creates error with details', () => {
      const details = { foo: 'bar', baz: 123 };
      const error = new KopiaError('Test error', undefined, undefined, details);
      expect(error.details).toEqual(details);
    });

    it('extends Error correctly', () => {
      const error = new KopiaError('Test error');
      expect(error instanceof Error).toBe(true);
      expect(error instanceof KopiaError).toBe(true);
    });
  });

  describe('is()', () => {
    it('checks error code correctly', () => {
      const error = new KopiaError('Test', KopiaErrorCode.SERVER_NOT_RUNNING);
      expect(error.is(KopiaErrorCode.SERVER_NOT_RUNNING)).toBe(true);
      expect(error.is(KopiaErrorCode.REPOSITORY_NOT_CONNECTED)).toBe(false);
    });

    it('returns false when no code', () => {
      const error = new KopiaError('Test');
      expect(error.is(KopiaErrorCode.SERVER_NOT_RUNNING)).toBe(false);
    });
  });

  describe('isAuthError()', () => {
    it('identifies invalid password (official API code)', () => {
      const error = new KopiaError(
        'Test',
        undefined,
        undefined,
        undefined,
        OfficialKopiaAPIErrorCode.INVALID_PASSWORD
      );
      expect(error.isAuthError()).toBe(true);
    });

    it('identifies invalid token (official API code)', () => {
      const error = new KopiaError(
        'Test',
        undefined,
        undefined,
        undefined,
        OfficialKopiaAPIErrorCode.INVALID_TOKEN
      );
      expect(error.isAuthError()).toBe(true);
    });

    it('identifies access denied (official API code)', () => {
      const error = new KopiaError(
        'Test',
        undefined,
        undefined,
        undefined,
        OfficialKopiaAPIErrorCode.ACCESS_DENIED
      );
      expect(error.isAuthError()).toBe(true);
    });

    it('identifies 401 status code', () => {
      const error = new KopiaError('Test', undefined, 401);
      expect(error.isAuthError()).toBe(true);
    });

    it('identifies 403 status code', () => {
      const error = new KopiaError('Test', undefined, 403);
      expect(error.isAuthError()).toBe(true);
    });

    it('returns false for non-auth errors', () => {
      const error = new KopiaError('Test', KopiaErrorCode.NOT_FOUND);
      expect(error.isAuthError()).toBe(false);
    });
  });

  describe('getUserMessage()', () => {
    it('returns translated message for known error code', () => {
      const error = new KopiaError('Test', 'SERVER_NOT_RUNNING');
      expect(error.getUserMessage()).toBe('Server is not running');
    });

    it('returns original message when no translation exists', () => {
      const error = new KopiaError('Custom error', 'UNKNOWN_CODE');
      expect(error.getUserMessage()).toBe('Custom error');
    });

    it('returns original message when no code', () => {
      const error = new KopiaError('Custom error');
      expect(error.getUserMessage()).toBe('Custom error');
    });

    it('returns unknown error when no message and no code', () => {
      const error = new KopiaError('');
      expect(error.getUserMessage()).toBe('Unknown error');
    });

    it('converts SCREAMING_SNAKE_CASE to camelCase for translation key', () => {
      const error = new KopiaError('Test', 'REPOSITORY_NOT_CONNECTED');
      expect(error.getUserMessage()).toBe('Repository is not connected');
    });

    it('returns fallback when translation returns the key itself', () => {
      const error = new KopiaError('Fallback message', 'UNMAPPED_ERROR_CODE');
      const message = error.getUserMessage();
      expect(message).toBe('Fallback message');
    });

    it('handles empty message with valid code', () => {
      const error = new KopiaError('', 'SERVER_NOT_RUNNING');
      expect(error.getUserMessage()).toBe('Server is not running');
    });
  });
});

describe('parseKopiaError', () => {
  it('returns KopiaError as-is', () => {
    const error = new KopiaError('Test', KopiaErrorCode.SERVER_NOT_RUNNING);
    expect(parseKopiaError(error)).toBe(error);
  });

  it('parses standard Error', () => {
    const error = new Error('Standard error');
    const parsed = parseKopiaError(error);
    expect(parsed).toBeInstanceOf(KopiaError);
    expect(parsed.message).toBe('Standard error');
    expect(parsed.code).toBeUndefined();
  });

  it('parses string error', () => {
    const error = 'String error';
    const parsed = parseKopiaError(error);
    expect(parsed).toBeInstanceOf(KopiaError);
    expect(parsed.message).toBe('String error');
  });

  it('parses Tauri error with type and data.message', () => {
    const error = {
      type: 'SERVER_NOT_RUNNING',
      data: {
        message: 'Server is not running',
        status_code: 500,
      },
    };
    const parsed = parseKopiaError(error);
    expect(parsed).toBeInstanceOf(KopiaError);
    expect(parsed.message).toBe('Server is not running');
    expect(parsed.code).toBe('SERVER_NOT_RUNNING');
    expect(parsed.statusCode).toBe(500);
  });

  it('parses Tauri error with type and message field', () => {
    const error = {
      type: 'SERVER_NOT_RUNNING',
      message: 'Server is not running',
    };
    const parsed = parseKopiaError(error);
    expect(parsed).toBeInstanceOf(KopiaError);
    expect(parsed.message).toBe('Server is not running');
    expect(parsed.code).toBe('SERVER_NOT_RUNNING');
  });

  it('parses Tauri error with only type', () => {
    const error = {
      type: 'SERVER_NOT_RUNNING',
    };
    const parsed = parseKopiaError(error);
    expect(parsed).toBeInstanceOf(KopiaError);
    expect(parsed.message).toBe('Server Not Running');
    expect(parsed.code).toBe('SERVER_NOT_RUNNING');
  });

  it('parses error with null data', () => {
    const error = {
      type: 'SERVER_NOT_RUNNING',
      data: null,
    };
    const parsed = parseKopiaError(error);
    expect(parsed).toBeInstanceOf(KopiaError);
    expect(parsed.code).toBe('SERVER_NOT_RUNNING');
  });

  it('parses object without type or message', () => {
    const error = { foo: 'bar' };
    const parsed = parseKopiaError(error);
    expect(parsed).toBeInstanceOf(KopiaError);
    expect(parsed.message).toBe('Unknown error');
  });

  it('handles null error', () => {
    const parsed = parseKopiaError(null);
    expect(parsed).toBeInstanceOf(KopiaError);
    expect(parsed.message).toBe('An unknown error occurred');
  });

  it('handles undefined error', () => {
    const parsed = parseKopiaError(undefined);
    expect(parsed).toBeInstanceOf(KopiaError);
    expect(parsed.message).toBe('An unknown error occurred');
  });

  it('handles number error', () => {
    const parsed = parseKopiaError(123);
    expect(parsed).toBeInstanceOf(KopiaError);
    expect(parsed.message).toBe('An unknown error occurred');
  });

  it('handles boolean error', () => {
    const parsed = parseKopiaError(true);
    expect(parsed).toBeInstanceOf(KopiaError);
    expect(parsed.message).toBe('An unknown error occurred');
  });

  it('extracts all data as details', () => {
    const error = {
      type: 'SERVER_NOT_RUNNING',
      data: {
        message: 'Server is not running',
        extra: 'info',
        nested: { foo: 'bar' },
      },
    };
    const parsed = parseKopiaError(error);
    expect(parsed.details).toEqual(error.data);
  });
});

describe('getErrorMessage', () => {
  it('extracts message from KopiaError', () => {
    const error = new KopiaError('Test error', 'SERVER_NOT_RUNNING');
    expect(getErrorMessage(error)).toBe('Server is not running');
  });

  it('extracts message from Error', () => {
    const error = new Error('Standard error');
    expect(getErrorMessage(error)).toBe('Standard error');
  });

  it('extracts message from string', () => {
    expect(getErrorMessage('String error')).toBe('String error');
  });

  it('adds prefix when provided', () => {
    const error = new Error('Test error');
    expect(getErrorMessage(error, 'Failed to connect')).toBe('Failed to connect: Test error');
  });

  it('handles unknown error types', () => {
    expect(getErrorMessage(null)).toBe('An unknown error occurred');
    expect(getErrorMessage(undefined)).toBe('An unknown error occurred');
    expect(getErrorMessage(123)).toBe('An unknown error occurred');
  });
});

describe('API Error Code Preservation', () => {
  it('preserves official API error code from backend', () => {
    const error = {
      type: 'REPOSITORY_NOT_CONNECTED',
      data: {
        message: 'Repository not connected',
        api_error_code: 'NOT_CONNECTED',
      },
    };
    const parsed = parseKopiaError(error);
    expect(parsed.code).toBe('REPOSITORY_NOT_CONNECTED');
    expect(parsed.apiErrorCode).toBe('NOT_CONNECTED');
  });

  it('checks both custom and API error codes with is()', () => {
    const error = new KopiaError(
      'Not connected',
      KopiaErrorCode.REPOSITORY_NOT_CONNECTED,
      undefined,
      undefined,
      OfficialKopiaAPIErrorCode.NOT_CONNECTED
    );

    // Should match custom code
    expect(error.is(KopiaErrorCode.REPOSITORY_NOT_CONNECTED)).toBe(true);

    // Should also match API code
    expect(error.is(OfficialKopiaAPIErrorCode.NOT_CONNECTED)).toBe(true);

    // Should not match different codes
    expect(error.is(KopiaErrorCode.SERVER_NOT_RUNNING)).toBe(false);
  });

  it('checks specific API error codes with isAPIError()', () => {
    const error = new KopiaError(
      'Invalid password',
      KopiaErrorCode.OPERATION_FAILED, // generic code
      undefined,
      undefined,
      OfficialKopiaAPIErrorCode.INVALID_PASSWORD // but preserves API code
    );

    expect(error.isAPIError(OfficialKopiaAPIErrorCode.INVALID_PASSWORD)).toBe(true);
    expect(error.isAPIError(OfficialKopiaAPIErrorCode.NOT_CONNECTED)).toBe(false);
  });

  it('handles authentication errors with official API codes', () => {
    const error = new KopiaError(
      'Auth failed',
      undefined,
      401,
      undefined,
      OfficialKopiaAPIErrorCode.INVALID_PASSWORD
    );

    expect(error.isAuthError()).toBe(true);
    expect(error.is(OfficialKopiaAPIErrorCode.INVALID_PASSWORD)).toBe(true);
  });
});

describe('Simplified Error System', () => {
  it('only has 9 error codes', () => {
    const codes = Object.keys(KopiaErrorCode);
    expect(codes.length).toBe(9);
  });

  it('includes only actively used error codes', () => {
    expect(KopiaErrorCode.SERVER_NOT_RUNNING).toBe('SERVER_NOT_RUNNING');
    expect(KopiaErrorCode.SERVER_ALREADY_RUNNING).toBe('SERVER_ALREADY_RUNNING');
    expect(KopiaErrorCode.REPOSITORY_NOT_CONNECTED).toBe('REPOSITORY_NOT_CONNECTED');
    expect(KopiaErrorCode.REPOSITORY_ALREADY_EXISTS).toBe('REPOSITORY_ALREADY_EXISTS');
    expect(KopiaErrorCode.POLICY_NOT_FOUND).toBe('POLICY_NOT_FOUND');
    expect(KopiaErrorCode.HTTP_REQUEST_FAILED).toBe('HTTP_REQUEST_FAILED');
    expect(KopiaErrorCode.RESPONSE_PARSE_ERROR).toBe('RESPONSE_PARSE_ERROR');
    expect(KopiaErrorCode.NOT_FOUND).toBe('NOT_FOUND');
    expect(KopiaErrorCode.OPERATION_FAILED).toBe('OPERATION_FAILED');
  });

  it('OPERATION_FAILED is the generic fallback', () => {
    const error = new KopiaError('Something went wrong', KopiaErrorCode.OPERATION_FAILED);
    expect(error.code).toBe(KopiaErrorCode.OPERATION_FAILED);
    expect(error.message).toBe('Something went wrong');
  });
});
