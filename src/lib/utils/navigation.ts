/**
 * Navigation utilities for consistent routing behavior across the app
 */

import type { NavigateFunction } from 'react-router';

/**
 * Navigate back with fallback to a specific route
 * If browser history exists, go back. Otherwise navigate to fallback.
 */
export function navigateBack(navigate: NavigateFunction, fallback: string): void {
  // Check if we have history to go back to
  if (window.history.length > 2) {
    void navigate(-1);
  } else {
    void navigate(fallback);
  }
}

/**
 * Navigate to profile history with proper parameters
 */
export function navigateToProfileHistory(navigate: NavigateFunction, profileId: string): void {
  void navigate(`/profiles/${profileId}/history`);
}

/**
 * Navigate to snapshot history for a specific source
 */
export function navigateToSnapshotHistory(
  navigate: NavigateFunction,
  userName: string,
  host: string,
  path: string
): void {
  const params = new URLSearchParams({
    userName,
    host,
    path,
  });
  void navigate(`/snapshots/history?${params.toString()}`);
}

/**
 * Navigate to snapshot browse view
 */
export function navigateToSnapshotBrowse(
  navigate: NavigateFunction,
  snapshotId: string,
  oid: string,
  rootOid: string,
  path: string
): void {
  const params = new URLSearchParams({
    snapshotId,
    oid,
    rootOid,
    path,
  });
  void navigate(`/snapshots/browse?${params.toString()}`);
}

/**
 * Navigate to snapshot restore view
 */
export function navigateToSnapshotRestore(
  navigate: NavigateFunction,
  snapshotId: string,
  oid: string,
  path: string
): void {
  const params = new URLSearchParams({
    snapshotId,
    oid,
    path,
  });
  void navigate(`/snapshots/restore?${params.toString()}`);
}

/**
 * Navigate to snapshot creation for a profile
 */
export function navigateToSnapshotCreate(navigate: NavigateFunction, profileId: string): void {
  void navigate(`/snapshots/create?profileId=${profileId}`);
}

/**
 * Navigate to policy edit page
 */
export function navigateToPolicyEdit(
  navigate: NavigateFunction,
  userName?: string,
  host?: string,
  path?: string
): void {
  if (userName && host && path) {
    const params = new URLSearchParams({ userName, host, path });
    void navigate(`/policies/edit?${params.toString()}`);
  } else {
    void navigate('/policies/edit');
  }
}
