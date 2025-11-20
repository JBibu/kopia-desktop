/**
 * Frontend Unit Tests for Kopia API Client Wrappers
 *
 * IMPORTANT: These tests only verify TypeScript wrapper functions that call `invoke()`.
 * They do NOT test actual Kopia binary integration - those are tested in Rust integration tests.
 *
 * Test Scope:
 * - Error handling and parsing logic (VALUABLE - tests actual business logic)
 * - Helper functions (isServerNotRunningError, etc.)
 *
 * For actual Kopia API integration testing, see:
 * - src-tauri/src/kopia_api_integration_tests.rs (10 tests with real Kopia binary)
 * - src-tauri/src/*_tests.rs (136 unit tests for error handling, edge cases)
 *
 * Rationale for minimal test coverage:
 * - Wrapper functions only call `invoke()` - TypeScript compiler ensures type safety
 * - All actual Kopia logic is tested in Rust (146 tests with ~65% coverage)
 * - Focus frontend tests on logic that runs in TypeScript (error parsing, helpers)
 */

import { describe, expect, it } from 'vitest';
import {
  // Error handling (the valuable functions to test)
  parseKopiaError,
  isServerNotRunningError,
  isNotConnectedError,
  isAuthenticationError,
} from '@/lib/kopia/client';

describe('Kopia Client - Error Handling', () => {
  describe('parseKopiaError', () => {
    it('parses string error', () => {
      const error = 'Server not running';
      const result = parseKopiaError(error);
      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('Server not running');
    });

    it('parses Error object', () => {
      const error = new Error('Connection failed');
      const result = parseKopiaError(error);
      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('Connection failed');
    });

    it('handles unknown error types', () => {
      const error = { unknown: 'type' };
      const result = parseKopiaError(error);
      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('Unknown error');
    });

    it('handles null/undefined errors', () => {
      expect(parseKopiaError(null).message).toBe('An unknown error occurred');
      expect(parseKopiaError(undefined).message).toBe('An unknown error occurred');
    });

    it('handles nested error objects', () => {
      const error = {
        type: 'SOME_ERROR',
        data: { message: 'Nested error message' },
      };
      const result = parseKopiaError(error);
      expect(result.message).toContain('Nested error message');
    });
  });

  describe('isServerNotRunningError', () => {
    it('detects SERVER_NOT_RUNNING error type', () => {
      const serverNotRunningError = {
        type: 'SERVER_NOT_RUNNING',
        data: { message: 'Server is not running' },
      };
      expect(isServerNotRunningError(serverNotRunningError)).toBe(true);
    });

    it('detects HTTP_REQUEST_FAILED with status 0 (connection refused)', () => {
      const httpRequestFailed = {
        type: 'HTTP_REQUEST_FAILED',
        data: { message: 'Connection refused', status_code: 0 },
      };
      expect(isServerNotRunningError(httpRequestFailed)).toBe(true);
    });

    it('returns false for HTTP errors with non-zero status', () => {
      const httpError = {
        type: 'HTTP_REQUEST_FAILED',
        data: { message: 'Not found', status_code: 404 },
      };
      expect(isServerNotRunningError(httpError)).toBe(false);
    });

    it('returns false for other error types', () => {
      expect(isServerNotRunningError(new Error('Invalid password'))).toBe(false);
      expect(isServerNotRunningError(new Error('Connection timeout'))).toBe(false);
      expect(isServerNotRunningError('Random string error')).toBe(false);
      expect(isServerNotRunningError(null)).toBe(false);
    });
  });

  describe('isNotConnectedError', () => {
    it('detects REPOSITORY_NOT_CONNECTED error type', () => {
      const error = {
        type: 'REPOSITORY_NOT_CONNECTED',
        data: { message: 'Repository not connected' },
      };
      expect(isNotConnectedError(error)).toBe(true);
    });

    it('returns false for string errors', () => {
      expect(isNotConnectedError('Invalid password')).toBe(false);
      expect(isNotConnectedError('Repository not connected')).toBe(false);
    });

    it('returns false for other error types', () => {
      expect(isNotConnectedError({ type: 'OTHER_ERROR', data: { message: 'Other error' } })).toBe(
        false
      );
      expect(isNotConnectedError(new Error('Server not running'))).toBe(false);
      expect(isNotConnectedError(null)).toBe(false);
    });
  });

  describe('isAuthenticationError', () => {
    it('detects AUTHENTICATION_FAILED error type', () => {
      const authError = {
        type: 'AUTHENTICATION_FAILED',
        data: { message: 'Authentication failed' },
      };
      expect(isAuthenticationError(authError)).toBe(true);
    });

    it('detects UNAUTHORIZED error type', () => {
      const unauthorizedError = {
        type: 'UNAUTHORIZED',
        data: { resource: 'repository' },
      };
      expect(isAuthenticationError(unauthorizedError)).toBe(true);
    });

    it('returns false for string errors', () => {
      expect(isAuthenticationError('Invalid password')).toBe(false);
      expect(isAuthenticationError('Authentication failed')).toBe(false);
    });

    it('returns false for other error types', () => {
      expect(isAuthenticationError(new Error('Server not running'))).toBe(false);
      expect(isAuthenticationError(new Error('Connection timeout'))).toBe(false);
      expect(
        isAuthenticationError({ type: 'SERVER_NOT_RUNNING', data: { message: 'Server offline' } })
      ).toBe(false);
      expect(isAuthenticationError(null)).toBe(false);
    });
  });
});

/**
 * NOTE: We intentionally DO NOT test the wrapper functions like:
 * - startKopiaServer()
 * - stopKopiaServer()
 * - getRepositoryStatus()
 * - createSnapshot()
 * - etc.
 *
 * Why? These functions are trivial one-line wrappers:
 *   export async function startKopiaServer() {
 *     return await invoke<KopiaServerInfo>('kopia_server_start');
 *   }
 *
 * Testing them provides no value because:
 * 1. TypeScript compiler already ensures type safety
 * 2. They contain zero business logic (just pass-through to Tauri invoke)
 * 3. Actual Kopia integration is tested in Rust (146 tests, ~65% coverage)
 * 4. Mocking invoke() doesn't test real behavior
 *
 * Focus testing effort on:
 * - Rust backend tests (src-tauri/src/*_tests.rs)
 * - Frontend component tests (when implemented)
 * - E2E tests with Playwright (when implemented)
 */
