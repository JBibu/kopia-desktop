/**
 * Kopia API Client
 *
 * This module provides a TypeScript client for communicating with the Kopia
 * server via Tauri commands. All HTTP requests are proxied through Rust
 * backend commands for security and lifecycle management.
 */

import { invoke } from '@tauri-apps/api/core';
import type {
  RepositoryStatus,
  RepositoryConnectRequest,
  KopiaServerInfo,
  KopiaServerStatus,
  SystemInfo,
} from './types';

// ============================================================================
// Kopia Server Lifecycle
// ============================================================================

/**
 * Start the Kopia server process
 */
export async function startKopiaServer(): Promise<KopiaServerInfo> {
  return invoke('kopia_server_start');
}

/**
 * Stop the Kopia server process
 */
export async function stopKopiaServer(): Promise<void> {
  return invoke('kopia_server_stop');
}

/**
 * Get Kopia server status
 */
export async function getKopiaServerStatus(): Promise<KopiaServerStatus> {
  return invoke('kopia_server_status');
}

// ============================================================================
// Repository Management
// ============================================================================

/**
 * Get repository status
 */
export async function getRepositoryStatus(): Promise<RepositoryStatus> {
  return invoke('repository_status');
}

/**
 * Connect to an existing repository
 */
export async function connectRepository(
  config: RepositoryConnectRequest
): Promise<RepositoryStatus> {
  return invoke('repository_connect', { config });
}

/**
 * Disconnect from the current repository
 */
export async function disconnectRepository(): Promise<void> {
  return invoke('repository_disconnect');
}

// ============================================================================
// System Utilities
// ============================================================================

/**
 * Get system information (OS, arch, version)
 */
export async function getSystemInfo(): Promise<SystemInfo> {
  return invoke('get_system_info');
}

/**
 * Get current username and hostname
 */
export async function getCurrentUser(): Promise<{ username: string; hostname: string }> {
  const [username, hostname] = await invoke<[string, string]>('get_current_user');
  return { username, hostname };
}

// ============================================================================
// Error Handling Utilities
// ============================================================================

/**
 * Parse Kopia API error from invoke error
 */
export function parseKopiaError(error: unknown): string {
  if (typeof error === 'string') {
    return error;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Unknown error occurred';
}

/**
 * Check if error indicates server not running
 */
export function isServerNotRunningError(error: unknown): boolean {
  const message = parseKopiaError(error);
  return message.includes('not running') || message.includes('not available');
}

/**
 * Check if error indicates repository not connected
 */
export function isNotConnectedError(error: unknown): boolean {
  const message = parseKopiaError(error);
  return message.includes('not connected') || message.includes('Connected: false');
}

/**
 * Check if error indicates invalid password
 */
export function isInvalidPasswordError(error: unknown): boolean {
  const message = parseKopiaError(error);
  return (
    message.toLowerCase().includes('invalid password') ||
    message.toLowerCase().includes('authentication failed')
  );
}
